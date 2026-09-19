// Lv2: 一般動詞の現在形（三人称単数以外）と、名詞の複数形。
//
// 三単現の -s は Lv3。ここでは「主語が I / You / We / They のときは
// 動詞はそのままの形」を身につけることを狙う。
// 誤答の選択肢に -s 形を必ず入れて、付けすぎの誤りを拾えるようにする。

import { pick, pickWhere, weightedPick, shuffle } from '../lib/rng.js';
import { finish } from './be.js';
import { toSentence } from '../lib/problem.js';
import { NOUNS, VERBS, SUBJECTS, isThirdSingular } from '../data/words.js';

const WEIGHTS = [
  ['verb_base', 4],
  ['word_order_svo', 3],
  ['plural_es', 2],
  ['plural_ies', 2],
  ['plural_ves', 1],
  ['plural_irregular', 2]
];

export const SUPPORTED_LEVELS = [2];

const FORMS_BY_PATTERN = {
  third_person_s: ['verb_base'],
  plural_spelling: ['plural_es', 'plural_ies', 'plural_ves', 'plural_irregular'],
  word_order: ['word_order_svo']
};

/**
 * どこに置いても大文字で書く語。
 * 並べ替えの単語は小文字で出す（大文字が文頭の手がかりになるため）が、
 * これらは位置に関係なく大文字なので、手がかりにはならない。
 */
const ALWAYS_CAPITAL = new Set(['I', 'Ken', 'Yuki', 'TV', 'English']);

function asChip(word) {
  return ALWAYS_CAPITAL.has(word) ? word : word.toLowerCase();
}

/** 複数形の綴りの説明。 */
const PLURAL_RULE = {
  es: 's, x, ch, sh, o で終わる語は -es を付ける',
  ies: '子音字 + y は y を i に変えて -es',
  ves: 'f, fe で終わる語は ves にする',
  irregular: '形そのものが変わる語'
};

/**
 * 複数形は「単数 → 複数」の書きかえの形で出す。
 *
 * 「I have many ___.」のような文にすると、辞書にある man / woman / child / city
 * などで「私は女の人をたくさん持っています」というおかしな文ができてしまう。
 * one X → two ___ の形なら、どの名詞でも必ず成立する。
 */
const PLURAL_FRAME = (word) => `one ${word} → two ___`;

// --- 各形の組み立て -------------------------------------------------------

/** I ___ tennis. 主語は三人称単数以外に限る。 */
function buildVerbBase(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => !isThirdSingular(s));
  const verb = pickWhere(rng, VERBS, (v) => v.base !== avoidKey);

  return {
    pattern: 'third_person_s',
    form: 'verb_base',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}。`,
    question: `${subject.text} ___ ${verb.obj}. (${verb.base})`,
    answer: verb.base,
    choices: shuffle(rng, [verb.base, verb.third, verb.ing, verb.past]),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      third: verb.third,
      ing: verb.ing,
      past: verb.past
    },
    steps: [
      `主語は ${subject.text}。三人称単数ではない`,
      '動詞はそのままの形で使う',
      `答えは ${verb.base}`
    ],
    traps: [
      { value: verb.third, reason: 'third_person_s_overused' },
      { value: verb.ing, reason: 'ing_without_be' },
      { value: verb.past, reason: 'wrong_tense' }
    ]
  };
}

/** one box → two ___。綴りが変わる名詞だけを使う（book → books は練習にならない）。 */
function buildPlural(rng, group, avoidKey) {
  const noun = pickWhere(rng, NOUNS, (n) => n.group === group && n.word !== avoidKey);
  const naive = `${noun.word}s`;

  return {
    pattern: 'plural_spelling',
    form: `plural_${group}`,
    input: 'choice',
    prompt: `「${noun.ja}」を複数形にしましょう。`,
    question: PLURAL_FRAME(noun.word),
    answer: noun.plural,
    choices: shuffle(rng, [noun.plural, naive, noun.word]),
    facts: { key: noun.word, word: noun.word, plural: noun.plural, group, rule: PLURAL_RULE[group] },
    steps: [
      PLURAL_RULE[group],
      `${noun.word} → ${noun.plural}`,
      `答えは ${noun.plural}`
    ],
    traps: [
      { value: naive, reason: 'plural_spelling' },
      { value: noun.word, reason: 'plural_missing' }
    ]
  };
}

/**
 * 語順の並べ替え。「だれが → どうする → なにを」の順に組む。
 *
 * 答えが1通りに決まる形だけを作る（DESIGN.md の判断どおり）。
 * 主語は1語のものに限る。「Ken and Yuki」は「Yuki and Ken」も成り立ってしまうため。
 */
function buildWordOrder(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => !s.text.includes(' '));
  const verb = pickWhere(rng, VERBS, (v) => v.base !== avoidKey);
  const verbForm = isThirdSingular(subject) ? verb.third : verb.base;

  const words = [subject.text, verbForm, ...verb.obj.split(' ')].map(asChip);
  const answer = toSentence(words);

  // 日本語の語順のまま「だれが → なにを → どうする」と並べたもの
  const sov = [words[0], ...words.slice(2), words[1]];

  return {
    pattern: 'word_order',
    form: 'word_order_svo',
    input: 'arrange',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}。`,
    question: answer,
    answer,
    choices: shuffle(rng, words),
    facts: {
      key: verb.base,
      subject: subject.text,
      verbForm,
      object: verb.obj,
      answer
    },
    steps: [
      '英語は「だれが → どうする → なにを」の順',
      `${subject.text} → ${verbForm} → ${verb.obj}`,
      `答えは ${answer}`
    ],
    traps: [
      { value: toSentence(sov), reason: 'word_order_sov' }
    ]
  };
}

const BUILDERS = {
  verb_base: buildVerbBase,
  word_order_svo: buildWordOrder,
  plural_es: (rng, avoidKey) => buildPlural(rng, 'es', avoidKey),
  plural_ies: (rng, avoidKey) => buildPlural(rng, 'ies', avoidKey),
  plural_ves: (rng, avoidKey) => buildPlural(rng, 'ves', avoidKey),
  plural_irregular: (rng, avoidKey) => buildPlural(rng, 'irregular', avoidKey)
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`verbs: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`verbs: 未知の form ${opts.form}`);
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

  let draft = null;
  for (let i = 0; i < 20; i++) {
    draft = BUILDERS[weightedPick(rng, allowed)](rng, opts.avoidKey);
    if (!recentQuestions.includes(draft.question)) break;
  }

  return finish(draft, level, rng, opts);
}

export function patternsFor() {
  return ['third_person_s', 'plural_spelling', 'word_order'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
