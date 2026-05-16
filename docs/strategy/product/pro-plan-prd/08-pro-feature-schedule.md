# PRD-08: 自主練スケジュール + リマインド

**作成日**: 2026-05-12
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`, `05-pro-feature-practice-log.md`

---

## 概要

曜日別の自主練スケジュールを設定し、プッシュ通知でリマインドする Pro 機能。
練習の習慣化を仕組みで支え、JTBD「諦めない」「毎日続ける」を実現する。

---

## 背景・目的

- 戦略ドキュメントのステップ11 で MVP に採用
- 「忙しい中で野球を続けたい」健・拓海ペルソナの動機に直撃
- 「サボり防止」の心理的仕組み

---

## ユーザーストーリー

### US-01: 健の習慣化

> 健は毎週の朝練スケジュールを設定:
> - 月曜 6:00 - 素振り200本
> - 水曜 6:00 - 素振り200本
> - 金曜 6:00 - 素振り200本
> - 土曜 9:00 - 試合があれば試合、なければ全体練習
> プッシュ通知で「今日の練習時間です」と通知を受け、忙しい仕事中でも忘れない。

### US-02: 翔太の部活外練習

> 翔太は部活終了後の自主練を計画:
> - 平日 21:00 - シャドウピッチング 30球 + 素振り 100本
> - 日曜 7:00 - ランニング 5km
> リマインドで気が緩む夜も自分を律する。

---

## 機能要件

### 必須機能

| # | 機能 | 詳細 |
|---|----|----|
| F-01 | スケジュール作成 | 曜日 + 時刻 + メニュー（複数可） |
| F-02 | 曜日選択 | 月〜日、複数選択可 |
| F-03 | 時刻設定 | 1分刻み |
| F-04 | メニュー紐付け | PRD-05 の practice_menus と連動 |
| F-05 | プッシュ通知 | 設定時刻に通知 |
| F-06 | 通知ON/OFF切り替え | スケジュール単位で |
| F-07 | スケジュール一覧 | 週間ビューで全スケジュール表示 |
| F-08 | 編集・削除 | スケジュールの修正可 |
| F-09 | スケジュールから記録開始 | 通知タップで練習記録画面へ |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-10 | スケジュール登録数 | 1つまで | 無制限 |
| F-11 | 通知頻度のカスタマイズ | × | ◎ |
| F-12 | スケジュール別の通知メッセージ | × | ◎ |
| F-13 | 月次の練習達成サマリー | × | ◎ |

---

## データモデル

### schedules テーブル（新規）

```ruby
class CreateSchedules < ActiveRecord::Migration[7.0]
  def change
    create_table :schedules do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false              # "朝の素振り"
      t.string :days_of_week, null: false       # "1,3,5"（月・水・金）
      t.time :scheduled_time, null: false       # 06:00
      t.text :note
      t.boolean :notification_enabled, default: true
      t.boolean :active, default: true
      t.string :notification_message            # カスタム通知文（Pro機能）
      t.timestamps
    end
  end
end
```

### schedule_menus テーブル（中間テーブル）

```ruby
class CreateScheduleMenus < ActiveRecord::Migration[7.0]
  def change
    create_table :schedule_menus do |t|
      t.references :schedule, null: false, foreign_key: true
      t.references :practice_menu, null: false, foreign_key: true
      t.float :target_value
      t.integer :sort_order, default: 0
      t.timestamps
    end
  end
end
```

---

## API 設計

| メソッド | パス |
|--------|----|
| GET | `/api/v1/schedules` |
| POST | `/api/v1/schedules` |
| PATCH | `/api/v1/schedules/:id` |
| DELETE | `/api/v1/schedules/:id` |
| POST | `/api/v1/schedules/:id/toggle_notification` |

### POST /api/v1/schedules

リクエスト:
```json
{
  "title": "朝の素振り",
  "days_of_week": [1, 3, 5],
  "scheduled_time": "06:00",
  "menus": [
    {"practice_menu_id": 10, "target_value": 200}
  ],
  "notification_enabled": true,
  "notification_message": "おはよう！今日も素振りしよう"
}
```

---

## UI 仕様

### スケジュール一覧（週間ビュー）

```
┌────────────────────────────────┐
│  自主練スケジュール              │
│                                │
│   月 火 水 木 金 土 日           │
│   ●     ●     ●               │
│   06:00 朝の素振り               │
│                                │
│        ●                       │
│        21:00 シャドウピッチング   │
│                                │
│                          ●     │
│                          07:00  │
│                          ランニング│
│                                │
│  [+ 新しいスケジュール]          │
└────────────────────────────────┘
```

### スケジュール作成画面

```
┌────────────────────────────────┐
│  新しいスケジュール              │
│                                │
│  タイトル: [朝の素振り]           │
│                                │
│  曜日:                          │
│  [月] [火] [水] [木] [金] [土] [日]│
│   ●        ●        ●           │
│                                │
│  時刻: [06:00]                   │
│                                │
│  メニュー:                       │
│   素振り 200回                   │
│   [+ メニュー追加]                │
│                                │
│  ☑ プッシュ通知                  │
│                                │
│  カスタム通知文（Pro）:           │
│  [おはよう！今日も素振りしよう]    │
│                                │
│  [   保存   ]                    │
└────────────────────────────────┘
```

### プッシュ通知

```
[通知例]

📣 BUZZ BASE
今日も素振りしよう

朝の素振り（200本）の時間です
タップで練習を開始
```

---

## 通知配信の実装

### 構成案: ローカル通知 + サーバー通知の併用

#### iOS（推奨）

- `expo-notifications` でローカル通知をスケジュール
- アプリ起動時に直近のスケジュールをデバイスにロード
- バックグラウンドでも通知が届く

#### Web

- Web Push 通知（FCM 等）
- ブラウザに permission リクエスト

### バックエンドからの補完通知

- ローカル通知が機能しない場合のフォールバック
- Rails の sidekiq + Firebase Cloud Messaging（FCM）

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 無料ユーザーが2つ目のスケジュール | 「Pro で無制限に」訴求 |
| 通知許可を拒否済み | アプリ内で再許可リクエスト |
| 機内モード時 | ローカル通知は機能、サーバー通知は届かない |
| 既に練習記録済みの場合 | 通知に「今日はもう練習済み！🎉」 |
| スケジュール削除 | スケジュールに紐付く通知も削除 |

---

## テスト要件

### 単体テスト

- [ ] Schedule のバリデーション
- [ ] days_of_week のパース
- [ ] ScheduleMenu の紐付け

### 統合テスト

- [ ] スケジュール作成 → 通知設定 → 練習記録
- [ ] Pro / 無料 の制限

### 手動テスト

- [ ] iOS で実際に通知が届く
- [ ] 通知タップで練習記録画面へ遷移

---

## 完了の定義（Definition of Done）

- [ ] スケジュール作成・編集・削除が動作
- [ ] 設定時刻にプッシュ通知が届く
- [ ] 通知タップで練習記録画面に遷移
- [ ] 無料は1つまで、Pro は無制限
- [ ] 既に練習済みの場合は通知文を変更

---

## 後で詰める論点

- [ ] Web Push 通知の実装可否
- [ ] スケジュール推奨機能（AIが過去履歴から推奨）
- [ ] 共有機能（チームメイトと同じスケジュール）（Phase 2）
- [ ] スマートリマインド（天候・予定に基づく自動延期）（Phase 3）
