# Enjoy英語

中学1年の英語（文法）を練習する、ひとり用の学習アプリ。
`Enjoy数学`（正負の数）の姉妹アプリで、継続のための作りは同じ。

- 問題文は**単語辞書から毎回組み立てる**。問題文の固定データは持たない
- **外部通信ゼロ**。アカウントもサーバー保存も分析も広告もない
- 入力は**4択と並べ替え**だけ。iOS のソフトキーボードを出さない
- 保存先は端末の localStorage だけ
- PWA。iPhone のホーム画面に追加すると全画面で起動し、機内モードでも動く

## 出題範囲

| Lv | 内容 |
|---|---|
| 1 | be動詞（am / is / are）、a / an |
| 2 | 一般動詞の現在形、名詞の複数形、語順（並べ替え） |
| 3 | 三人称単数の -s（綴りの規則） |
| 4 | 疑問文・否定文（do / does）、can |
| 5 | 現在進行形、代名詞の格変化、語順（be動詞 + ing） |

単語の意味・長文読解・リスニング・発音は扱わない。

## 構成

ビルド不要。依存ライブラリなし。

```
index.html          画面（ホーム / 問題 / 終了）
manifest.json       PWA の設定
sw.js               Service Worker（オフライン用）
server.py           LAN 配信 + 学習量の記録
css/style.css
js/
  app.js            画面遷移・セッション制御
  choices.js        4択の入力
  arrange.js        並べ替えの入力
  timer.js          カウントダウン
  recovery.js       誤答フローの状態機械
  explain.js        誤答パターン別の解説（27通り）
  carryover.js      持ち越しキュー
  level.js          難易度の自動調整
  storage.js        localStorage ラッパ
  data/words.js     単語辞書（このアプリ唯一の固定データ）
  lib/              乱数・Problem の共通部品
  generators/       レベルごとの問題ジェネレータ
icons/              PWA アイコン
test/               単体テスト
tools/make-icons.py アイコン生成（一度だけ走らせる。実行時には不要）
```

`Enjoy数学` と共通の部品（誤答フロー、持ち越し、タイマー、保存、難易度）は
**抽象化せずコピーしている。** 完成して動いている数学版を壊さないことを優先する。

## 手元で動かす

```bash
python server.py 8200
```

- アプリ: `http://localhost:8200/`
- 同じ Wi-Fi の iPhone からは `http://<PCのIPアドレス>:8200/`

`start-server.bat` をダブルクリックしても起動できる（アドレスが画面に出る）。
`Enjoy数学` はポート 8000 なので、両方を同時に動かせる。

## 学習量の記録（保護者向け）

`server.py` は `POST /_log` を受けて `study-log-english.csv` に1行追記する。

```
date,minutes,solved
2026-09-19,10,7
```

- 記録するのは **日付 / 選んだ時間 / 解いた問題数** だけ。正誤や点数は送らない
- 1問も解かずに閉じた回は記録しない
- **iframe の中で動いているときは記録しない**（テストが記録を汚さないため）
- サーバーが応答しないとき（GitHub Pages 上など）は黙って諦める
- `study-log-english.csv` は `.gitignore` に入れてある。**公開しないこと**

## テスト

ブラウザで `tests.html` を開くと全部走る。iPhone でも開ける。

## 問題を目で見る

`preview.html` を開くと、Lv1〜Lv5 の問題が並ぶ。
単語の難易度や日本語の自然さはここで確認して調整する。

## アイコンを作り直す

```bash
python tools/make-icons.py
```

## 開発用の URL パラメータ

| | |
|---|---|
| `?level=1`〜`?level=5` | レベルを固定する（自動調整を止める） |
| `?minutes=1` | 時間ボタンの値を上書きする |
| `?reset=1` | 保存内容を消して起動する |
| `?newday=1` | 「今日はまだやっていない」状態で起動する |

## 公開

GitHub Pages（Settings → Pages → Branch: `main` / root）。

`manifest.json` の `start_url` と `scope` を `./` にしてあるので、
`https://<ユーザー名>.github.io/<リポジトリ名>/` のようなサブディレクトリでも動く。

`sw.js` にファイルの一覧（`PRECACHE`）がある。**ファイルを増やしたらここにも足すこと。**
足し忘れは `tests.html` が見つける。
