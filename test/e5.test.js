// 小5 ジェネレータの単体テスト。
//
// 小5 でいちばん壊しやすいのは「中1の内容が混ざること」なので、そこを見張る。
//   - 三単現（plays / goes）が答えになっていない
//   - he / she を主語にした一般動詞の文が出ない
//   - 中1でしか使わない語が出てこない
//
// 英文としておかしくないこと（「私は女の人を持っています」のような文）も、
// 一度やらかしているので毎回確かめる。

import { test, assert, assertEqual } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { validateProblem, PATTERNS, FORMS } from '../js/lib/problem.js';
import * as e5 from '../js/generators/e5/index.js';
import { easyNouns, easyVerbs, easySubjects, NOUNS, VERBS } from '../js/data/words.js';

const LEVELS = [1, 2, 3, 4, 5];

function sample(level, count = 150, opts = {}) {
  const rng = createRng(20260920 + level * 11);
  const out = [];
  const recent = [];
  for (let i = 0; i < count; i++) {
    const p = e5.generate(level, rng, recent, opts);
    recent.push(p);
    if (recent.length > 3) recent.shift();
    out.push(p);
  }
  return out;
}

function onlyChoice(list) {
  return list.filter((p) => p.input === 'choice');
}

// --- 全レベル共通 -----------------------------------------------------------

test('小5: どのレベルでも Problem の形が壊れていない', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 80)) {
      const errors = validateProblem(p);
      assertEqual(errors.length, 0, `Lv${level} ${p.question}: ${errors.join(' / ')}`);
    }
  }
});

test('小5: pattern と form が既知の値になる', () => {
  for (const level of LEVELS) {
    const expected = e5.patternsFor(level);
    for (const p of sample(level, 60)) {
      assert(PATTERNS.includes(p.pattern), `未知の pattern: ${p.pattern}`);
      assert(FORMS.includes(p.form), `未知の form: ${p.form}`);
      assert(expected.includes(p.pattern), `Lv${level} で想定外の pattern: ${p.pattern}`);
      assert(
        e5.formsFor(p.pattern).includes(p.form),
        `pattern ${p.pattern} が取らない form: ${p.form}`
      );
    }
  }
});

test('小5: pattern の名前が中1とぶつかっていない', () => {
  // ぶつかると、小5の誤答に中1向けの（文法用語入りの）解説が出てしまう
  for (const name of e5.allPatterns()) {
    assert(name.startsWith('e5_'), `中1と区別がつかない pattern: ${name}`);
  }
});

test('小5: 同じ問題が連続で出ない', () => {
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

test('小5: traps が必ず1件以上あり、選択肢とかみ合っている', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 80)) {
      assert(p.traps.length >= 1, `traps が空: Lv${level} ${p.question}`);
      if (p.input !== 'choice') continue;

      const trapValues = new Set(p.traps.map((t) => t.value));
      for (const c of p.choices) {
        if (c === p.answer) continue;
        assert(trapValues.has(c), `解説の無い選択肢がある: ${p.question} → ${c}`);
      }
    }
  }
});

test('小5: 解説は3行以内で、評価する言葉を使わない', () => {
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

test('小5: 解説に中1以降の文法用語を使わない', () => {
  // 小5 には習っていない言い方なので、出た時点で読めない解説になる
  const jargon = ['三人称', '三単現', '目的格', '所有格', '現在進行形', '原形', '不定詞'];
  for (const level of LEVELS) {
    for (const p of sample(level, 50)) {
      for (const line of p.steps) {
        for (const word of jargon) {
          assert(!line.includes(word), `小5に文法用語が出ている: ${line}`);
        }
      }
    }
  }
});

// --- 中1の内容が混ざっていないこと ------------------------------------------

test('小5: 三単現が答えになることがない', () => {
  const thirdForms = new Set(VERBS.map((v) => v.third).filter((t) => !VERBS.some((v) => v.base === t)));
  for (const level of LEVELS) {
    for (const p of sample(level, 120)) {
      assert(!thirdForms.has(p.answer), `三単現が答えになっている: ${p.question} → ${p.answer}`);
    }
  }
});

test('小5: 一般動詞の文で he / she が主語にならない', () => {
  // he / she を出すと plays が要る。小5 では扱わない。
  for (const level of [3, 5]) {
    for (const p of sample(level, 120)) {
      const subject = p.facts.subject;
      assert(
        !['He', 'She', 'Ken', 'Yuki'].includes(subject),
        `三単現が要る主語が出た: ${p.question}（${subject}）`
      );
    }
  }
});

test('小5: 進行形・疑問文・代名詞の格は出てこない', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 80)) {
      assert(!/\bing\b|ing\./.test(p.question), `進行形が出た: ${p.question}`);
      assert(!p.question.includes('?'), `疑問文が出た: ${p.question}`);
      assert(!/\bDo |\bDoes /.test(p.question), `疑問文が出た: ${p.question}`);
    }
  }
});

test('小5: 中1向けの難しい語が出てこない', () => {
  const easyWords = new Set([
    ...easyNouns().flatMap((n) => [n.word, n.plural]),
    ...easyVerbs().flatMap((v) => [v.base, v.third])
  ]);
  const hardWords = new Set(
    [
      ...NOUNS.flatMap((n) => [n.word, n.plural]),
      ...VERBS.flatMap((v) => [v.base, v.third])
    ].filter((w) => !easyWords.has(w))
  );

  for (const level of LEVELS) {
    for (const p of sample(level, 120)) {
      const text = `${p.question} ${p.choices.join(' ')}`;
      for (const word of text.split(/[^A-Za-z]+/)) {
        assert(!hardWords.has(word), `小5で使わない語が出た: ${word}（${p.question}）`);
      }
    }
  }
});

// --- 各レベルの中身 ---------------------------------------------------------

test('Lv1: 主語は I / You / He / She の4つだけ', () => {
  // いきなり We / They まで出すと、覚えることが一度に増える
  for (const p of sample(1, 150)) {
    assert(
      ['I', 'You', 'He', 'She'].includes(p.facts.subject),
      `Lv1 で想定外の主語: ${p.facts.subject}`
    );
  }
});

test('Lv1-2: am / is / are が主語と合っている', () => {
  const expected = {
    I: 'am', You: 'are',
    He: 'is', She: 'is', Ken: 'is', Yuki: 'is',
    We: 'are', They: 'are'
  };
  for (const level of [1, 2]) {
    for (const p of sample(level, 150)) {
      if (p.pattern !== 'e5_be') continue;
      assertEqual(p.answer, expected[p.facts.subject], `${p.question} の答えが合っていない`);
    }
  }
});

test('Lv2: a と an が語の始まりと合っている', () => {
  const vowel = /^[aeiou]/;
  for (const p of sample(2, 200)) {
    if (p.pattern !== 'e5_article') continue;
    const [article, word] = p.answer.split(' ');
    assertEqual(article, vowel.test(word) ? 'an' : 'a', `${p.answer} が合っていない`);
  }
});

test('Lv4: 複数形が辞書のとおりになっている', () => {
  const byWord = new Map(easyNouns().map((n) => [n.word, n.plural]));
  for (const p of sample(4, 200)) {
    const m = /^one (\w+) → two ___$/.exec(p.question);
    assert(m, `式を読み取れない: ${p.question}`);
    assertEqual(p.answer, byWord.get(m[1]), `${m[1]} の複数形が合っていない`);
  }
});

test('Lv4: つづりの型がひととおり出る', () => {
  // 型が欠けると、その綴りの練習ができない
  const seen = new Set(sample(4, 400).map((p) => p.facts.group));
  for (const group of ['regular', 'es', 'ies', 'ves', 'irregular']) {
    assert(seen.has(group), `${group} の問題が1問も出なかった`);
  }
});

test('Lv5: 並べ替えは3〜4語で、単語に記号が入らない', () => {
  for (const p of sample(5, 150)) {
    assertEqual(p.input, 'arrange', `Lv5 が並べ替えになっていない: ${p.question}`);
    assert(p.choices.length >= 3 && p.choices.length <= 4, `語数が合わない: ${p.choices.join(' ')}`);
    for (const chip of p.choices) {
      assert(!/[.,!?]/.test(chip), `単語に記号が入っている: ${chip}`);
    }
  }
});

test('Lv5: 並べた語をつなぐと答えの文になる', () => {
  for (const p of sample(5, 150)) {
    const fromChips = [...p.choices].sort().join(' ');
    const fromAnswer = p.answer
      .replace(/\.$/, '')
      .split(' ')
      .map((w, i) => (i === 0 && w !== 'I' ? w.charAt(0).toLowerCase() + w.slice(1) : w))
      .sort()
      .join(' ');
    assertEqual(fromChips, fromAnswer, `並べる語と答えが噛み合わない: ${p.answer}`);
  }
});

// --- 日本語の手がかり -------------------------------------------------------

test('小5: 日本語の手がかりが必ず付いていて、文として終わっている', () => {
  for (const level of LEVELS) {
    for (const p of sample(level, 60)) {
      assert(p.prompt.length > 0, `prompt が空: ${p.question}`);
      assert(p.prompt.endsWith('。'), `prompt が文で終わっていない: ${p.prompt}`);
      assert(!/[a-z]/.test(p.prompt), `prompt に英語が混ざっている: ${p.prompt}`);
    }
  }
});

test('小5: おかしな日本語が出てこない', () => {
  // 「私は女の人を持っています」のような文を一度作っているので見張る。
  // 「家族が2つ」「子どもが2つ」のような数え方も同じ種類の事故。
  const weird = ['を持っています', 'ますます', 'ませません', 'していています'];
  const badCounters = ['家族が2つ', '子どもが2つ', '男の人が2つ', '女の人が2つ'];
  for (const level of LEVELS) {
    for (const p of sample(level, 120)) {
      for (const bad of [...weird, ...badCounters]) {
        assert(!p.prompt.includes(bad), `おかしな日本語: ${p.prompt}`);
      }
    }
  }
});

// --- 誤答フローで使う指定 ---------------------------------------------------

test('小5: pattern を指定すると、その pattern の問題が返る', () => {
  const rng = createRng(77);
  const levelOf = { e5_be: 1, e5_article: 2, e5_verb: 3, e5_plural: 4, e5_order: 5 };
  for (const pattern of e5.allPatterns()) {
    for (let i = 0; i < 20; i++) {
      const p = e5.generate(levelOf[pattern], rng, [], { pattern });
      assertEqual(p.pattern, pattern);
      assertEqual(validateProblem(p).length, 0, `${pattern}: ${validateProblem(p).join(' / ')}`);
    }
  }
});

test('小5: form を指定すると、その形が返る', () => {
  const rng = createRng(79);
  const levelOf = { e5_be: 1, e5_article: 2, e5_verb: 3, e5_plural: 4, e5_order: 5 };
  for (const pattern of e5.allPatterns()) {
    for (const form of e5.formsFor(pattern)) {
      for (let i = 0; i < 10; i++) {
        const p = e5.generate(levelOf[pattern], rng, [], { pattern, form });
        assertEqual(p.form, form, `${pattern} / ${form} を指定したのに ${p.form}`);
      }
    }
  }
});

test('小5: easier を指定すると選択肢が2つに減る', () => {
  const rng = createRng(83);
  for (const level of [1, 2, 3, 4]) {
    for (const p of onlyChoice(sample(level, 40, { easier: true }))) {
      assertEqual(p.choices.length, 2, `easier なのに ${p.choices.length}択: ${p.question}`);
      assertEqual(validateProblem(p).length, 0, validateProblem(p).join(' / '));
    }
  }
});

// --- 辞書 -------------------------------------------------------------------

test('辞書: 小5の語が中1の辞書から取り出されている', () => {
  for (const n of easyNouns()) assert(NOUNS.includes(n), `別物の名詞が混ざっている: ${n.word}`);
  for (const v of easyVerbs()) assert(VERBS.includes(v), `別物の動詞が混ざっている: ${v.base}`);
});

test('辞書: 小5の名詞に複数形の型がすべてそろっている', () => {
  const groups = new Set(easyNouns().map((n) => n.group));
  for (const group of ['regular', 'es', 'ies', 'ves', 'irregular']) {
    assert(groups.has(group), `${group} の名詞が1つも無い`);
  }
});

test('辞書: 小5の名詞に a と an の両方がある', () => {
  const nouns = easyNouns();
  assert(nouns.filter((n) => n.article === 'a').length >= 5, 'a の名詞が少なすぎる');
  assert(nouns.filter((n) => n.article === 'an').length >= 2, 'an の名詞が少なすぎる');
});

test('辞書: 小5の主語に am / is / are がすべてある', () => {
  const bes = new Set(easySubjects().map((s) => s.be));
  for (const be of ['am', 'is', 'are']) assert(bes.has(be), `${be} を使う主語が無い`);
});
