// 中3 Lv3: 現在完了の形 / Lv4: for・since と、過去形との使い分け。
//
// つまずきの中心は
//   Lv3  have と has の取り違え、過去分詞のかわりに過去形や ing を置く
//   Lv4  for と since の取り違え、「〜前に」があるのに現在完了を使う
//
// 過去分詞が原形と同じ動詞（read, run）は、形を問う問題には使わない。
// 選択肢に同じ語が2つ並んでしまうため。

import { pick, pickWhere, weightedPick, shuffle } from '../../lib/rng.js';
import { finish } from '../be.js';
import {
  VERBS, SUBJECTS, DURATIONS, participleVerbs
} from '../../data/words.js';

const LEVEL_CONFIG = {
  3: { weights: [['j3_perfect_have', 5], ['j3_perfect_pp', 5]] },
  4: { weights: [['j3_for_since', 5], ['j3_past_marker', 5]] }
};

const FORMS_BY_PATTERN = {
  j3_perfect: ['j3_perfect_have', 'j3_perfect_pp'],
  j3_time: ['j3_for_since', 'j3_past_marker']
};

export const SUPPORTED_LEVELS = [3, 4];

/** 目的語を取る動詞だけ（「ちょうど〜したところ」の文にする）。 */
function actionVerbs() {
  return VERBS.filter((v) => !v.stative && /を$/.test(v.objJa));
}

/** have / has を取り違えたときの形が分かるよう、人称のはっきりした主語だけ使う。 */
function clearSubjects() {
  return SUBJECTS.filter((s) => s.person === 'third_sg' || s.person === 'plural' || s.text === 'I');
}

function haveFor(subject) {
  return subject.person === 'third_sg' ? 'has' : 'have';
}

/** 「作ります」→「作りました」。「ちょうど〜ました」の文にする。 */
function jaPast(verb) {
  return verb.ja.replace(/ます$/, 'ました');
}

/** 形を問う問題に使える動詞（目的語を「〜を」で言えるものだけ）。 */
function participlePool() {
  return participleVerbs().filter((v) => !v.stative && /を$/.test(v.objJa));
}

/**
 * 過去分詞の問題の外れをそろえる。
 * made / made のように過去形と過去分詞が同じ動詞では、過去形を外れに使えない
 * （選択肢に同じ語が2つ並ぶ）。そのときは三単現の形を外れにする。
 */
function participleTraps(verb) {
  const sameAsPast = verb.past === verb.pp;
  return [
    sameAsPast
      ? { value: verb.third, reason: 'third_for_pp' }
      : { value: verb.past, reason: 'past_for_pp' },
    { value: verb.base, reason: 'base_for_pp' },
    { value: verb.ing, reason: 'ing_for_pp' }
  ];
}

/** Ken ___ just made lunch. */
function buildPerfectHave(rng, avoidKey) {
  const verb = pickWhere(rng, actionVerbs(), (v) => v.base !== avoidKey);
  const subject = pick(rng, clearSubjects());
  const answer = haveFor(subject);
  const other = answer === 'has' ? 'have' : 'has';

  return {
    pattern: 'j3_perfect',
    form: 'j3_perfect_have',
    input: 'choice',
    prompt: `${subject.ja}ちょうど${verb.objJa}${jaPast(verb)}。`,
    question: `${subject.text} ___ just ${verb.pp} ${verb.obj}.`,
    answer,
    choices: shuffle(rng, [answer, other, 'is', 'did']),
    facts: {
      key: verb.base,
      subject: subject.text,
      have: answer,
      other,
      pp: verb.pp,
      base: verb.base
    },
    steps: [
      '「ちょうど〜したところ」は have / has + 過去分詞',
      `${subject.text} には ${answer} を使う`,
      `答えは ${answer}`
    ],
    traps: [
      { value: other, reason: 'have_has' },
      { value: 'is', reason: 'be_not_have' },
      { value: 'did', reason: 'did_not_have' }
    ]
  };
}

/** Ken has just ___ lunch. 過去分詞の形をえらぶ。 */
function buildPerfectPp(rng, avoidKey) {
  const verb = pickWhere(rng, participlePool(), (v) => v.base !== avoidKey);
  const subject = pick(rng, clearSubjects());
  const have = haveFor(subject);
  const traps = participleTraps(verb);

  return {
    pattern: 'j3_perfect',
    form: 'j3_perfect_pp',
    input: 'choice',
    prompt: `${subject.ja}ちょうど${verb.objJa}${jaPast(verb)}。`,
    question: `${subject.text} ${have} just ___ ${verb.obj}.`,
    answer: verb.pp,
    choices: shuffle(rng, [verb.pp, ...traps.map((t) => t.value)]),
    facts: {
      key: verb.base,
      base: verb.base,
      past: verb.past,
      third: verb.third,
      pp: verb.pp,
      have
    },
    steps: [
      `${have} のあとは過去分詞`,
      `${verb.base} の過去分詞は ${verb.pp}`,
      `答えは ${verb.pp}`
    ],
    traps
  };
}

/** I have studied English ___ three years. */
function buildForSince(rng, avoidKey) {
  const verb = pickWhere(rng, actionVerbs(), (v) => v.base !== avoidKey);
  const subject = pick(rng, clearSubjects());
  const have = haveFor(subject);
  const duration = pick(rng, DURATIONS);

  const answer = duration.kind;
  const other = answer === 'for' ? 'since' : 'for';

  return {
    pattern: 'j3_time',
    form: 'j3_for_since',
    input: 'choice',
    prompt: `${subject.ja}${duration.ja}${verb.objJa}${verb.jaIng}。`,
    question: `${subject.text} ${have} ${verb.pp} ${verb.obj} ___ ${duration.text}.`,
    answer,
    choices: shuffle(rng, [answer, other, 'from']),
    facts: {
      key: duration.text,
      duration: duration.text,
      kind: duration.kind,
      other,
      durationJa: duration.ja
    },
    steps: [
      '現在完了では、そのあとに for か since を置く',
      answer === 'for'
        ? `${duration.text} は「どれくらい続いたか」なので for`
        : `${duration.text} は「いつから始まったか」なので since`,
      `答えは ${answer}`
    ],
    traps: [
      { value: other, reason: 'for_since' },
      { value: 'from', reason: 'from_not_used' }
    ]
  };
}

/** Ken ___ lunch an hour ago. 「〜前に」があるので過去形。 */
function buildPastMarker(rng, avoidKey) {
  const verb = pickWhere(rng, participlePool(), (v) => v.base !== avoidKey);
  const subject = pick(rng, clearSubjects());
  const have = haveFor(subject);

  return {
    pattern: 'j3_time',
    form: 'j3_past_marker',
    input: 'choice',
    prompt: `${subject.ja}1時間前に${verb.objJa}${jaPast(verb)}。`,
    question: `${subject.text} ___ ${verb.obj} an hour ago.`,
    answer: verb.past,
    choices: shuffle(rng, [verb.past, `${have} ${verb.pp}`, verb.base, verb.ing]),
    facts: {
      key: verb.base,
      base: verb.base,
      past: verb.past,
      pp: verb.pp,
      have
    },
    steps: [
      'an hour ago は「いつのことか」をはっきり指す言い方',
      'いつのことか決まっている文には、現在完了ではなく過去形を使う',
      `答えは ${verb.past}`
    ],
    traps: [
      { value: `${have} ${verb.pp}`, reason: 'perfect_with_ago' },
      { value: verb.base, reason: 'base_for_past' },
      { value: verb.ing, reason: 'ing_for_past' }
    ]
  };
}

const BUILDERS = {
  j3_perfect_have: buildPerfectHave,
  j3_perfect_pp: buildPerfectPp,
  j3_for_since: buildForSince,
  j3_past_marker: buildPastMarker
};

// --- 公開 API -------------------------------------------------------------

export function generate(level, rng, recent = [], opts = {}) {
  const cfg = LEVEL_CONFIG[level] || LEVEL_CONFIG[3];

  if (opts.pattern && !FORMS_BY_PATTERN[opts.pattern]) {
    throw new Error(`j3/perfect: 未知の pattern ${opts.pattern}`);
  }
  if (opts.form && !BUILDERS[opts.form]) {
    throw new Error(`j3/perfect: 未知の form ${opts.form}`);
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
  return level === 4 ? ['j3_time'] : ['j3_perfect'];
}

export function formsFor(pattern) {
  return FORMS_BY_PATTERN[pattern] ? FORMS_BY_PATTERN[pattern].slice() : [];
}
