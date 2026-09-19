// 中3 Lv5: 関係代名詞（who / which）。
//
// 見分けるのは「前に来るのが人かどうか」だけ。
// 文が自然になるかどうかは名詞と動詞の組み合わせで決まるので、
// ここでは組にして持つ。辞書に動詞だけ足しても自然な文にはならない。
//
// つまずきの中心は
//   1. 人と物で取り違える
//   2. whose を使う（うしろに名詞が要ることを忘れる）
//   3. what を使う（前に名詞があるときは使えない）

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';

/** 人。うしろに「〜する」がそのまま続く動詞と組にしてある。 */
const PEOPLE = [
  { text: 'a friend', ja: '友だち', third: 'plays', obj: 'tennis', jaAct: 'テニスをする' },
  { text: 'a friend', ja: '友だち', third: 'lives', obj: 'in Osaka', jaAct: '大阪に住んでいる' },
  { text: 'a brother', ja: '兄', third: 'studies', obj: 'English', jaAct: '英語を勉強する' },
  { text: 'a sister', ja: '姉', third: 'sings', obj: 'well', jaAct: '歌が上手な' },
  { text: 'a teacher', ja: '先生', third: 'teaches', obj: 'math', jaAct: '数学を教える' },
  { text: 'a friend', ja: '友だち', third: 'runs', obj: 'fast', jaAct: '走るのが速い' }
];

/** 物。「ケンが〜する◯◯」の形になる組にしてある。 */
const THINGS = [
  { text: 'the book', ja: '本', third: 'reads', jaAct: '読む' },
  { text: 'the bag', ja: 'かばん', third: 'uses', jaAct: '使う' },
  { text: 'the car', ja: '車', third: 'likes', jaAct: '好きな' },
  { text: 'the computer', ja: 'コンピュータ', third: 'uses', jaAct: '使う' },
  { text: 'the song', ja: '歌', third: 'sings', jaAct: '歌う' }
];

const OWNERS = [
  { text: 'Ken', ja: 'ケン' },
  { text: 'Yuki', ja: 'ユキ' },
  { text: 'my brother', ja: '私の兄' }
];

const WEIGHTS = [
  ['j3_relative_who', 5],
  ['j3_relative_which', 5]
];

const FORMS_BY_PATTERN = {
  j3_relative: ['j3_relative_who', 'j3_relative_which']
};

export const SUPPORTED_LEVELS = [5];

/** I have a friend ___ plays tennis. */
function buildWho(rng, avoidKey) {
  const person = pickWhere(rng, PEOPLE, (p) => `${p.text} ${p.third}` !== avoidKey);

  return {
    pattern: 'j3_relative',
    form: 'j3_relative_who',
    input: 'choice',
    prompt: `私には${person.jaAct}${person.ja}がいます。`,
    question: `I have ${person.text} ___ ${person.third} ${person.obj}.`,
    answer: 'who',
    choices: shuffle(rng, ['who', 'which', 'whose', 'what']),
    facts: {
      key: `${person.text} ${person.third}`,
      noun: person.text,
      isPerson: true
    },
    steps: [
      `前に来るのは ${person.text}。人を指している`,
      '人を説明するときは who',
      '答えは who'
    ],
    traps: [
      { value: 'which', reason: 'which_for_person' },
      { value: 'whose', reason: 'whose_needs_noun' },
      { value: 'what', reason: 'what_not_relative' }
    ]
  };
}

/** This is the book ___ Ken reads. */
function buildWhich(rng, avoidKey) {
  const thing = pickWhere(rng, THINGS, (t) => `${t.text} ${t.third}` !== avoidKey);
  const owner = pick(rng, OWNERS);

  return {
    pattern: 'j3_relative',
    form: 'j3_relative_which',
    input: 'choice',
    prompt: `これは${owner.ja}が${thing.jaAct}${thing.ja}です。`,
    question: `This is ${thing.text} ___ ${owner.text} ${thing.third}.`,
    answer: 'which',
    choices: shuffle(rng, ['which', 'who', 'whose', 'what']),
    facts: {
      key: `${thing.text} ${thing.third}`,
      noun: thing.text,
      isPerson: false
    },
    steps: [
      `前に来るのは ${thing.text}。人ではない`,
      '人以外を説明するときは which',
      '答えは which'
    ],
    traps: [
      { value: 'who', reason: 'who_for_thing' },
      { value: 'whose', reason: 'whose_needs_noun' },
      { value: 'what', reason: 'what_not_relative' }
    ]
  };
}

const BUILDERS = {
  j3_relative_who: buildWho,
  j3_relative_which: buildWhich
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`j3/relative: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`j3/relative: 未知の form ${opts.form}`);
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
  return ['j3_relative'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
