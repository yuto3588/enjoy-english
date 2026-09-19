// 誤答フローの状態機械。Enjoy数学 から移植（教科に依存しない部分）。
//
// DESIGN.md 7章:
//   誤答 → [STEP1] 解説 → [STEP2] 類題 → [STEP3] 易しい問題 → 明日に持ち越し
//
// 守っている性質:
//   - 遷移は一方向のみ。前の STEP に戻る辺が存在しない
//   - どの入力を与えても、有限回で必ず NORMAL に戻る
//   - 1つのつまずきに対して追加で出す問題は 2 問まで（元の問題を含めて 3 問）
//
// while / 再帰で「正解するまで」を表現する構造は、このファイルにも他にも無い。

export const STEP = {
  NORMAL: 'normal',           // 通常の出題
  EXPLAIN: 'explain',         // STEP1: 解説を表示している
  RETRY: 'retry',             // STEP2: 同じ形の類題を出している
  EASIER: 'easier',           // STEP3: より易しい同種問題を出している
  CARRY_OVER: 'carryOver',    // 「ここは明日もう一回やろう」を表示している

  // 「わからない」を押したとき、および持ち越し問題を誤答したとき。
  // 解説を1画面出すだけで通常フローに戻る。
  // 分からない状態で同じ形を続けて出されるのは、逃げ道を塞ぐことになるため。
  EXPLAIN_ONLY: 'explainOnly'
};

/** 1つのつまずきに対して追加で出題される問題数の上限。 */
export const MAX_EXTRA_PROBLEMS = 2;

/**
 * 次の状態を返す。
 *
 * @param {string} step     いまの状態
 * @param {boolean} correct 直前の解答が正解だったか（EXPLAIN 系では無視される）
 */
export function nextStep(step, correct) {
  switch (step) {
    case STEP.NORMAL:
      return correct ? STEP.NORMAL : STEP.EXPLAIN;

    case STEP.EXPLAIN:
      // 「わかった」を押す以外の出口を作らない。必ず類題へ進む。
      return STEP.RETRY;

    case STEP.RETRY:
      return correct ? STEP.NORMAL : STEP.EASIER;

    case STEP.EASIER:
      // ここで正解できなくても、それ以上は出さずに持ち越す。
      return correct ? STEP.NORMAL : STEP.CARRY_OVER;

    case STEP.CARRY_OVER:
      return STEP.NORMAL;

    case STEP.EXPLAIN_ONLY:
      return STEP.NORMAL;

    default:
      return STEP.NORMAL;
  }
}

/** その状態が「問題を出す」状態か。 */
export function isProblemStep(step) {
  return step === STEP.NORMAL || step === STEP.RETRY || step === STEP.EASIER;
}

/**
 * STEP2 の類題の出題条件。
 * つまずいた問題と同じレベル・同じ pattern・同じ形にする。
 * ただし**別の単語**で出す（答えを覚えただけかどうかを分けるため）。
 */
export function retrySpec(origin) {
  return {
    level: origin.level,
    pattern: origin.pattern,
    form: origin.form,
    avoidKey: origin.facts && origin.facts.key
  };
}

/**
 * STEP3 の易しい問題の出題条件。
 * pattern と形は変えず、選択肢を2つに減らす。
 */
export function easierSpec(origin) {
  return {
    level: origin.level,
    pattern: origin.pattern,
    form: origin.form,
    avoidKey: origin.facts && origin.facts.key,
    easier: true
  };
}
