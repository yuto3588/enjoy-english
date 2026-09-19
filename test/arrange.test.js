// 並べ替えのテスト（DESIGN.md 6.2）。
//
// 見張っていること:
//   - 答えが1通りに決まること（複数の正しい並びを作らない）
//   - 単語チップが大文字・記号で答えを漏らさないこと
//   - 解答欄の単語をタップすると戻せること
//   - 全部並べ終えた瞬間に判定されること
//   - 問題を出している間、画面に正解の文が出ていないこと

import { test, assert, assertEqual, assertDeepEqual } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { generate } from '../js/generators/index.js';
import { validateProblem, toSentence } from '../js/lib/problem.js';
import { createArrange } from '../js/arrange.js';

const canRunDom = typeof document !== 'undefined';

function sampleArrange(seed = 20260919, n = 400) {
  const rng = createRng(seed);
  const out = [];
  for (let i = 0; i < n; i++) {
    out.push(generate(2, rng, [], { pattern: 'word_order' }));
  }
  return out;
}

// --- 問題の作り ------------------------------------------------------------

test('並べ替え: Problem が不変条件を満たす', () => {
  for (const p of sampleArrange()) {
    const errors = validateProblem(p);
    assert(errors.length === 0, `${p.answer}\n  ${errors.join('\n  ')}`);
    assertEqual(p.input, 'arrange');
  }
});

test('並べ替え: 並べる単語を正しい順に並べると答えになる', () => {
  for (const p of sampleArrange()) {
    const words = p.answer.replace(/\.$/, '').split(' ');
    // 先頭だけ大文字になっているので、チップの形に戻して突き合わせる
    const asChips = [...p.choices].sort().join('|');
    const asAnswer = words
      .map((w, i) => (i === 0 && !p.choices.includes(w) ? w.charAt(0).toLowerCase() + w.slice(1) : w))
      .sort()
      .join('|');
    assertEqual(asChips, asAnswer, `単語と答えが噛み合わない: ${p.choices.join(' / ')} → ${p.answer}`);
  }
});

test('並べ替え: チップに大文字の手がかりを残さない', () => {
  // 文頭の語だけが大文字だと、それだけで答えが分かってしまう。
  // I / Ken / TV のように、どこに置いても大文字の語は例外。
  const alwaysCapital = new Set(['I', 'Ken', 'Yuki', 'TV', 'English']);
  for (const p of sampleArrange()) {
    for (const c of p.choices) {
      if (alwaysCapital.has(c)) continue;
      assertEqual(c, c.toLowerCase(), `チップが大文字になっている（手がかりになる）: ${c}`);
    }
  }
});

test('並べ替え: チップに記号を残さない', () => {
  for (const p of sampleArrange()) {
    for (const c of p.choices) {
      assert(!/[.,!?]/.test(c), `チップに記号が入っている（文末が分かる）: ${c}`);
    }
  }
});

test('並べ替え: 単語は3〜6個', () => {
  for (const p of sampleArrange()) {
    assert(p.choices.length >= 3 && p.choices.length <= 6, `単語の数が不正: ${p.choices.length}`);
  }
});

test('並べ替え: 主語が1語の文だけを作る（答えが2通りにならないように）', () => {
  // 「Ken and Yuki」を分けると「Yuki and Ken」も正しくなってしまう
  for (const p of sampleArrange()) {
    assert(!p.choices.includes('and'), `and が含まれている: ${p.choices.join(' / ')}`);
  }
});

test('並べ替え: 日本語の語順のまま並べた形が trap に入っている', () => {
  for (const p of sampleArrange()) {
    const reasons = p.traps.map((t) => t.reason);
    assert(reasons.includes('word_order_sov'), `語順のつまずきを拾えていない: ${p.answer}`);
    for (const t of p.traps) {
      assert(t.value !== p.answer, `trap が正解と同じ: ${t.value}`);
    }
  }
});

test('並べ替え: 日本語の手がかりが必ず付く', () => {
  for (const p of sampleArrange()) {
    assert(/[ぁ-んァ-ヶ一-龠]/.test(p.prompt), `prompt に日本語が無い: ${p.prompt}`);
  }
});

// --- 文の組み立て ----------------------------------------------------------

test('文の組み立て: 先頭が大文字になり、終わりにピリオドが付く', () => {
  assertEqual(toSentence(['he', 'plays', 'tennis']), 'He plays tennis.');
  assertEqual(toSentence(['I', 'like', 'music']), 'I like music.');
  assertEqual(toSentence(['they', 'watch', 'TV']), 'They watch TV.');
  assertEqual(toSentence([]), '');
});

// --- 入力部品 --------------------------------------------------------------

test('並べ替えの操作: タップで並び、もう一度タップで戻せる', () => {
  if (!canRunDom) return;

  const answerMount = document.createElement('div');
  const chipMount = document.createElement('div');
  let completed = null;

  const arrange = createArrange({
    answerMount, chipMount,
    onComplete: (s) => { completed = s; }
  });
  arrange.render(['tennis', 'he', 'plays']);

  const chip = (text) => [...chipMount.querySelectorAll('.chip')].find((b) => b.textContent === text);

  chip('he').click();
  assertEqual(arrange.current(), 'He.', '1語目が並んでいない');
  assertEqual(completed, null, '途中で判定されている');

  chip('plays').click();
  assertEqual(arrange.current(), 'He plays.');

  // 解答欄の単語をタップすると戻る
  [...answerMount.querySelectorAll('.answer-word')].find((b) => b.textContent === 'plays').click();
  assertEqual(arrange.current(), 'He.', '取り消せていない');
  assertEqual(completed, null, '取り消したのに判定されている');

  chip('plays').click();
  chip('tennis').click();
  assertEqual(completed, 'He plays tennis.', '並べ終えた瞬間に判定されていない');
});

test('並べ替えの操作: 使った単語は場所が動かない', () => {
  if (!canRunDom) return;

  const answerMount = document.createElement('div');
  const chipMount = document.createElement('div');
  const arrange = createArrange({ answerMount, chipMount, onComplete: () => {} });
  arrange.render(['a', 'b', 'c']);

  const order = () => [...chipMount.querySelectorAll('.chip')].map((b) => b.textContent);
  assertDeepEqual(order(), ['a', 'b', 'c']);

  [...chipMount.querySelectorAll('.chip')].find((b) => b.textContent === 'b').click();
  assertDeepEqual(order(), ['a', 'b', 'c'], 'チップの位置が動いた');

  [...answerMount.querySelectorAll('.answer-word')][0].click();
  assertDeepEqual(order(), ['a', 'b', 'c'], '戻したらチップの位置が動いた');
});

test('並べ替えの操作: 入力要素を使っていない（キーボードが出ない）', () => {
  if (!canRunDom) return;

  const answerMount = document.createElement('div');
  const chipMount = document.createElement('div');
  const arrange = createArrange({ answerMount, chipMount, onComplete: () => {} });
  arrange.render(['x', 'y', 'z']);

  for (const mount of [answerMount, chipMount]) {
    assertEqual(mount.querySelectorAll('input, textarea, [contenteditable]').length, 0);
  }
});

// --- 画面に答えが出ていないこと --------------------------------------------

test('並べ替え: 問題を出している間、画面に正解の文が出ていない', async () => {
  if (!canRunDom || !/^https?:$/.test(location.protocol)) return;

  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'arrange probe');
  frame.style.cssText = 'position:fixed; left:-10000px; top:0; border:0; width:375px; height:555px;';
  document.body.appendChild(frame);

  try {
    await new Promise((resolve) => {
      frame.addEventListener('load', resolve, { once: true });
      // 学年を指定しないと、初回は学年えらびが出てホームまで進まない
      frame.src = './index.html?level=2&grade=j1';
    });
    const doc = frame.contentDocument;    // ホーム画面から10分を選んでセッションを始める
    for (let i = 0; i < 100 && !doc.querySelector('.time'); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assert(doc.querySelector('.time'), 'ホーム画面が出ていない');
    doc.querySelector('.time').click();
    await new Promise((r) => setTimeout(r, 30));


    for (let i = 0; i < 100 && doc.querySelectorAll('.choice,.chip').length === 0; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }

    // 並べ替えの問題が出るまで進める
    let found = false;
    for (let i = 0; i < 40 && !found; i++) {
      if (doc.querySelectorAll('.chip').length > 0) { found = true; break; }
      if (doc.getElementById('screen-done').classList.contains('active')) {
        doc.getElementById('againBtn').click();
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      doc.getElementById('dunnoBtn').click();
      doc.getElementById('overlayBtn').click();
      await new Promise((r) => setTimeout(r, 20));    }
    assert(found, '並べ替えの問題が出なかった');

    const shown = doc.body.innerText;
    const chips = [...doc.querySelectorAll('.chip')].map((b) => b.textContent);
    const correct = toSentence(chips); // 並びは違うが、答えの文が丸ごと出ていないかを見る

    assert(!shown.includes(correct), `画面に正解の文が出ている: ${correct}`);
    assert(doc.getElementById('question').textContent === '', 'question が表示されている（答えが入っている）');
  } finally {
    frame.remove();
  }
});
