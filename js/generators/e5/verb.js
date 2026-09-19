// 小5 Lv3: 一般動詞の文 / Lv5: 語順の並べ替え。
//
// 小5 では三単現を扱わない。
// 主語は I / You / We / They だけにして、動詞はいつも原形のままにする。
// he / she を出すと plays が要るので、ここでは使わない。
//
// 外れの選択肢は2種類入れる。
//   1. s の付いた形（plays）… 中1で習うことの下ごしらえ
//   2. 別の意味の動詞      … 語彙の確認
// どちらを選んでも、それぞれ別の解説が出る。

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import { toSentence } from '../../lib/problem.js';
import { easyVerbs, easySubjects, isThirdSingular } from '../../data/words.js';

const LEVEL_CONFIG = {
  3: { weights: [['e5_verb_base', 1]] },
  5: { weights: [['e5_order_svo', 1]] }
};

const FORMS_BY_PATTERN = {
  e5_verb: ['e5_verb_base'],
  e5_order: ['e5_order_svo']
};

export const SUPPORTED_LEVELS = [3, 5];

/**
 * どこに置いても大文字で書く語。
 * 並べ替えの単語は小文字で出す（大文字が文頭の手がかりになるため）が、
 * これらは位置に関係なく大文字なので、手がかりにはならない。
 */
const ALWAYS_CAPITAL = new Set(['I', 'Ken', 'Yuki', 'TV', 'English']);

function asChip(word) {
  return ALWAYS_CAPITAL.has(word) ? word : word.toLowerCase();
}

/** 三単現が要らない主語だけ。 */
function plainSubjects() {
  return easySubjects().filter((s) => !isThirdSingular(s));
}

/** I ___ tennis. */
function buildVerbBase(rng, avoidKey) {
  const subject = pick(rng, plainSubjects());
  const verb = pickWhere(rng, easyVerbs(), (v) => v.base !== avoidKey);

  // 別の意味の動詞を2つ。目的語が違っても、選択肢としては並ぶ。
  const others = shuffle(rng, easyVerbs().filter((v) => v.base !== verb.base)).slice(0, 2);

  // どの語を選んだかで説明を変えるため、外れの語の意味も持たせておく。
  // 「別の意味です」だけだと、2つの外れに同じ説明が出てしまう。
  const meanings = Object.fromEntries(others.map((v) => [v.base, v.jaDict]));
  const otherBases = others.map((v) => v.base);

  return {
    pattern: 'e5_verb',
    form: 'e5_verb_base',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}。`,
    question: `${subject.text} ___ ${verb.obj}.`,
    answer: verb.base,
    choices: shuffle(rng, [verb.base, verb.third, ...otherBases]),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      third: verb.third,
      obj: verb.obj,
      objJa: verb.objJa,
      ja: verb.ja,
      meanings
    },
    steps: [
      `「${verb.objJa}${verb.ja}」にあたる語をえらぶ`,
      `${subject.text} のときは、形を変えずに ${verb.base} のまま使う`,
      `答えは ${verb.base}`
    ],
    traps: [
      { value: verb.third, reason: 'verb_with_s' },
      ...otherBases.map((value) => ({ value, reason: 'wrong_verb' }))
    ]
  };
}

/**
 * 並べ替え。だれが → どうする → なにを の順。
 *
 * 語数は3〜4語に収める。目的語が「to the park」のように長い動詞は使わない。
 * 小5 で5語以上を並べるのは、語順を考える前に手が止まる。
 */
function buildWordOrder(rng, avoidKey) {
  const subject = pick(rng, plainSubjects());
  const shortObject = easyVerbs().filter((v) => v.obj.split(' ').length <= 2);
  const verb = pickWhere(rng, shortObject, (v) => v.base !== avoidKey);

  const words = [subject.text, verb.base, ...verb.obj.split(' ')].map(asChip);
  const answer = toSentence(words);

  // 日本語の語順のまま「だれが → なにを → どうする」と並べたもの
  const sov = [words[0], ...words.slice(2), words[1]];

  return {
    pattern: 'e5_order',
    form: 'e5_order_svo',
    input: 'arrange',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}。`,
    question: answer,
    answer,
    choices: shuffle(rng, words),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      obj: verb.obj,
      answer
    },
    steps: [
      '英語は「だれが → どうする → なにを」の順',
      `${subject.text} → ${verb.base} → ${verb.obj}`,
      `答えは ${answer}`
    ],
    traps: [
      { value: toSentence(sov), reason: 'japanese_order' }
    ]
  };
}

const BUILDERS = {
  e5_verb_base: buildVerbBase,
  e5_order_svo: buildWordOrder
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[3];

  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`e5/verb: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`e5/verb: 未知の form ${opts.form}`);
  }

  const allowed = opts.form
    ? [[opts.form, 1]]
    : opts.pattern
      ? FORMS_BY_PATTERN[opts.pattern].map((f) => [f, 1])
      : cfg.weights;

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

export function patternsFor(level) {
  return level === 5 ? ['e5_order'] : ['e5_verb'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
