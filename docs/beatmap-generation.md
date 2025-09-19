# 譜面自動生成ガイド

このドキュメントでは `npm run analyze-audio` と `npm run generate-beatmap` を利用した半自動の譜面生成ワークフローを解説します。BPM と再生時間をベースにしつつ、必要に応じてオンセット解析結果を取り込むことで、基礎的な譜面を素早く生成し、最後に人間の耳で仕上げる運用を想定しています。

## ディレクトリ構成

- `assets/song-configs/` … 楽曲ごとの設定ファイル (`SongConfig`) を配置します。
- `assets/audio-analysis/` … 解析済みのオンセットデータ (`<songId>_onsets.json`) を保存します。
- `assets/beatmaps/` … 自動生成された譜面 (`.auto.json`) を出力します。

## SongConfig の主な項目

| キー | 説明 |
| --- | --- |
| `songId` | 譜面と音源を識別する一意の ID。スクリプトの `--song` で指定します。|
| `bpm` | ベース BPM。`grid` ジェネレータでビート間隔を算出する際に利用します。|
| `durationMs` | 楽曲の再生時間（ミリ秒）。`ffprobe` を使えない環境ではここが唯一のソースになります。|
| `analysis.onsetsFile` | `assets/audio-analysis/` 配下の JSON ファイル名。`fromOnsets` ジェネレータが参照します。|
| `difficulties[]` | 難易度ごとの生成ルールを定義します。|
| `difficulties[].generators[]` | 区間ごとの生成ロジック。`grid` と `fromOnsets` を組み合わせます。|
| `difficulties[].postProcesses[]` | 後処理でソートや重複除去を制御します。省略時は `dedupe → sort → trim` を自動適用します。|

### grid ジェネレータ

```json
{
  "type": "grid",
  "startBeat": 16,
  "measures": 4,
  "subdivision": 2,
  "pattern": "10",
  "laneCycle": [0, 2, 1, 3],
  "swingMs": 15
}
```

- `startBeat` と `measures` で対象区間を指定し、`subdivision` でビートの分割数を決めます。
- `pattern` は `subdivision` の長さに合わせた 0/1 の文字列。`"10"` なら表拍のみ、`"11"` なら 8 分刻みになります。
- `laneCycle` はノーツを割り当てるレーンの順番です。`rotatePerBeat: true` を指定するとビートごとに次のレーンへ移ります。
- `swingMs` を使うと奇数番目のステップにミリ秒単位のスウィングを加えられます。

### fromOnsets ジェネレータ

```json
{
  "type": "fromOnsets",
  "startBeat": 32,
  "maxNotes": 32,
  "laneCycle": [0, 1, 2, 3],
  "minGapMs": 180
}
```

- `assets/audio-analysis/<songId>_onsets.json` の `onsets` 配列を参照し、指定区間内のオンセットをノーツとして採用します。
- `takeEvery` を 2 にすると 1 つおきに採用し、`minGapMs` で密度を抑制できます。
- `maxNotes` に上限を設定するとクライマックス前後だけを自動配置させる、といった使い方ができます。

## 自動生成のフロー

1. `npm run analyze-audio -- --song <songId>`
   - `ffprobe` が使える場合は `durationMs` を補正し、`aubioonset` があればピーク検出を行います。
   - 解析コマンドが無い環境では BPM から等間隔のグリッドを出力します。結果は JSON の `tools` 配列で確認できます。
2. `npm run generate-beatmap -- --song <songId> --difficulty <difficultyId>`
   - `--dry-run` でノーツ数とプレビューのみ確認可能。`--list` で利用可能な難易度一覧を表示します。
   - 出力ファイルは `*.auto.json` となり、既存譜面を守ります。完成版として採用する際は `--overwrite` を付けるかファイル名をリネームしてください。
3. `npm run prepare`
   - 新しい譜面をマニフェストに反映します。

## 手動調整のポイント

- **ビートのハマり具合を確認**: `grid` 生成のままではブレイクやフィルに反応できないことがあります。`fromOnsets` を使うか、当該区間だけ `pattern` を変更して再生成すると調整が楽になります。
- **レーンの散り具合**: `laneCycle` だけでは偏りが出るので、`grid` を複数セクションに分けてローテーション順序を変えるか、生成後の JSON を直接編集してバリエーションを出してください。
- **ノーツのクレンジング**:
  1. 生成譜面を `--dry-run --preview=50` で確認し、怪しい区間のタイムスタンプをメモする。
  2. `assets/beatmaps/*.auto.json` を開き、該当ノーツの `time_ms` を補正。または `song-configs` のセクションを細分化して再生成。
- **HOLD や SLIDE の追加**: 現状のジェネレータは `tap` のみ出力します。必要に応じて生成後に `type` と `duration_ms` を手編集するか、ジェネレータの後処理にカスタムロジックを組み込んでください。

## セキュリティと品質面の注意

- 解析コマンド (`ffprobe`, `aubioonset`) を利用する場合は社内で配布しているバイナリに限定し、外部 API に音源をアップロードしないでください。
- スクリプト実行前に入力ファイル (`SongConfig`, `onsets`) を `git diff` で確認し、意図しない差分がないことをチェックする習慣をつけてください。
- 自動生成後は必ず実機またはシミュレータでプレイ確認し、体感遅延やレーン密度をレビューしましょう。

## 追加でカスタマイズするには

- `scripts/generate-beatmap.js` 内の TODO コメントを起点に、ジェネレータを増やす・後処理を追加するといった拡張が可能です。
- 生成済みのオンセットファイルは JSON なので、外部 DAW で書き出した拍位置リストを取り込む用途にも流用できます。

以上で自動生成の基本的な流れは完了です。疑問点があれば `docs/` ディレクトリに追記する形でナレッジを蓄積してください。
