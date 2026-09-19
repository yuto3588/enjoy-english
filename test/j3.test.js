// 中3 ジェネレータの単体テスト。
//
// 中3 でいちばん怖いのは、英文としておかしいものが出ることなので、
// 文の組み立てに使う語の条件を正面から確かめる。
//   - 受動態は「〜されます」と言える動詞だけ
//   - 過去分詞を問う問題では、選択肢に同じ語が2つ並ばない
//   - 比較は -er の語と more の語の両方が出る
//
// 日本語の手がかりがおかしくなっていないかも見る
//（「人気があるです」のような形を一度作りかけている）。

import { test, assert, assertEqual } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { validateProblem, PATTERNS, FORMS } from '../js/lib/problem.js';
import * as j3 from '../js/generators/j3/index.js';
import { COMPARABLES, VERBS, passiveVerbs, participleVerbs } from '../js/data/words.js';

const LEVELS = [1, 2, 3, 4, 5];

function sample(level, count = 150, opts = {}) {
  const rng = createRng(20260921 + level * 13);
  const out = [];
  const recent = [];
  for (let i = 0; i < count; i++) {
    const p = j3.generate(level, rng, recent, opts);
    recent.push(p);
    if (recent.length > 3) recent.shift();
    out.push(p);
  }
  return out;
}

// --- 全レベル共通 -----------------------------------------------------------

test('中3: どのレベルでも Problem の形が壊れていない', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 80)) {
      const errors = validateProblem(p);
      assertEqual(errors.length, 0, `Lv${level} ${p.question}: ${errors.join(' / ')}`);
    }
  }
});

test('中3: pattern と form が既知の値になる', () => {
  for (const level of LEVELS) {
    const expected = j3.patternsFor(level);
    for (const p of sample(level, 60)) {
      assert(PATTERNS.includes(p.pattern), `未知の pattern: ${p.pattern}`);
      assert(FORMS.includes(p.form), `未知の form: ${p.form}`);
      assert(expected.includes(p.pattern), `Lv${level} で想定外の pattern: ${p.pattern}`);
    }
  }
});

test('中3: pattern の名前が中1・小5とぶつかっていない', () => {
  for (const name of j3.allPatterns()) {
    assert(name.startsWith('j3_'), `学年の区別がつかない pattern: ${name}`);
  }
});

test('中3: 同じ問題が連続で出ない', () => {
  for (const level of LEVELS) {
    const list = sample(level, 200);
    for (let i = 1; i < list.length; i++) {
      assert(
        list[i].question !== list[i - 1].question,
        `Lv${level} で同じ問題が続いた: ${list[i].question}`
      );
    }
  }
});

test('中3: どの選択肢にも専用の解説がある', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 100)) {
      const trapValues = new Set(p.traps.map((t) => t.value));
      for (const c of p.choices) {
        if (c === p.answer) continue;
        assert(trapValues.has(c), `解説の無い選択肢がある: ${p.question} → ${c}`);
      }
    }
  }
});

test('中3: 選択肢に同じ語が2つ並ばない', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 150)) {
      assertEqual(
        new Set(p.choices).size,
        p.choices.length,
        `選択肢が重複: ${p.question} / ${p.choices.join(' | ')}`
      );
    }
  }
});

test('中3: 解説は3行以内で、評価する言葉を使わない', () => {
  const banned = ['残念', 'おしい', '惜しい', 'まちがい', '間違い', 'すごい', 'えらい', 'ダメ'];
  for (const level of LEVELS) {
    for (const p of sample(level, 50)) {
      assert(p.steps.length <= 3, `steps が3行を超えた: ${p.question}`);
      for (const line of p.steps) {
        for (const word of banned) {
          assert(!line.includes(word), `評価する言葉が入っている: ${line}`);
        }
      }
    }
  }
});

test('中3: 日本語の手がかりが文として終わっている', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 100)) {
      assert(p.prompt.endsWith('。'), `prompt が文で終わっていない: ${p.prompt}`);
      assert(!/[a-z]/.test(p.prompt), `prompt に英語が混ざっている: ${p.prompt}`);
    }
  }
});

test('中3: おかしな日本語が出てこない', () => {
  // 「人気があるです」「作るています」のような形を実際に作っている。
  // 辞書形のあとに活用をつなげると、この形が出る。
  const weird = [
    'があるです', 'のです。', 'はは', 'をを', 'ますます', 'ですです',
    'るています', 'るところ', 'るました', 'いています。ます'
  ];
  for (const level of LEVELS) {
    for (const p of sample(level, 150)) {
      for (const bad of weird) {
        assert(!p.prompt.includes(bad), `おかしな日本語: ${p.prompt}`);
      }
    }
  }
});

test('中3: 文の途中に大文字の語が残っていない', () => {
  // than He / by My brother のような形を実際に作っている。
  // 主語の一覧は文頭に置く前提で大文字から書いてあるため、
  // than や by のあとに置くときは小文字に直す必要がある。
  // どこに置いても大文字で書く語（名前・地名・固有の呼び名）
  const alwaysCapital = /^(I|Ken|Yuki|TV|English|Japan|Osaka)$/;
  for (const level of LEVELS) {
    for (const p of sample(level, 150)) {
      const words = p.question.replace(/[.?]/g, '').split(' ');
      words.slice(1).forEach((w) => {
        if (!/^[A-Z]/.test(w)) return;
        assert(alwaysCapital.test(w), `文の途中に大文字の語がある: ${p.question}（${w}）`);
      });
    }
  }
});

test('中3: by や than のあとに主語の形の代名詞を置かない', () => {
  // by she / than he は英文として誤り。使わない語をそもそも選ばない。
  for (const level of LEVELS) {
    for (const p of sample(level, 150)) {
      assert(!/\b(by|than) (he|she|they|we|I)\b/i.test(p.question), `代名詞の形が違う: ${p.question}`);
    }
  }
});

// --- Lv1 比較 ---------------------------------------------------------------

test('Lv1: 比較級・最上級が辞書のとおりになっている', () => {
  const byWord = new Map(COMPARABLES.map((a) => [a.word, a]));
  for (const p of sample(1, 200)) {
    const adj = byWord.get(p.facts.word);
    assert(adj, `辞書に無い語: ${p.facts.word}`);
    assertEqual(
      p.answer,
      p.form === 'j3_comparative' ? adj.comparative : adj.superlative,
      `${p.question} の答えが合っていない`
    );
  }
});

test('Lv1: -er を付ける語と more を付ける語の両方が出る', () => {
  const groups = new Set(sample(1, 300).map((p) => p.facts.group));
  for (const group of ['er', 'double', 'ier', 'more', 'irregular']) {
    assert(groups.has(group), `${group} の語が1問も出なかった`);
  }
});

test('Lv1: than の文と the の文の両方が出る', () => {
  const forms = new Set(sample(1, 200).map((p) => p.form));
  assert(forms.has('j3_comparative'), 'than の文が出なかった');
  assert(forms.has('j3_superlative'), 'the の文が出なかった');
});

// --- Lv2 受動態 -------------------------------------------------------------

test('Lv2: 受動態に使うのは「〜されます」と言える動詞だけ', () => {
  const allowed = new Set(passiveVerbs().map((v) => v.base));
  for (const p of sample(2, 200)) {
    assert(allowed.has(p.facts.base), `受動態にできない動詞が出た: ${p.facts.base}`);
  }
});

test('Lv2: 答えが be動詞 + 過去分詞になっている', () => {
  const byBase = new Map(VERBS.map((v) => [v.base, v]));
  for (const p of sample(2, 200)) {
    const verb = byBase.get(p.facts.base);
    assertEqual(p.answer, `${p.facts.be} ${verb.pp}`, `${p.question} の答えが合っていない`);
    assert(['is', 'are'].includes(p.facts.be), `be動詞 が変: ${p.facts.be}`);
  }
});

test('Lv2: 主語の数と be動詞 が合っている', () => {
  for (const p of sample(2, 200)) {
    assertEqual(p.facts.be, p.facts.plural ? 'are' : 'is', `${p.question} の be動詞 が合っていない`);
  }
});

// --- Lv3 現在完了 -----------------------------------------------------------

test('Lv3: have / has が主語と合っている', () => {
  for (const p of sample(3, 200)) {
    if (p.form !== 'j3_perfect_have') continue;
    const expected = ['He', 'She', 'Ken', 'Yuki', 'My brother', 'My sister'].includes(p.facts.subject)
      ? 'has'
      : 'have';
    assertEqual(p.answer, expected, `${p.question} の答えが合っていない`);
  }
});

test('Lv3: 過去分詞をえらぶ問題では、原形と過去分詞が別の語', () => {
  // read / run のように同じ形だと、選択肢に同じ語が2つ並ぶ
  for (const p of sample(3, 200)) {
    if (p.form !== 'j3_perfect_pp') continue;
    assert(p.facts.pp !== p.facts.base, `原形と過去分詞が同じ: ${p.facts.base}`);
  }
});

test('Lv3: 過去分詞が辞書のとおりになっている', () => {
  const byBase = new Map(VERBS.map((v) => [v.base, v]));
  for (const p of sample(3, 200)) {
    if (p.form !== 'j3_perfect_pp') continue;
    assertEqual(p.answer, byBase.get(p.facts.base).pp, `${p.facts.base} の過去分詞が合っていない`);
  }
});

// --- Lv4 for / since と過去形 ----------------------------------------------

test('Lv4: for と since が期間の種類と合っている', () => {
  for (const p of sample(4, 200)) {
    if (p.form !== 'j3_for_since') continue;
    assertEqual(p.answer, p.facts.kind, `${p.question} の答えが合っていない`);
    assert(['for', 'since'].includes(p.answer), `想定外の答え: ${p.answer}`);
  }
});

test('Lv4: for と since の両方が出る', () => {
  const kinds = new Set(
    sample(4, 300).filter((p) => p.form === 'j3_for_since').map((p) => p.answer)
  );
  assert(kinds.has('for'), 'for の問題が出なかった');
  assert(kinds.has('since'), 'since の問題が出なかった');
});

test('Lv4: ago の文では過去形が答えになる', () => {
  const byBase = new Map(VERBS.map((v) => [v.base, v]));
  for (const p of sample(4, 200)) {
    if (p.form !== 'j3_past_marker') continue;
    assert(p.question.includes('an hour ago'), `ago が無い: ${p.question}`);
    assertEqual(p.answer, byBase.get(p.facts.base).past, `${p.facts.base} の過去形が合っていない`);
  }
});

// --- Lv5 関係代名詞 ---------------------------------------------------------

test('Lv5: 人なら who、人以外なら which', () => {
  for (const p of sample(5, 200)) {
    assertEqual(p.answer, p.facts.isPerson ? 'who' : 'which', `${p.question} の答えが合っていない`);
  }
});

test('Lv5: who の問題と which の問題の両方が出る', () => {
  const answers = new Set(sample(5, 200).map((p) => p.answer));
  assert(answers.has('who'), 'who の問題が出なかった');
  assert(answers.has('which'), 'which の問題が出なかった');
});

test('Lv5: 選択肢は必ず4つ', () => {
  for (const p of sample(5, 150)) {
    assertEqual(p.choices.length, 4, `選択肢が4つでない: ${p.choices.join(' | ')}`);
  }
});

// --- 誤答フローで使う指定 ---------------------------------------------------

test('中3: pattern を指定すると、その pattern の問題が返る', () => {
  const rng = createRng(101);
  const levelOf = { j3_compare: 1, j3_passive: 2, j3_perfect: 3, j3_time: 4, j3_relative: 5 };
  for (const pattern of j3.allPatterns()) {
    for (let i = 0; i < 20; i++) {
      const p = j3.generate(levelOf[pattern], rng, [], { pattern });
      assertEqual(p.pattern, pattern);
      assertEqual(validateProblem(p).length, 0, `${pattern}: ${validateProblem(p).join(' / ')}`);
    }
  }
});

test('中3: form を指定すると、その形が返る', () => {
  const rng = createRng(103);
  const levelOf = { j3_compare: 1, j3_passive: 2, j3_perfect: 3, j3_time: 4, j3_relative: 5 };
  for (const pattern of j3.allPatterns()) {
    for (const form of j3.formsFor(pattern)) {
      for (let i = 0; i < 10; i++) {
        const p = j3.generate(levelOf[pattern], rng, [], { pattern, form });
        assertEqual(p.form, form, `${pattern} / ${form} を指定したのに ${p.form}`);
      }
    }
  }
});

test('中3: easier を指定すると選択肢が2つに減る', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 40, { easier: true })) {
      assertEqual(p.choices.length, 2, `easier なのに ${p.choices.length}択: ${p.question}`);
      assertEqual(validateProblem(p).length, 0, validateProblem(p).join(' / '));
    }
  }
});

// --- 辞書 -------------------------------------------------------------------

test('辞書: すべての動詞に過去分詞がある', () => {
  for (const v of VERBS) {
    assert(typeof v.pp === 'string' && v.pp.length > 0, `${v.base} に過去分詞が無い`);
  }
});

test('辞書: 受動態に使える動詞が十分にある', () => {
  assert(passiveVerbs().length >= 8, `受動態に使える動詞が少なすぎる: ${passiveVerbs().length}`);
  for (const v of passiveVerbs()) {
    assert(v.jaPassive.endsWith('ます'), `「〜されます」の形になっていない: ${v.jaPassive}`);
  }
});

test('辞書: 原形と別の過去分詞を持つ動詞が十分にある', () => {
  assert(
    participleVerbs().length >= 10,
    `形を問う問題に使える動詞が少なすぎる: ${participleVerbs().length}`
  );
});

test('辞書: 比較の語に5つの型がすべてある', () => {
  const groups = new Set(COMPARABLES.map((a) => a.group));
  for (const group of ['er', 'double', 'ier', 'more', 'irregular']) {
    assert(groups.has(group), `${group} の語が無い`);
  }
});
