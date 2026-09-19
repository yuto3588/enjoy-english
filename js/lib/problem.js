// Problem データ構造の共通ヘルパと不変条件チェック。
// DESIGN.md 4章 / 5章 に対応する。

/** 解説の出し分けキー（DESIGN.md 4章）。 */
export const PATTERNS = [
  'be_agreement',           // 主語と be動詞 が合わない
  'article_an',             // a と an の使い分け
  'plural_spelling',        // 複数形の綴り
  'third_person_s',         // 三単現の -s を付け忘れる
  'third_person_spelling',  // -s の付け方
  'do_does',                // 疑問文・否定文の do / does
  'verb_after_does',        // Does he plays〜? のように -s を残す
  'be_vs_do',               // be動詞の文に do を使う
  'ing_spelling',           // 現在進行形の綴り
  'pronoun_case',           // 代名詞の格
  'word_order',             // 語順

  // --- 小5 ---
  // 中1と内容は重なるが、解説の文面を分けるために別の名前にしてある
  //（解説は pattern:reason で引くため、同じ名前だと中1の文面が出てしまう）。
  'e5_be',                  // am / is / are
  'e5_article',             // a と an
  'e5_verb',                // 一般動詞の文（三単現は扱わない）
  'e5_plural',              // 複数形のつづり
  'e5_order'                // 語順
];

/** 類題を同じ形で出すための細分。数学版の form と同じ役割。 */
export const FORMS = [
  // Lv1
  'be_adj',          // He ___ happy.
  'be_role',         // He ___ a student.
  'article_single',  // This is ___ apple.

  // Lv2
  'verb_base',       // I ___ tennis.
  'plural_es',       // two ___（box → boxes）
  'plural_ies',      // two ___（city → cities）
  'plural_ves',      // two ___（knife → knives）
  'plural_irregular', // two ___（man → men）

  'word_order_svo',   // 並べ替え: だれが → どうする → なにを

  // Lv3 三単現の綴り
  'third_s', 'third_es', 'third_ies', 'third_irregular',

  // Lv4 疑問文・否定文・can
  'verb_after_does', 'can_base', 'does_question', 'dont_doesnt', 'be_question',

  // Lv5 現在進行形・代名詞・語順
  'ing_plain', 'ing_drop_e', 'ing_double',
  'pronoun_object', 'pronoun_possessive',
  'word_order_ing',

  // 小5
  'e5_be_adj',           // He ___ happy.
  'e5_be_role',          // I ___ a student.
  'e5_article_single',   // This is ___ apple.
  'e5_verb_base',        // I ___ tennis.
  'e5_plural_s', 'e5_plural_es', 'e5_plural_ies', 'e5_plural_ves', 'e5_plural_irregular',
  'e5_order_svo'         // 並べ替え
];

/** 入力方式。 */
export const INPUTS = ['choice', 'arrange'];

/**
 * 並べた語を1つの文にする。
 * 先頭を大文字にして、終わりにピリオドを付ける。
 *
 * 単語チップ自体は小文字で出す（大文字が文頭の手がかりになってしまうため）。
 * ただし I や Ken のように、どこに置いても大文字の語はそのままにする。
 */
export function toSentence(words) {
  if (!Array.isArray(words) || words.length === 0) return '';
  const head = words[0];
  const first = head.charAt(0).toUpperCase() + head.slice(1);
  return [first, ...words.slice(1)].join(' ') + '.';
}

/**
 * 選択肢を整える。
 * 重複を取り除き、正解が必ず含まれることを保証する。
 */
export function cleanChoices(choices, answer) {
  const out = [];
  for (const c of choices) {
    if (typeof c !== 'string' || c.length === 0) continue;
    if (!out.includes(c)) out.push(c);
  }
  if (!out.includes(answer)) out.unshift(answer);
  return out;
}

/**
 * traps を整える。
 * 正解と同じもの、重複、選択肢に無いものを取り除く。
 */
export function cleanTraps(traps, answer, choices, input = 'choice') {
  const seen = new Set();
  const out = [];
  for (const t of traps) {
    if (!t || typeof t.value !== 'string') continue;
    if (t.value === answer) continue;
    if (seen.has(t.value)) continue;
    // 選択式のときだけ、選択肢に無い誤答を落とす。
    // 並べ替えは選択肢そのものが誤答にならないので、この検査はしない。
    if (input === 'choice' && !choices.includes(t.value)) continue;
    seen.add(t.value);
    out.push(t);
  }
  return out;
}

/**
 * Problem が満たすべき条件を検査し、違反の説明を配列で返す。
 * 問題がなければ空配列。テストと preview.html から呼ぶ。
 */
export function validateProblem(p) {
  const errors = [];
  const push = (msg) => errors.push(msg);

  if (!p || typeof p !== 'object') return ['Problem がオブジェクトではない'];

  if (typeof p.id !== 'string' || p.id.length === 0) push('id が空');
  if (!Number.isInteger(p.level) || p.level < 1 || p.level > 5) push(`level が不正: ${p.level}`);
  if (!PATTERNS.includes(p.pattern)) push(`未知の pattern: ${p.pattern}`);
  if (!FORMS.includes(p.form)) push(`未知の form: ${p.form}`);
  if (!INPUTS.includes(p.input)) push(`未知の input: ${p.input}`);

  if (typeof p.prompt !== 'string' || p.prompt.trim().length === 0) push('prompt（日本語の手がかり）が空');
  if (typeof p.question !== 'string' || p.question.trim().length === 0) push('question が空');
  if (typeof p.answer !== 'string' || p.answer.trim().length === 0) push('answer が空');

  if (!p.facts || typeof p.facts !== 'object' || Array.isArray(p.facts)) {
    push('facts が無い');
  }

  // 選択肢（choice のときは選ぶもの、arrange のときは並べる単語）
  if (!Array.isArray(p.choices)) {
    push('choices が配列でない');
  } else if (p.input === 'choice') {
    if (p.choices.length < 2) push(`選択肢が少なすぎる: ${p.choices.length}`);
    if (p.choices.length > 4) push(`選択肢が多すぎる: ${p.choices.length}`);
    if (new Set(p.choices).size !== p.choices.length) push(`選択肢に重複がある: ${p.choices.join(' / ')}`);
    if (!p.choices.includes(p.answer)) push(`正解が選択肢に無い: ${p.answer}`);
    for (const c of p.choices) {
      if (typeof c !== 'string' || c.trim().length === 0) push('空の選択肢がある');
    }
    if (!p.question.includes('___')) push(`空所（___）が無い: ${p.question}`);
  } else if (p.input === 'arrange') {
    if (p.choices.length < 3) push(`並べる単語が少なすぎる: ${p.choices.length}`);
    if (p.choices.length > 6) push(`並べる単語が多すぎる: ${p.choices.length}`);
    for (const c of p.choices) {
      if (typeof c !== 'string' || c.trim().length === 0) push('空の単語がある');
      if (/[.,!?]/.test(c)) push(`単語に記号が入っている（手がかりになる）: ${c}`);
    }
    // 並べ替えた結果が答えと一致しうること
    if (toSentence(p.choices.slice().sort()) === '') push('並べる単語が空');
    const words = p.answer.replace(/\.$/, '').split(' ');
    const lowered = words.map((w, i) => (i === 0 ? w.charAt(0).toLowerCase() + w.slice(1) : w));
    const asChips = [...p.choices].sort().join(' ');
    const asAnswer = [...lowered].sort().join(' ');
    if (asChips !== asAnswer && [...p.choices].sort().join(' ') !== [...words].sort().join(' ')) {
      push(`並べる単語と答えが噛み合わない: ${p.choices.join(' / ')} → ${p.answer}`);
    }
  }

  // 解説
  if (!Array.isArray(p.steps) || p.steps.length === 0) {
    push('steps が空');
  } else {
    if (p.steps.length > 3) push(`steps が3行を超えている: ${p.steps.length}行`);
    p.steps.forEach((s, i) => {
      if (typeof s !== 'string' || s.trim().length === 0) push(`steps[${i}] が空`);
    });
  }

  // 誤答の受け皿
  if (!Array.isArray(p.traps) || p.traps.length === 0) {
    push('traps が1件もない');
  } else {
    const seen = new Set();
    p.traps.forEach((t, i) => {
      if (!t || typeof t !== 'object') return push(`traps[${i}] がオブジェクトではない`);
      if (typeof t.value !== 'string' || t.value.length === 0) push(`traps[${i}].value が空`);
      if (typeof t.reason !== 'string' || t.reason.trim().length === 0) push(`traps[${i}].reason が空`);
      if (t.value === p.answer) push(`traps[${i}] が正解と同じ: ${t.value}`);
      if (seen.has(t.value)) push(`traps の value が重複: ${t.value}`);
      // 選択式では、誤答は必ず選択肢のどれかになる
      if (p.input === 'choice' && Array.isArray(p.choices) && !p.choices.includes(t.value)) {
        push(`traps[${i}] が選択肢に無い: ${t.value}`);
      }
      seen.add(t.value);
    });

    // 選択式では、どの誤答を選んでも専用解説が出せるようにする
    if (p.input === 'choice' && Array.isArray(p.choices)) {
      const covered = new Set(p.traps.map((t) => t.value));
      for (const c of p.choices) {
        if (c !== p.answer && !covered.has(c)) {
          push(`選択肢 "${c}" に対応する trap が無い`);
        }
      }
    }
  }

  return errors;
}
