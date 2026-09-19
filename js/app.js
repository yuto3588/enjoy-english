// 画面遷移・セッション制御。
//
// Phase 5 までの範囲:
//   ホーム（時間選択）→ 問題（タイマー・休憩・やめる）→ 終了
//   4択と並べ替えの2つの入力
//   誤答したら 解説 → 類題 → 易しい問題 → 明日に持ち越し（最大3手で必ず終了）
//   どの選択肢を選んだかで、専用の解説を出し分ける
//   持ち越しキューと成績を localStorage に保存し、次回に引き継ぐ
//   通常フローの問題が10問たまるたびに難易度を自動調整
//
// Phase 5 では作らないもの:
//   - Lv3-5 の出題 … Phase 6
//   - PWA 化       … Phase 7
//
// 画面に出さないもの（内部では持っている）:
//   レベル / 正答率 / 連続日数 / 累計学習時間 / 前回の点数

import { createRng, randomSeed } from './lib/rng.js';
import { generate } from './generators/index.js';
import { createChoices } from './choices.js';
import { createArrange } from './arrange.js';
import { STEP, nextStep, retrySpec, easierSpec } from './recovery.js';
import { explanationFor } from './explain.js';
import { createCarryOverQueue, MAX_AT_SESSION_START } from './carryover.js';
import { createTimer, remainingLabel } from './timer.js';
import { createLevelController } from './level.js';
import { load, save, clear, defaultState } from './storage.js';

const params = new URLSearchParams(location.search);

// --- 開発用のパラメータ（本番の操作では使わない） -------------------------
//   ?level=1|2   レベルを固定する（自動調整を止める）
//   ?minutes=1   時間ボタンの値を上書きする（時間切れの確認用）
//   ?reset=1     保存内容を消して起動する
//   ?newday=1    「今日はまだやっていない」状態にして起動する
const LEVEL_OVERRIDE = (() => {
  const raw = Number(params.get('level'));
  return Number.isInteger(raw) && raw >= 1 && raw <= 2 ? raw : null;
})();
const MINUTES_OVERRIDE = (() => {
  const raw = Number(params.get('minutes'));
  return Number.isFinite(raw) && raw > 0 ? raw : null;
})();

const FLASH_MS = 600;

// 学習量を自宅 PC のサーバーに残すための宛先（保護者が確認するため）。
// 送るのは 日付 / 選んだ時間 / 解いた問題数 だけ。正誤も点数も送らない。
// 宛先は同じ配信元の相対パスのみ。応答が無ければ黙って諦める。
const LOG_ENDPOINT = './_log';

const el = {
  app: document.getElementById('app'),
  home: document.getElementById('screen-home'),
  practice: document.getElementById('screen-practice'),
  done: document.getElementById('screen-done'),
  carryNote: document.getElementById('carryNote'),
  stage: document.getElementById('stage'),
  prompt: document.getElementById('prompt'),
  question: document.getElementById('question'),
  answerLine: document.getElementById('answerLine'),
  choices: document.getElementById('choices'),
  chips: document.getElementById('chips'),
  dunnoBtn: document.getElementById('dunnoBtn'),
  progressFill: document.getElementById('progressFill'),
  remain: document.getElementById('remain'),
  pauseBtn: document.getElementById('pauseBtn'),
  quitBtn: document.getElementById('quitBtn'),
  doneCount: document.getElementById('doneCount'),
  homeBtn: document.getElementById('homeBtn'),
  overlay: document.getElementById('overlay'),
  overlayExpr: document.getElementById('overlayExpr'),
  overlayLines: document.getElementById('overlayLines'),
  overlayBtn: document.getElementById('overlayBtn'),
  pausePanel: document.getElementById('pausePanel'),
  resumeBtn: document.getElementById('resumeBtn'),
  quitFromPauseBtn: document.getElementById('quitFromPauseBtn')
};

// --- 保存内容の読み込み ---------------------------------------------------
// load() は何が起きても必ず使える状態を返す。ここで落ちることはない。

const stored = (() => {
  if (params.get('reset') === '1') {
    clear();
    return defaultState();
  }
  const s = load();
  if (params.get('newday') === '1') s.sessions = [];
  return s;
})();

const rng = createRng(randomSeed());
const queue = createCarryOverQueue(stored.carryOver);
const sessions = stored.sessions;
const levels = createLevelController({
  level: LEVEL_OVERRIDE || stored.level,
  history: stored.history,
  sinceJudge: stored.sinceJudge,
  pinned: Boolean(LEVEL_OVERRIDE)
});

/**
 * いまの状態をまるごと保存する。失敗しても何も起きない。
 * ?level= で固定して開いているときは、そのレベルを保存しない
 * （開発用に覗いただけで学習の記録が上書きされないように）。
 */
function persist() {
  save({
    level: LEVEL_OVERRIDE ? stored.level : levels.getLevel(),
    sinceJudge: levels.getSinceJudge(),
    history: levels.getHistory(),
    carryOver: queue.list(),
    sessions
  });
}

const state = {
  step: STEP.NORMAL,
  current: null,
  origin: null,
  fromCarryOver: false,
  recent: [],
  solved: 0,
  pending: [],
  minutes: 0,
  timer: null,
  timeUp: false,
  logged: false
};

const choices = createChoices({ mount: el.choices, onPick: handlePick });
const arrange = createArrange({
  answerMount: el.answerLine,
  chipMount: el.chips,
  onComplete: handlePick
});

function inputOf() {
  return state.current ? state.current.input : 'choice';
}

// --- 画面 -----------------------------------------------------------------

function showScreen(name) {
  el.home.classList.toggle('active', name === 'home');
  el.practice.classList.toggle('active', name === 'practice');
  el.done.classList.toggle('active', name === 'done');
}

function updateProgress(remainingMs, durationMs) {
  const ratio = durationMs > 0 ? 1 - remainingMs / durationMs : 0;
  el.progressFill.style.width = `${Math.min(1, Math.max(0, ratio)) * 100}%`;
}

function setAnswering(on) {
  if (inputOf() === 'arrange') arrange.setEnabled(on);
  else choices.setEnabled(on);
  el.dunnoBtn.disabled = !on;
}

function openOverlay({ expr = '', lines, buttonLabel, message = false }) {
  el.overlayExpr.textContent = expr;
  el.overlay.classList.toggle('message', message);

  el.overlayLines.innerHTML = '';
  lines.forEach((text, i) => {
    const li = document.createElement('li');
    const n = document.createElement('span');
    n.className = 'n';
    n.textContent = String(i + 1);
    const body = document.createElement('span');
    body.textContent = text;
    li.append(n, body);
    el.overlayLines.appendChild(li);
  });

  el.overlayBtn.textContent = buttonLabel;
  el.overlay.classList.add('active');
}

function closeOverlay() {
  el.overlay.classList.remove('active');
}

// --- ホーム ---------------------------------------------------------------

function todayKey(d = new Date()) {
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

function hasSessionToday() {
  return sessions.some((s) => s.date === todayKey());
}

function showHome() {
  // 持ち越しがあるときだけ、小さく知らせる。
  // その日すでに1回やっていたら出さない。
  const n = queue.size();
  el.carryNote.textContent =
    n > 0 && !hasSessionToday() ? `昨日の続きが${n}問あるよ` : '';

  showScreen('home');
}

// --- 出題 -----------------------------------------------------------------

function specForCurrentStep() {
  if (state.step === STEP.RETRY) return retrySpec(state.origin);
  if (state.step === STEP.EASIER) return easierSpec(state.origin);

  const carried = state.pending.shift();
  if (carried) {
    return { level: carried.level, pattern: carried.pattern, carried: true };
  }
  return { level: levels.getLevel() };
}

function nextProblem() {
  const spec = specForCurrentStep();

  state.current = generate(spec.level, rng, state.recent, {
    pattern: spec.pattern,
    form: spec.form,
    easier: spec.easier,
    avoidKey: spec.avoidKey
  });
  state.fromCarryOver = Boolean(spec.carried);

  state.recent.push(state.current);
  if (state.recent.length > 3) state.recent.shift();

  el.prompt.textContent = state.current.prompt;
  el.app.dataset.input = state.current.input;

  if (state.current.input === 'arrange') {
    // question には正解の文が入っているので、並べ替えのときは画面に出さない
    el.question.textContent = '';
    arrange.render(state.current.choices);
  } else {
    el.question.textContent = state.current.question;
    choices.render(state.current.choices);
  }

  setAnswering(true);
}

// --- 解答 -----------------------------------------------------------------

function isAnswering() {
  return state.step === STEP.NORMAL || state.step === STEP.RETRY || state.step === STEP.EASIER;
}

function handlePick(value) {
  if (!isAnswering()) return;
  setAnswering(false);

  if (value === state.current.answer) onCorrect(value);
  else onWrong(value);
}

/**
 * 難易度調整の材料にするのは通常フローの1回目の解答だけ。
 * 誤答フロー中の類題・易問は記録しない。
 */
function recordResult(correct) {
  levels.record(state.current.pattern, correct);
}

function onCorrect(value) {
  const from = state.step;

  if (from === STEP.NORMAL) recordResult(true);

  if (from === STEP.RETRY || from === STEP.EASIER) queue.resolve(state.origin.pattern);
  else if (state.fromCarryOver) queue.resolve(state.current.pattern);

  state.step = nextStep(from, true);
  state.origin = null;
  persist();

  // 正解のフィードバックは 0.6 秒の色の変化のみ。
  if (inputOf() === 'arrange') arrange.markOk();
  else choices.markPicked(value);

  el.stage.classList.add('flash');
  setTimeout(() => {
    el.stage.classList.remove('flash');
    arrange.clearMarks();
    choices.clearMarks();
    advance();
  }, FLASH_MS);
}

/** @param {string|null} submitted 選んだもの。「わからない」なら null */
function onWrong(submitted) {
  const from = state.step;

  if (from === STEP.NORMAL) recordResult(false);

  // 「わからない」と、持ち越し問題の誤答は、解説を1画面出すだけで通常フローに戻す。
  if (submitted === null || (from === STEP.NORMAL && state.fromCarryOver)) {
    if (state.fromCarryOver) queue.add(state.current.pattern, state.current.level);
    state.step = STEP.EXPLAIN_ONLY;
    persist();
    return showExplanation(submitted);
  }

  state.step = nextStep(from, false);

  if (state.step === STEP.EXPLAIN) {
    state.origin = state.current;
    persist();
    return showExplanation(submitted);
  }

  if (state.step === STEP.EASIER) {
    return nextProblem();
  }

  if (state.step === STEP.CARRY_OVER) {
    queue.add(state.origin.pattern, state.origin.level);
    persist();
    return openOverlay({
      lines: ['ここは明日もう一回やろう'],
      buttonLabel: 'つぎへ',
      message: true
    });
  }
}

function showExplanation(submitted) {
  const p = state.current;
  const { lines } = explanationFor(p, submitted);
  openOverlay({
    expr: p.input === 'arrange' ? p.question : p.question.replace('___', p.answer),
    lines,
    buttonLabel: 'わかった'
  });
}

// --- 学習量の記録（保護者向け） -------------------------------------------

/**
 * その回の学習量を1件だけ記録する。
 * 記録できなくてもアプリは何事もなく続く。1問も解いていない回は記録しない。
 */
function logSession() {
  if (state.logged || !state.minutes || state.solved <= 0) return;

  // iframe の中で動いているときは記録しない。
  // 本物のアプリは iframe に入らない。テストがアプリを読み込んで動かすので、
  // この guard が無いとテストを走らせるたびに記録が増えてしまう。
  if (window.top !== window.self) return;

  state.logged = true;

  try {
    fetch(LOG_ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date: todayKey(),
        minutes: state.minutes,
        solved: state.solved
      }),
      keepalive: true
    }).catch(() => {});
  } catch {
    /* 送れなくても構わない */
  }
}

// --- セッションの進行 -----------------------------------------------------

/**
 * 1つの問題（誤答フローを含む）が片付いたときに呼ぶ。
 * 時間切れの判定はここでしか行わない。走っている誤答フローは必ず最後まで終わらせる。
 */
function advance() {
  state.solved += 1;

  if (state.timeUp) finish();
  else nextProblem();
}

function onTimeUp() {
  state.timeUp = true;
  // 残り時間の表示は消す。0分と出し続けるのは急かしになるため。
  el.remain.textContent = '';
  el.progressFill.style.width = '100%';
}

function finish() {
  if (state.timer) state.timer.stop();
  setAnswering(false);
  closeOverlay();
  el.pausePanel.classList.remove('active');

  sessions.push({ date: todayKey(), minutes: state.minutes, solved: state.solved });
  if (sessions.length > 30) sessions.shift();
  persist();
  logSession();

  // やった問題数だけ。10分の日と60分の日で文言を変えない。
  el.doneCount.textContent = `${state.solved}問`;
  showScreen('done');
}

function startSession(minutes) {
  state.step = STEP.NORMAL;
  state.origin = null;
  state.fromCarryOver = false;
  state.recent = [];
  state.solved = 0;
  state.minutes = minutes;
  state.timeUp = false;
  state.logged = false;
  state.pending = queue.take(MAX_AT_SESSION_START);

  levels.startSession();

  if (state.timer) state.timer.stop();
  const durationMs = minutes * 60 * 1000;
  state.timer = createTimer({
    durationMs,
    onTick: (remaining) => {
      if (state.timeUp) return;
      el.remain.textContent = remainingLabel(remaining);
      updateProgress(remaining, durationMs);
    },
    onExpire: onTimeUp
  });

  closeOverlay();
  el.pausePanel.classList.remove('active');
  showScreen('practice');
  nextProblem();
  state.timer.start();
}

function goHome() {
  if (state.timer) state.timer.stop();
  showHome();
}

// --- イベント -------------------------------------------------------------

for (const btn of document.querySelectorAll('.time')) {
  btn.addEventListener('click', () => {
    startSession(MINUTES_OVERRIDE || Number(btn.dataset.min));
  });
}

// 「わからない」。当てずっぽうを強いるより、降参できる方が続く。
el.dunnoBtn.addEventListener('click', () => {
  if (!isAnswering()) return;
  setAnswering(false);
  onWrong(null);
});

el.overlayBtn.addEventListener('click', () => {
  const from = state.step;
  if (from !== STEP.EXPLAIN && from !== STEP.EXPLAIN_ONLY && from !== STEP.CARRY_OVER) return;

  closeOverlay();
  state.step = nextStep(from, false);

  if (state.step === STEP.RETRY) nextProblem();
  else advance();
});

el.pauseBtn.addEventListener('click', () => {
  if (state.timer) state.timer.pause();
  el.pausePanel.classList.add('active');
});

el.resumeBtn.addEventListener('click', () => {
  el.pausePanel.classList.remove('active');
  if (state.timer) state.timer.resume();
});

// やめるは確認を挟まない。引き止めない。
el.quitBtn.addEventListener('click', finish);
el.quitFromPauseBtn.addEventListener('click', finish);

el.homeBtn.addEventListener('click', goHome);

// アプリが閉じられる直前にも一度だけ保存しておく。
window.addEventListener('pagehide', () => {
  persist();
  logSession();
});

// --- オフライン対応 -------------------------------------------------------
// Service Worker が登録できなくても（対応していない、HTTPS でない等）
// アプリ自体は普通に動く。失敗しても黙って続ける。
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// --- 起動 -----------------------------------------------------------------

showHome();
