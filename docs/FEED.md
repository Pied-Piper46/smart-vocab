# Feed word data

## Step 1
`words.json`に単語リストを作成

## Step 2
以下のプロンプトを使用し、Step1で作成した単語リストをJson形式の`wordsJson.json`に変換

- prompt
```md
@data/words/words.json
に記載されている各単語（english）を以下のデータ構造に合わせて@data/words/wordsJson.json
に追加して下さい。
・データ構造の各フィールドを単語（english）に合わせて一般的な知識に基づいて埋めて下さい。
・群動詞やイディオムに発音記号は不要です。
・partOfSpeechは英語で記載してください。
・特に日本語訳、発音記号の文字化け防止のためUTF-8エンコーディングで保存してください。

[
    {
        "english": "";
        "japanese": "";
        "phonetic": "";
        "partOfSpeech": "";
        "exampleEnglish": "";
        "exampleJapanese": "";
    },
    ...
]
```

## Step 3 (Optional)
`prisma/seed.ts`でDBへ追加する単語Jsonファイルを指定。デフォルトは`wordsJson.json`。

```
// Load data from all JSON files
  const files = ['wordsJson.json']; <- edit to the file name you want to feed
```

## Step 4
以下のコマンドでDBにプッシュ

```
npm run words:add
```

## Step 5 (Optional)
Githubへタグをプッシュ

```
git add .
git commit -m "feed data"
npm version patch -m "feed data"
git push origin main
git push --tags
```
