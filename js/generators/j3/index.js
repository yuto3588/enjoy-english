// 中3 のレベル → ジェネレータの振り分け。
//
//   Lv1  比較級・最上級（taller / more difficult）
//   Lv2  受動態（is read by Ken）
//   Lv3  現在完了の形（has just made / 過去分詞）
//   Lv4  for と since、過去形との使い分け
//   Lv5  関係代名詞（who / which）
//
// 中1の続きとして作ってある。三単現・進行形・疑問文は中1で済んでいる前提。

import * as compare from './compare.js';
import * as passive from './passive.js';
import * as perfect from './perfect.js';
import * as relative from './relative.js';

const BY_LEVEL = {
  1: compare,
  2: passive,
  3: perfect,
  4: perfect,
  5: relative
};

const BY_PATTERN = {
  j3_compare: compare,
  j3_passive: passive,
  j3_perfect: perfect,
  j3_time: perfect,
  j3_relative: relative
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
