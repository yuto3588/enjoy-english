// セッションのカウントダウン。Enjoy数学 から移植（内容は同じ）。
//
// 守っていること:
//   - アプリがバックグラウンドに回っている間は時間を減らさない
//   - 一時停止できる（席を離れられることが継続の条件）
//   - 残り時間は「分」でしか出さない。秒が刻まれるのは急かしになるため
//   - 0 になっても勝手に画面を切らない。onExpire を呼ぶだけ

export function createTimer({
  durationMs,
  onTick,
  onExpire,
  now = () => Date.now(),
  isVisible = () => typeof document === 'undefined' || document.visibilityState === 'visible'
}) {
  let remaining = Math.max(0, durationMs);
  let running = false;
  let expired = false;
  let last = 0;
  let handle = null;

  function tick() {
    const t = now();
    const dt = Math.max(0, t - last);
    last = t;

    if (!running || expired || !isVisible()) return;

    remaining = Math.max(0, remaining - dt);
    if (onTick) onTick(remaining, durationMs);

    if (remaining === 0) {
      expired = true;
      running = false;
      if (onExpire) onExpire();
    }
  }

  // バックグラウンドから戻ってきたとき、離れていた分を差し引かないよう基準を打ち直す。
  function handleVisibility() {
    last = now();
  }

  function start() {
    if (handle) return;
    running = true;
    last = now();
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', handleVisibility);
    }
    handle = setInterval(tick, 250);
    if (onTick) onTick(remaining, durationMs);
  }

  function pause() { running = false; }

  function resume() {
    if (expired) return;
    running = true;
    last = now();
  }

  function stop() {
    running = false;
    if (handle) { clearInterval(handle); handle = null; }
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', handleVisibility);
    }
  }

  return {
    start, pause, resume, stop, tick,
    remainingMs: () => remaining,
    isRunning: () => running,
    isExpired: () => expired
  };
}

/** 残り時間の表示。分だけを出す。秒を刻むと急かしになる。 */
export function remainingLabel(remainingMs) {
  const minutes = Math.max(1, Math.ceil(remainingMs / 60000));
  return `のこり ${minutes}分`;
}
