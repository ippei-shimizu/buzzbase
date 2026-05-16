# PRD-07: 目標設定 + 達成管理

**作成日**: 2026-05-12
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`

---

## 概要

シーズン目標・月次目標を設定し、達成度をプログレスバーで可視化する Pro 機能。
「ライバルに負けたくない」「もっと上手くなりたい」を行動に変える仕組み。

---

## 背景・目的

- 戦略ドキュメントのステップ11 で MVP に採用
- ペルソナの「目標達成」「努力の見える化」動機に直撃
- 達成バッジで継続モチベーション

---

## ユーザーストーリー

### US-01: 大輝のシーズン目標

> 大輝は2026年春季リーグのシーズン目標を設定:
> - 打率 0.300 以上
> - 出塁率 0.400 以上
> - 試合数 20試合以上
> アプリのホームで毎日達成度を確認、現在 0.298 で「あと少し」と粘る。

### US-02: 健の月次目標

> 健は毎月初に「月間目標」を設定:
> - 素振り 5,000本
> - 練習日数 20日以上
> 月末に達成サマリーで自分の頑張りを振り返る。

---

## 機能要件

### 必須機能

| # | 機能 | 詳細 |
|---|----|----|
| F-01 | シーズン目標設定 | 既存 `seasons` テーブルに紐付け |
| F-02 | 月次目標設定 | カレンダー月単位 |
| F-03 | 目標指標の選択 | 打率、OPS、防御率、試合数、練習日数、素振り本数 等 |
| F-04 | 目標値の入力 | 数値入力 |
| F-05 | 達成度プログレスバー | リアルタイム計算 |
| F-06 | 期限到来時の自動判定 | 月末・シーズン終了で達成/未達確定 |
| F-07 | 達成バッジ | 達成時にバッジ獲得 |
| F-08 | 達成履歴 | 過去の目標達成記録 |
| F-09 | 目標一覧画面 | アクティブな目標を一覧表示 |
| F-10 | 達成度の通知 | 「目標達成まで90%」プッシュ通知 |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-11 | 月次目標の設定 | 1つまで | 無制限 |
| F-12 | シーズン目標の設定 | × | ◎ |
| F-13 | 目標履歴の閲覧 | 直近1ヶ月 | 全期間 |
| F-14 | 達成バッジ獲得 | △ 基本のみ | ◎ 全種類 |
| F-15 | 目標達成度の詳細ダッシュボード | × | ◎ |

---

## 目標指標の一覧

### 成績系

| 指標 | 単位 | 集計元 |
|----|----|-----|
| 打率 | float | batting_averages |
| OPS | float | 同上 |
| 出塁率 | float | 同上 |
| 長打率 | float | 同上 |
| 本塁打 | integer | 同上 |
| 打点 | integer | 同上 |
| 防御率 | float | pitching_results |
| WHIP | float | 同上 |
| 勝利数 | integer | 同上 |
| 奪三振 | integer | 同上 |

### 行動系

| 指標 | 単位 | 集計元 |
|----|----|-----|
| 試合数 | integer | game_results |
| 練習日数 | integer | practice_logs（distinct） |
| 練習総時間 | minutes | practice_logs |
| 素振り総本数 | integer | shadow_swing_sessions |
| ランニング総距離 | km | practice_logs |
| 連続練習日数 | integer | activity_logs |

---

## データモデル

### goals テーブル（新規）

```ruby
class CreateGoals < ActiveRecord::Migration[7.0]
  def change
    create_table :goals do |t|
      t.references :user, null: false, foreign_key: true
      t.string :title, null: false
      t.string :period_type, null: false   # 'season' or 'monthly'
      t.references :season, foreign_key: true, null: true
      t.date :month_start                  # 月次目標の場合
      t.date :deadline, null: false
      t.string :metric_key, null: false    # 'batting_average', 'practice_days' 等
      t.float :target_value, null: false
      t.string :comparison_type, default: 'greater_than'  # 'greater_than' or 'less_than'（防御率等）
      t.float :achieved_value
      t.datetime :achieved_at
      t.boolean :is_achieved, default: false
      t.boolean :is_finalized, default: false  # 期限後にロック
      t.timestamps
    end

    add_index :goals, [:user_id, :period_type, :is_finalized]
  end
end
```

### goal_badges テーブル（新規、達成バッジ管理）

```ruby
class CreateGoalBadges < ActiveRecord::Migration[7.0]
  def change
    create_table :goal_badges do |t|
      t.references :user, null: false, foreign_key: true
      t.references :goal, foreign_key: true
      t.string :badge_type             # 'season_achieved', 'monthly_achieved', 'streak_3months'
      t.string :badge_name
      t.datetime :awarded_at, null: false
      t.timestamps
    end
  end
end
```

---

## API 設計

| メソッド | パス |
|--------|----|
| GET | `/api/v1/goals` |
| POST | `/api/v1/goals` |
| PATCH | `/api/v1/goals/:id` |
| DELETE | `/api/v1/goals/:id` |
| GET | `/api/v1/goals/active` |
| GET | `/api/v1/goals/history` |
| POST | `/api/v1/goals/finalize` |（バッチで期限到来分を一括処理）|

### GET /api/v1/goals/active

レスポンス:
```json
{
  "goals": [
    {
      "id": 1,
      "title": "春季リーグで打率3割",
      "period_type": "season",
      "metric_key": "batting_average",
      "metric_label": "打率",
      "target_value": 0.300,
      "achieved_value": 0.298,
      "progress_percent": 99.3,
      "deadline": "2026-06-30",
      "days_remaining": 49,
      "is_achieved": false
    },
    ...
  ]
}
```

---

## UI 仕様

### 目標一覧画面（ホーム画面の一部）

```
┌────────────────────────────────┐
│  現在の目標                     │
│                                │
│  🎯 春季リーグで打率3割          │
│  ████████████░  99.3%（あと少し）│
│  現在 0.298 / 目標 0.300         │
│  残り 49日                       │
│                                │
│  🎯 今月の練習日数 25日          │
│  ███████░░░░░░  60%             │
│  現在 15日 / 目標 25日           │
│                                │
│  [+ 新しい目標を追加]            │
└────────────────────────────────┘
```

### 目標設定画面

```
┌────────────────────────────────┐
│  新しい目標                      │
│                                │
│  種類:                          │
│   ● シーズン目標                 │
│   ○ 月次目標                    │
│                                │
│  対象シーズン: [2026年春季 ▼]    │
│                                │
│  指標: [打率 ▼]                  │
│  条件: [○ 以上 / ○ 以下]         │
│  目標値: [0.300]                 │
│                                │
│  目標タイトル:                   │
│  [春季リーグで打率3割]            │
│                                │
│  [   保存   ]                    │
└────────────────────────────────┘
```

### 達成サマリー画面（月末 / シーズン終了時）

```
┌────────────────────────────────┐
│  🎉 目標達成サマリー             │
│  2026年4月                      │
│                                │
│  ✅ 練習日数 25日                │
│     実績: 27日 / 目標 25日       │
│                                │
│  ❌ 素振り 5,000本               │
│     実績: 4,200本 / 目標 5,000本 │
│                                │
│  達成率: 50%                    │
│                                │
│  🏆 獲得バッジ                  │
│  [月間目標達成 ×1]               │
└────────────────────────────────┘
```

---

## 達成判定ロジック

### リアルタイム判定（プログレスバー）

```ruby
class GoalProgressCalculator
  def initialize(goal)
    @goal = goal
  end

  def progress_percent
    return 0 if @goal.target_value.zero?

    achieved = current_value
    case @goal.comparison_type
    when 'greater_than'
      (achieved / @goal.target_value * 100).clamp(0, 100)
    when 'less_than'
      # 防御率等、低いほど良い指標
      (@goal.target_value / achieved * 100).clamp(0, 100) if achieved > 0
    end
  end

  def current_value
    GoalMetricCalculator.calculate(@goal.user, @goal.metric_key, @goal.period_range)
  end
end
```

### 期限到来時の確定処理（バッチ）

```ruby
# 毎日 00:00 に実行
class FinalizeGoalsJob < ApplicationJob
  def perform
    Goal.where(is_finalized: false)
        .where('deadline < ?', Date.current)
        .find_each do |goal|
      finalize_goal(goal)
    end
  end

  private

  def finalize_goal(goal)
    final_value = GoalProgressCalculator.new(goal).current_value
    achieved = check_achievement(goal, final_value)

    goal.update!(
      achieved_value: final_value,
      is_achieved: achieved,
      achieved_at: achieved ? Time.current : nil,
      is_finalized: true
    )

    GoalBadge.award_for(goal) if achieved
    NotificationService.send_goal_result(goal)
  end
end
```

---

## バッジ種類

| バッジID | 名前 | 条件 |
|--------|----|----|
| `monthly_achieved` | 月間目標達成 | 月次目標1つ達成 |
| `monthly_streak_3` | 月間目標3連続達成 | 3ヶ月連続で月次目標達成 |
| `monthly_streak_6` | 月間目標半年連続 | 6ヶ月連続 |
| `monthly_streak_12` | 月間目標1年連続 | 12ヶ月連続 |
| `season_achieved` | シーズン目標達成 | シーズン目標1つ達成 |
| `season_streak_2` | シーズン2連続 | 2シーズン連続達成 |

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 無料ユーザーが2つ目の月次目標 | 「Pro で無制限に」訴求 |
| 目標期限後の編集 | is_finalized = true でブロック |
| 該当指標のデータが0件 | progress 0%、「データなし」表示 |
| シーズン削除 | 紐付く目標は orphan 状態に（保持） |

---

## テスト要件

### 単体テスト

- [ ] GoalProgressCalculator の各指標
- [ ] FinalizeGoalsJob の達成判定
- [ ] GoalBadge の付与ロジック

### 統合テスト

- [ ] 目標設定 → 達成 → バッジ獲得 のフルフロー
- [ ] Pro / 無料 の制限

---

## 完了の定義（Definition of Done）

- [ ] シーズン・月次の目標設定が動作
- [ ] プログレスバーがリアルタイム更新
- [ ] 期限到来時の自動確定処理が動作
- [ ] バッジ獲得が動作
- [ ] Pro / 無料 の制限が正しく機能
- [ ] 達成時にプッシュ通知

---

## 後で詰める論点

- [ ] バッジのデザイン（アイコン）
- [ ] 目標達成度のプッシュ通知タイミング（90%、100%、未達時）
- [ ] チームメイトとの目標共有（Phase 2）
- [ ] AI による目標提案（Phase 3）
