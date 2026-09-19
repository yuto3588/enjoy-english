// 学年 → 問題ジェネレータ一式の振り分け。
//
// 学年ごとに扱う文法がまったく違うので、レベル 1-5 の中身も学年ごとに別物になる。
//   小5  中1の内容をやさしくしたもの（語彙と文の長さを抑える）
//   中1  be動詞 / 一般動詞 / 三単現 / 疑問文 / 進行形
//   中3  現在完了 / 受動態 / 比較 / 関係代名詞
//
// ここに載っていない学年は「じゅんび中」として、選べるが始められない状態で出す。
// 選択肢だけ先に見せておくと、あとから足したときに置き場所が変わらない。

import * as j1 from './generators/index.js';
import * as e5 from './generators/e5/index.js';
import * as j3 from './generators/j3/index.js';

const COURSES = {
  e5,
  j1,
  j3
};

/** その学年の問題を作る一式。まだ無ければ null。 */
export function courseFor(grade) {
  return COURSES[grade] || null;
}

/** その学年の問題がもう作れるか。 */
export function isCourseReady(grade) {
  return Boolean(COURSES[grade]);
}

/** 問題を作れる学年の一覧（テスト用）。 */
export function readyGrades() {
  return Object.keys(COURSES);
}
