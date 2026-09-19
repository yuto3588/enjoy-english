// 誤答フローの単体テスト。
//
// このアプリで最も壊してはいけない性質:
//   「1つのつまずきに対する連続出題は最大3問。正解するまで続く構造を作らない」
// を、遷移表の全探索で確認する。

import { test, assert, assertEqual, assertDeepEqual } from './runner.js';
import { STEP, nextStep, isProblemStep, retrySpec, easierSpec, MAX_EXTRA_PROBLEMS } from '../js/recovery.js';
import { createRng } from '../js/lib/rng.js';
import { generate, patternsFor, formsFor, SUPPORTED_LEVELS } from '../js/generators/index.js';

const ALL_STEPS = Object.values(STEP);

// --- 必ず終わること --------------------------------------------------------

test('誤答フロー: 全問誤答でも必ず NORMAL に戻る', () => {
  for (const start of ALL_STEPS) {
    let step = start;
    let guard = 0;
    while (step !== STEP.NORMAL) {
      step = nextStep(step, false);
      guard += 1;
      assert(guard <= 10, `${start} から抜けられない（${guard}回遷移）`);
    }
  }
});

test('誤答フロー: 全問正解でも必ず NORMAL に戻る', () => {
  for (const start of ALL_STEPS) {
    let step = start;
    let guard = 0;
    while (step !== STEP.NORMAL) {
      step = nextStep(step, true);
      guard += 1;
      assert(guard <= 10, `${start} から抜けられない（${guard}回遷移）`);
    }
  }
});

test('誤答フロー: 1つのつまずきで追加出題は2問まで（元の問題を含めて3問）', () => {
  let step = STEP.NORMAL;
  let problemsShown = 1;
  let guard = 0;

  step = nextStep(step, false); // 誤答 → EXPLAIN

  while (step !== STEP.NORMAL) {
    step = nextStep(step, false);
    if (isProblemStep(step) && step !== STEP.NORMAL) problemsShown += 1;
    guard += 1;
    assert(guard <= 10, 'フローが終わらない');
  }

  assertEqual(problemsShown, 1 + MAX_EXTRA_PROBLEMS, '出題数が3問を超えている');
});

test('誤答フロー: 経路が仕様どおりの順番になっている', () => {
  const path = [STEP.NORMAL];
  let step = STEP.NORMAL;
  for (let i = 0; i < 5; i++) {
    step = nextStep(step, false);
    path.push(step);
    if (step === STEP.NORMAL) break;
  }
  assertDeepEqual(
    path,
    [STEP.NORMAL, STEP.EXPLAIN, STEP.RETRY, STEP.EASIER, STEP.CARRY_OVER, STEP.NORMAL],
    '解説 → 類題 → 易問 → 持ち越し の順になっていない'
  );
});

test('誤答フロー: 前の STEP に戻る遷移が存在しない', () => {
  const order = {
    [STEP.NORMAL]: 0,
    [STEP.EXPLAIN]: 1,
    [STEP.RETRY]: 2,
    [STEP.EASIER]: 3,
    [STEP.CARRY_OVER]: 4,
    [STEP.EXPLAIN_ONLY]: 1
  };

  for (const step of ALL_STEPS) {
    for (const correct of [true, false]) {
      const to = nextStep(step, correct);
      assert(
        to === STEP.NORMAL || order[to] > order[step],
        `${step} → ${to} が後戻りしている（correct=${correct}）`
      );
    }
  }
});

test('誤答フロー: 解説からは必ず類題へ進む（正誤に関係なく）', () => {
  assertEqual(nextStep(STEP.EXPLAIN, true), STEP.RETRY);
  assertEqual(nextStep(STEP.EXPLAIN, false), STEP.RETRY);
});

test('誤答フロー: 「わからない」と持ち越しの解説からは、必ず通常フローへ', () => {
  for (const correct of [true, false]) {
    assertEqual(nextStep(STEP.EXPLAIN_ONLY, correct), STEP.NORMAL);
    assertEqual(nextStep(STEP.CARRY_OVER, correct), STEP.NORMAL);
  }
});

test('誤答フロー: 類題・易問に正解したら通常フローへ戻る', () => {
  assertEqual(nextStep(STEP.RETRY, true), STEP.NORMAL);
  assertEqual(nextStep(STEP.EASIER, true), STEP.NORMAL);
});

test('誤答フロー: 未知の状態を渡しても NORMAL を返す（起動不能にしない）', () => {
  assertEqual(nextStep('こわれた値', false), STEP.NORMAL);
  assertEqual(nextStep(undefined, true), STEP.NORMAL);
});

// --- 類題・易問の条件 ------------------------------------------------------

test('類題: レベル・pattern・形が元の問題と同じで、単語だけ変える', () => {
  const origin = { level: 2, pattern: 'plural_spelling', form: 'plural_ies', facts: { key: 'city' } };
  const spec = retrySpec(origin);
  assertEqual(spec.level, 2);
  assertEqual(spec.pattern, 'plural_spelling');
  assertEqual(spec.form, 'plural_ies');
  assertEqual(spec.avoidKey, 'city', '同じ単語を避ける指定が入っていない');
});

test('易問: 形は変えず、選択肢を減らす指定になる', () => {
  const spec = easierSpec({ level: 1, pattern: 'article_an', form: 'article_single', facts: { key: 'apple' } });
  assertEqual(spec.pattern, 'article_an');
  assertEqual(spec.form, 'article_single');
  assertEqual(spec.easier, true);
  assertEqual(spec.avoidKey, 'apple');
});

// --- 実際に生成してみる ----------------------------------------------------

test('類題: 実際に生成すると pattern と形が一致し、単語が変わる', () => {
  const rng = createRng(555);
  for (const level of SUPPORTED_LEVELS) {
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        const origin = generate(level, rng, [], { pattern, form });
        const spec = retrySpec(origin);

        for (let i = 0; i < 30; i++) {
          const p = generate(spec.level, rng, [], spec);
          assertEqual(p.pattern, pattern, '類題の pattern が違う');
          assertEqual(p.form, form, '類題の形が違う');
          assertEqual(p.level, level, '類題のレベルが違う');
          assert(
            p.facts.key !== origin.facts.key,
            `同じ単語で類題が出ている: ${p.facts.key}`
          );
        }
      }
    }
  }
});

test('易問: 選択式なら2択になり、pattern と形は保たれる', () => {
  const rng = createRng(999);
  for (const level of SUPPORTED_LEVELS) {
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        const origin = generate(level, rng, [], { pattern, form });
        const spec = easierSpec(origin);

        for (let i = 0; i < 30; i++) {
          const p = generate(spec.level, rng, [], spec);
          assertEqual(p.pattern, pattern, '易問の pattern が違う');
          assertEqual(p.form, form, '易問の形が違う');
          if (p.input !== 'choice') continue; // 並べ替えは選択肢を減らす対象ではない
          assertEqual(p.choices.length, 2, `2択になっていない: ${p.choices.join(' / ')}`);
          assert(p.choices.includes(p.answer), '正解が残っていない');
        }
      }
    }
  }
});

test('フローを最後まで走らせても、出題は3問で止まる', () => {
  // 実際にジェネレータを動かして、1つのつまずきで何問出るかを数える
  const rng = createRng(20260919);
  let step = STEP.NORMAL;
  let origin = generate(1, rng, []);
  let shown = 1;
  let guard = 0;

  step = nextStep(step, false); // 誤答

  while (step !== STEP.NORMAL) {
    if (step === STEP.RETRY) { generate(1, rng, [], retrySpec(origin)); shown += 1; }
    if (step === STEP.EASIER) { generate(1, rng, [], easierSpec(origin)); shown += 1; }
    step = nextStep(step, false);
    guard += 1;
    assert(guard <= 10, 'フローが終わらない');
  }

  assertEqual(shown, 3, `3問を超えて出題された: ${shown}問`);
});
