// 小5 Lv4: 複数形のつづり。
//
// 「one box → two ___」の形で出す。
// 「I have many ___.」のような文にすると、辞書にある man / woman / child で
// 「私は女の人をたくさん持っています」というおかしな文ができてしまう。
// 書きかえの形なら、どの名詞でも必ず成立する。
//
// 外れの選択肢は2つ。
//   1. 素直に s を付けただけの形（boxs, citys）
//   2. 単数のまま（box）
// どちらを選んでも、それぞれ別の解説が出る。

import { pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import { easyNouns } from '../../data/words.js';

const LEVEL_CONFIG = {
  4: {
    weights: [
      ['e5_plural_s', 3],
      ['e5_plural_es', 3],
      ['e5_plural_ies', 3],
      ['e5_plural_ves', 1],
      ['e5_plural_irregular', 2]
    ]
  }
};

const FORMS_BY_PATTERN = {
  e5_plural: ['e5_plural_s', 'e5_plural_es', 'e5_plural_ies', 'e5_plural_ves', 'e5_plural_irregular']
};

export const SUPPORTED_LEVELS = [4];

/** form の名前 → 辞書のグループ名。 */
const GROUP_BY_FORM = {
  e5_plural_s: 'regular',
  e5_plural_es: 'es',
  e5_plural_ies: 'ies',
  e5_plural_ves: 'ves',
  e5_plural_irregular: 'irregular'
};

/** つづりの決まり。文法用語を使わず、見たままの形で書く。 */
const RULE = {
  regular: 'ふつうは s を付ける',
  es: 's, x, ch, sh, o で終わる語は es を付ける',
  ies: 'y の前が a, i, u, e, o でないときは、y を i に変えて es',
  ves: 'f, fe で終わる語は ves にする',
  irregular: 'この語は形そのものが変わる'
};

/** 素直に s を付けただけの形。regular だけは逆に es を付けた形にする。 */
function naiveForm(noun, group) {
  return group === 'regular' ? `${noun.word}es` : `${noun.word}s`;
}

function buildPlural(rng, group, avoidKey) {
  const noun = pickWhere(
    rng,
    easyNouns().filter((n) => n.group === group),
    (n) => n.word !== avoidKey
  );

  const naive = naiveForm(noun, group);

  return {
    pattern: 'e5_plural',
    form: `e5_plural_${group === 'regular' ? 's' : group}`,
    input: 'choice',
    // 「家族が2つ」「子どもが2つ」のような数え方にならないよう、
    // ものの数ではなく語の形の話だと分かる言い方にする。
    prompt: `「${noun.ja}」を2つ以上の形にする。`,
    question: `one ${noun.word} → two ___`,
    answer: noun.plural,
    choices: shuffle(rng, [noun.plural, naive, noun.word]),
    facts: {
      key: noun.word,
      word: noun.word,
      plural: noun.plural,
      group,
      rule: RULE[group],
      naive
    },
    steps: [
      RULE[group],
      `${noun.word} → ${noun.plural}`,
      `答えは ${noun.plural}`
    ],
    traps: [
      { value: naive, reason: 'spelling_rule' },
      { value: noun.word, reason: 'still_one' }
    ]
  };
}

const BUILDERS = {
  e5_plural_s: (rng, avoidKey) => buildPlural(rng, 'regular', avoidKey),
  e5_plural_es: (rng, avoidKey) => buildPlural(rng, 'es', avoidKey),
  e5_plural_ies: (rng, avoidKey) => buildPlural(rng, 'ies', avoidKey),
  e5_plural_ves: (rng, avoidKey) => buildPlural(rng, 'ves', avoidKey),
  e5_plural_irregular: (rng, avoidKey) => buildPlural(rng, 'irregular', avoidKey)
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[4];

  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`e5/plural: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`e5/plural: 未知の form ${opts.form}`);
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

export function patternsFor() {
  return ['e5_plural'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
