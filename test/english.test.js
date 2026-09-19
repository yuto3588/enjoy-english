// 英文と日本語が正しく組み立てられているかのテスト。
//
// ジェネレータは日本語の活用も組み立てる。ここを間違えると
//   「しますません」「泳ぎっています」「飼っていますことができます」
// のような、読んだ側が混乱する文が出てしまう。実際に一度出している。

import { test, assert } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { generate, patternsFor, SUPPORTED_LEVELS } from '../js/generators/index.js';
import { VERBS, jaNegative } from '../js/data/words.js';

function sample(level, seed = 20260919, n = 800) {
  const rng = createRng(seed + level);
  const out = [];
  const recent = [];
  for (let i = 0; i < n; i++) {
    const p = generate(level, rng, recent);
    out.push(p);
    recent.push(p);
    if (recent.length > 3) recent.shift();
  }
  return out;
}

function all(seed = 4321, n = 500) {
  const out = [];
  for (const level of SUPPORTED_LEVELS) out.push(...sample(level, seed, n));
  return out;
}

// --- 日本語がこわれていないこと --------------------------------------------

test('日本語: 活用のつなぎ目がこわれていない', () => {
  // 一度出した壊れ方をそのまま検査する
  const broken = ['ますません', 'ますことができます', 'ぎっています', 'きっています',
                  'みっています', 'びっています', 'しますっています', 'ますっています'];
  for (const p of all()) {
    for (const bad of broken) {
      assert(!p.prompt.includes(bad), `日本語がこわれている: ${p.prompt}（${p.question}）`);
    }
  }
});

test('日本語: 手がかりが必ず日本語で入っている', () => {
  for (const p of all()) {
    assert(/[ぁ-んァ-ヶ一-龠]/.test(p.prompt), `日本語が無い: ${p.prompt}`);
    assert(p.prompt.endsWith('。'), `文の終わりが「。」でない: ${p.prompt}`);
  }
});

test('日本語: 否定形の作り方が正しい', () => {
  assert(jaNegative('します') === 'しません');
  assert(jaNegative('好きです') === '好きではありません');
  assert(jaNegative('飼っています') === '飼っていません');
  assert(jaNegative('勉強します') === '勉強しません');
});

test('辞書: すべての動詞に辞書形と ing の日本語がある', () => {
  for (const v of VERBS) {
    assert(typeof v.jaDict === 'string' && v.jaDict.length > 0, `jaDict が無い: ${v.base}`);
    assert(typeof v.jaIng === 'string' && v.jaIng.length > 0, `jaIng が無い: ${v.base}`);
  }
});

// --- 英文がこわれていないこと ----------------------------------------------

test('英語: 文の途中でも I と人の名前は大文字のまま', () => {
  for (const p of all()) {
    if (p.input !== 'choice') continue;
    assert(!/\bken\b/.test(p.question), `人の名前が小文字になっている: ${p.question}`);
    assert(!/\byuki\b/.test(p.question), `人の名前が小文字になっている: ${p.question}`);
    assert(!/\bi\b/.test(p.question), `I が小文字になっている: ${p.question}`);
  }
});

test('英語: 大文字で始まり、記号で終わる', () => {
  for (const p of all()) {
    if (p.input !== 'choice') continue;
    if (p.form.startsWith('plural_')) continue; // one box → two ___ の形
    assert(/^[A-Z_(]/.test(p.question), `大文字で始まっていない: ${p.question}`);
    assert(/[.?]\s*(\([a-z]+\))?$/.test(p.question), `文の終わりの記号が無い: ${p.question}`);
  }
});

test('英語: いましていることを言えない動詞を進行形に使わない', () => {
  // He is having a dog. / He is liking music. は英語として成り立たない
  const stative = VERBS.filter((v) => v.stative).map((v) => v.ing);
  for (const p of sample(5)) {
    if (p.pattern !== 'ing_spelling' && p.form !== 'word_order_ing') continue;
    for (const s of stative) {
      assert(p.answer !== s, `状態を表す動詞が進行形になっている: ${p.answer}`);
      assert(!p.question.includes(s), `状態を表す動詞が進行形になっている: ${p.question}`);
    }
  }
});

test('英語: 代名詞の問題で I like me. のような文を作らない', () => {
  for (const p of sample(5)) {
    if (p.form !== 'pronoun_object') continue;
    assert(p.answer !== 'me', `I like me. の形になっている: ${p.question} / ${p.answer}`);
    assert(p.answer !== 'us', `I know us. の形になっている: ${p.question} / ${p.answer}`);
  }
});

// --- Lv3-5 の中身 ----------------------------------------------------------

test('Lv3: 主語は必ず三人称単数で、答えは -s の形', () => {
  for (const p of sample(3)) {
    const verb = VERBS.find((v) => v.third === p.answer);
    assert(verb, `三単現の形でない答え: ${p.answer}`);
    assert(p.choices.includes(verb.base), `原形が選択肢に無い: ${p.question}`);
  }
});

test('Lv3: そのまま s を付けた形が選択肢に入っている（綴りの練習になる）', () => {
  for (const p of sample(3)) {
    if (p.facts.group === 's') continue; // そのまま +s が正解の語は対象外
    assert(
      p.choices.includes(p.facts.naive),
      `よくある綴り誤りが選択肢に無い: ${p.question} / ${p.choices.join(' / ')}`
    );
  }
});

test('Lv4: Does のあとの -s を拾う trap がある（中1最頻出）', () => {
  let found = 0;
  for (const p of sample(4)) {
    if (p.form !== 'verb_after_does') continue;
    found += 1;
    const reasons = p.traps.map((t) => t.reason);
    assert(reasons.includes('verb_after_does'), `-s を残す誤りを拾えていない: ${p.question}`);
    assert(p.choices.includes(p.facts.third), `-s の形が選択肢に無い: ${p.question}`);
    assert(/^Does /.test(p.question), `Does で始まっていない: ${p.question}`);
  }
  assert(found > 0, 'Does の問題が出題されていない');
});

test('Lv4: be動詞の文に do を選んだときを拾う trap がある', () => {
  let found = 0;
  for (const p of sample(4)) {
    if (p.pattern !== 'be_vs_do') continue;
    found += 1;
    const reasons = p.traps.map((t) => t.reason);
    assert(reasons.includes('be_vs_do'), `do を使う誤りを拾えていない: ${p.question}`);
    assert(p.choices.includes('Do'), `Do が選択肢に無い: ${p.question}`);
  }
  assert(found > 0, 'be動詞の疑問文が出題されていない');
});

test('Lv5: 定義した pattern がすべて出題される', () => {
  const seen = new Set(sample(5, 999, 1500).map((p) => p.pattern));
  for (const pattern of patternsFor(5)) {
    assert(seen.has(pattern), `Lv5 で pattern "${pattern}" が出題されない`);
  }
});

test('Lv5: 並べ替えに be動詞 と ing の両方が入る', () => {
  let found = 0;
  for (const p of sample(5)) {
    if (p.form !== 'word_order_ing') continue;
    found += 1;
    assert(
      p.choices.some((c) => ['am', 'is', 'are'].includes(c)),
      `be動詞 が入っていない: ${p.choices.join(' / ')}`
    );
    assert(
      p.choices.some((c) => c.endsWith('ing')),
      `ing の形が入っていない: ${p.choices.join(' / ')}`
    );
  }
  assert(found > 0, '並べ替えが出題されていない');
});
