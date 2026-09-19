// 単語辞書。
//
// このアプリで唯一の固定データ。問題文はここから毎回組み立てる。
// 教科書・単語帳からの転記はしていない。中1が確実に知っている語だけを選び、
// **綴りの規則を網羅するように**並べてある。
//
// 語を足すときの注意:
//   - 数えられる名詞だけ（water, music のような不可算名詞は入れない）
//   - a / an は「母音字で始まるかどうか」で決まる語だけにする
//     （hour, university のような例外は、説明が嘘になるので入れない）
//   - 動詞には必ず目的語（obj）を持たせる。文が不自然にならないようにするため

/** 名詞。plural の付き方でグループ分けしてある。 */
export const NOUNS = [
  // 規則変化（+s）
  { word: 'book', plural: 'books', article: 'a', ja: '本', group: 'regular' },
  { word: 'pen', plural: 'pens', article: 'a', ja: 'ペン', group: 'regular' },
  { word: 'desk', plural: 'desks', article: 'a', ja: '机', group: 'regular' },
  { word: 'dog', plural: 'dogs', article: 'a', ja: '犬', group: 'regular' },
  { word: 'cat', plural: 'cats', article: 'a', ja: 'ねこ', group: 'regular' },
  { word: 'bag', plural: 'bags', article: 'a', ja: 'かばん', group: 'regular' },
  { word: 'ball', plural: 'balls', article: 'a', ja: 'ボール', group: 'regular' },
  { word: 'car', plural: 'cars', article: 'a', ja: '車', group: 'regular' },
  { word: 'friend', plural: 'friends', article: 'a', ja: '友だち', group: 'regular' },
  { word: 'apple', plural: 'apples', article: 'an', ja: 'りんご', group: 'regular' },
  { word: 'egg', plural: 'eggs', article: 'an', ja: 'たまご', group: 'regular' },
  { word: 'orange', plural: 'oranges', article: 'an', ja: 'オレンジ', group: 'regular' },
  { word: 'umbrella', plural: 'umbrellas', article: 'an', ja: 'かさ', group: 'regular' },
  { word: 'animal', plural: 'animals', article: 'an', ja: '動物', group: 'regular' },

  // s, x, ch, sh, o で終わる（+es）
  { word: 'box', plural: 'boxes', article: 'a', ja: '箱', group: 'es' },
  { word: 'bus', plural: 'buses', article: 'a', ja: 'バス', group: 'es' },
  { word: 'class', plural: 'classes', article: 'a', ja: 'クラス', group: 'es' },
  { word: 'dish', plural: 'dishes', article: 'a', ja: '皿', group: 'es' },
  { word: 'watch', plural: 'watches', article: 'a', ja: '腕時計', group: 'es' },
  { word: 'potato', plural: 'potatoes', article: 'a', ja: 'じゃがいも', group: 'es' },

  // 子音字 + y（y を i に変えて +es）
  { word: 'city', plural: 'cities', article: 'a', ja: '都市', group: 'ies' },
  { word: 'country', plural: 'countries', article: 'a', ja: '国', group: 'ies' },
  { word: 'baby', plural: 'babies', article: 'a', ja: '赤ちゃん', group: 'ies' },
  { word: 'story', plural: 'stories', article: 'a', ja: '物語', group: 'ies' },
  { word: 'family', plural: 'families', article: 'a', ja: '家族', group: 'ies' },

  // f, fe で終わる（ves）
  { word: 'knife', plural: 'knives', article: 'a', ja: 'ナイフ', group: 'ves' },
  { word: 'leaf', plural: 'leaves', article: 'a', ja: '葉', group: 'ves' },

  // 不規則
  { word: 'man', plural: 'men', article: 'a', ja: '男の人', group: 'irregular' },
  { word: 'woman', plural: 'women', article: 'a', ja: '女の人', group: 'irregular' },
  { word: 'child', plural: 'children', article: 'a', ja: '子ども', group: 'irregular' },
  { word: 'foot', plural: 'feet', article: 'a', ja: '足', group: 'irregular' }
];

/**
 * 動詞。
 * group は三単現の付き方、ingGroup は ing 形の作り方。
 * obj は目的語。文が不自然にならないよう必ず添える。
 * ja は日本語の述部（objJa につなげてそのまま文になる形）。
 */
// ja       … 「〜します」（ふつうの文）
// jaDict   … 辞書形。「〜することができます」を作るのに使う
// jaIng    … 「〜しています」（いましていること）
// stative  … いましていることを言えない動詞（like, have）。進行形の問題に使わない
export const VERBS = [
  // 三単現 +s
  { base: 'play', third: 'plays', ing: 'playing', past: 'played', obj: 'tennis', objJa: 'テニスを', ja: 'します', jaDict: 'する', jaIng: 'しています', group: 's', ingGroup: 'plain' },
  { base: 'like', third: 'likes', ing: 'liking', past: 'liked', obj: 'music', objJa: '音楽が', ja: '好きです', jaDict: '好きである', jaIng: '好きです', group: 's', ingGroup: 'drop_e', stative: true },
  { base: 'use', third: 'uses', ing: 'using', past: 'used', obj: 'a computer', objJa: 'コンピュータを', ja: '使います', jaDict: '使う', jaIng: '使っています', group: 's', ingGroup: 'drop_e' },
  { base: 'make', third: 'makes', ing: 'making', past: 'made', obj: 'lunch', objJa: '昼食を', ja: '作ります', jaDict: '作る', jaIng: '作っています', group: 's', ingGroup: 'drop_e' },
  { base: 'write', third: 'writes', ing: 'writing', past: 'wrote', obj: 'a letter', objJa: '手紙を', ja: '書きます', jaDict: '書く', jaIng: '書いています', group: 's', ingGroup: 'drop_e' },
  { base: 'help', third: 'helps', ing: 'helping', past: 'helped', obj: 'my mother', objJa: '私の母を', ja: '手伝います', jaDict: '手伝う', jaIng: '手伝っています', group: 's', ingGroup: 'plain' },
  { base: 'sing', third: 'sings', ing: 'singing', past: 'sang', obj: 'a song', objJa: '歌を', ja: '歌います', jaDict: '歌う', jaIng: '歌っています', group: 's', ingGroup: 'plain' },
  { base: 'walk', third: 'walks', ing: 'walking', past: 'walked', obj: 'to the park', objJa: '公園まで', ja: '歩きます', jaDict: '歩く', jaIng: '歩いています', group: 's', ingGroup: 'plain' },
  { base: 'read', third: 'reads', ing: 'reading', past: 'read', obj: 'books', objJa: '本を', ja: '読みます', jaDict: '読む', jaIng: '読んでいます', group: 's', ingGroup: 'plain' },
  { base: 'run', third: 'runs', ing: 'running', past: 'ran', obj: 'fast', objJa: '速く', ja: '走ります', jaDict: '走る', jaIng: '走っています', group: 's', ingGroup: 'double' },
  { base: 'swim', third: 'swims', ing: 'swimming', past: 'swam', obj: 'well', objJa: '上手に', ja: '泳ぎます', jaDict: '泳ぐ', jaIng: '泳いでいます', group: 's', ingGroup: 'double' },

  // 三単現 +es（s, x, ch, sh, o で終わる）
  { base: 'go', third: 'goes', ing: 'going', past: 'went', obj: 'to school', objJa: '学校へ', ja: '行きます', jaDict: '行く', jaIng: '行っています', group: 'es', ingGroup: 'plain' },
  { base: 'watch', third: 'watches', ing: 'watching', past: 'watched', obj: 'TV', objJa: 'テレビを', ja: '見ます', jaDict: '見る', jaIng: '見ています', group: 'es', ingGroup: 'plain' },
  { base: 'teach', third: 'teaches', ing: 'teaching', past: 'taught', obj: 'math', objJa: '数学を', ja: '教えます', jaDict: '教える', jaIng: '教えています', group: 'es', ingGroup: 'plain' },
  { base: 'wash', third: 'washes', ing: 'washing', past: 'washed', obj: 'the dishes', objJa: '皿を', ja: '洗います', jaDict: '洗う', jaIng: '洗っています', group: 'es', ingGroup: 'plain' },

  // 三単現 ies（子音字 + y）
  { base: 'study', third: 'studies', ing: 'studying', past: 'studied', obj: 'English', objJa: '英語を', ja: '勉強します', jaDict: '勉強する', jaIng: '勉強しています', group: 'ies', ingGroup: 'plain' },
  { base: 'carry', third: 'carries', ing: 'carrying', past: 'carried', obj: 'a bag', objJa: 'かばんを', ja: '運びます', jaDict: '運ぶ', jaIng: '運んでいます', group: 'ies', ingGroup: 'plain' },

  // 不規則
  { base: 'do', third: 'does', ing: 'doing', past: 'did', obj: 'homework', objJa: '宿題を', ja: 'します', jaDict: 'する', jaIng: 'しています', group: 'irregular', ingGroup: 'plain' },
  { base: 'have', third: 'has', ing: 'having', past: 'had', obj: 'a dog', objJa: '犬を', ja: '飼っています', jaDict: '飼う', jaIng: '飼っています', group: 'irregular', ingGroup: 'drop_e', stative: true }
];

/**
 * 「〜しません」の形にする。
 * 「します」→「しません」、「好きです」→「好きではありません」、
 * 「飼っています」→「飼っていません」。
 */
export function jaNegative(ja) {
  if (ja.endsWith('ています')) return ja.replace(/ています$/, 'ていません');
  if (ja.endsWith('です')) return ja.replace(/です$/, 'ではありません');
  return ja.replace(/ます$/, 'ません');
}

/**
 * 主語。
 * person は be動詞と三単現の判定に使う。
 *   first_sg … I / second … You / third_sg … He, She, Ken / plural … We, They
 */
export const SUBJECTS = [
  { text: 'I', ja: '私は', be: 'am', person: 'first_sg' },
  { text: 'You', ja: 'あなたは', be: 'are', person: 'second' },
  { text: 'He', ja: '彼は', be: 'is', person: 'third_sg' },
  { text: 'She', ja: '彼女は', be: 'is', person: 'third_sg' },
  { text: 'Ken', ja: 'ケンは', be: 'is', person: 'third_sg' },
  { text: 'Yuki', ja: 'ユキは', be: 'is', person: 'third_sg' },
  { text: 'My brother', ja: '私の兄は', be: 'is', person: 'third_sg' },
  { text: 'My sister', ja: '私の姉は', be: 'is', person: 'third_sg' },
  { text: 'We', ja: '私たちは', be: 'are', person: 'plural' },
  { text: 'They', ja: '彼らは', be: 'are', person: 'plural' },
  { text: 'Ken and Yuki', ja: 'ケンとユキは', be: 'are', person: 'plural' },
  { text: 'My friends', ja: '私の友だちは', be: 'are', person: 'plural' }
];

/**
 * be動詞の文で使う形容詞。どの主語でもそのまま使える。
 * ja は日本語の述部そのもの（主語にそのままつなげて文になる形）。
 */
export const ADJECTIVES = [
  { word: 'happy', ja: 'うれしいです' },
  { word: 'busy', ja: 'いそがしいです' },
  { word: 'tired', ja: 'つかれています' },
  { word: 'kind', ja: '親切です' },
  { word: 'hungry', ja: 'おなかがすいています' },
  { word: 'free', ja: 'ひまです' }
];

/** be動詞の文で使う名詞。主語の数に合わせて単数・複数を切り替える。 */
export const ROLES = [
  { word: 'student', plural: 'students', ja: '生徒' },
  { word: 'teacher', plural: 'teachers', ja: '先生' },
  { word: 'singer', plural: 'singers', ja: '歌手' }
];

/**
 * 代名詞の格変化。
 * 3つの形がすべて違うものだけを入れる。
 * she は her / her が同じ形になり、選択肢が作れないので入れない。
 */
export const PRONOUNS = [
  { subject: 'I', object: 'me', possessive: 'my', ja: '私' },
  { subject: 'he', object: 'him', possessive: 'his', ja: '彼' },
  { subject: 'we', object: 'us', possessive: 'our', ja: '私たち' },
  { subject: 'they', object: 'them', possessive: 'their', ja: '彼ら' }
];

// --- 小5 で使う語 -----------------------------------------------------------
//
// 上の辞書から、小5が確実に知っている語だけを取り出す。
// 別の辞書は作らない。同じ語の綴りが2か所にあると、必ずどちらかがずれる。
//
// 複数形のつづりの型（regular / es / ies / ves / irregular）は、
// すべての型が残るように選んである。型が欠けると、その綴りの問題が作れなくなる。
// a / an も、両方が十分な数だけ残るようにしてある。

const E5_NOUNS = [
  'book', 'pen', 'desk', 'dog', 'cat', 'bag', 'ball', 'car',
  'apple', 'egg', 'orange',
  'box', 'bus', 'dish',
  'city', 'baby', 'family',
  'knife', 'leaf',
  'man', 'woman', 'child'
];

const E5_VERBS = [
  'play', 'like', 'go', 'run', 'swim', 'read', 'sing',
  'walk', 'study', 'watch', 'wash', 'help', 'make', 'have'
];

// 小5 では三単現を扱わないので、he / she を主語にする問題は作らない。
// ただし be動詞（is）では必要なので、主語の一覧そのものには残しておく。
const E5_SUBJECTS = ['I', 'You', 'He', 'She', 'Ken', 'Yuki', 'We', 'They'];

export function easyNouns() {
  return NOUNS.filter((n) => E5_NOUNS.includes(n.word));
}

export function easyVerbs() {
  return VERBS.filter((v) => E5_VERBS.includes(v.base));
}

export function easySubjects() {
  return SUBJECTS.filter((s) => E5_SUBJECTS.includes(s.text));
}

/** 主語が複数扱いか。 */
export function isPlural(subject) {
  return subject.person === 'plural';
}

/** 主語が三人称単数か（三単現の -s が要るか）。 */
export function isThirdSingular(subject) {
  return subject.person === 'third_sg';
}
