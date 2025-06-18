# Feed word data

- prompt
```
@data/words/test.json
に記載されている各単語（english）を以下のデータ構造に合わせて@data/words/medium3.json
に追加して下さい。
・idは初めの要素215から連番でお願いします。
・データ構造の各フィールドを単語（english）に合わせて一般的な知識に基づいて埋めて下さい。群動詞やイディオムに発音記号は不要です。

[
    {
        "id": "medium_215",
        "english": "",
        "japanese": "",
        "phonetic": "",
        "partOfSpeech": "",
        "frequency": null,
        "examples": [
        {
            "id": "medium_215_ex1",
            "english": "",
            "japanese": "",
            "difficulty": null,
            "context": ""
        }
        ]
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
