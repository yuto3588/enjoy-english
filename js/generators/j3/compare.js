// 中3 Lv1: 比較級と最上級。
//
// つまずきの中心は
//   1. than の文に最上級を置く（Ken is the tallest than Yuki.）
//   2. -er と more を重ねる（more taller）
//   3. つづりを変え忘れる（bigger を biger、easier を easyer）
// なので、traps はこの3つから作る。
//
// -er を付ける語と more を付ける語の両方を必ず出す。
// 片方しか出ないと、使い分けの練習にならない。

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import { midSentence } from '../../lib/problem.js';
import { COMPARABLES, COMPARE_PLACES, SUBJECTS } from '../../data/words.js';

const WEIGHTS = [
  ['j3_comparative', 5],
  ['j3_superlative', 5]
];

const FORMS_BY_PATTERN = {
  j3_compare: ['j3_comparative', 'j3_superlative']
};

export const SUPPORTED_LEVELS = [1];

/**
 * 1人を指す主語だけ（背くらべの文にするため）。
 *
 * He / She は使わない。than のあとに置くと he か him かという別の話になり、
 * 比較級を選ぶ練習から外れてしまう。名前と「私の兄」だけにすれば迷いようがない。
 */
function singleSubjects() {
  return SUBJECTS.filter((s) => s.person === 'third_sg' && !['He', 'She'].includes(s.text));
}

/** more を付ける語かどうかで、間違え方が変わる。 */
function naiveForms(adj) {
  if (adj.group === 'more') {
    // more を付ける語に -er / -est を付けてしまう形
    return {
      wrongComparative: `${adj.word}er`,
      wrongSuperlative: `${adj.word}est`
    };
  }
  // -er を付ける語に more を重ねてしまう形
  return {
    wrongComparative: `more ${adj.word}`,
    wrongSuperlative: `most ${adj.word}`
  };
}

/** Ken is ___ than Yuki. */
function buildComparative(rng, avoidKey) {
  const adj = pickWhere(rng, COMPARABLES, (a) => a.word !== avoidKey);
  const a = pick(rng, singleSubjects());
  const b = pickWhere(rng, singleSubjects(), (s) => s.text !== a.text);
  const naive = naiveForms(adj);

  return {
    pattern: 'j3_compare',
    form: 'j3_comparative',
    input: 'choice',
    prompt: `${a.ja}${b.ja.replace(/は$/, '')}より${adj.ja}です。`,
    question: `${a.text} is ___ than ${midSentence(b.text)}.`,
    answer: adj.comparative,
    choices: shuffle(rng, [
      adj.comparative,
      adj.superlative,
      naive.wrongComparative,
      adj.word
    ]),
    facts: {
      key: adj.word,
      word: adj.word,
      comparative: adj.comparative,
      superlative: adj.superlative,
      group: adj.group,
      usesMore: adj.group === 'more'
    },
    steps: [
      'than があるので、2つを比べる形にする',
      adj.group === 'more'
        ? `${adj.word} は長い語なので more を前に置く`
        : `${adj.word} → ${adj.comparative}`,
      `答えは ${adj.comparative}`
    ],
    traps: [
      { value: adj.superlative, reason: 'superlative_with_than' },
      { value: naive.wrongComparative, reason: 'compare_spelling' },
      { value: adj.word, reason: 'no_change' }
    ]
  };
}

/** Ken is the ___ in my class. */
function buildSuperlative(rng, avoidKey) {
  const adj = pickWhere(rng, COMPARABLES, (a) => a.word !== avoidKey);
  const subject = pick(rng, singleSubjects());
  const place = pick(rng, COMPARE_PLACES);
  const naive = naiveForms(adj);

  return {
    pattern: 'j3_compare',
    form: 'j3_superlative',
    input: 'choice',
    prompt: `${subject.ja}${place.ja}いちばん${adj.ja}です。`,
    question: `${subject.text} is the ___ ${place.text}.`,
    answer: adj.superlative,
    choices: shuffle(rng, [
      adj.superlative,
      adj.comparative,
      naive.wrongSuperlative,
      adj.word
    ]),
    facts: {
      key: adj.word,
      word: adj.word,
      comparative: adj.comparative,
      superlative: adj.superlative,
      group: adj.group,
      usesMore: adj.group === 'more'
    },
    steps: [
      'the があって「いちばん」なので、最上級にする',
      adj.group === 'more'
        ? `${adj.word} は長い語なので most を前に置く`
        : `${adj.word} → ${adj.superlative}`,
      `答えは ${adj.superlative}`
    ],
    traps: [
      { value: adj.comparative, reason: 'comparative_for_best' },
      { value: naive.wrongSuperlative, reason: 'compare_spelling' },
      { value: adj.word, reason: 'no_change' }
    ]
  };
}

const BUILDERS = {
  j3_comparative: buildComparative,
  j3_superlative: buildSuperlative
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`j3/compare: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`j3/compare: 未知の form ${opts.form}`);
  }

  const allowed = opts.form
    ? [[opts.form, 1]]
    : opts.pattern
      ? FORMS_BY_PATTERN[opts.pattern].map((f) => [f, 1])
      : WEIGHTS;

  const recentQuestions = recent
    .slice(-3)
    .map((p) => (typeof p === 'string' ? p : p && p.question))
    .filter(Boolean);

  // 直近3問と同じ問題を避ける。試行回数は固定で打ち切る。
  let draft = null;
  for (let i = 0; i < 20; i++) {
    draft = BUILDERS[weightedPick(rng, allowed)](rng, opts.avoidKey);
    if (!recentQuestions.includes(draft.question)) break;
  }

  return finish(draft, level, rng, opts);
}

export function patternsFor() {
  return ['j3_compare'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
