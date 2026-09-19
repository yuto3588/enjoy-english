// 4択の入力部品。
//
// iOS のソフトキーボードを出さないため、入力はすべてボタンで行う。
// input / textarea / contenteditable は一切使わない。
//
// タップした瞬間に確定する（決定ボタンは置かない）。
// 4択は選び直す必要がなく、1タップで進める方がテンポが良いため。

/**
 * @param {object} opts
 * @param {HTMLElement} opts.mount  選択肢を並べる要素
 * @param {Function} opts.onPick    タップされたとき (value:string) => void
 */
export function createChoices({ mount, onPick }) {
  let enabled = true;
  let buttons = [];

  /** 選択肢を並べ直す。 */
  function render(choices) {
    mount.innerHTML = '';
    buttons = [];

    for (const value of choices) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'choice';
      b.textContent = value;
      b.dataset.value = value;
      b.addEventListener('click', () => {
        if (!enabled) return;
        if (onPick) onPick(value);
      });
      mount.appendChild(b);
      buttons.push(b);
    }
    enabled = true;
  }

  function setEnabled(next) {
    enabled = next;
    for (const b of buttons) b.disabled = !next;
  }

  /** 正解を選べたときだけ、短く印を付ける（タップが通ったことを示す）。 */
  function markPicked(value) {
    for (const b of buttons) {
      if (b.dataset.value === value) b.classList.add('picked-ok');
    }
  }

  function clearMarks() {
    for (const b of buttons) b.classList.remove('picked-ok');
  }

  return { render, setEnabled, markPicked, clearMarks };
}
