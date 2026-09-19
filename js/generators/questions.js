// Lv4: 疑問文・否定文と can。
//
// ここが中1でいちばん間違いの多いところ。
//   Does he plays tennis?   … Does のあとに -s を残してしまう
//   Do you are a student?   … be動詞の文に do を使ってしまう
// この2つを必ず拾えるように、選択肢と traps を組む。

import { pick, pickWhere, weightedPick, shuffle } from '../lib/rng.js';
import { finish } from './be.js';
import { VERBS, SUBJECTS, ADJECTIVES, isThirdSingular, jaNegative } from '../data/words.js';

export const SUPPORTED_LEVELS = [4];

const FORMS_BY_PATTERN = {
  // Does / Do のあとは原形にもどる。can のあとも同じ。
  verb_after_does: ['verb_after_does', 'can_base'],
  // 疑問文・否定文で do と does を取り違える
  do_does: ['does_question', 'dont_doesnt'],
  // be動詞の文に do を使ってしまう
  be_vs_do: ['be_question']
};

/**
 * 文の途中に置くときの主語。
 * He → he のように先頭を小文字にするが、I と人の名前はそのまま。
 * どこに置いても大文字で書く語なので、小文字にすると誤った英語になる。
 */
function midSentence(text) {
  if (text === 'I') return text;
  if (/^(Ken|Yuki)/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

const WEIGHTS = [
  ['verb_after_does', 4],
  ['does_question', 2],
  ['dont_doesnt', 2],
  ['be_question', 2],
  ['can_base', 2]
];

/** Does he ___ tennis? … Does のあとの動詞。中1最頻出のつまずき。 */
function buildVerbAfterDoes(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => isThirdSingular(s) && s.text !== avoidKey);
  const verb = pickWhere(rng, VERBS, (v) => v.base !== avoidKey);
  const helper = 'Does';

  const traps = [
    { value: verb.third, reason: 'verb_after_does' },
    { value: verb.ing, reason: 'ing_without_be' },
    { value: verb.past, reason: 'wrong_tense' }
  ];

  return {
    pattern: 'verb_after_does',
    form: 'verb_after_does',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}か。`,
    question: `${helper} ${midSentence(subject.text)} ___ ${verb.obj}? (${verb.base})`,
    answer: verb.base,
    choices: shuffle(rng, [verb.base, ...traps.map((t) => t.value)]),
    facts: {
      key: verb.base,
      subject: subject.text,
      helper,
      base: verb.base,
      third: verb.third,
      ing: verb.ing,
      past: verb.past
    },
    steps: [
      `${helper} が前に出ているので、動詞はそのままの形にもどる`,
      `${verb.third} ではなく ${verb.base}`,
      `答えは ${verb.base}`
    ],
    traps
  };
}

/** He can ___ fast. … can のあとも原形。 */
function buildCanBase(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  // like は「音楽が好きだことができます」になってしまうので使わない
  const verb = pickWhere(rng, VERBS, (v) => v.base !== avoidKey && v.base !== 'like');

  const traps = [
    { value: verb.third, reason: 'verb_after_can' },
    { value: verb.ing, reason: 'ing_without_be' },
    { value: verb.past, reason: 'wrong_tense' }
  ];

  return {
    pattern: 'verb_after_does',
    form: 'can_base',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.jaDict}ことができます。`,
    question: `${subject.text} can ___ ${verb.obj}. (${verb.base})`,
    answer: verb.base,
    choices: shuffle(rng, [verb.base, ...traps.map((t) => t.value)]),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      third: verb.third,
      ing: verb.ing,
      past: verb.past
    },
    steps: [
      'can は「〜できる」を表す',
      'そのあとの動詞は、そのままの形で使う',
      `答えは ${verb.base}`
    ],
    traps
  };
}

/** ___ he play tennis? … Do と Does の使い分け。 */
function buildDoesQuestion(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  const verb = pick(rng, VERBS);
  const third = isThirdSingular(subject);
  const answer = third ? 'Does' : 'Do';
  const other = third ? 'Do' : 'Does';

  const traps = [
    { value: other, reason: 'do_does' },
    { value: 'Is', reason: 'be_vs_do' },
    { value: 'Are', reason: 'be_vs_do_are' }
  ];

  return {
    pattern: 'do_does',
    form: 'does_question',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}か。`,
    question: `___ ${midSentence(subject.text)} ${verb.base} ${verb.obj}?`,
    answer,
    choices: shuffle(rng, [answer, ...traps.map((t) => t.value)]),
    facts: { key: subject.text, subject: subject.text, helper: answer, other, third },
    steps: [
      `主語は ${subject.text}`,
      third ? '1人のときは Does を使う' : '1人でないときは Do を使う',
      `答えは ${answer}`
    ],
    traps
  };
}

/** He ___ play tennis. … don't と doesn't の使い分け。 */
function buildDontDoesnt(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  const verb = pick(rng, VERBS);
  const third = isThirdSingular(subject);
  const answer = third ? "doesn't" : "don't";
  const other = third ? "don't" : "doesn't";

  const traps = [
    { value: other, reason: 'do_does' },
    { value: "isn't", reason: 'be_vs_do' },
    { value: "aren't", reason: 'be_vs_do_are' }
  ];

  return {
    pattern: 'do_does',
    form: 'dont_doesnt',
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${jaNegative(verb.ja)}。`,
    question: `${subject.text} ___ ${verb.base} ${verb.obj}.`,
    answer,
    choices: shuffle(rng, [answer, ...traps.map((t) => t.value)]),
    facts: { key: subject.text, subject: subject.text, helper: answer, other, third },
    steps: [
      `主語は ${subject.text}`,
      third ? '1人のときは doesn\'t を使う' : '1人でないときは don\'t を使う',
      `答えは ${answer}`
    ],
    traps
  };
}

/** ___ you a student? … be動詞の文に do を使ってしまう誤り。 */
function buildBeQuestion(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  const adj = pick(rng, ADJECTIVES);
  const answer = subject.be === 'am' ? 'Are' : subject.be.charAt(0).toUpperCase() + subject.be.slice(1);
  // 疑問文では I の文でも Am I〜? になるので、主語が I のときは Am を答えにする
  const correct = subject.be === 'am' ? 'Am' : answer;

  const traps = [
    { value: 'Do', reason: 'be_vs_do' },
    { value: 'Does', reason: 'be_vs_do_does' },
    { value: correct === 'Is' ? 'Are' : 'Is', reason: 'be_agreement_question' }
  ];

  return {
    pattern: 'be_vs_do',
    form: 'be_question',
    input: 'choice',
    prompt: `${subject.ja}${adj.ja.replace(/です$/, 'です')}か。`,
    question: `___ ${midSentence(subject.text)} ${adj.word}?`,
    answer: correct,
    choices: shuffle(rng, [correct, ...traps.map((t) => t.value)]),
    facts: { key: subject.text, subject: subject.text, be: correct },
    steps: [
      'あとに動詞が無く、様子を表す語が来ている',
      'このときは be動詞 を前に出す。do は使わない',
      `答えは ${correct}`
    ],
    traps
  };
}

const BUILDERS = {
  verb_after_does: buildVerbAfterDoes,
  can_base: buildCanBase,
  does_question: buildDoesQuestion,
  dont_doesnt: buildDontDoesnt,
  be_question: buildBeQuestion
};

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`questions: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`questions: 未知の form ${opts.form}`);
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
  return ['verb_after_does', 'do_does', 'be_vs_do'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
