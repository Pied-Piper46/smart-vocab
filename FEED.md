# Feed word data

- prompt
```
@data/words/words.json
に記載されている各単語（english）を以下のデータ構造に合わせて@data/words/wordsJson.json
に追加して下さい。
・データ構造の各フィールドを単語（english）に合わせて一般的な知識に基づいて埋めて下さい。群動詞やイディオムに発音記号は不要です。
・partOfSpeechは英語で記載してください。
・特に日本語、発音記号の文字化け防止のためUTF-8エンコーディングで保存してください。

```
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

- edit prisma/seed.ts
```
// Load data from all JSON files
  const files = ['medium3.json']; <- edit to the file name you want to feed
```

- feed
```
npm run words:add
```

- commit
```
git add .
git commit -m "feed data"
npm version patch -m "feed data"
git push origin main
git push --tags
```
