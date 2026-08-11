# PRD-07: 目標設定 + 達成管理

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（実装内容に合わせて期間タイプ・目標種類・指標・API・バッジを更新）
**ステータス**: 実装済み（back / front / mobile）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`
**設計**: [`../pro-plan-design/03-ux-information-architecture.md`](../pro-plan-design/03-ux-information-architecture.md) §1, §7
**関連PRD**: [`12-pro-feature-improvement-loop.md`](./12-pro-feature-improvement-loop.md)（課題テーマは短期の技術フォーカス、目標は到達値。将来レポート統合の余地あり）

---

## 概要

シーズン目標・月次目標を設定し、達成度をプログレスバーで可視化する Pro 機能。
「ライバルに負けたくない」「もっと上手くなりたい」を行動に変える仕組み。

---

## 実装確定事項（2026-08-11）

実装に合わせた最終仕様。以降の「機能要件」「UI 仕様」と差異がある場合は**本セクションを優先**する。

### 期間タイプ（6種）

当初の season / monthly の2種から拡張し、`Goal::PERIOD_TYPES` = `season` / `monthly` / `tournament` / `weekly` / `yearly` / `custom` の6種で運用する。

- `monthly` / `weekly` / `yearly` は期間を自動設定（今月 / 今週 月〜日 / 今年 1〜12月）
- `custom` は開始日（`month_start`）と期限（`deadline`）をユーザーが指定する
- `season` は `seasons`、`tournament` は `tournaments` に紐付け、その対象の試合の最小〜最大日時を集計期間とする

### 目標の種類（kind・3種）

指標を自動集計できない目標も扱えるよう `kind` を導入した。

| kind | 内容 | 現在値の決まり方 |
|---|---|---|
| `numeric` | 数値目標（打率3割・今月20日練習 等） | `Goals::MetricCalculator` が自動集計 |
| `qualitative` | 達成目標（大会優勝・レギュラー獲得 等） | 数値を持たず、ユーザーが達成ボタンで切り替え |
| `manual` | 自由指標（球速・体重 等） | `custom_metric_label` / `custom_unit` を自分で定義し、`manual_current_value` を手入力 |

### 配置

- ホーム > 活動タブ「今日の目標」に進捗バーを常時表示。目標一覧・設定・達成サマリーはスタック下

### 通知は MVP では出さない（アプリ内表示のみ）

- #324 でサーバー push を MVP 不採用としたため、進捗90%通知（F-10）は MVP では実装しない（将来延期）
- 進捗はアプリ内のプログレスバーで常時確認。達成/未達は下記バッチで確定し、アプリ起動時に達成サマリーを表示

### 期限確定と達成サマリー

- `FinalizeGoalsJob`（バッチ）で期限到来分を DB 確定（達成/未達・バッジ付与）。**push はしない**
- 月末/シーズン終了後にユーザーがアプリを開いた時、達成サマリーをモーダル表示

### 指標

- 自動集計する指標は `Goal::METRIC_KEYS`（下記「目標指標の一覧」）。新分析指標（状況別打率・打球の質・球種別 等）は将来追加の余地として保留
- 達成条件（`comparison_type`）は指標ごとに固定でクライアントが決め、ユーザーには選ばせない（防御率・WHIP は「以下」）

### 無料 / Pro（2026-08-11 更新）

- 個人の期間目標（`monthly` / `weekly` / `yearly` / `custom`）は**無料枠を合算して 2件**まで（`MONTHLY_GOAL_FREE_LIMIT = 2`、進行中のみカウント）。Pro は `unlimited_monthly_goals` で無制限
- `season` / `tournament` / `custom` / 自由指標（`manual`）は **Pro 限定**（`season_goals` / `tournament_goals` / `custom_period_goals` / `manual_metric_goals`）
- 目標履歴閲覧・達成バッジ: **無料も全期間・全種類**（F-13 の「直近1ヶ月」、F-14 の「基本のみ」を撤回）

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

| # | 機能 | 詳細 | 状態 |
|---|----|----|----|
| F-01 | シーズン目標設定 | 既存 `seasons` テーブルに紐付け | 実装済み |
| F-02 | 期間目標設定 | 月次に加えて週次・年間・カスタム期間・大会 | 実装済み |
| F-03 | 目標指標の選択 | 打率、OPS、防御率、試合数、練習日数、素振り本数 等（下記一覧） | 実装済み |
| F-04 | 目標値の入力 | 数値入力（`qualitative` は目標値なし） | 実装済み |
| F-05 | 達成度プログレスバー | 参照時にリアルタイム計算（`Goals::ProgressCalculator`） | 実装済み |
| F-06 | 期限到来時の自動判定 | `FinalizeGoalsJob` が毎日 00:10 に確定 | 実装済み |
| F-07 | 達成バッジ | 確定時に達成していればバッジ付与 | 実装済み |
| F-08 | 達成履歴 | `GET /api/v2/goals/history`（確定済みのみ） | 実装済み |
| F-09 | 目標一覧画面 | 進行中 / 達成 / 未達のタブで一覧表示 | 実装済み |
| F-10 | 達成度の通知 | 「目標達成まで90%」プッシュ通知 | **未実装**（MVP 不採用・将来延期） |
| F-16 | 定性目標の手動達成 | `POST/DELETE /api/v2/goals/:id/achievement` | 実装済み |
| F-17 | 自由指標の現在値更新 | `manual_current_value` を PATCH で更新 | 実装済み |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro | Entitlement |
|---|----|----|----|----|
| F-11 | 個人の期間目標（月次/週次/年間/カスタム）の同時設定数 | 合算2つまで | 無制限 | `unlimited_monthly_goals` |
| F-12 | シーズン目標の設定 | × | ◎ | `season_goals` |
| F-13 | 大会目標の設定 | × | ◎ | `tournament_goals` |
| F-14 | カスタム期間の目標設定 | × | ◎ | `custom_period_goals` |
| F-15 | 自由指標（手動更新）の目標設定 | × | ◎ | `manual_metric_goals` |

目標履歴の閲覧・達成バッジの獲得は無料・Pro で差を付けない。Pro 限定の詳細ダッシュボードも設けず、目標一覧と達成サマリーを共通で提供する。

---

## 目標指標の一覧

`Goal::METRIC_KEYS` / `Goals::MetricCalculator::DISPATCH` と一致する（`kind = numeric` のみ使用）。

### 成績系

| metric_key | 指標 | 単位 | 集計元 |
|----|----|----|-----|
| `batting_average` | 打率 | float | batting_averages |
| `ops` | OPS | float | 同上 |
| `on_base_percentage` | 出塁率 | float | 同上 |
| `slugging_percentage` | 長打率 | float | 同上 |
| `hits` | 安打 | integer | 同上 |
| `home_runs` | 本塁打 | integer | 同上 |
| `runs_batted_in` | 打点 | integer | 同上 |
| `runs_scored` | 得点 | integer | 同上 |
| `stolen_bases` | 盗塁 | integer | 同上 |
| `era` | 防御率 | float | pitching_results |
| `whip` | WHIP | float | 同上 |
| `strikeouts` | 奪三振 | integer | 同上 |
| `wins` | 勝利数 | integer | 同上 |
| `saves` | セーブ | integer | 同上 |

`era` / `whip` は登板がない場合を `nil`（データなし）で扱い、真の 0.00 と区別する。API では互換のため 0 で返す。

### 行動系

| metric_key | 指標 | 単位 | 集計元 |
|----|----|----|-----|
| `game_count` | 試合数 | integer | match_results |
| `practice_days` | 練習日数 | integer | activity_logs（`intensity_level >= 1` の日数） |
| `total_swing_count` | 素振り総本数 | integer | practice_logs（`source = shadow_swing`） |
| `menu_practice_days` | メニュー継続日数 | integer | practice_logs（対象メニューを実施した distinct 日数） |

練習総時間・ランニング総距離・連続練習日数は指標としては未実装。継続性は `menu_practice_days`（特定メニューの実施日数）で代替している。

---

## データモデル

### goals テーブル

```ruby
create_table :goals do |t|
  t.references :user, null: false, foreign_key: true
  t.string :title, null: false                        # 最大60文字
  t.string :period_type, null: false                  # season / monthly / tournament / weekly / yearly / custom
  t.string :kind, null: false, default: 'numeric'     # numeric / qualitative / manual
  t.references :season, null: true                    # season 目標のみ
  t.references :tournament, null: true                # tournament 目標のみ
  t.references :practice_menu, null: true             # metric_key = menu_practice_days のとき必須
  t.date :month_start                                 # 月次の開始月 / weekly・yearly・custom の開始日
  t.date :deadline, null: false
  t.string :metric_key                                # numeric のみ必須
  t.float :target_value                               # qualitative 以外は必須・0以上
  t.string :comparison_type, null: false, default: 'greater_than'  # greater_than / less_than
  t.string :custom_metric_label                       # manual のみ必須（最大40文字）
  t.string :custom_unit                               # manual の単位表示
  t.float :manual_current_value, null: false, default: 0.0
  t.float :achieved_value
  t.datetime :achieved_at
  t.boolean :is_achieved, null: false, default: false
  t.boolean :is_finalized, null: false, default: false  # 期限後に確定
  t.timestamps
end

add_index :goals, [:user_id, :period_type, :is_finalized]
```

`season_id` / `practice_menu_id` は自分の所有レコードのみ指定できるようモデル側でバリデートする（IDOR 防止）。

### goal_badges テーブル（達成バッジ管理）

```ruby
create_table :goal_badges do |t|
  t.references :user, null: false, foreign_key: true
  t.references :goal, null: true            # 目標削除時は nullify（バッジは恒久保存）
  t.string :badge_type, null: false         # 'season_achieved' / 'monthly_achieved' / 'tournament_achieved'
  t.string :badge_name, null: false
  t.string :goal_title, null: false         # 付与時のスナップショット
  t.datetime :awarded_at, null: false
  t.timestamps
end
```

---

## API 設計

| メソッド | パス | 内容 |
|--------|----|----|
| GET | `/api/v2/goals` | 進行中（`is_finalized = false`）の目標を期限昇順で返す |
| POST | `/api/v2/goals` | 作成。無料枠超過・Pro 限定は 403 |
| PATCH | `/api/v2/goals/:id` | タイトル・期間・目標値・自由指標の現在値のみ更新可 |
| DELETE | `/api/v2/goals/:id` | 削除（バッジは残る） |
| GET | `/api/v2/goals/history` | 確定済み（達成・未達）を期限降順で返す |
| POST | `/api/v2/goals/:goal_id/achievement` | 定性目標を達成にする |
| DELETE | `/api/v2/goals/:goal_id/achievement` | 定性目標の達成を取り消す |
| GET | `/api/v2/goal_badges` | 獲得バッジ一覧（付与日降順） |

期限到来分の確定は API ではなく `FinalizeGoalsJob`（Solid Queue の recurring、毎日 00:10）で行う。`POST /goals/finalize` は設けない。

`period_type` / `season_id` / `metric_key` / `comparison_type` / `practice_menu_id` は作成後に変更できない（Pro 制限の回避と、指標差し替えによる目標値の無意味化を防ぐため）。

### GET /api/v2/goals

`V2::GoalSerializer` が返す配列。

```json
[
  {
    "id": 1,
    "title": "春季リーグで打率3割",
    "kind": "numeric",
    "period_type": "season",
    "season_id": 3,
    "tournament_id": null,
    "month_start": null,
    "deadline": "2026-06-30",
    "metric_key": "batting_average",
    "target_value": 0.3,
    "comparison_type": "greater_than",
    "practice_menu_id": null,
    "practice_menu_name": null,
    "custom_metric_label": null,
    "custom_unit": null,
    "manual_current_value": 0.0,
    "is_achieved": false,
    "is_finalized": false,
    "achieved_value": null,
    "current_value": 0.298,
    "progress_percent": 99.3,
    "days_remaining": 49
  }
]
```

指標の表示ラベルはサーバーではなくクライアント側の定数（`front/app/constants/goal.ts` 等）で解決する。

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
│  種類: [数値目標/達成目標/自由指標]│
│                                │
│  期間:                          │
│   週次 / 月次 / 年間             │
│   カスタム期間 / 大会 / シーズン  │
│                                │
│  対象シーズン: [2026年春季 ▼]    │
│                                │
│  指標: [打率 ▼]                  │
│  目標値: [0.300]                 │
│  （条件は指標ごとに固定）         │
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

`Goals::ProgressCalculator`（現在値・進捗率・達成判定）と `Goals::MetricCalculator`（指標の期間集計）の2クラスに分ける。

- `numeric`: `MetricCalculator` が `Goal#period_range` の範囲で集計した値を現在値にする
- `qualitative`: 数値を持たず、`is_achieved` が true なら 100%、false なら 0%
- `manual`: `manual_current_value`（手入力）を現在値にする
- `comparison_type = less_than`（防御率等）は比率を反転する。データなし（`nil`）は 0%、真の 0.00 は目標値によらず 100%
- `target_value = 0` は除算できないため、達成判定と同じ結果（100 / 0）に委ねる

### 期限到来時の確定処理（バッチ）

`FinalizeGoalsJob` を Solid Queue の recurring で **毎日 00:10（JST）** 実行する。

- 対象は `is_finalized = false` かつ `deadline < 今日（JST）`
- 目標ごとに `with_lock` を取り、ロック後に確定済みを再チェックする（重複実行での二重確定・バッジ二重付与を防ぐ）
- `achieved_value` / `is_achieved` / `achieved_at` / `is_finalized` を更新し、達成なら `goal_badges` を作成する
- 定性目標の `achieved_at` はユーザーが達成ボタンを押した時刻を残し、ジョブ実行時刻で上書きしない
- **push 通知は送らない**（アプリ起動時の達成サマリーで伝える）

---

## バッジ種類

`badge_type` は `"#{period_type}_achieved"` で機械的に決まり、確定バッチが達成時に1件付与する。

| バッジID | 名前 | 条件 |
|--------|----|----|
| `monthly_achieved` | 月間目標達成 | 月次目標を達成して確定 |
| `season_achieved` | シーズン目標達成 | シーズン目標を達成して確定 |
| `tournament_achieved` | 大会目標達成 | 大会目標を達成して確定 |
| （上記以外） | 目標達成 | 週次 / 年間 / カスタム期間の目標を達成して確定 |

連続達成（`monthly_streak_3` 等）のバッジは未実装。導入するなら確定バッチ側に連続判定を足す。

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 無料ユーザーが3つ目の期間目標 | 403 + 「Pro で無制限に」訴求 |
| 無料ユーザーがシーズン / 大会 / カスタム期間 / 自由指標の目標を作成 | 403 + Pro 限定である旨を返す |
| 作成後の目標タイプ・期間・指標・条件の変更 | `update_params` から除外し変更不可（削除して作り直す旨を UI で案内） |
| 該当指標のデータが0件 | progress 0%。防御率・WHIP は登板なしを内部で `nil` として未達扱い |
| 登板なしと防御率 0.00 の区別 | `era` / `whip` は `nil`（データなし）を返し、真の 0.00 と分ける |
| シーズン削除 | 紐付く目標は orphan 状態に（保持） |
| 目標削除 | 獲得済みバッジは `goal_id` を nullify して残す（`goal_title` のスナップショットで表示） |
| 数値目標で達成ボタンを押す | 422（自動判定のため手動達成不可） |

---

## テスト要件

### 単体テスト

- [ ] `Goals::MetricCalculator` の各指標
- [ ] `Goals::ProgressCalculator` の進捗率・達成判定（`less_than` / データなし / `target_value = 0`）
- [ ] `FinalizeGoalsJob` の達成判定・重複実行時の二重付与防止

### 統合テスト

- [ ] 目標設定 → 達成 → バッジ獲得 のフルフロー
- [ ] Pro / 無料 の制限

---

## 完了の定義（Definition of Done）

- [x] シーズン・大会・週次・月次・年間・カスタム期間の目標設定が動作
- [x] 数値 / 定性 / 自由指標の3種類が動作
- [x] プログレスバーがリアルタイム更新
- [x] 期限到来時の自動確定処理が動作（`FinalizeGoalsJob`）
- [x] バッジ獲得が動作
- [x] Pro / 無料 の制限が正しく機能
- [x] 月末・シーズン終了後の達成サマリーをアプリ内で表示（月1回まで）
- 達成時のプッシュ通知は MVP 不採用

---

## 後で詰める論点

- [ ] バッジのデザイン（アイコン）
- [ ] 目標達成度のプッシュ通知タイミング（90%、100%、未達時）
- [ ] チームメイトとの目標共有（Phase 2）
- [ ] AI による目標提案（Phase 3）
