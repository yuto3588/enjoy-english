// Lv1: be動詞（am / is / are）と a / an。
//
// 方針は数学版と同じ。
//   - generate() は純関数。乱数は rng を引数で受け取る
//   - 問題文は単語辞書から毎回組み立てる。問題文の固定データは持たない
//   - どの誤答の選択肢にも必ず traps を用意する

import { pick, pickWhere, weightedPick, shuffle, hexId } from '../lib/rng.js';
import { cleanChoices, cleanTraps } from '../lib/problem.js';
import { NOUNS, SUBJECTS, ADJECTIVES, ROLES, isPlural } from '../data/words.js';

const WEIGHTS = [
  ['be_adj', 4],
  ['be_role', 3],
  ['article_single', 3]
];

export const SUPPORTED_LEVELS = [1];

const FORMS_BY_PATTERN = {
  be_agreement: ['be_adj', 'be_role'],
  article_an: ['article_single']
};

/**
 * a / an を入れる文のわく。
 *
 * 「持っている」系のわくは使わない。辞書には man / woman / child / city のように
 * 所有できないものが入っており、「私は女の人を持っています」のような
 * おかしな（そして不適切な）文ができてしまうため。
 * 「これは〜です」はどの名詞でも成立する。
 */
const FRAMES = [
  { en: 'This is', ja: 'これは', tail: 'です。' },
  { en: 'That is', ja: 'あれは', tail: 'です。' }
];

/** 主語に対して正しくない be動詞 2つ。 */
function wrongBeForms(correct) {
  return ['am', 'is', 'are'].filter((b) => b !== correct);
}

/**
 * 選んだ形ごとに理由を変える。
 * 「are のところで am を選んだ」と「is を選んだ」では、必要な説明が違うため。
 */
const REASON_BY_BE = {
  am: 'be_am_only_for_i',
  is: 'be_is_for_singular',
  are: 'be_are_for_plural'
};

function beSteps(subject) {
  return [
    `主語は ${subject.text}`,
    `${subject.text} には ${subject.be} を使う`,
    `答えは ${subject.be}`
  ];
}

function beTraps(subject) {
  return wrongBeForms(subject.be).map((value) => ({ value, reason: REASON_BY_BE[value] }));
}

// --- 各形の組み立て -------------------------------------------------------

/** He ___ happy. */
function buildBeAdj(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  const adj = pick(rng, ADJECTIVES);

  return {
    pattern: 'be_agreement',
    form: 'be_adj',
    input: 'choice',
    prompt: `${subject.ja}${adj.ja}。`,
    question: `${subject.text} ___ ${adj.word}.`,
    answer: subject.be,
    choices: shuffle(rng, ['am', 'is', 'are']),
    facts: { key: subject.text, subject: subject.text, be: subject.be, person: subject.person },
    steps: beSteps(subject),
    traps: beTraps(subject)
  };
}

/** He ___ a student. 主語の数に合わせて単数・複数を切り替える。 */
function buildBeRole(rng, avoidKey) {
  const subject = pickWhere(rng, SUBJECTS, (s) => s.text !== avoidKey);
  const role = pick(rng, ROLES);
  const complement = isPlural(subject) ? role.plural : `a ${role.word}`;

  return {
    pattern: 'be_agreement',
    form: 'be_role',
    input: 'choice',
    prompt: `${subject.ja}${role.ja}です。`,
    question: `${subject.text} ___ ${complement}.`,
    answer: subject.be,
    choices: shuffle(rng, ['am', 'is', 'are']),
    facts: { key: subject.text, subject: subject.text, be: subject.be, person: subject.person },
    steps: beSteps(subject),
    traps: beTraps(subject)
  };
}

/** This is ___ apple. */
function buildArticle(rng, avoidKey) {
  const noun = pickWhere(rng, NOUNS, (n) => n.word !== avoidKey);
  const frame = pick(rng, FRAMES);

  const answer = `${noun.article} ${noun.word}`;
  const other = noun.article === 'a' ? 'an' : 'a';
  const isAn = noun.article === 'an';

  const choices = shuffle(rng, [
    answer,
    `${other} ${noun.word}`,
    `${noun.article} ${noun.plural}`
  ]);

  return {
    pattern: 'article_an',
    form: 'article_single',
    input: 'choice',
    prompt: `${frame.ja}${noun.ja}${frame.tail}`,
    question: `${frame.en} ___.`,
    answer,
    choices,
    facts: { key: noun.word, word: noun.word, article: noun.article, plural: noun.plural, isAn },
    steps: [
      isAn
        ? `${noun.word} は母音（a, e, i, o, u）の字で始まる`
        : `${noun.word} は母音以外の字で始まる`,
      isAn ? '母音で始まる語には an' : '母音以外で始まる語には a',
      `答えは ${answer}`
    ],
    traps: [
      { value: `${other} ${noun.word}`, reason: 'article_an' },
      { value: `${noun.article} ${noun.plural}`, reason: 'article_with_plural' }
    ]
  };
}

const BUILDERS = {
  be_adj: buildBeAdj,
  be_role: buildBeRole,
  article_single: buildArticle
};

// --- 公開 API -------------------------------------------------------------

/**
 * 問題を1問作る。
 *
 * @param {number} level
 * @param {Function} rng
 * @param {Array} recent   直近に出した問題（重複回避）
 * @param {object} [opts]  pattern / form / easier / avoidKey
 */
export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`be: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`be: 未知の form ${opts.form}`);
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

/**
 * 選択肢と traps を整え、Problem として仕上げる。
 * easier のときは選択肢を2つに減らす（正解＋いちばん典型的な誤答）。
 */
export function finish(draft, level, rng, opts = {}) {
  // 並べ替えは choices が「並べる単語」なので、選択肢としての整形はしない
  if (draft.input === 'arrange') {
    return {
      id: `l${level}-${draft.pattern}-${hexId(rng)}`,
      level,
      pattern: draft.pattern,
      form: draft.form,
      input: draft.input,
      prompt: draft.prompt,
      question: draft.question,
      answer: draft.answer,
      choices: draft.choices,
      facts: draft.facts,
      steps: draft.steps,
      traps: cleanTraps(draft.traps, draft.answer, draft.choices, 'arrange')
    };
  }

  let choices = cleanChoices(draft.choices, draft.answer);
  let traps = cleanTraps(draft.traps, draft.answer, choices);

  if (opts.easier && choices.length > 2) {
    const keep = traps.length ? traps[0].value : choices.find((c) => c !== draft.answer);
    choices = shuffle(rng, [draft.answer, keep]);
    traps = cleanTraps(draft.traps, draft.answer, choices);
  }

  return {
    id: `l${level}-${draft.pattern}-${hexId(rng)}`,
    level,
    pattern: draft.pattern,
    form: draft.form,
    input: draft.input,
    prompt: draft.prompt,
    question: draft.question,
    answer: draft.answer,
    choices,
    facts: draft.facts,
    steps: draft.steps,
    traps
  };
}

export function patternsFor() {
  return ['be_agreement', 'article_an'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
