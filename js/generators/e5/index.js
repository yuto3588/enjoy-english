// 小5 のレベル → ジェネレータの振り分け。
//
//   Lv1  am / is / are（主語は I / You / He / She の4つ）
//   Lv2  am / is / are（We / They も）と a / an
//   Lv3  一般動詞の文（I play tennis.）
//   Lv4  複数形のつづり（one box → two boxes）
//   Lv5  語順の並べ替え（3〜4語）
//
// 中1の内容をやさしくしたもの。三単現・疑問文・進行形は扱わない。
// 中1に上がったときに、同じ形の問題がそのまま続きになる。

import * as basic from './basic.js';
import * as verb from './verb.js';
import * as plural from './plural.js';

const BY_LEVEL = {
  1: basic,
  2: basic,
  3: verb,
  4: plural,
  5: verb
};

const BY_PATTERN = {
  e5_be: basic,
  e5_article: basic,
  e5_verb: verb,
  e5_plural: plural,
  e5_order: verb
};

export const SUPPORTED_LEVELS = Object.keys(BY_LEVEL).map(Number);

export function generate(level, rng, recent = [], opts = {}) {
  if (opts.pattern) {
    const gen = BY_PATTERN[opts.pattern];
    if (!gen) throw new Error(`未知の pattern: ${opts.pattern}`);
    return gen.generate(level, rng, recent, opts);
  }

  const gen = BY_LEVEL[level];
  if (!gen) throw new Error(`レベル ${level} のジェネレータは未実装`);
  return gen.generate(level, rng, recent, opts);
}

export function patternsFor(level) {
  const gen = BY_LEVEL[level];
  return gen ? gen.patternsFor(level) : [];
}

export function formsFor(pattern) {
  const gen = BY_PATTERN[pattern];
  return gen ? gen.formsFor(pattern) : [];
}

export function allPatterns() {
  return Object.keys(BY_PATTERN);
}
