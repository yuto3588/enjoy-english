// Lv1-2 ジェネレータの単体テスト。

import { test, assert, assertEqual, assertDeepEqual } from './runner.js';
import { createRng } from '../js/lib/rng.js';
import { generate, patternsFor, formsFor, allPatterns, SUPPORTED_LEVELS } from '../js/generators/index.js';
import { validateProblem, PATTERNS, FORMS } from '../js/lib/problem.js';
import { NOUNS, VERBS, SUBJECTS, isThirdSingular } from '../js/data/words.js';

const N = 1500;

/** 選択式の問題だけを取り出す（並べ替えは選択肢の意味が違うため）。 */
function onlyChoice(list) {
  return list.filter((p) => p.input === 'choice');
}

function sample(level, seed = 20260919, n = N, opts = {}) {
  const rng = createRng(seed + level);
  const out = [];
  const recent = [];
  for (let i = 0; i < n; i++) {
    const p = generate(level, rng, recent, opts);
    out.push(p);
    recent.push(p);
    if (recent.length > 3) recent.shift();
  }
  return out;
}

/**
 * 問題文の先頭から主語を特定する。
 * "Ken and Yuki" を "Ken" と取り違えないよう、いちばん長い一致を選ぶ。
 */
function subjectOf(question) {
  let best = null;
  for (const s of SUBJECTS) {
    if (!question.startsWith(s.text + ' ')) continue;
    if (!best || s.text.length > best.text.length) best = s;
  }
  return best;
}

/** 全レベル × 全 pattern × 全 form をまんべんなく作る。 */
function everyKind(seed = 4242, perKind = 60, opts = {}) {
  const rng = createRng(seed);
  const out = [];
  for (const level of SUPPORTED_LEVELS) {
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        for (let i = 0; i < perKind; i++) {
          out.push(generate(level, rng, [], { pattern, form, ...opts }));
        }
      }
    }
  }
  return out;
}

// --- Problem の形 ----------------------------------------------------------

test('全レベル: Problem が不変条件を満たす', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      const errors = validateProblem(p);
      assert(errors.length === 0, `Lv${level} ${p.question}\n  ${errors.join('\n  ')}`);
    }
  }
});

test('全レベル: pattern と form が既知の値になる', () => {
  for (const level of SUPPORTED_LEVELS) {
    const expected = patternsFor(level);
    for (const p of sample(level)) {
      assert(PATTERNS.includes(p.pattern), `未知の pattern: ${p.pattern}`);
      assert(FORMS.includes(p.form), `未知の form: ${p.form}`);
      assert(expected.includes(p.pattern), `Lv${level} で想定外の pattern: ${p.pattern}`);
      assert(formsFor(p.pattern, level).includes(p.form), `pattern ${p.pattern} が取らない form: ${p.form}`);
    }
  }
});

test('全レベル: 定義した form がすべて実際に生成される', () => {
  for (const level of SUPPORTED_LEVELS) {
    const seen = new Set(sample(level).map((p) => p.form));
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        assert(seen.has(form), `Lv${level} で form "${form}" が一度も出なかった`);
      }
    }
  }
});

// --- 選択肢 ----------------------------------------------------------------

test('全レベル: 正解が選択肢にちょうど1つ含まれる', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      if (p.input !== 'choice') continue;
      const hits = p.choices.filter((c) => c === p.answer).length;
      assertEqual(hits, 1, `正解が選択肢に ${hits} 個: ${p.question}`);
    }
  }
});

test('全レベル: 選択肢に重複がない', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      if (p.input !== 'choice') continue;
      assertEqual(new Set(p.choices).size, p.choices.length, `選択肢が重複: ${p.choices.join(' / ')}`);
    }
  }
});

test('全レベル: 選択肢は2〜4個', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      if (p.input !== 'choice') continue;
      assert(p.choices.length >= 2 && p.choices.length <= 4, `選択肢の数が不正: ${p.choices.length}`);
    }
  }
});

test('全レベル: どの誤答の選択肢にも専用の trap がある', () => {
  // どれを選んでも専用解説が出せることを保証する
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      if (p.input !== 'choice') continue;
      const covered = new Set(p.traps.map((t) => t.value));
      for (const c of p.choices) {
        if (c === p.answer) continue;
        assert(covered.has(c), `選択肢 "${c}" に trap が無い: ${p.question}`);
      }
    }
  }
});

test('全レベル: trap が正解と重ならない', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      assert(p.traps.length >= 1, `traps が空: ${p.question}`);
      for (const t of p.traps) {
        assert(t.value !== p.answer, `trap が正解と同じ: ${p.question}`);
        if (p.input === 'choice') assert(p.choices.includes(t.value), `trap が選択肢に無い: ${t.value}`);
      }
    }
  }
});

// --- 出題の並び ------------------------------------------------------------

test('全レベル: 直近3問と同じ問題が出ない', () => {
  for (const level of SUPPORTED_LEVELS) {
    const problems = sample(level);
    for (let i = 1; i < problems.length; i++) {
      const window = problems.slice(Math.max(0, i - 3), i).map((p) => p.question);
      assert(!window.includes(problems[i].question), `Lv${level} 重複: ${problems[i].question}`);
    }
  }
});

test('全レベル: 同じシードからは同じ問題列が出る', () => {
  for (const level of SUPPORTED_LEVELS) {
    assertDeepEqual(sample(level, 777, 120), sample(level, 777, 120), `Lv${level} 再現しない`);
  }
});

test('全レベル: シードを変えても例外を投げない', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (let seed = 1; seed <= 30; seed++) {
      const rng = createRng(seed * 7919);
      const recent = [];
      for (let i = 0; i < 40; i++) {
        const p = generate(level, rng, recent);
        recent.push(p);
        if (recent.length > 3) recent.shift();
      }
    }
  }
});

test('未対応のレベル / 未知の pattern はエラーになる', () => {
  const rng = createRng(1);
  for (const level of [0, -1, 6, 9]) {
    let threw = false;
    try { generate(level, rng, []); } catch { threw = true; }
    assert(threw, `レベル ${level} でエラーにならなかった`);
  }
  let threw = false;
  try { generate(1, rng, [], { pattern: 'そんなものはない' }); } catch { threw = true; }
  assert(threw, '未知の pattern が素通りした');
});

// --- 解説 ------------------------------------------------------------------

test('全レベル: steps は3行以内で、最後の行に答えが入っている', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      assert(p.steps.length >= 1 && p.steps.length <= 3, `行数が不正: ${p.question}`);
      const last = p.steps[p.steps.length - 1];
      assert(last.includes(p.answer), `最後の行に答えがない: ${p.question} / ${last}`);
    }
  }
});

test('全レベル: 解説に英語の文法用語を使わない', () => {
  // 学校で習う日本語の用語で書く（CLAUDE.md の文言方針）
  const banned = ['subject', 'verb', 'plural', 'singular', 'article', 'noun', 'tense'];
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level, 555, 300)) {
      const text = p.steps.join(' ').toLowerCase();
      for (const word of banned) {
        assert(!text.includes(word), `英語の文法用語 "${word}" が入っている: ${p.steps.join(' / ')}`);
      }
    }
  }
});

test('全レベル: 解説に評価語を使わない', () => {
  const banned = ['残念', 'おしい', '惜しい', '間違', 'まちがい', 'ミス', 'すばらしい', 'がんばろう'];
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level, 999, 300)) {
      const text = p.steps.join(' ');
      for (const word of banned) {
        assert(!text.includes(word), `評価語 "${word}" が入っている: ${text}`);
      }
    }
  }
});

test('全レベル: 日本語の手がかりが必ず付く', () => {
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      assert(p.prompt.trim().length > 0, `prompt が空: ${p.question}`);
      assert(/[ぁ-んァ-ヶ一-龠]/.test(p.prompt), `prompt に日本語が無い: ${p.prompt}`);
    }
  }
});

// --- 易しくする指定 --------------------------------------------------------

test('易しい問題: 選択肢が2つになる', () => {
  for (const p of onlyChoice(everyKind(1111, 30, { easier: true }))) {
    assertEqual(p.choices.length, 2, `2択になっていない: ${p.question} / ${p.choices.join(' / ')}`);
    assert(p.choices.includes(p.answer), '正解が残っていない');
    assert(validateProblem(p).length === 0, `不変条件違反: ${p.question}`);
  }
});

test('易しい問題: pattern と form は変わらない', () => {
  const rng = createRng(2222);
  for (const level of SUPPORTED_LEVELS) {
    for (const pattern of patternsFor(level)) {
      for (const form of formsFor(pattern, level)) {
        for (let i = 0; i < 20; i++) {
          const p = generate(level, rng, [], { pattern, form, easier: true });
          assertEqual(p.pattern, pattern);
          assertEqual(p.form, form);
        }
      }
    }
  }
});

// --- Lv1 の中身 ------------------------------------------------------------

test('Lv1: be動詞 の問題は am / is / are の3択になる', () => {
  for (const p of sample(1)) {
    if (p.pattern !== 'be_agreement') continue;
    assertDeepEqual(p.choices.slice().sort(), ['am', 'are', 'is'], `選択肢が違う: ${p.choices.join(' / ')}`);
  }
});

test('Lv1: be動詞 の答えが主語と合っている', () => {
  for (const p of sample(1)) {
    if (p.pattern !== 'be_agreement') continue;
    const subject = subjectOf(p.question);
    assert(subject, `主語を特定できない: ${p.question}`);
    assertEqual(p.answer, subject.be, `be動詞 が主語と合わない: ${p.question}`);
  }
});

test('Lv1: 複数の主語には複数形の名詞が続く', () => {
  for (const p of sample(1)) {
    if (p.form !== 'be_role') continue;
    const subject = subjectOf(p.question);
    if (subject.person === 'plural') {
      assert(!p.question.includes(' a '), `複数の主語なのに a が付いている: ${p.question}`);
    } else {
      assert(p.question.includes(' a '), `単数の主語なのに a が無い: ${p.question}`);
    }
  }
});

test('Lv1: a / an が辞書どおりに出る', () => {
  for (const p of sample(1)) {
    if (p.pattern !== 'article_an') continue;
    const noun = NOUNS.find((n) => p.answer.endsWith(' ' + n.word));
    assert(noun, `名詞を特定できない: ${p.answer}`);
    assertEqual(p.answer, `${noun.article} ${noun.word}`, `a / an が違う: ${p.answer}`);
  }
});

test('Lv1: すべての名詞が a / an の問題に出る', () => {
  const seen = new Set();
  for (const p of sample(1, 31337, 4000)) {
    if (p.pattern !== 'article_an') continue;
    seen.add(p.answer.split(' ')[1]);
  }
  for (const n of NOUNS) {
    assert(seen.has(n.word), `辞書にあるのに出題されない名詞: ${n.word}`);
  }
});

// --- Lv2 の中身 ------------------------------------------------------------

test('Lv2: 動詞の問題は三人称単数以外の主語になる', () => {
  for (const p of sample(2)) {
    if (p.form !== 'verb_base') continue;
    const subject = subjectOf(p.question);
    assert(subject, `主語を特定できない: ${p.question}`);
    assert(!isThirdSingular(subject), `Lv2 に三人称単数が出ている: ${p.question}`);
  }
});

test('Lv2: 動詞の問題の答えは必ず原形', () => {
  for (const p of sample(2)) {
    if (p.form !== 'verb_base') continue;
    const verb = VERBS.find((v) => v.base === p.answer);
    assert(verb, `原形でない答え: ${p.answer}`);
    assert(p.choices.includes(verb.third), `-s 形が選択肢に無い: ${p.question}`);
  }
});

test('Lv2: -s の付けすぎを拾う trap がある', () => {
  for (const p of sample(2)) {
    if (p.form !== 'verb_base') continue;
    const reasons = p.traps.map((t) => t.reason);
    assert(reasons.includes('third_person_s_overused'), `-s の付けすぎを拾えていない: ${p.question}`);
  }
});

test('Lv2: 複数形の問題は綴りが変わる名詞だけを使う', () => {
  for (const p of sample(2)) {
    if (p.pattern !== 'plural_spelling') continue;
    const noun = NOUNS.find((n) => n.plural === p.answer);
    assert(noun, `名詞を特定できない: ${p.answer}`);
    assert(noun.plural !== `${noun.word}s`, `+s で済む語が出ている（練習にならない）: ${noun.word}`);
    assert(p.choices.includes(`${noun.word}s`), `よくある綴り誤りが選択肢に無い: ${p.question}`);
  }
});

test('Lv2: 複数形のすべての型が出題される', () => {
  const seen = new Set();
  for (const p of sample(2, 4242, 3000)) {
    if (p.pattern === 'plural_spelling') seen.add(p.form);
  }
  for (const form of ['plural_es', 'plural_ies', 'plural_ves', 'plural_irregular']) {
    assert(seen.has(form), `複数形の型 "${form}" が出題されない`);
  }
});

test('Lv2: 選択式の問題文に元の語が必ず示されている', () => {
  for (const p of onlyChoice(sample(2))) {
    const base = p.form === 'verb_base'
      ? VERBS.find((v) => v.base === p.answer).base
      : NOUNS.find((n) => n.plural === p.answer).word;
    assert(p.question.includes(base), `元の語が示されていない: ${p.question}`);
  }
});

// --- 不自然な文が出ないこと ------------------------------------------------

test('所有できないものを「持っている」文に使わない', () => {
  // 辞書には man / woman / child / city のように所有できない名詞が入っている。
  // have を使うわくを作ると「私は女の人を持っています」という文ができてしまう。
  for (const level of SUPPORTED_LEVELS) {
    for (const p of sample(level)) {
      // 文のわくを組み立てる pattern だけを見る。動詞そのものの have は辞書の目的語なので対象外。
      if (p.pattern !== 'article_an' && p.pattern !== 'plural_spelling') continue;
      assert(!/\bhave\b/.test(p.question), `have を含む出題がある: ${p.question}`);
      assert(!p.prompt.includes('持っています'), `「持っています」を含む出題がある: ${p.prompt}`);
    }
  }
});

test('a / an のわくは、どの名詞でも成立する形だけを使う', () => {
  for (const p of sample(1)) {
    if (p.pattern !== 'article_an') continue;
    assert(
      /^(This|That) is ___\.$/.test(p.question),
      `想定外のわく: ${p.question}`
    );
  }
});

test('複数形は「単数 → 複数」の書きかえで出す', () => {
  for (const p of sample(2)) {
    if (p.pattern !== 'plural_spelling') continue;
    assert(
      /^one [a-z]+ → two ___$/.test(p.question),
      `想定外の形: ${p.question}`
    );
  }
});
