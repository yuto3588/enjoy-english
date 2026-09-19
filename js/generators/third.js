// Lv3: 三人称単数の -s（綴りの規則）。
//
// Lv2 は「I / You / We / They のときは -s を付けない」だった。
// ここは逆に「He / She のときは付ける。ただし付け方が語によって違う」。
//
// 選択肢には必ず「そのまま s を付けただけの形」（studys, goS など）を入れて、
// 綴りの規則そのものを練習できるようにする。

import { pickWhere, weightedPick, shuffle } from '../lib/rng.js';
import { finish } from './be.js';
import { VERBS, SUBJECTS, isThirdSingular } from '../data/words.js';

export const SUPPORTED_LEVELS = [3];

const FORMS_BY_PATTERN = {
  third_person_spelling: ['third_s', 'third_es', 'third_ies', 'third_irregular']
};

const WEIGHTS = [
  ['third_s', 3],
  ['third_es', 3],
  ['third_ies', 3],
  ['third_irregular', 1]
];

/** -s の付け方の説明。 */
const RULE = {
  s: 'そのまま -s を付ける',
  es: 's, x, ch, sh, o で終わる語は -es を付ける',
  ies: '子音字 + y は y を i に変えて -es',
  irregular: '形そのものが変わる語（have → has）'
};

function build(rng, group, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, isThirdSingular);
  const verb = pickWhere(rng, VERBS, (v) => v.group === group && v.base !== avoidKey);

  const naive = `${verb.base}s`;
  const traps = [
    { value: verb.base, reason: 'third_person_s_missing' },
    { value: verb.ing, reason: 'ing_without_be' }
  ];
  // 「そのまま s を付けた形」が正解と違うときだけ、綴りの誤りとして入れる
  if (naive !== verb.third) traps.push({ value: naive, reason: 'third_person_spelling' });
  else traps.push({ value: verb.past, reason: 'wrong_tense' });

  return {
    pattern: 'third_person_spelling',
    form: `third_${group}`,
    input: 'choice',
    prompt: `${subject.ja}${verb.objJa}${verb.ja}。`,
    question: `${subject.text} ___ ${verb.obj}. (${verb.base})`,
    answer: verb.third,
    choices: shuffle(rng, [verb.third, ...traps.map((t) => t.value)]),
    facts: {
      key: verb.base,
      subject: subject.text,
      base: verb.base,
      third: verb.third,
      ing: verb.ing,
      past: verb.past,
      naive,
      group,
      rule: RULE[group]
    },
    steps: [
      `主語は ${subject.text}。1人なので -s が付く`,
      RULE[group],
      `答えは ${verb.third}`
    ],
    traps
  };
}

const BUILDERS = {
  third_s: (rng, avoidKey) => build(rng, 's', avoidKey),
  third_es: (rng, avoidKey) => build(rng, 'es', avoidKey),
  third_ies: (rng, avoidKey) => build(rng, 'ies', avoidKey),
  third_irregular: (rng, avoidKey) => build(rng, 'irregular', avoidKey)
};

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`third: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`third: 未知の form ${opts.form}`);
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
  return ['third_person_spelling'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
