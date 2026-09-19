// 中3 Lv2: 受動態（be動詞 + 過去分詞）。
//
// 「テニスはケンによってされます」のような日本語ができないよう、
// 「〜されます」と言える動詞（jaPassive を持つもの）だけを使う。
//
// つまずきの中心は
//   1. 能動態のまま答える（A letter writes by Ken.）
//   2. ing を使う（is writing）
//   3. be動詞 が主語と合わない（Books is read.）
// なので、traps はこの3つから作る。

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import { midSentence } from '../../lib/problem.js';
import { passiveVerbs, SUBJECTS } from '../../data/words.js';

const WEIGHTS = [['j3_passive_be', 1]];

const FORMS_BY_PATTERN = {
  j3_passive: ['j3_passive_be']
};

export const SUPPORTED_LEVELS = [2];

/**
 * 「〜によって」に置く人。
 *
 * He / She は使わない。by のあとは by him / by her になるので、
 * 主語の形のまま置くと誤った英語になる。名前と「私の兄」だけにする。
 */
function actors() {
  return SUBJECTS.filter((s) => s.person === 'third_sg' && !['He', 'She'].includes(s.text));
}

/** 目的語を主語の位置に置く（先頭を大文字にする）。 */
function asSubject(obj) {
  return obj.charAt(0).toUpperCase() + obj.slice(1);
}

function buildPassive(rng, avoidKey) {
  const verb = pickWhere(rng, passiveVerbs(), (v) => v.base !== avoidKey);
  const actor = pick(rng, actors());

  const subject = asSubject(verb.obj);
  const be = verb.objPlural ? 'are' : 'is';
  const wrongBe = verb.objPlural ? 'is' : 'are';

  const answer = `${be} ${verb.pp}`;

  return {
    pattern: 'j3_passive',
    form: 'j3_passive_be',
    input: 'choice',
    prompt: `${verb.objJa.replace(/を$/, 'は')}${actor.ja.replace(/は$/, 'によって')}${verb.jaPassive}。`,
    question: `${subject} ___ by ${midSentence(actor.text)}.`,
    answer,
    choices: shuffle(rng, [
      answer,
      `${be} ${verb.ing}`,
      verb.third,
      `${wrongBe} ${verb.pp}`
    ]),
    facts: {
      key: verb.base,
      base: verb.base,
      pp: verb.pp,
      be,
      wrongBe,
      subject,
      plural: Boolean(verb.objPlural),
      jaPassive: verb.jaPassive
    },
    steps: [
      `「${verb.jaPassive}」は「される」の形`,
      `be動詞 + 過去分詞にする。${verb.base} の過去分詞は ${verb.pp}`,
      `答えは ${answer}`
    ],
    traps: [
      { value: `${be} ${verb.ing}`, reason: 'ing_used' },
      { value: verb.third, reason: 'active_used' },
      { value: `${wrongBe} ${verb.pp}`, reason: 'be_number' }
    ]
  };
}

const BUILDERS = { j3_passive_be: buildPassive };

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`j3/passive: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`j3/passive: 未知の form ${opts.form}`);
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
  return ['j3_passive'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
