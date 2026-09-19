// 誤答パターン別の解説（DESIGN.md 4章 / 7章）。
//
// 4択のどれを選んだかで、必要な説明はまったく違う。
//   are のところで am を選んだ → 「am を使うのは I のときだけ」
//   are のところで is を選んだ → 「is を使うのは1人・1つのとき」
// なので trap の reason を選択肢ごとに分け、それぞれに専用の解説を持つ。
//
// テンプレートに差し込む数値・語は、ジェネレータが Problem.facts に入れて渡す。
// ここで英文を解析し直すことはしない。
//
// 文言の原則（CLAUDE.md）:
//   - 評価語を使わない。「残念」「間違い」は書かない
//   - 英語の文法用語（subject, verb…）を使わない。学校で習う日本語で書く
//   - 3行以内

const TEMPLATES = {
  // --- be動詞 ---

  'be_agreement:be_am_only_for_i': (f) => [
    'am を使うのは、主語が I のときだけ',
    `主語は ${f.subject}`,
    `答えは ${f.be}`
  ],
  'be_agreement:be_is_for_singular': (f) => [
    'is を使うのは、He や She のように1人・1つのとき',
    `主語は ${f.subject}`,
    `答えは ${f.be}`
  ],
  'be_agreement:be_are_for_plural': (f) => [
    'are を使うのは、You と、2人以上のとき',
    `主語は ${f.subject}`,
    `答えは ${f.be}`
  ],

  // --- a / an ---

  'article_an:article_an': (f) => [
    f.isAn
      ? `${f.word} は a, e, i, o, u の音で始まる`
      : `${f.word} は a, e, i, o, u の音で始まらない`,
    f.isAn ? 'そのときは an を使う' : 'そのときは a を使う',
    `答えは ${f.article} ${f.word}`
  ],
  'article_an:article_with_plural': (f) => [
    'a と an は、1つのときに使う',
    `${f.plural} は2つ以上のときの形`,
    `答えは ${f.article} ${f.word}`
  ],

  // --- 一般動詞の形 ---

  'third_person_s:third_person_s_overused': (f) => [
    '-s が付くのは、He や She のように1人のときだけ',
    `主語は ${f.subject} なので付けない`,
    `答えは ${f.base}`
  ],
  'third_person_s:ing_without_be': (f) => [
    `${f.ing} は be動詞（am, is, are）といっしょに使う形`,
    'ここには be動詞 が無い',
    `答えは ${f.base}`
  ],
  'third_person_s:wrong_tense': (f) => [
    `${f.past} は、過ぎたことを言うときの形`,
    'いつもすることは、そのままの形で言う',
    `答えは ${f.base}`
  ],

  // --- 名詞の複数形 ---

  'plural_spelling:plural_spelling': (f) => [
    `${f.word} は s を付けるだけではない`,
    f.rule,
    `答えは ${f.plural}`
  ],
  'plural_spelling:plural_missing': (f) => [
    '2つ以上あるので、形を変える',
    `${f.word} → ${f.plural}`,
    `答えは ${f.plural}`
  ],

  // --- 語順 ---

  'word_order:word_order_sov': (f) => [
    '日本語は「なにを」が先だが、英語はあとに来る',
    `${f.subject} → ${f.verbForm} → ${f.object} の順`,
    `答えは ${f.answer}`
  ],

  // --- Lv3: 三単現の -s の付け方 ---

  'third_person_spelling:third_person_s_missing': (f) => [
    `${f.base} のままだと、1人のときの形になっていない`,
    f.rule,
    `答えは ${f.third}`
  ],
  'third_person_spelling:third_person_spelling': (f) => [
    `${f.base} は、そのまま s を付けるのではない`,
    f.rule,
    `答えは ${f.third}`
  ],
  'third_person_spelling:ing_without_be': (f) => [
    `${f.ing} は be動詞（am, is, are）といっしょに使う形`,
    'ここには be動詞 が無い',
    `答えは ${f.third}`
  ],
  'third_person_spelling:wrong_tense': (f) => [
    `${f.past} は、過ぎたことを言うときの形`,
    'いつもすることは、いまの形で言う',
    `答えは ${f.third}`
  ],

  // --- Lv4: Does のあとの動詞（中1最頻出） ---

  'verb_after_does:verb_after_does': (f) => [
    `${f.helper} が前に出たら、動詞はそのままの形にもどる`,
    `${f.third} ではなく ${f.base}`,
    `答えは ${f.base}`
  ],
  'verb_after_does:verb_after_can': (f) => [
    'can のあとの動詞は、そのままの形',
    `${f.third} ではなく ${f.base}`,
    `答えは ${f.base}`
  ],
  'verb_after_does:ing_without_be': (f) => [
    `${f.ing} は be動詞 といっしょに使う形`,
    'ここには be動詞 が無い',
    `答えは ${f.base}`
  ],
  'verb_after_does:wrong_tense': (f) => [
    `${f.past} は、過ぎたことを言うときの形`,
    'ここはいまのことを聞いている',
    `答えは ${f.base}`
  ],

  // --- Lv4: do と does ---

  'do_does:do_does': (f) => [
    `主語は ${f.subject}`,
    f.third ? '1人のときは does の側を使う' : '1人でないときは do の側を使う',
    `答えは ${f.helper}`
  ],
  'do_does:be_vs_do': (f, picked) => [
    `${picked} は be動詞`,
    'あとに動詞があるので、be動詞 は使わない',
    `答えは ${f.helper}`
  ],
  'do_does:be_vs_do_are': (f, picked) => [
    `${picked} は be動詞`,
    `主語が ${f.subject} なので ${f.helper} を使う`,
    `答えは ${f.helper}`
  ],

  // --- Lv4: be動詞の文に do を使ってしまう ---

  'be_vs_do:be_vs_do': (f) => [
    'あとに動詞が無く、様子を表す語が来ている',
    'このときは do ではなく be動詞 を前に出す',
    `答えは ${f.be}`
  ],
  'be_vs_do:be_vs_do_does': (f) => [
    'あとに動詞が無いので、does は使わない',
    'be動詞 を前に出す',
    `答えは ${f.be}`
  ],
  'be_vs_do:be_agreement_question': (f) => [
    '前に出す be動詞 も、主語に合わせる',
    `主語は ${f.subject}`,
    `答えは ${f.be}`
  ],

  // --- Lv5: ing の綴り ---

  'ing_spelling:ing_spelling': (f) => [
    `${f.base} は、そのまま ing を付けるのではない`,
    f.rule,
    `答えは ${f.ing}`
  ],
  'ing_spelling:ing_missing': (f) => [
    `${f.subject} のあとに be動詞 があるので、ing の形にする`,
    f.rule,
    `答えは ${f.ing}`
  ],
  'ing_spelling:third_instead_of_ing': (f) => [
    '-s の形は「いつもすること」を言うとき',
    'いましていることは、be動詞 + ing',
    `答えは ${f.ing}`
  ],
  'ing_spelling:wrong_tense': (f) => [
    'これは、いましていることを言う文',
    f.rule,
    `答えは ${f.ing}`
  ],

  // --- Lv5: 代名詞の格 ---

  'pronoun_case:pronoun_subject_used': (f) => [
    `${f.subject} は「〜は」の形`,
    `ここで使うのは ${f.answerWord}`,
    `答えは ${f.answerWord}`
  ],
  'pronoun_case:pronoun_object_used': (f) => [
    `${f.object} は「〜を」の形`,
    'あとに名詞が来るときは「〜の」の形',
    `答えは ${f.possessive}`
  ],
  'pronoun_case:pronoun_possessive_used': (f) => [
    `${f.possessive} は「〜の」の形。あとに名詞が要る`,
    '動詞のあとは「〜を」の形',
    `答えは ${f.object}`
  ],

  // --- 小5 ---
  // 中1と同じ内容でも、文法用語を使わずに書く。
  // 「主語」「三人称単数」ではなく、目の前の語をそのまま指して言う。

  'e5_be:am_only_for_i': (f) => [
    'am を使うのは I のときだけ',
    `${f.subject} のときは ${f.be}`,
    `答えは ${f.be}`
  ],
  'e5_be:is_for_one': (f) => [
    'is を使うのは、1人か1つのときだけ',
    `${f.subject} のときは ${f.be}`,
    `答えは ${f.be}`
  ],
  'e5_be:are_for_many': (f) => [
    'are を使うのは You と、2人以上のとき',
    `${f.subject} のときは ${f.be}`,
    `答えは ${f.be}`
  ],

  'e5_article:wrong_article': (f) => [
    f.isAn
      ? `${f.word} は a, e, i, o, u で始まる`
      : `${f.word} は a, e, i, o, u 以外で始まる`,
    f.isAn ? 'そういう語には an' : 'そういう語には a',
    `答えは ${f.article} ${f.word}`
  ],
  'e5_article:one_thing_only': (f) => [
    `${f.plural} は2つ以上のときの形`,
    `1つのときは ${f.word} のまま`,
    `答えは ${f.article} ${f.word}`
  ],

  'e5_verb:verb_with_s': (f) => [
    `${f.third} は he や she のときの形`,
    `${f.subject} のときは s を付けない`,
    `答えは ${f.base}`
  ],
  'e5_verb:wrong_verb': (f, picked) => [
    f.meanings && f.meanings[picked]
      ? `${picked} は「${f.meanings[picked]}」という意味`
      : `${picked} はここには合わない`,
    `「${f.objJa}${f.ja}」は ${f.base}`,
    `答えは ${f.base}`
  ],

  'e5_plural:spelling_rule': (f) => [
    `${f.naive} ではなく ${f.plural}`,
    f.rule,
    `${f.word} → ${f.plural}`
  ],
  'e5_plural:still_one': (f) => [
    `${f.word} は1つのときの形`,
    `2つ以上になると ${f.plural}`,
    `答えは ${f.plural}`
  ],

  'e5_order:japanese_order': (f) => [
    '日本語は「だれが → なにを → どうする」の順',
    '英語は「だれが → どうする → なにを」の順',
    `${f.subject} → ${f.base} → ${f.obj}`
  ],

  // --- 中3 比較 ---

  'j3_compare:superlative_with_than': (f) => [
    `${f.superlative} は「いちばん〜」の形`,
    'than があるので、2つを比べる形にする',
    `答えは ${f.comparative}`
  ],
  'j3_compare:comparative_for_best': (f) => [
    `${f.comparative} は2つを比べる形`,
    'the があって「いちばん」なので、最上級にする',
    `答えは ${f.superlative}`
  ],
  'j3_compare:compare_spelling': (f, picked) => [
    `${picked} という形にはならない`,
    f.usesMore
      ? `${f.word} は長い語なので、形は変えずに more / most を前に置く`
      : `${f.word} は短い語なので、more ではなく -er / -est を付ける`,
    `答えは ${picked.includes('most') || picked === `${f.word}est` ? f.superlative : f.comparative}`
  ],
  'j3_compare:no_change': (f, picked) => [
    `${picked} はもとの形のまま`,
    '比べる文では形を変える',
    `${f.word} → ${f.comparative} / ${f.superlative}`
  ],

  // --- 中3 受動態 ---

  'j3_passive:ing_used': (f) => [
    'ing は「いましているところ」の形',
    `「される」は be動詞 + 過去分詞。${f.base} の過去分詞は ${f.pp}`,
    `答えは ${f.be} ${f.pp}`
  ],
  'j3_passive:active_used': (f) => [
    `${f.subject} は「する」側ではなく「される」側`,
    `be動詞 + 過去分詞にする`,
    `答えは ${f.be} ${f.pp}`
  ],
  'j3_passive:be_number': (f) => [
    `${f.wrongBe} ではなく ${f.be}`,
    f.plural ? `${f.subject} は2つ以上を指している` : `${f.subject} は1つを指している`,
    `答えは ${f.be} ${f.pp}`
  ],

  // --- 中3 現在完了 ---

  'j3_perfect:have_has': (f) => [
    `${f.other} ではなく ${f.have}`,
    `${f.subject} には ${f.have} を使う`,
    `答えは ${f.have}`
  ],
  'j3_perfect:be_not_have': (f) => [
    'be動詞 のあとに過去分詞を置くと「される」の意味になる',
    '「ちょうど〜したところ」は have / has + 過去分詞',
    `答えは ${f.have}`
  ],
  'j3_perfect:did_not_have': (f) => [
    'did のあとは原形が来る',
    `ここは ${f.pp} が続いているので、have / has が入る`,
    `答えは ${f.have}`
  ],
  'j3_perfect:third_for_pp': (f) => [
    `${f.third} は he / she の文で使う形`,
    `${f.have} のあとは過去分詞。${f.base} の過去分詞は ${f.pp}`,
    `答えは ${f.pp}`
  ],
  'j3_perfect:past_for_pp': (f) => [
    `${f.past} は過去形`,
    `${f.have} のあとは過去分詞。${f.base} の過去分詞は ${f.pp}`,
    `答えは ${f.pp}`
  ],
  'j3_perfect:base_for_pp': (f) => [
    `${f.base} はもとの形のまま`,
    `${f.have} のあとは過去分詞に変える`,
    `答えは ${f.pp}`
  ],
  'j3_perfect:ing_for_pp': (f) => [
    'ing が付くのは be動詞 のあと',
    `${f.have} のあとは過去分詞`,
    `答えは ${f.pp}`
  ],

  // --- 中3 for / since と過去形 ---

  'j3_time:for_since': (f) => [
    f.kind === 'for'
      ? `since は「いつから始まったか」を言うときに使う`
      : `for は「どれくらい続いたか」を言うときに使う`,
    f.kind === 'for'
      ? `${f.duration} は続いた長さなので for`
      : `${f.duration} は始まった時なので since`,
    `答えは ${f.kind}`
  ],
  'j3_time:from_not_used': (f) => [
    'from は「どこから」を表すときに使う',
    f.kind === 'for' ? '長さには for' : '始まった時には since',
    `答えは ${f.kind}`
  ],
  'j3_time:perfect_with_ago': (f) => [
    'an hour ago は、いつのことかをはっきり指している',
    '時がはっきり決まっている文には現在完了を使わない',
    `答えは ${f.past}`
  ],
  'j3_time:base_for_past': (f) => [
    `${f.base} はもとの形のまま`,
    'an hour ago があるので過去形にする',
    `答えは ${f.past}`
  ],
  'j3_time:ing_for_past': (f) => [
    'ing が付くのは be動詞 のあと',
    'an hour ago があるので過去形にする',
    `答えは ${f.past}`
  ],

  // --- 中3 関係代名詞 ---

  'j3_relative:which_for_person': (f) => [
    `前に来るのは ${f.noun}。人を指している`,
    'which は人以外を説明するときに使う',
    '答えは who'
  ],
  'j3_relative:who_for_thing': (f) => [
    `前に来るのは ${f.noun}。人ではない`,
    'who は人を説明するときに使う',
    '答えは which'
  ],
  'j3_relative:whose_needs_noun': (f) => [
    'whose は「〜の」の意味で、うしろに名詞が要る',
    f.isPerson ? '人を説明するときは who' : '人以外を説明するときは which',
    `答えは ${f.isPerson ? 'who' : 'which'}`
  ],
  'j3_relative:what_not_relative': (f) => [
    'what の前には、説明される名詞を置かない',
    f.isPerson ? `${f.noun} を説明するので who` : `${f.noun} を説明するので which`,
    `答えは ${f.isPerson ? 'who' : 'which'}`
  ]
};

/** テンプレートが用意されている pattern:reason の一覧（テスト用）。 */
export function templateKeys() {
  return Object.keys(TEMPLATES);
}

/**
 * 解説の行を返す。
 *
 * 選んだ選択肢が traps に一致し、専用のテンプレートがあればそれを優先する。
 * 一致しない場合（「わからない」を押したときなど）は汎用の steps を返す。
 *
 * @param {object} problem
 * @param {string|null} submitted 選んだ選択肢。押さずに降参したときは null
 * @returns {{lines: string[], matched: string|null}}
 */
export function explanationFor(problem, submitted) {
  if (submitted !== null && submitted !== undefined) {
    const trap = (problem.traps || []).find((t) => t.value === submitted);
    if (trap) {
      const template = TEMPLATES[`${problem.pattern}:${trap.reason}`];
      if (template && problem.facts) {
        return { lines: template(problem.facts, submitted), matched: trap.reason };
      }
    }
  }
  return { lines: problem.steps.slice(), matched: null };
}
