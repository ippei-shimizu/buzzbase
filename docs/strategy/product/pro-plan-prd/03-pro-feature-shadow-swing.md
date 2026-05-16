# PRD-03: 素振りカウンター機能

**作成日**: 2026-05-12
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`

---

## 概要

野球選手の自主練「素振り」をリズム音 + 自動カウントでサポートする業界初の機能。
練習記録と連動し、Streak（草機能）にも反映される。

---

## 背景・目的

- 戦略ドキュメントのステップ11 で MVP に採用
- 競合（ヒットメーカー、ベボレコ、TeamHub等）に存在しない独自機能
- SNS バイラル素材（TikTok等で映える）
- 「毎日のコア体験」として Streak / 草機能と連動

---

## ユーザーストーリー

### US-01: 翔太（大学投手）の素振り練習

> 部活の練習後、寮で素振り200本を目標に練習する。
> アプリで「目標200本、インターバル2秒」を設定して開始。
> リズム音に合わせて素振り、自動でカウントアップ。
> 完了後、自動的に練習記録に保存され、Streak が継続する。

### US-02: 健（社会人野手）の朝練

> 朝6:00に出勤前の素振り。集中したいので音を出さずバイブのみに設定。
> 100本完了後、アプリは自動的に停止。

---

## 機能要件

### 必須機能

| # | 機能 | 詳細 |
|---|----|----|
| F-01 | 目標本数の設定 | 10本〜2,000本（カスタム入力可） |
| F-02 | インターバル設定 | 1秒〜10秒（0.5秒刻み） |
| F-03 | 開始 / 一時停止 / 終了 | 通常の音楽プレイヤーと同様 |
| F-04 | 自動カウントアップ | インターバルごとに+1 |
| F-05 | リズム音再生 | デフォルト音（メトロノーム風） |
| F-06 | バイブレーション切り替え | 音 / バイブ / 両方 / 無音 |
| F-07 | 進捗表示 | 「現在 / 目標」を大きく表示 |
| F-08 | 完了時の達成感演出 | 振動 + 効果音 + 達成アニメ |
| F-09 | 練習記録への自動保存 | 練習ログテーブルに紐付け |
| F-10 | 累計本数の表示 | 過去総本数を確認可能 |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-11 | 基本利用（10〜100本まで） | ◎ | ◎ |
| F-12 | 100本以上の目標設定 | ✕ | ◎ |
| F-13 | カスタムインターバル（1秒未満等） | ✕ | ◎ |
| F-14 | カスタムリズム音（アップロード） | ✕ | ◎（Phase 2） |
| F-15 | 累計本数の表示（30日以上） | ✕ | ◎ |
| F-16 | バックグラウンド継続実行 | ✕ | ◎ |

---

## データモデル

### shadow_swing_sessions テーブル（新規）

```ruby
class CreateShadowSwingSessions < ActiveRecord::Migration[7.0]
  def change
    create_table :shadow_swing_sessions do |t|
      t.references :user, null: false, foreign_key: true
      t.integer :target_count, null: false        # 目標本数
      t.integer :completed_count, null: false     # 実際の本数
      t.float :interval_seconds, null: false      # インターバル（秒）
      t.integer :duration_seconds                 # 合計時間
      t.string :sound_setting                     # 'sound' / 'vibration' / 'both' / 'silent'
      t.datetime :started_at, null: false
      t.datetime :ended_at
      t.references :practice_log, foreign_key: true, null: true
      t.timestamps
    end

    add_index :shadow_swing_sessions, [:user_id, :started_at]
  end
end
```

### 累計集計（クエリで集計、キャッシュ不要）

```ruby
class User < ApplicationRecord
  has_many :shadow_swing_sessions

  def total_swing_count
    shadow_swing_sessions.sum(:completed_count)
  end

  def total_swing_count_in_period(start_date, end_date)
    shadow_swing_sessions
      .where(started_at: start_date..end_date)
      .sum(:completed_count)
  end
end
```

---

## API 設計

| メソッド | パス | 用途 |
|--------|----|----|
| POST | `/api/v1/shadow_swing/sessions` | セッション開始 |
| PATCH | `/api/v1/shadow_swing/sessions/:id` | セッション更新（カウント中の中間更新） |
| POST | `/api/v1/shadow_swing/sessions/:id/complete` | セッション完了 |
| GET | `/api/v1/shadow_swing/sessions` | セッション一覧取得 |
| GET | `/api/v1/shadow_swing/stats` | 累計統計取得 |

### POST /api/v1/shadow_swing/sessions

リクエスト:
```json
{
  "target_count": 200,
  "interval_seconds": 2.0,
  "sound_setting": "sound"
}
```

レスポンス:
```json
{
  "session_id": 123,
  "started_at": "2026-05-31T15:00:00+09:00"
}
```

### POST /api/v1/shadow_swing/sessions/:id/complete

リクエスト:
```json
{
  "completed_count": 200,
  "duration_seconds": 420
}
```

レスポンス:
```json
{
  "session": { ... },
  "practice_log_id": 456,
  "streak_updated": true,
  "current_streak_days": 15
}
```

---

## UI 仕様

### 設定画面（開始前）

```
┌────────────────────────────────┐
│  素振りカウンター               │
│                                │
│  目標本数: [  200  ] 本         │
│  インターバル: [ 2.0 ] 秒        │
│                                │
│  音: ● 音 ○ バイブ ○ 両方 ○ 無音│
│                                │
│  [    開始する    ]             │
│                                │
│  累計本数: 12,450本             │
└────────────────────────────────┘
```

### 実行中画面

```
┌────────────────────────────────┐
│                                │
│         87 / 200                │
│                                │
│      [大きなプログレスバー]      │
│                                │
│   経過時間: 02:54                │
│                                │
│   [一時停止]   [終了]             │
│                                │
└────────────────────────────────┘
```

### 完了画面

```
┌────────────────────────────────┐
│       🎉 200本 達成！          │
│                                │
│   所要時間: 06:40               │
│   平均インターバル: 2.0秒        │
│                                │
│   今日の累計: 200本             │
│   今月の累計: 4,500本           │
│   通算累計: 12,450本            │
│                                │
│   [   練習記録に保存   ]         │
│   [   閉じる            ]        │
└────────────────────────────────┘
```

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| アプリをバックグラウンドにした | Pro: 継続実行 / 無料: 一時停止 |
| 電話がかかってきた | 自動的に一時停止、終了後に再開選択 |
| 画面ロック | バックグラウンドモードに移行 |
| 設定範囲外の数値入力 | バリデーションでブロック |
| インターバル中に手動カウントしたい | （Phase 2）手動カウントモード |
| 途中で中断 | 完了画面に「途中保存しますか?」確認 |

---

## テスト要件

### 単体テスト

- [ ] ShadowSwingSession モデルのバリデーション
- [ ] 累計集計のクエリ
- [ ] practice_log との紐付け

### 統合テスト

- [ ] セッション開始 → 中間更新 → 完了 の API フロー
- [ ] Pro 機能チェック（無料ユーザーの100本以上ブロック）

### 手動テスト

- [ ] iOS でリズム音が正しく再生される
- [ ] バックグラウンド継続実行（Pro機能）
- [ ] バイブレーションの動作確認

---

## 完了の定義（Definition of Done）

- [ ] iOS で設定→実行→完了→保存のフルフローが動作
- [ ] 無料ユーザーは100本までしか設定できない
- [ ] Pro ユーザーは無制限に設定できる
- [ ] 練習記録と自動連動する
- [ ] Streak（草機能）に反映される
- [ ] 累計本数が正しく集計される
- [ ] Sentry でエラー監視できる

---

## 後で詰める論点

- [ ] リズム音のデフォルト音源（楽曲使用権の確認）
- [ ] バックグラウンド実行の iOS 仕様確認
- [ ] Web 版でも提供するか?（mobile 限定で良いか）
- [ ] 手動カウントモードは Phase 2 で良いか
- [ ] 「失敗」検知（インターバルより長く間が空いた）の実装可否
