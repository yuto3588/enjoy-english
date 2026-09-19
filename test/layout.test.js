// 画面レイアウトのテスト。
//
// DESIGN.md 6章 / 11章:
//   「スクロールなしで収まること」「タップ領域は最低 48px」
//   「iOS のソフトキーボードを出さないこと」
//
// 実際に index.html を小さな iframe に読み込んで、各サイズで
//   - 選択肢と「わからない」が画面外に出ていないか
//   - タップ領域が 48px を割っていないか
//   - 縦にも横にもスクロールが出ていないか
//   - 入力要素（キーボードが出る元）が存在しないか
// を測る。
//
// Enjoy数学 で、画面の低い端末と横向きで下の段が切れる不具合を出している。
// 同じ事故を繰り返さないよう、目視に頼らずここで見張る。

import { test, assert } from './runner.js';

const STORAGE_KEY = 'enjoy-english';

/** テストが本物の学習記録を書き換えないよう、前後で退避・復元する。 */
async function withSavedStorage(fn) {
  const saved = localStorage.getItem(STORAGE_KEY);
  try {
    return await fn();
  } finally {
    if (saved === null) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, saved);
  }
}

const canRun = typeof document !== 'undefined'
  && typeof location !== 'undefined'
  && /^https?:$/.test(location.protocol);

const SIZES = [
  { name: 'iPhone SE 相当（ツールバーあり）', w: 320, h: 454 },
  { name: 'iPhone SE', w: 375, h: 555 },
  { name: 'iPhone 14（ツールバーあり）', w: 390, h: 664 },
  { name: 'iPhone 15 Pro Max', w: 430, h: 932 },
  { name: '横向き（低い）', w: 667, h: 300 },
  { name: '横向き', w: 844, h: 390 }
];

/** 4択の問題が出るまで進めてから測る（選択肢がいちばん多い状態で確かめる）。 */
async function measure(width, height) {
  const frame = document.createElement('iframe');
  frame.setAttribute('title', 'layout probe');
  frame.style.cssText =
    `position:fixed; left:-10000px; top:0; border:0; width:${width}px; height:${height}px;`;
  document.body.appendChild(frame);

  try {
    await new Promise((resolve, reject) => {
      frame.addEventListener('load', resolve, { once: true });
      frame.addEventListener('error', () => reject(new Error('読み込めない')), { once: true });
      frame.src = './index.html?level=2';
    });

    const win = frame.contentWindow;
    const doc = frame.contentDocument;    // ホーム画面から10分を選んでセッションを始める
    for (let i = 0; i < 100 && !doc.querySelector('.time'); i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assert(doc.querySelector('.time'), 'ホーム画面が出ていない');
    doc.querySelector('.time').click();
    await new Promise((r) => setTimeout(r, 30));


        const ready = () => doc.querySelectorAll('.choice').length + doc.querySelectorAll('.chip').length;
    for (let i = 0; i < 100 && ready() === 0; i++) {
      await new Promise((r) => setTimeout(r, 20));
    }
    assert(ready() > 0, '問題が組み上がっていない');

    // 選択肢が4つになる問題まで進める（並べ替えは飛ばす）
    for (let i = 0; i < 40 && doc.querySelectorAll('.choice').length < 4; i++) {
      if (doc.getElementById('screen-done').classList.contains('active')) {
        doc.getElementById('againBtn').click();
        await new Promise((r) => setTimeout(r, 20));
        continue;
      }
      doc.getElementById('dunnoBtn').click();
      doc.getElementById('overlayBtn').click();
      await new Promise((r) => setTimeout(r, 20));    }

    const choices = [...doc.querySelectorAll('.choice')].map((b) => b.getBoundingClientRect());
    const dunno = doc.getElementById('dunnoBtn').getBoundingClientRect();
    const root = doc.documentElement;

    return {
      choiceCount: choices.length,
      lowest: Math.max(...choices.map((c) => c.bottom), dunno.bottom),
      rightmost: Math.max(...choices.map((c) => c.right), dunno.right),
      minChoiceHeight: Math.min(...choices.map((c) => c.height)),
      minChoiceWidth: Math.min(...choices.map((c) => c.width)),
      inputs: doc.querySelectorAll('input, textarea, [contenteditable]').length,
      viewportW: win.innerWidth,
      viewportH: win.innerHeight,
      overflowY: root.scrollHeight > root.clientHeight,
      overflowX: root.scrollWidth > root.clientWidth
    };
  } finally {
    frame.remove();
  }
}

test('レイアウト: どの画面サイズでも選択肢と「わからない」が画面内に収まる', async () => {
  if (!canRun) return;

  await withSavedStorage(async () => {
  for (const size of SIZES) {
    const m = await measure(size.w, size.h);
    const where = `${size.name}（${size.w}x${size.h}）`;

    assert(m.choiceCount === 4, `${where}: 4択の問題まで進めなかった（${m.choiceCount}択）`);
    assert(
      m.lowest <= m.viewportH + 1,
      `${where}: 下が画面から出ている（${Math.round(m.lowest)} > ${m.viewportH}）`
    );
    assert(
      m.rightmost <= m.viewportW + 1,
      `${where}: 右が画面から出ている（${Math.round(m.rightmost)} > ${m.viewportW}）`
    );
  }
  });
});

test('レイアウト: どの画面サイズでも選択肢が 48px を割らない', async () => {
  if (!canRun) return;

  await withSavedStorage(async () => {
  for (const size of SIZES) {
    const m = await measure(size.w, size.h);
    const where = `${size.name}（${size.w}x${size.h}）`;

    assert(m.minChoiceHeight >= 47.5, `${where}: 選択肢の高さが足りない（${Math.round(m.minChoiceHeight)}px）`);
    assert(m.minChoiceWidth >= 47.5, `${where}: 選択肢の幅が足りない（${Math.round(m.minChoiceWidth)}px）`);
  }
  });
});

test('レイアウト: どの画面サイズでもスクロールが出ない', async () => {
  if (!canRun) return;

  await withSavedStorage(async () => {
  for (const size of SIZES) {
    const m = await measure(size.w, size.h);
    const where = `${size.name}（${size.w}x${size.h}）`;

    assert(!m.overflowY, `${where}: 縦にスクロールする`);
    assert(!m.overflowX, `${where}: 横にスクロールする`);
  }
  });
});

test('キーボードが出る要素が1つも無い', async () => {
  if (!canRun) return;

  // input / textarea / contenteditable が無ければ、iOS のキーボードは出ようがない
  const m = await withSavedStorage(() => measure(375, 555));
  assert(m.inputs === 0, `入力要素がある（キーボードが出る）: ${m.inputs}個`);
});

test('テストがアプリを動かしても、学習量の記録を汚さない', async () => {
  if (!canRun) return;

  // このテストは iframe でアプリを何度も動かす。
  // そのたびに記録が送られると、保護者が見る study-log-english.csv が
  // テストの分で埋まって使いものにならなくなる。
  const src = await fetch('./js/app.js', { cache: 'no-store' }).then((r) => r.text());
  assert(
    src.indexOf('window.top !== window.self') >= 0,
    'iframe で動いているときに記録を止める guard が無い'
  );
});
