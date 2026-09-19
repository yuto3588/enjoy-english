// 小5 Lv1-2: am / is / are と a / an。
//
// 中1の be.js と同じ内容を、小5向けにやさしくしたもの。
//   - 使う語を減らす（easySubjects / easyNouns）
//   - Lv1 は主語を I / You / He / She の4つに絞る
//   - 解説に文法用語を使わない
//     中1版は「主語は He」「母音の字」と書くが、
//     ここでは「He のときは is」「a, e, i, o, u で始まる語」と書く
//
// pattern の名前は中1と別にしてある（e5_ を付ける）。
// 解説は pattern:reason で引くので、同じ名前にすると中1の文面が出てしまう。

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import { easyNouns, easySubjects, ADJECTIVES, ROLES, isPlural } from '../../data/words.js';

// Lv1 は4つだけ。複数（We / They）は Lv2 から出す。
const LV1_SUBJECTS = ['I', 'You', 'He', 'She'];

const LEVEL_CONFIG = {
  1: {
    lv1Only: true,
    weights: [['e5_be_adj', 5], ['e5_be_role', 5]]
  },
  2: {
    lv1Only: false,
    weights: [['e5_be_adj', 3], ['e5_be_role', 3], ['e5_article_single', 4]]
  }
};

const FORMS_BY_PATTERN = {
  e5_be: ['e5_be_adj', 'e5_be_role'],
  e5_article: ['e5_article_single']
};

export const SUPPORTED_LEVELS = [1, 2];

/** これは / あれは。どの名詞でも成立する言い方だけを使う。 */
const FRAMES = [
  { en: 'This is', ja: 'これは', tail: 'です。' },
  { en: 'That is', ja: 'あれは', tail: 'です。' }
];

const REASON_BY_BE = {
  am: 'am_only_for_i',
  is: 'is_for_one',
  are: 'are_for_many'
};

function subjectPool(cfg) {
  const all = easySubjects();
  return cfg.lv1Only ? all.filter((s) => LV1_SUBJECTS.includes(s.text)) : all;
}

function beSteps(subject) {
  return [
    'am / is / are は、前に来る語で決まる',
    `${subject.text} のときは ${subject.be}`,
    `答えは ${subject.be}`
  ];
}

function beTraps(subject) {
  return ['am', 'is', 'are']
    .filter((b) => b !== subject.be)
    .map((value) => ({ value, reason: REASON_BY_BE[value] }));
}

// --- 各形の組み立て -------------------------------------------------------

/** He ___ happy. */
function buildBeAdj(rng, avoidKey, cfg) {
  const subject = pickWhere(rng, subjectPool(cfg), (s) => s.text !== avoidKey);
  const adj = pick(rng, ADJECTIVES);

  return {
    pattern: 'e5_be',
    form: 'e5_be_adj',
    input: 'choice',
    prompt: `${subject.ja}${adj.ja}。`,
    question: `${subject.text} ___ ${adj.word}.`,
    answer: subject.be,
    choices: shuffle(rng, ['am', 'is', 'are']),
    facts: { key: subject.text, subject: subject.text, be: subject.be, subjectJa: subject.ja },
    steps: beSteps(subject),
    traps: beTraps(subject)
  };
}

/** I ___ a student. 主語が複数なら students にする。 */
function buildBeRole(rng, avoidKey, cfg) {
  const subject = pickWhere(rng, subjectPool(cfg), (s) => s.text !== avoidKey);
  const role = pick(rng, ROLES);
  const complement = isPlural(subject) ? role.plural : `a ${role.word}`;

  return {
    pattern: 'e5_be',
    form: 'e5_be_role',
    input: 'choice',
    prompt: `${subject.ja}${role.ja}です。`,
    question: `${subject.text} ___ ${complement}.`,
    answer: subject.be,
    choices: shuffle(rng, ['am', 'is', 'are']),
    facts: { key: subject.text, subject: subject.text, be: subject.be, subjectJa: subject.ja },
    steps: beSteps(subject),
    traps: beTraps(subject)
  };
}

/** This is ___ apple. */
function buildArticle(rng, avoidKey) {
  const noun = pickWhere(rng, easyNouns(), (n) => n.word !== avoidKey);
  const frame = pick(rng, FRAMES);

  const answer = `${noun.article} ${noun.word}`;
  const other = noun.article === 'a' ? 'an' : 'a';
  const isAn = noun.article === 'an';

  return {
    pattern: 'e5_article',
    form: 'e5_article_single',
    input: 'choice',
    prompt: `${frame.ja}${noun.ja}${frame.tail}`,
    question: `${frame.en} ___.`,
    answer,
    choices: shuffle(rng, [
      answer,
      `${other} ${noun.word}`,
      `${noun.article} ${noun.plural}`
    ]),
    facts: { key: noun.word, word: noun.word, article: noun.article, plural: noun.plural, isAn },
    steps: [
      isAn
        ? `${noun.word} は a, e, i, o, u で始まる`
        : `${noun.word} は a, e, i, o, u 以外で始まる`,
      isAn ? 'そういう語の前には an' : 'そういう語の前には a',
      `答えは ${answer}`
    ],
    traps: [
      { value: `${other} ${noun.word}`, reason: 'wrong_article' },
      { value: `${noun.article} ${noun.plural}`, reason: 'one_thing_only' }
    ]
  };
}

const BUILDERS = {
  e5_be_adj: buildBeAdj,
  e5_be_role: buildBeRole,
  e5_article_single: buildArticle
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[1];

  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`e5/basic: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`e5/basic: 未知の form ${opts.form}`);
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
    draft = BUILDERS[weightedPick(rng, allowed)](rng, opts.avoidKey, cfg);
    if (!recentQuestions.includes(draft.question)) break;
  }

  return finish(draft, level, rng, opts);
}

export function patternsFor(level) {
  return level === 1 ? ['e5_be'] : ['e5_be', 'e5_article'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
