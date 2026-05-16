# PRD-09: 野球ノート拡張（画像・動画アップロード + 試合紐付け）

**作成日**: 2026-05-12
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`

---

## 概要

既存の野球ノート機能を拡張し、画像・動画のアップロードと試合への紐付けを可能にする。
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

- [ ] 画像・動画のアップロードが動作
- [ ] サムネイル自動生成
- [ ] 試合との紐付け
- [ ] 無料は月3点・30日制限、Pro は無制限・永続
- [ ] フルスクリーン再生（mobile / web）
- [ ] 自動削除ジョブが動作

---

## 後で詰める論点

- [ ] ストレージサービスの最終選定（R2 vs S3）
- [ ] 動画圧縮のサーバー処理 vs クライアント処理
- [ ] SNS シェア時の透かし入り動画生成
- [ ] AI による動画解析（Phase 4）
- [ ] フォーム比較機能（2動画並べて再生）（Phase 2）
