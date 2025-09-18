# おうちでBEAT

React Native + Expo 製のリズムゲームです。譜面と音源は `assets` 配下で管理し、`scripts/generate-song-manifest.ts` を実行するとゲーム内の楽曲マニフェストが自動生成されます。

## 開発環境のセットアップ

1. 依存関係をインストールします。

   ```bash
   npm install
   ```

2. 音源と譜面からマニフェストを生成します。

   ```bash
   npm run prepare
   ```

3. Expo 開発環境を起動します。

   ```bash
   npm start
   ```

## ディレクトリ構成

- `App.tsx`: ルートエントリ。ナビゲーションとコンテキストの定義。
- `app/`
  - `components/`: プレイ画面の UI コンポーネント。
  - `providers/`: グローバルステート（楽曲、ハイスコア、キャリブ設定）。
  - `screens/`: タイトル、楽曲選択、プレイ、リザルトなどの画面。
  - `hooks/`: 共通ロジック用のカスタムフック。
  - `utils/`: 譜面パースやスコア計算のヘルパー。
  - `constants/`: 判定ウィンドウや自動生成されるマニフェスト。
  - `types/`: 型定義。
- `assets/`
  - `audio/`: 音源。
  - `beatmaps/`: 譜面 JSON。
  - `art/`: 将来の画像素材用ディレクトリ（必要に応じて追加）。
- `scripts/`: ビルド前処理やスキャナブルなユーティリティ。

## 開発時の注意

- キャリブレーションは楽曲選択画面のカードから ±5ms 単位で調整できます。調整結果は `AsyncStorage` に保持されます。
- テストは Jest（`jest-expo`）で動作します。`npm test` を実行してください。

## 標準テスト

```bash
npm test
```

## ライセンスと音源

`assets/audio` 配下の音源は検証用です。個人利用に限定し、外部配布は禁止です。
