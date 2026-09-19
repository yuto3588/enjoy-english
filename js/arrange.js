// 並べ替えの入力部品。
//
// iOS のソフトキーボードを出さないため、入力はすべてボタンで行う。
// input / textarea / contenteditable は一切使わない。
//
//   - 下の単語をタップすると、上の解答欄に並ぶ
//   - 解答欄の単語をタップすると、元の位置に戻る
//   - 全部並べ終えた瞬間に判定する（決定ボタンは置かない）

import { toSentence } from './lib/problem.js';

/**
 * @param {object} opts
 * @param {HTMLElement} opts.answerMount  組み立て中の文を並べる要素
 * @param {HTMLElement} opts.chipMount    まだ使っていない単語を並べる要素
 * @param {Function} opts.onComplete      全部並べ終えたとき (sentence:string) => void
 */
export function createArrange({ answerMount, chipMount, onComplete }) {
  let words = [];     // { id, word } の元の並び（チップの位置を動かさないため）
  let placed = [];    // 解答欄に置かれた id の順
  let enabled = true;

  function render(list) {
    words = list.map((word, id) => ({ id, word }));
    placed = [];
    enabled = true;
    draw();
  }

  function draw() {
    // 解答欄
    answerMount.innerHTML = '';
    for (const id of placed) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'answer-word';
      b.textContent = words[id].word;
      b.addEventListener('click', () => {
        if (!enabled) return;
        placed = placed.filter((x) => x !== id);
        draw();
      });
      answerMount.appendChild(b);
    }
    answerMount.classList.toggle('empty', placed.length === 0);

    // まだ使っていない単語。位置は動かさず、使ったものだけ見えなくする。
    chipMount.innerHTML = '';
    for (const { id, word } of words) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'chip';
      b.textContent = word;
      if (placed.includes(id)) {
        b.classList.add('used');
        b.disabled = true;
      } else {
        b.addEventListener('click', () => {
          if (!enabled) return;
          placed.push(id);
          draw();
          if (placed.length === words.length && onComplete) {
            onComplete(current());
          }
        });
      }
      chipMount.appendChild(b);
    }
  }

  /** いま組み立てられている文。 */
  function current() {
    return toSentence(placed.map((id) => words[id].word));
  }

  function setEnabled(next) {
    enabled = next;
    for (const b of chipMount.querySelectorAll('.chip')) {
      b.disabled = !next || b.classList.contains('used');
    }
    for (const b of answerMount.querySelectorAll('.answer-word')) {
      b.disabled = !next;
    }
  }

  /** 正解のときに解答欄へ短く印を付ける。 */
  function markOk() {
    answerMount.classList.add('ok');
  }

  function clearMarks() {
    answerMount.classList.remove('ok');
  }

  return { render, setEnabled, current, markOk, clearMarks };
}
