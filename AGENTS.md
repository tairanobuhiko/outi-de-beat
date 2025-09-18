# モバイル音ゲー（iOS／自宅Wi-Fi限定）要件定義
### 1. 目的・スコープ
  - 自宅の 特定 Wi-Fi 環境下でのみ プレイ可能なタップ型リズムゲーム（オフライン配信なし）
  - 対象：iOS（iPhone／iPad）
  - 開発スタック：React Native + Expo（EAS Development Build 前提）
  - 音源：.mp3, .wav, .caf
  - 難易度：3〜4 種（かんたん／ふつう／むずかしい／激ムズ）

### 2. 配布・実行形態
  - 配布：TestFlight または Ad-hoc（社内限定）
  - ビルド：Expo Dev Client（EAS Development Build） を基本
    - ネイティブ設定や将来のプラグイン追加に柔軟（Capabilities/Entitlements は必要時のみ）
  - 最低 OS：iOS 15 以上（目安）

### 3. オーディオ・譜面・アセット管理
  - アセット配置（リポジトリ内）：
  ```
  /assets
    /audio
      song01.mp3
      song02.caf
    /beatmaps
      song01_easy.json
      song01_normal.json
      song01_hard.json
    /art
      lane.png
      note.png
  ```
  - 楽曲追加手順：開発者が /assets/audio と /assets/beatmaps にファイルを置く→起動時に自動スキャン
  - 譜面（ビートマップ）フォーマット（JSON 例）
  - 必須キー：song_id, audio_file, offset_ms, notes[] { time_ms, lane, type(tap|hold|slide), duration_ms? }
  - 難易度ごとに個別ファイル（song01_easy.json など）

### 4. オーディオ再生と同期
  - 再生ライブラリ：expo-av（Audio.Sound.createAsync / playAsync / unloadAsync）
  - 再生位置を唯一の正とし、描画・判定は currentTime に追従（ドリフト防止）
  - AVAudioSession のカテゴリやモードは将来ネイティブ移行時に最適化（playback など）
  - 将来拡張：より低遅延が必要になれば AVAudioEngine ベース（ネイティブ実装／プラグイン化）を検討

### 5. 判定・スコアリング
  - 判定ウィンドウ（初期値・ms）：PERFECT ±25 / GREAT ±60 / GOOD ±100 / MISS それ以外
  - スコア例：PERFECT=1000, GREAT=700, GOOD=300, MISS=0
  - コンボ補正：1 + floor(combo/50)*0.02
  - HOLD：開始／終了＋ティックボーナス
  - レイテンシ補正：キャリブ（±ms）を保存し、判定時に加算

### 6. ゲーム進行・UI
  - 画面フロー：タイトル → 楽曲選択 → 難易度 → プレイ → リザルト
  - プレイ画面：レーン数：4（MVP）／ ジャッジライン／スコア・コンボ表示
  - 操作：タップ（MVP）→ 長押し／スライドは拡張
  - 設定：音量、タップエフェクト、キャリブ（A/Vオフセット）、判定表示 ON/OFF
  - アクセシビリティ：色覚配慮配色／ノーツサイズ調整／Haptics

### 7. データ保存
  - ローカルのみ（クラウド同期なし）
  - 保存対象：ハイスコア、クリア状況、判定分布、キャリブ値
  - 実装：AsyncStorage もしくは expo-file-system（JSON で十分）

### 8. 非機能要件（NFR）
  - フレームレート：60fps（対応端末は 120Hz に追随可）
  - 体感遅延：20ms 以内を目標（UI 更新は「音声再生位置」を正とする）
  - 起動：3 秒以内（初回アセットスキャンは別スレッド）
  - 安定性：連続 10 曲プレイで GC/ドリフトが発生しないこと

### 9. 権限・設定（iOS）
  - 本要件では 位置情報・Wi-Fi情報は不要（ネットワーク状態も必須ではない）
  - 必要に応じて通知/Haptics 等は別途検討
  - Capabilities/Entitlements は機能追加時にのみ付与（EASで同期管理）

### 10. テスト計画
  - 単体：譜面パース／判定関数／スコア計算のテスト
  - 結合：音声再生位置と入力判定の同期（実機）
  - 端末差：複数機種・有線/BTで遅延計測（注意喚起テキストも検証）
  - 長時間：10曲連続でドリフトの有無、unloadAsync のリーク無し確認（expo-av）

### 11. MVP スコープ（初回リリース）
  - レーン 4、タップのみ
  - 難易度：かんたん／ふつう／むずかしい（激ムズは次回）
  - 楽曲 1 曲＋譜面 3 種
  - リザルト：スコア／コンボ／判定分布
  - 設定：キャリブ保存

### 12. ディレクトリ例（RN + Expo）
```
/app
  /screens
  /components
/assets
  /audio
  /beatmaps
  /art
/app.config.ts        // iOS entitlements などの設定
```
