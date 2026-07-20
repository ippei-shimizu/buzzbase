# PRD-09: 野球ノート拡張（画像・動画アップロード + 試合 / 練習 紐付け）

**作成日**: 2026-05-12
**最終更新**: 2026-07-20（実装設計確定。着手: `feature/325-note-media-back` / `feature/325-note-media-mobile`）
**ステータス**: 実装中
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`
**設計**: [`../pro-plan-design/03-ux-information-architecture.md`](../pro-plan-design/03-ux-information-architecture.md) §4〜§5
**拡張PRD**: [`12-pro-feature-improvement-loop.md`](./12-pro-feature-improvement-loop.md)（課題テーマ紐付け・振り返りテンプレ＝問いかけの構造化）
**関連 issue**: [ippei-shimizu/buzzbase#325](https://github.com/ippei-shimizu/buzzbase/issues/325)（本PRD）、[#440](https://github.com/ippei-shimizu/buzzbase/issues/440)（Paywall未実装機能監査。本PRDの実装で#440の指摘1・3を解消）

---

## ⚠️ IA / 紐付け方針の追記（2026-06-27）

- 紐付け対象を拡張: 試合に加えて **練習（その日の練習 / 任意で特定の練習ログ）** にも紐付け可能にする（モデルA: 緩い紐付け）
- 役割の明確化: 野球ノートは**定性（感想・コーチ指摘・フォーム動画）**を担い、練習記録の**定量（量）**とは別データ。「練習中に感じたこと・教わったこと」をノートに残す用途
- 入口: 練習記録の**保存直後にノート誘導**する（感想を書きたい瞬間を逃さない）。ノートは何にも紐付かない日記としても書ける
- 配置: ホーム > 活動セグメントの**日付タイムライン**で、その日の量ログと紐付いたノートを同居表示する
- 詳細は設計 §4〜§5

---

## UI/UX 確定事項（2026-06-27）

設計検討で確定。以降の「機能要件」「Pro機能」「UI 仕様」「ストレージ構成」と差異がある場合は**本セクションを優先**する。

### 紐付け（モデルA）の実装

- 紐付け対象: 試合（既存 `game_result_id`）＋ 練習
  - **日単位** = 既存の `baseball_notes.date` で同日の練習ログとタイムライン同居（カラム追加不要）
  - **特定メニュー単位**（任意）= `baseball_notes` に `practice_log_id`(nullable) を追加
- 紐付けセレクタ: `[なし / 試合を選ぶ / 練習]`。練習保存後の誘導から入った時はその練習を**自動プリセット**、標準起動時は「なし」既定

### ストレージ・動画処理（最安構成で確定）

- **Cloudflare R2**（エグレス無料・$0.015/GB）に保存。サーバーは署名URL発行＋メタ保存のみ
- 画像・動画の**圧縮・サムネ生成はクライアント側（expo）**で実施。サーバー ffmpeg は使わない
- ※ S3・Cloudflare Stream は検討の結果**不採用**（R2＋クライアント処理が最安。S3はエグレス課金で割高）

### 無料 / Pro 制限

- アップロード上限は**点数制限**を採用（合計サイズ制限は不採用）
  - 理由: R2 はストレージ激安・エグレス無料、かつ無料は480p/30秒で1点が小さく（〜10-15MB）サイズで縛る実利が薄い。点数の方が分かりやすく Pro 転換レバーとして強い
- **保存期間は無料・Pro とも永続**（無料の30日自動削除は撤回。F-11 と `CleanupExpiredMediaJob` による無料ユーザーの期限切れ削除は不採用。`media_attachments.expires_at` は実質未使用）。R2 はストレージ激安のため永続でもコスト影響は小さい
- **無料**: 月3点（画像・動画合算）/ 動画30秒 / 480p / 画像5MB / 永続
- **Pro**: 無制限 / 動画60秒 / 1080p / 画像10MB / 永続
- 再生時の**透かしロゴ(F-14)は無料でも付けない**（自己フォーム確認の用途を損ねるため撤回）
- 上限到達モーダルは **Pro 加入導線のみ**（リワード広告ボタンは撤去。広告は対象外）

### プラットフォーム

- アップロードは **mobile 優先**（カメラ・録画が主）。閲覧・再生は既存ノート画面。Web 対応は将来

---

## 実装設計確定事項（2026-07-20）

設計フェーズで確定。以降の「データモデル」「ストレージ構成」「API 設計」「自動削除ジョブ」との差異は**本セクションを優先**する（該当セクションは歴史的経緯として残すが、実装は本セクションに従う）。

### 既存実装との関係（重要）

`baseball_notes` への `practice_log_id` / `practice_session_id`（nullable）と、試合への紐付け（`note_game_links` 中間テーブル）は **`api/v2/baseball_notes_controller.rb` で実装済み**。本PRDのスコープは `media_attachments` の新規実装のみで、紐付け自体の新規実装は不要。

### データモデル（最終版）

`media_attachments` は `baseball_note_id` 必須（メディア単体では存在しない。ノートに従属する）。

```ruby
create_table :media_attachments do |t|
  t.references :user, null: false, foreign_key: true
  t.references :baseball_note, null: false, foreign_key: true
  t.string :media_type, null: false        # 'image' or 'video'
  t.string :r2_key, null: false            # R2オブジェクトキー（フルURLは持たない。CDNドメイン変更に強くするため）
  t.string :thumbnail_r2_key
  t.integer :file_size_bytes
  t.integer :duration_seconds              # 動画のみ
  t.integer :width
  t.integer :height
  t.integer :position, null: false, default: 0  # 表示順
  t.string :status, null: false, default: 'pending'  # pending(署名URL発行済・未完了) / ready / failed
  t.timestamps
end

add_index :media_attachments, [:user_id, :created_at]  # 月間カウント集計用
```

`baseball_notes.media_count` カラムは追加しない。`belongs_to :baseball_note, counter_cache: true` で `media_attachments_count` を自動管理する。

旧データモデル節にある `url` / `expires_at` カラムは不採用（`expires_at` は保存期間が無料・Proとも永続のため不要）。

### ストレージ構成（最終版）

- **Cloudflare R2** に確定。S3互換APIのため、既存の `fog-aws` 資産は流用せず `aws-sdk-s3` gem を新規追加し、`endpoint` をR2のエンドポイントに向けて presigned URL を発行する（既存のCarrierWave + fog-aws による画像アップロード＝アバター等とは別系統。混在させない）
- **画像・動画とも署名URL方式に統一**。プロフィール画像等の既存「FormData → サーバー経由multipart」パターン（`ImagePicker` → `FormData` → `axiosInstance` PUT）は本機能には使わず、新規に署名URL方式を実装する
- サムネイル生成・動画圧縮は **クライアント側（expo）** で実施。サーバー側 ffmpeg は使わない
  - 動画圧縮: **`react-native-compressor`** を導入する。Expo Go では動作しないネイティブモジュールのため、本機能の開発・検証からは **EAS Build の dev client** を使用する（`yarn ios` / `yarn android` は dev client 前提に変更）
  - サムネイル生成: `expo-video-thumbnails` を導入（動画のファーストフレーム抽出）
  - 動画再生: `expo-video`（Expo SDK 55 の推奨動画コンポーネント）を新規導入

### 無料 / Pro 上限のサーバー側再検証

クライアント側の解像度・長さ・サイズチェックはバイパス可能なため、アップロード完了時（後述の `PATCH /media_attachments/:id`）にサーバー側でも無料/Pro上限を再検証し、超過時は `422` を返して `status: failed` にする。

### entitlement整理

- `media_long_term_storage` は **entitlementキーごと削除**する（`app/models/concerns/entitlement.rb` の `PRO_FEATURES` から除去）。保存期間は無料・Proとも永続のため、Pro限定機能として存在しない
- Paywall比較表（front / mobile）から「保存期間: 31日以内 → 無期限」の行を削除する
- `unlimited_media_uploads` は実装を継続。`app/models/concerns/plan_limits.rb` の `media_attachments_count_this_month`（現状 `0` を返すダミー）を、当月 `created_at` かつ `status != 'failed'` の `media_attachments` 実カウントに差し替える

上記2点により、issue #440 の指摘1（`unlimited_media_uploads` ダミー実装）と指摘3（`media_long_term_storage` 未実装）を解消する。指摘3は「実装」ではなく「仕様として存在しない」ことの明確化によるクローズ。

### API 設計（署名URL方式・最終版）

「API 設計」節の multipart アップロード方式は不採用とし、以下に置き換える。

| メソッド | パス | 用途 |
|--------|----|----|
| POST | `/api/v2/media_attachments/presign` | 署名URL発行。`media_type`, `content_type` を受け取り、月間上限チェック後に本体・サムネイルの署名PUT URLと`media_attachment.id`（`status: pending`）を返す |
| PATCH | `/api/v2/media_attachments/:id` | アップロード完了通知。実測 `duration_seconds` / `width` / `height` / `file_size_bytes` を受け取りサーバー側で上限再検証、`status: ready` に更新 |
| DELETE | `/api/v2/media_attachments/:id` | 削除（本人のみ、R2オブジェクトも削除） |

`baseball_note_id` は `presign` 時点でノートが存在している前提（先にノート本体を保存 → メディア追加、の順序）。

### 自動削除ジョブ

`CleanupExpiredMediaJob` は実装しない（保存期間が無料・Proとも永続のため対象が存在しない）。旧「自動削除ジョブ（無料ユーザー）」節は歴史的経緯として残すが、実装不要。

---

## 概要

既存の野球ノート機能を拡張し、画像・動画のアップロードと **試合 / 練習への紐付け** を可能にする。
フォームチェック、コーチの指摘の保存、進化の記録に使える。

---

## 背景・目的

- 戦略ドキュメントのステップ11 で MVP に採用
- 「ユーザーが工数を考えなくていい」観点で、追加された機能
- フォームチェック動画のニーズ（特に拓海・翔太）
- 既存の `baseball_notes` テーブルを拡張する形

---

## ユーザーストーリー

### US-01: 拓海のフォーム録画

> 拓海はジムでシャドウピッチングを録画し、アプリにアップロード。
> 3ヶ月前のフォームと比較して、肩の開きが改善されたことを確認。

### US-02: 翔太のコーチ指摘記録

> 翔太は練習で監督から「リリースポイントが前すぎる」と指摘される。
> その日のノートに動画を録って、メモを添える。
> 後日、同じ問題が再発したときに参照する。

### US-03: 大輝の試合ハイライト

> 大輝は試合で打ったホームランの動画を、その試合の記録に紐付ける。
> 後で見返して「ここまで成長した」と実感、SNS にもシェア。

---

## 機能要件

### 必須機能

| # | 機能 | 詳細 |
|---|----|----|
| F-01 | 画像アップロード | jpg, png, heic（自動変換） |
| F-02 | 動画アップロード | mp4, mov（最大60秒・100MB） |
| F-03 | サムネイル自動生成 | 動画はファーストフレーム |
| F-04 | 試合と紐付け | game_results との関連 |
| F-05 | メモ機能 | 既存野球ノートを流用 |
| F-06 | タイムライン表示 | 日付順に並べて閲覧 |
| F-07 | 試合詳細から関連メディア表示 | 試合ページで紐付くメディア一覧 |
| F-08 | フルスクリーン再生 | 動画再生 |
| F-09 | 削除機能 | ユーザー本人のみ |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-10 | 画像・動画アップロード月間上限 | 3点まで | 無制限 |
| F-11 | 保管期間 | 30日後に自動削除 | 永続保存 |
| F-12 | 動画最大長 | 30秒 | 60秒 |
| F-13 | 動画解像度 | 480p | 1080p |
| F-14 | フルスクリーン再生 | △ 透かしロゴ表示 | ◎ 透かしなし |

---

## データモデル

### baseball_notes テーブルの拡張

既存テーブルに以下を追加:

```ruby
class ExtendBaseballNotes < ActiveRecord::Migration[7.0]
  def change
    add_reference :baseball_notes, :game_result, foreign_key: true, null: true
    add_column :baseball_notes, :media_count, :integer, default: 0
  end
end
```

### media_attachments テーブル（新規）

```ruby
class CreateMediaAttachments < ActiveRecord::Migration[7.0]
  def change
    create_table :media_attachments do |t|
      t.references :user, null: false, foreign_key: true
      t.references :baseball_note, foreign_key: true
      t.string :media_type, null: false        # 'image' or 'video'
      t.string :url, null: false               # 本体URL
      t.string :thumbnail_url                  # サムネイルURL
      t.integer :file_size_bytes
      t.integer :duration_seconds              # 動画のみ
      t.integer :width
      t.integer :height
      t.string :original_filename
      t.string :status, default: 'processing'  # 'processing' / 'ready' / 'failed'
      t.datetime :expires_at                   # 無料ユーザーは30日後
      t.timestamps
    end

    add_index :media_attachments, [:user_id, :expires_at]
  end
end
```

---

## ストレージ構成

### 利用サービス

| サービス | 用途 |
|---------|----|
| **Cloudflare R2** | 主要候補。S3互換、エグレス無料 |
| AWS S3 | 代替案 |
| ActiveStorage | Rails の標準、上記のいずれかと連携 |

### 動画処理

| 処理 | サービス候補 |
|----|----------|
| サムネイル生成 | ffmpeg（サーバーサイド） or Cloudflare Stream |
| 動画圧縮 | ffmpeg or Cloudflare Stream |
| 配信 | CDN 経由（Cloudflare R2 + Cache） |

### URLの形式

- 永続URL（公開）: `https://media.buzzbase.jp/{user_id}/{uuid}.mp4`
- サムネイル: `https://media.buzzbase.jp/{user_id}/{uuid}_thumb.jpg`

### サイズ制限

| 種類 | 無料 | Pro |
|----|----|-----|
| 画像 | 最大 5MB / 4K まで | 最大 10MB / 4K まで |
| 動画 | 最大 100MB / 30秒 / 480p | 最大 200MB / 60秒 / 1080p |

---

## API 設計

### Media Attachments

| メソッド | パス |
|--------|----|
| GET | `/api/v1/media_attachments?baseball_note_id=` |
| POST | `/api/v1/media_attachments` （マルチパートアップロード）|
| DELETE | `/api/v1/media_attachments/:id` |

### Baseball Notes（拡張）

既存のエンドポイントに `game_result_id` パラメータを追加。

| メソッド | パス |
|--------|----|
| GET | `/api/v1/baseball_notes` |
| GET | `/api/v1/baseball_notes/by_game_result/:id` |
| POST | `/api/v1/baseball_notes` |
| PATCH | `/api/v1/baseball_notes/:id` |
| DELETE | `/api/v1/baseball_notes/:id` |

### POST /api/v1/media_attachments

リクエスト（multipart/form-data）:
```
file: <binary>
baseball_note_id: 123
```

レスポンス:
```json
{
  "media_attachment": {
    "id": 456,
    "media_type": "video",
    "url": "https://media.buzzbase.jp/...",
    "thumbnail_url": "https://media.buzzbase.jp/..._thumb.jpg",
    "duration_seconds": 25,
    "status": "ready"
  }
}
```

---

## UI 仕様

### ノート編集画面

```
┌────────────────────────────────┐
│  ノートを書く                    │
│                                │
│  [紐付ける試合: 2026-05-15 vs 〇〇 ▼]│
│                                │
│  [今日の気づき]                  │
│  [リリースポイントが前すぎると指摘]│
│  [次回、もう少し後ろを意識する]    │
│                                │
│  メディア:                       │
│  [📷] [🎥] [📁]                   │
│                                │
│  [📸 サムネ1] [🎥 サムネ2]        │
│  [+ 追加]                        │
│                                │
│  [   保存   ]                    │
└────────────────────────────────┘
```

### メディアプレビュー

```
┌────────────────────────────────┐
│        2026-05-15 のノート       │
│                                │
│  [動画再生エリア]                │
│  ▶ ━━━━━━━━━━━░░░░░ 0:25      │
│                                │
│  リリースポイントが前すぎると...  │
│                                │
│  関連: 2026-05-15 vs 〇〇       │
└────────────────────────────────┘
```

### 無料ユーザーの上限到達時

```
┌────────────────────────────────┐
│  📁 月間アップロード上限          │
│                                │
│  今月は3点までアップロードできます│
│  あと 0点                       │
│                                │
│  [Pro に加入する]                │
│  Pro なら無制限・永続保存        │
│                                │
│  [リワード広告で1点追加]          │ ← PRD-10
└────────────────────────────────┘
```

---

## 自動削除ジョブ（無料ユーザー）

```ruby
# 毎日 03:00 に実行
class CleanupExpiredMediaJob < ApplicationJob
  def perform
    MediaAttachment.where('expires_at < ?', Time.current)
                    .find_each do |attachment|
      delete_from_storage(attachment)
      attachment.destroy
    end
  end

  private

  def delete_from_storage(attachment)
    # Cloudflare R2 から削除
  end
end
```

無料ユーザーは作成時に `expires_at = created_at + 30.days` を設定。
Pro ユーザーは `expires_at = NULL`。

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| アップロードサイズ超過 | クライアント側でブロック、エラー表示 |
| 動画長さ超過 | クライアント側で警告、トリミング機能（Phase 2） |
| アップロード中断 | レジューム不可、再アップロード必要 |
| ファイル形式非対応 | クライアント側でブロック |
| Pro 解約後 | 既存メディアは保持、新規は無料制限が適用 |
| 30日経過直前の Pro 加入 | expires_at をクリア、永続保存に変更 |

---

## テスト要件

### 単体テスト

- [ ] MediaAttachment のバリデーション
- [ ] expires_at の自動設定
- [ ] CleanupExpiredMediaJob のロジック

### 統合テスト

- [ ] 画像アップロード → サムネイル生成 → 表示
- [ ] 動画アップロード → 圧縮 → 配信
- [ ] 試合詳細ページから関連メディア表示

---

## 完了の定義（Definition of Done）

- [ ] 画像・動画のアップロードが動作（R2署名URL方式）
- [ ] サムネイル自動生成（クライアント側 `expo-video-thumbnails`）
- [ ] 動画のクライアント側圧縮が動作（`react-native-compressor`、dev client）
- [ ] 試合・練習（日単位 / `practice_log_id`）との紐付け表示（紐付け自体は実装済み、メディア表示のみ追加）
- [ ] 無料は月3点・480p/30秒・画像5MB・永続、Pro は無制限・1080p/60秒・画像10MB・永続
- [ ] サーバー側でも無料/Pro上限を再検証（クライアント側チェックのバイパス対策）
- [ ] `media_attachments_count_this_month` を実カウントに差し替え
- [ ] `media_long_term_storage` entitlementキーを削除、Paywall比較表から該当行を削除
- [ ] フルスクリーン再生（mobile。web は将来）

---

## 後で詰める論点

- [ ] R2バケット・CDNドメイン（`media.buzzbase.jp`想定）の用意、環境変数設計
- [ ] `aws-sdk-s3` gemの導入・presigned URL発行の実装詳細
- [ ] EAS Build dev client のCI/配布フロー整備（`react-native-compressor`導入に伴う）
- [ ] SNS シェア時の透かし入り動画生成
- [ ] AI による動画解析（Phase 4）
- [ ] フォーム比較機能（2動画並べて再生）（Phase 2）
