// Lv5: 現在進行形の綴り、代名詞の格変化、語順（長め）。
//
// 語順は Lv2 より語数を増やし、be動詞 + ing の2語の動詞を含める。

import { pick, pickWhere, weightedPick, shuffle } from '../lib/rng.js';
import { finish } from './be.js';
import { toSentence } from '../lib/problem.js';
import { VERBS, SUBJECTS, NOUNS, PRONOUNS, isThirdSingular } from '../data/words.js';

export const SUPPORTED_LEVELS = [5];

const FORMS_BY_PATTERN = {
  ing_spelling: ['ing_plain', 'ing_drop_e', 'ing_double'],
  pronoun_case: ['pronoun_object', 'pronoun_possessive'],
  word_order: ['word_order_ing']
};

const WEIGHTS = [
  ['ing_plain', 2],
  ['ing_drop_e', 2],
  ['ing_double', 2],
  ['pronoun_object', 2],
  ['pronoun_possessive', 2],
  ['word_order_ing', 3]
];

const ING_RULE = {
  plain: 'そのまま -ing を付ける',
  drop_e: '終わりの e を取って -ing',
  double: '終わりの字を重ねて -ing'
};

const ALWAYS_CAPITAL = new Set(['I', 'Ken', 'Yuki', 'TV', 'English']);
const asChip = (w) => (ALWAYS_CAPITAL.has(w) ? w : w.toLowerCase());

/** He is ___ now. (run) … ing 形の綴り。 */
function buildIng(rng, ingGroup, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  // like / have は「いま〜している」と言えない動詞なので使わない
  const verb = pickWhere(rng, VERBS, (v) => v.ingGroup === ingGroup && !v.stative && v.base !== avoidKey);
  const naive = `${verb.base}ing`;

  const traps = [
    { value: verb.base, reason: 'ing_missing' },
    { value: verb.third, reason: 'third_instead_of_ing' }
  ];
  if (naive !== verb.ing) traps.push({ value: naive, reason: 'ing_spelling' });
  else traps.push({ value: verb.past, reason: 'wrong_tense' });

  return {
    pattern: 'ing_spelling',
    form: `ing_${ingGroup}`,
    input: 'choice',
    prompt: `${subject.ja}いま${verb.objJa}${verb.jaIng}。`,
    question: `${subject.text} ${subject.be} ___ ${verb.obj} now. (${verb.base})`,
    answer: verb.ing,
    choices: shuffle(rng, [verb.ing, ...traps.map((t) => t.value)]),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      ing: verb.ing,
      naive,
      ingGroup,
      rule: ING_RULE[ingGroup]
    },
    steps: [
      `${subject.be} があるので ing の形にする`,
      ING_RULE[ingGroup],
      `答えは ${verb.ing}`
    ],
    traps
  };
}

/** I know ___. … 目的語になる形。 */
function buildPronounObject(rng, avoidKey) {
  // 主語が I の文なので、I like me. のような不自然な文にならない語だけを使う
  const pron = pickWhere(rng, PRONOUNS, (p) => p.subject !== avoidKey && p.subject !== 'I' && p.subject !== 'we');
  const verb = pick(rng, [
    { en: 'know', ja: '知っています' },
    { en: 'help', ja: '手伝います' },
    { en: 'like', ja: 'が好きです' }
  ]);

  const traps = [
    { value: pron.subject, reason: 'pronoun_subject_used' },
    { value: pron.possessive, reason: 'pronoun_possessive_used' }
  ];

  return {
    pattern: 'pronoun_case',
    form: 'pronoun_object',
    input: 'choice',
    prompt: `私は${pron.ja}${verb.ja.startsWith('が') ? verb.ja : 'を' + verb.ja}。`,
    question: `I ${verb.en} ___.`,
    answer: pron.object,
    choices: shuffle(rng, [pron.object, ...traps.map((t) => t.value)]),
    facts: {
      key: pron.subject,
      ja: pron.ja,
      subject: pron.subject,
      object: pron.object,
      possessive: pron.possessive,
      answerWord: pron.object
    },
    steps: [
      '動詞のあとに来る形を選ぶ',
      `「〜を」の形は ${pron.object}`,
      `答えは ${pron.object}`
    ],
    traps
  };
}

/** This is ___ book. … 「〜の」の形。 */
function buildPronounPossessive(rng, avoidKey) {
  const pron = pickWhere(rng, PRONOUNS, (p) => p.subject !== avoidKey);
  const noun = pick(rng, NOUNS.filter((n) => n.group === 'regular'));

  const traps = [
    { value: pron.subject, reason: 'pronoun_subject_used' },
    { value: pron.object, reason: 'pronoun_object_used' }
  ];

  return {
    pattern: 'pronoun_case',
    form: 'pronoun_possessive',
    input: 'choice',
    prompt: `これは${pron.ja}の${noun.ja}です。`,
    question: `This is ___ ${noun.word}.`,
    answer: pron.possessive,
    choices: shuffle(rng, [pron.possessive, ...traps.map((t) => t.value)]),
    facts: {
      key: pron.subject,
      ja: pron.ja,
      subject: pron.subject,
      object: pron.object,
      possessive: pron.possessive,
      answerWord: pron.possessive
    },
    steps: [
      'あとに名詞が来ている',
      `「〜の」の形は ${pron.possessive}`,
      `答えは ${pron.possessive}`
    ],
    traps
  };
}

/** He is playing tennis. … be動詞 + ing を含む語順。 */
function buildWordOrderIng(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => !s.text.includes(' ') && s.text !== avoidKey);
  const verb = pickWhere(rng, VERBS, (v) => !v.stative && v.base !== avoidKey);

  const words = [subject.text, subject.be, verb.ing, ...verb.obj.split(' ')].map(asChip);
  const answer = toSentence(words);

  // 日本語の語順のまま「だれが → なにを → どうする」と並べたもの
  const sov = [words[0], ...words.slice(3), words[1], words[2]];

  return {
    pattern: 'word_order',
    form: 'word_order_ing',
    input: 'arrange',
    prompt: `${subject.ja}いま${verb.objJa}${verb.jaIng}。`,
    question: answer,
    answer,
    choices: shuffle(rng, words),
    facts: {
      key: verb.base,
      subject: subject.text,
      verbForm: `${subject.be} ${verb.ing}`,
      object: verb.obj,
      answer
    },
    steps: [
      '「いま〜している」は be動詞 と ing をならべて使う',
      `${subject.text} → ${subject.be} ${verb.ing} → ${verb.obj} の順`,
      `答えは ${answer}`
    ],
    traps: [
      { value: toSentence(sov), reason: 'word_order_sov' }
    ]
  };
}

const BUILDERS = {
  ing_plain: (rng, k) => buildIng(rng, 'plain', k),
  ing_drop_e: (rng, k) => buildIng(rng, 'drop_e', k),
  ing_double: (rng, k) => buildIng(rng, 'double', k),
  pronoun_object: buildPronounObject,
  pronoun_possessive: buildPronounPossessive,
  word_order_ing: buildWordOrderIng
};

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`progressive: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`progressive: 未知の form ${opts.form}`);
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
  return ['ing_spelling', 'pronoun_case', 'word_order'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
