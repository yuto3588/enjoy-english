// 誤答パターン別解説の単体テスト。
//
// 「4択のどれを選んでも、その選択に合った説明が出る」ことが
// このアプリの学習面での中核価値なので、網羅性まで見る。

import { test, assert, assertEqual, assertDeepEqual } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { generate, patternsFor, formsFor, SUPPORTED_LEVELS } from '../js/generators/index.js';
import { explanationFor, templateKeys } from '../js/explain.js';

/** 選択式だけを取り出す（並べ替えは選択肢が「並べる単語」なので意味が違う）。 */
function onlyChoice(list) {
  return list.filter((p) => p.input === 'choice');
}

function allKindsOfProblems(seed = 2468, perKind = 50) {
  const rng = createRng(seed);
  const out = [];
  for (const level of SUPPORTED_LEVELS) {
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        for (let i = 0; i < perKind; i++) {
          out.push(generate(level, rng, [], { pattern, form }));
        }
      }
    }
  }
  return out;
}

// --- 網羅性 ----------------------------------------------------------------

test('解説: 生成されうる全ての pattern × reason にテンプレートがある', () => {
  const keys = new Set(templateKeys());
  const seen = new Set();

  for (const p of allKindsOfProblems()) {
    for (const t of p.traps) {
      const key = `${p.pattern}:${t.reason}`;
      seen.add(key);
      assert(keys.has(key), `テンプレートが無い組み合わせ: ${key}（${p.question}）`);
    }
  }

  for (const key of keys) {
    assert(seen.has(key), `どの問題からも呼ばれないテンプレート: ${key}`);
  }
});

test('解説: どの誤答の選択肢を選んでも専用解説が出る', () => {
  // 「4択のどれを選んでも説明が出る」ことを、実際に全部選んで確かめる
  for (const p of onlyChoice(allKindsOfProblems(1357, 25))) {
    for (const c of p.choices) {
      if (c === p.answer) continue;
      const { lines, matched } = explanationFor(p, c);
      assert(matched, `選択肢 "${c}" で専用解説が出ない: ${p.question}`);
      assert(
        lines.join('|') !== p.steps.join('|'),
        `専用解説が汎用の steps と同じ: ${p.question} / ${c}`
      );
    }
  }
});

test('解説: 選ぶ選択肢が違えば、違う説明が出る', () => {
  // am を選んだときと is を選んだときで、同じ文が出てはいけない
  for (const p of onlyChoice(allKindsOfProblems(8642, 25))) {
    const wrong = p.choices.filter((c) => c !== p.answer);
    if (wrong.length < 2) continue;

    const texts = wrong.map((c) => explanationFor(p, c).lines.join('|'));
    assertEqual(
      new Set(texts).size,
      texts.length,
      `選択肢が違うのに同じ解説が出る: ${p.question}`
    );
  }
});

// --- 「わからない」 --------------------------------------------------------

test('解説:「わからない」を押したときは汎用の手順が出る', () => {
  for (const p of allKindsOfProblems(2469, 20)) {
    const { lines, matched } = explanationFor(p, null);
    assertEqual(matched, null, '選択していないのに matched が付いた');
    assertDeepEqual(lines, p.steps, `steps が返っていない: ${p.question}`);
  }
});

test('解説: 正解を渡しても落ちない', () => {
  for (const p of allKindsOfProblems(3690, 10)) {
    const { lines } = explanationFor(p, p.answer);
    assert(Array.isArray(lines) && lines.length > 0, `解説が空: ${p.question}`);
  }
});

test('解説: facts が無い問題でも汎用の steps に落ちるだけで落ちない', () => {
  const p = onlyChoice(allKindsOfProblems(999, 1))[0];
  const broken = { ...p, facts: undefined };
  const wrong = p.choices.find((c) => c !== p.answer);
  const { lines, matched } = explanationFor(broken, wrong);
  assertEqual(matched, null);
  assertDeepEqual(lines, p.steps);
});

// --- 文言の条件 ------------------------------------------------------------

test('解説: 専用解説も3行以内で、答えが入っている', () => {
  for (const p of onlyChoice(allKindsOfProblems(4812, 20))) {
    for (const c of p.choices) {
      if (c === p.answer) continue;
      const { lines } = explanationFor(p, c);
      assert(lines.length >= 1 && lines.length <= 3, `行数が不正: ${p.question} / ${lines.length}行`);
      for (const line of lines) {
        assert(typeof line === 'string' && line.trim().length > 0, `空行がある: ${p.question}`);
      }
      assert(
        lines.join(' ').includes(p.answer),
        `答えが入っていない: ${p.question} / ${lines.join(' / ')}`
      );
    }
  }
});

test('解説: 評価語を使わない', () => {
  const banned = ['残念', 'おしい', '惜しい', '間違', 'まちがい', 'ミス',
                  'すばらしい', 'がんばろう', 'がんばって', 'もう一度考え'];
  for (const p of onlyChoice(allKindsOfProblems(5934, 15))) {
    for (const c of p.choices) {
      if (c === p.answer) continue;
      const text = explanationFor(p, c).lines.join(' ');
      for (const word of banned) {
        assert(!text.includes(word), `評価語 "${word}" が含まれる: ${text}`);
      }
    }
  }
});

test('解説: 英語の文法用語を使わない', () => {
  const banned = ['subject', 'verb', 'plural', 'singular', 'article', 'noun', 'tense'];
  for (const p of onlyChoice(allKindsOfProblems(6543, 15))) {
    for (const c of p.choices) {
      if (c === p.answer) continue;
      const text = explanationFor(p, c).lines.join(' ').toLowerCase();
      for (const word of banned) {
        assert(!text.includes(word), `英語の文法用語 "${word}" が含まれる: ${text}`);
      }
    }
  }
});

test('解説: undefined や NaN が文字列に混ざっていない', () => {
  // facts の項目名を間違えるとここで見つかる
  for (const p of onlyChoice(allKindsOfProblems(7531, 20))) {
    for (const c of p.choices) {
      if (c === p.answer) continue;
      const text = explanationFor(p, c).lines.join(' ');
      assert(!text.includes('undefined'), `undefined が混ざっている: ${text}`);
      assert(!text.includes('NaN'), `NaN が混ざっている: ${text}`);
    }
  }
});

// --- 代表的な例 ------------------------------------------------------------

test('例: are のところで am を選ぶと「am は I のときだけ」が出る', () => {
  const rng = createRng(4444);
  let target = null;
  for (let i = 0; i < 2000 && !target; i++) {
    const p = generate(1, rng, [], { pattern: 'be_agreement' });
    if (p.answer === 'are') target = p;
  }
  assert(target, 'are が答えの問題を作れなかった');

  const { lines, matched } = explanationFor(target, 'am');
  assertEqual(matched, 'be_am_only_for_i');
  assert(lines[0].includes('I のときだけ'), `想定した解説が出ていない: ${lines[0]}`);
  assertEqual(lines[2], '答えは are');
});

test('例: 原形のところで -s 形を選ぶと「-s は1人のときだけ」が出る', () => {
  const rng = createRng(5555);
  const p = generate(2, rng, [], { pattern: 'third_person_s', form: 'verb_base' });

  const { lines, matched } = explanationFor(p, p.facts.third);
  assertEqual(matched, 'third_person_s_overused');
  assert(lines[0].includes('-s'), `-s の説明が出ていない: ${lines[0]}`);
  assert(lines[1].includes(p.facts.subject), `主語が示されていない: ${lines[1]}`);
});

test('例: 原形のところで ing 形を選ぶと be動詞 の話が出る', () => {
  const rng = createRng(6666);
  const p = generate(2, rng, [], { pattern: 'third_person_s', form: 'verb_base' });

  const { lines, matched } = explanationFor(p, p.facts.ing);
  assertEqual(matched, 'ing_without_be');
  assert(lines.join(' ').includes('be動詞'), `be動詞 の説明が出ていない: ${lines.join(' / ')}`);
});
