// レベル → ジェネレータの振り分け。
//
// pattern を明示されたときは、その pattern を持つジェネレータに回す。
// 誤答フローの類題・易問はレベルではなく pattern で決まるため。
// Lv3-5 は Phase 6 で追加する。

import * as be from './be.js';
import * as verbs from './verbs.js';
import * as third from './third.js';
import * as questions from './questions.js';
import * as progressive from './progressive.js';

const BY_LEVEL = {
  1: be,
  2: verbs,
  3: third,
  4: questions,
  5: progressive
};

const BY_PATTERN = {
  be_agreement: be,
  article_an: be,
  third_person_s: verbs,
  plural_spelling: verbs,
  third_person_spelling: third,
  verb_after_does: questions,
  do_does: questions,
  be_vs_do: questions,
  ing_spelling: progressive,
  pronoun_case: progressive,
  // 語順は Lv2（原形）と Lv5（be + ing）の両方にある。
  // pattern だけで振り分けられないので、レベルで分ける。
  word_order: verbs
};

/** 現時点で出題できるレベル。 */
export const SUPPORTED_LEVELS = Object.keys(BY_LEVEL).map(Number);

/**
 * 問題を1問作る。
 *
 * @param {number} level
 * @param {Function} rng
 * @param {Array} recent  直近に出した問題（重複回避に使う）
 * @param {object} [opts] pattern / form / easier
 */
export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern) {
    // 同じ pattern を複数のレベルが持つ場合（語順）は、レベル側を優先する
    const byLevel = BY_LEVEL[level];
    const gen = (byLevel && byLevel.patternsFor(level).includes(opts.pattern))
      ? byLevel
      : BY_PATTERN[opts.pattern];
    if (!gen) throw new Error(`未知の pattern: ${opts.pattern}`);
    return gen.generate(level, rng, recent, opts);
  }

  const gen = BY_LEVEL[level];
  if (!gen) throw new Error(`レベル ${level} のジェネレータは未実装`);
  return gen.generate(level, rng, recent, opts);
}

/** そのレベルでランダム出題に使う pattern の一覧。 */
export function patternsFor(level) {
  const gen = BY_LEVEL[level];
  return gen ? gen.patternsFor(level) : [];
}

/** その pattern が取りうる form の一覧。レベルを渡すとそのレベルのものに絞る。 */
export function formsFor(pattern, level) {
  const byLevel = BY_LEVEL[level];
  if (byLevel && byLevel.patternsFor(level).includes(pattern)) {
    return byLevel.formsFor(pattern);
  }
  const gen = BY_PATTERN[pattern];
  return gen ? gen.formsFor(pattern) : [];
}

/** すべての pattern の一覧（テスト用）。 */
export function allPatterns() {
  return Object.keys(BY_PATTERN);
}
