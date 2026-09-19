// 単語辞書のテスト。
//
// この辞書はこのアプリで唯一の固定データなので、
// 抜けや綴りの間違いがあると全部の問題に効いてくる。
// 綴りの規則を網羅していることも、ここで担保する。

import { test, assert, assertEqual } from './runner.js';
import { NOUNS, VERBS, SUBJECTS, ADJECTIVES, ROLES, isPlural, isThirdSingular } from '../js/data/words.js';

const ASCII_WORD = /^[a-zA-Z][a-zA-Z '.]*$/;

// --- 形が揃っていること ----------------------------------------------------

test('辞書: 名詞に必要な項目がすべてある', () => {
  assert(NOUNS.length >= 20, `名詞が少なすぎる: ${NOUNS.length}語`);
  for (const n of NOUNS) {
    assert(ASCII_WORD.test(n.word), `word が英単語でない: ${n.word}`);
    assert(ASCII_WORD.test(n.plural), `plural が英単語でない: ${n.plural}`);
    assert(n.article === 'a' || n.article === 'an', `article が不正: ${n.word} / ${n.article}`);
    assert(typeof n.ja === 'string' && n.ja.length > 0, `日本語が無い: ${n.word}`);
    assert(typeof n.group === 'string' && n.group.length > 0, `group が無い: ${n.word}`);
    assert(n.plural !== n.word, `単数形と複数形が同じ: ${n.word}`);
  }
});

test('辞書: 動詞に必要な項目がすべてある', () => {
  assert(VERBS.length >= 15, `動詞が少なすぎる: ${VERBS.length}語`);
  for (const v of VERBS) {
    for (const key of ['base', 'third', 'ing', 'past']) {
      assert(ASCII_WORD.test(v[key]), `${key} が英単語でない: ${v.base} / ${v[key]}`);
    }
    assert(typeof v.obj === 'string' && v.obj.length > 0, `目的語が無い: ${v.base}`);
    assert(typeof v.objJa === 'string' && v.objJa.length > 0, `目的語の日本語が無い: ${v.base}`);
    assert(typeof v.ja === 'string' && v.ja.length > 0, `日本語が無い: ${v.base}`);
    assert(v.third !== v.base, `三単現が原形と同じ: ${v.base}`);
    assert(v.ing !== v.base, `ing形が原形と同じ: ${v.base}`);
  }
});

test('辞書: 主語に be動詞 と人称がある', () => {
  for (const s of SUBJECTS) {
    assert(['am', 'is', 'are'].includes(s.be), `be が不正: ${s.text} / ${s.be}`);
    assert(['first_sg', 'second', 'third_sg', 'plural'].includes(s.person), `person が不正: ${s.text}`);
    assert(typeof s.ja === 'string' && s.ja.length > 0, `日本語が無い: ${s.text}`);
  }
});

test('辞書: 主語の be動詞 が人称と合っている', () => {
  for (const s of SUBJECTS) {
    const expected = s.person === 'first_sg' ? 'am' : s.person === 'third_sg' ? 'is' : 'are';
    assertEqual(s.be, expected, `${s.text}（${s.person}）の be動詞 が違う`);
  }
});

test('辞書: 形容詞と役割語に日本語がある', () => {
  for (const a of ADJECTIVES) {
    assert(ASCII_WORD.test(a.word), `英単語でない: ${a.word}`);
    assert(a.ja.length > 0, `日本語が無い: ${a.word}`);
  }
  for (const r of ROLES) {
    assert(r.plural !== r.word, `単複が同じ: ${r.word}`);
    assert(r.ja.length > 0, `日本語が無い: ${r.word}`);
  }
});

// --- 綴りの規則を網羅していること ------------------------------------------

test('辞書: 複数形のすべての型が入っている', () => {
  const groups = new Set(NOUNS.map((n) => n.group));
  for (const need of ['regular', 'es', 'ies', 'ves', 'irregular']) {
    assert(groups.has(need), `複数形の型 "${need}" の語が無い`);
  }
});

test('辞書: 三単現のすべての型が入っている', () => {
  const groups = new Set(VERBS.map((v) => v.group));
  for (const need of ['s', 'es', 'ies', 'irregular']) {
    assert(groups.has(need), `三単現の型 "${need}" の語が無い`);
  }
});

test('辞書: ing形のすべての型が入っている', () => {
  const groups = new Set(VERBS.map((v) => v.ingGroup));
  for (const need of ['plain', 'drop_e', 'double']) {
    assert(groups.has(need), `ing形の型 "${need}" の語が無い`);
  }
});

test('辞書: a / an の両方が十分にある', () => {
  const an = NOUNS.filter((n) => n.article === 'an').length;
  const a = NOUNS.filter((n) => n.article === 'a').length;
  assert(an >= 3, `an を使う語が少ない: ${an}語`);
  assert(a >= 10, `a を使う語が少ない: ${a}語`);
});

// --- 中身が正しいこと ------------------------------------------------------

test('辞書: a / an が語頭の字と合っている', () => {
  // 説明に「母音の字で始まるかどうか」と書くので、例外語を入れてはいけない
  for (const n of NOUNS) {
    const startsWithVowel = 'aeiou'.includes(n.word[0].toLowerCase());
    const expected = startsWithVowel ? 'an' : 'a';
    assertEqual(n.article, expected, `${n.word} の a / an が語頭と合わない（説明が嘘になる）`);
  }
});

test('辞書: group が実際の綴りと合っている', () => {
  for (const n of NOUNS) {
    const naive = `${n.word}s`;
    if (n.group === 'regular') {
      assertEqual(n.plural, naive, `regular なのに +s でない: ${n.word}`);
    } else {
      assert(n.plural !== naive, `${n.group} なのに +s と同じ: ${n.word}`);
    }
  }
});

test('辞書: 三単現の group が実際の綴りと合っている', () => {
  for (const v of VERBS) {
    const naive = `${v.base}s`;
    if (v.group === 's') {
      assertEqual(v.third, naive, `s 型なのに +s でない: ${v.base}`);
    } else {
      assert(v.third !== naive, `${v.group} 型なのに +s と同じ: ${v.base}`);
    }
  }
});

test('辞書: 同じ語が二重に入っていない', () => {
  const nouns = NOUNS.map((n) => n.word);
  assertEqual(new Set(nouns).size, nouns.length, '名詞に重複がある');

  const verbs = VERBS.map((v) => v.base);
  assertEqual(new Set(verbs).size, verbs.length, '動詞に重複がある');

  const subjects = SUBJECTS.map((s) => s.text);
  assertEqual(new Set(subjects).size, subjects.length, '主語に重複がある');
});

test('辞書: 三人称単数の主語と、それ以外の主語が両方ある', () => {
  assert(SUBJECTS.some(isThirdSingular), '三人称単数の主語が無い');
  assert(SUBJECTS.some((s) => !isThirdSingular(s)), '三人称単数以外の主語が無い');
  assert(SUBJECTS.some(isPlural), '複数の主語が無い');
});
