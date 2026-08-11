# PRD-05: 練習記録機能

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（実装済みコードに合わせてカテゴリ8種・計測タイプ4種・スキーマ・API を実装準拠に更新）
**ステータス**: 実装済み（`release/pro-202605`）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`
**設計**: [`../pro-plan-design/03-ux-information-architecture.md`](../pro-plan-design/03-ux-information-architecture.md) §2〜§5
**拡張PRD**: [`12-pro-feature-improvement-loop.md`](./12-pro-feature-improvement-loop.md)（課題テーマ紐付け・練習量×成績の相関インサイト＝F-21 の具体化・週次レポート）

---

## ⚠️ IA / 体験方針（2026-06-27 再設計）

- 単位の転換: 練習記録は **メニュー単位の単票** から **日次セッション（1日の振り返り）** へ再設計。1日（`logged_on`）を親に、その日の複数メニュー＋回数＋コンディションを1画面で束ねて記録する（野球ノート形式）
- 配置: 練習記録は **ホーム > 練習・活動セグメント**の「記録」に置く。導線は **素振り / お気に入りワンタップ / 📝練習を記録 / 野球ノート** の4つ。**コンディション単独導線は廃止**し、コンディションは `📝練習を記録` の中の section（Pro 限定）として入力する
- 記録の住み分け: お気に入りワンタップ＝単一メニューの高速記録、`📝練習を記録`＝日付＋複数メニュー＋コンディションのフル版、素振りカウンター＝専用計測（完了時に練習ログ自動生成し当日セッションへ自動でぶら下げ）
- 野球ノートとの関係: 練習記録（定量・量）と野球ノート（定性・感想/動画）は**別データのまま緩く紐付ける**。日次セッションの**保存直後にノート誘導**し、日単位で紐付ける（モデルA）。詳細は設計 §4〜§5

---

## UI/UX 確定事項（2026-06-27）

設計検討で確定した UI/UX。以降の「データモデル」「UI 仕様」と差異がある場合は**本セクションを優先**する。

### メニュー登録（プリセットは作らない）

- プリセットメニューは用意しない。代わりに**プレースホルダー・例示**で入力イメージを補助する
- 空状態（メニュー未登録）: 「まだ練習メニューがありません／よくやる練習を登録するとワンタップで記録 → 草が育つ」＋ `[＋ 最初のメニューを作る]` ＋ 例示（素振り200本・ランニング5km）
- メニュー作成フォーム: 名前（placeholder「例: 素振り、ティー、ランニング」）／カテゴリ／計測タイプ（回数/時間/距離/重さ×回数 のセグメント）／単位表示ラベル／既定値（任意）／お気に入りトグル
- 計測タイプを選ぶと**単位ラベルと既定値のプレースホルダーが自動切替**（回数→本/例200、時間→分/例30、距離→km/例5、重さ×回数→回/例10）

### カテゴリ（実装）

バッティング（`batting`）/ 投手（`pitching`）/ 守備（`defense`）/ 走塁（`baserunning`）/ トレーニング（`training`）/ 筋トレ（`strength`）/ ケア（`care`）/ その他（`other`）の8種。
正本は `PracticeMenu::CATEGORIES`、表示ラベルは front の `PRACTICE_CATEGORIES` と一致させる。

### 練習記録フロー（日次セッション・一括入力）

- `📝練習を記録 → 日付選択 → 複数メニューを選択して各回数を入力 → （Pro）コンディション → 今日の振り返りメモ → 保存 → ノート誘導（モデルA）`
- 1画面で**日付＋複数メニュー＋回数を一括入力**する（旧「一括入力フォームは作らない」方針を撤回）。同じ日付に再保存すると同一セッションを upsert し、メニュー項目を `practice_menu_id` ベースで差分同期する
- 各メニュー項目: 既定値プリセット・単位ラベル付き。日付は過去遡及可。写真（Pro/月3点）は項目単位で添付
- お気に入りワンタップは単一メニューの即記録として併存し、作成された量ログは当日セッションへ自動でぶら下がる

### コンディション入力（Pro限定・練習記録に統合）

- **練習記録（日次セッション）の中の section** として入力する。コンディション単独の記録画面・動線は持たない
- バックエンドは引き続き `condition_logs`（user × `logged_on` で1日1件・upsert）に保存し、セッションの保存ペイロードに含める。Pro 未加入時はコンディション部分のみ 403（`PracticeSessions::Upsert::NotEntitled`、entitlement は `detailed_condition_log`）
- 疲労度（`fatigue_level`）・体調（`physical_level`）: **4段階の integer 1〜4**（1=かなり疲れ/不調 … 4=元気/好調）。`ConditionLog::LEVEL_RANGE` が正本で、文字列 enum ではない
- 睡眠: 0.5刻みステッパー＋直接入力
- 気分: プリセットチップ（好調/普通/不調）＋任意自由メモ（`mood` はプリセット文字列、`memo` が自由メモ。back は両方とも自由文字列で、選択肢は front / mobile 側の定数で揃える）
- 怪我・痛み: 部位プリセット（肩/肘/手首/腰/股関節/膝/足首/その他）＋任意自由メモ（**程度は持たない**）。`injuries` = `[{part, memo}]`
- 全項目とも任意・部分保存可

### データモデルの変更点（後述スキーマへの追記）

- `practice_sessions`（新規）: 日次の親。`user_id` × `logged_on` で一意、任意の `memo`（今日の振り返り）を持つ
- `practice_logs`: `practice_session_id`(nullable) を追加し、各量ログを当日セッションへ束ねる。作成時に当日セッションを find_or_create して自動でぶら下げる
- `practice_menus`: `unit` を `count`(回数)/`minutes`(時間)/`distance`(距離)/`weight_reps`(重さ×回数) の4種に正規化、`unit_label`(string) を追加
- `practice_logs`: `menu_name`(string, null: false)・`unit_label`(string) のスナップショット列を追加（メニュー改名・削除でも履歴が壊れない）。筋トレ用に `weight`(decimal) を持ち、`weight_reps` のメニューは「60kg × 10回」として表示する
- `practice_logs.source`: `manual` / `shadow_swing`。素振りカウンター由来のログは `source = 'shadow_swing'` で、user × `logged_on` の部分ユニークインデックスにより1日1件に制限する
- `condition_logs.injuries`: jsonb `[{part, memo}]`（severity は持たない）。`logged_on` でセッションと 1:1 対応

### activity_logs への集約（草・Streak 連動）

- `activity_logs` はユーザー×日付の集計テーブル。practice_log / game_result / shadow_swing の書き込み時に **after_commit でその日分を再計算**
- 保持: `practice_menu_count`（distinct メニュー数）/ `total_swing_count` / `has_game` / `intensity_level`(0〜4)
- 強度レベル: L1=メニュー1種 / L2=2種 or 素振り100本+ / L3=3種 or 300本+ / L4=4種+ or 500本+ or 試合あり
- Streak = `intensity_level >= 1` の連続日数（現在＋最長）、日付は JST ローカルで集計
- **コンディションログは草・Streak に影響させない**（休養日でも記録するため）
- `activity_logs` のスキーマ・強度閾値の**正本は PRD-04（草 / #320）**。本機能は「練習ログ → activity_logs 反映」を担う

### 無料 / Pro 制限（2026-07-27 更新）

- 練習メニュー登録: **無料3つまで**（F-16 のまま。2026-06-27 に「5つまで」への変更を検討したが撤回し、3つまでで確定）
- 過去ログ閲覧: **無料も全期間**（F-19 の「直近1ヶ月」を撤回）
- データ保管: **無料も永続**（F-17 の「1年」を撤回）
- コンディションログ: Pro 限定（F-18 のまま）

---

## 概要

「練習量記録（回数・時間・距離）」「コンディションログ」「トレーニング・練習メニュー マスター登録」を統合した練習記録機能。
試合がない日もアプリを開く動機を作り、Streak / 草機能と連動する核心機能。

---

## 背景・目的

- 戦略ドキュメントのステップ3.5 JTBD「諦めない」「毎日続ける」の核
- 試合記録だけだと週末しか使われない課題を解決
- 練習をデータで可視化して、自分の取り組みを認識
- Streak / 草機能 / 素振りカウンターと一気通貫

---

## ユーザーストーリー

### US-01: 翔太の練習ルーチン

> 翔太は毎日の練習後、アプリで以下を記録:
> - 素振り 300本（素振りカウンターから自動連動）
> - シャドウピッチング 50球
> - ランニング 5km
> - コンディション: 疲労◎、体調○、睡眠 7時間

### US-02: マスター登録の活用

> 健は最初に自分の「定番メニュー」を登録:
> - 朝の素振り
> - ジムでの体幹トレ
> - ランニング
> 毎朝、定番メニューをタップして練習開始 → 1タップで記録完了。

---

## 機能要件

### 必須機能

#### A. 練習メニュー マスター

| # | 機能 | 詳細 |
|---|----|----|
| F-01 | カスタムメニュー登録 | 名前、カテゴリ、計測タイプ（回数/時間/距離/重さ×回数）、単位表示ラベル、デフォルト値 |
| F-02 | カテゴリ分類 | バッティング / 投手 / 守備 / 走塁 / トレーニング / 筋トレ / ケア / その他 |
| F-03 | お気に入りメニュー | よく使うメニューを上位表示 |
| F-04 | メニュー編集・削除 | 既存記録に影響しない設計 |

#### B. 練習量記録

| # | 機能 | 詳細 |
|---|----|----|
| F-05 | 日付選択（カレンダー） | 過去日付の遡及入力可 |
| F-06 | メニュー選択 + 値入力 | マスターから選択して回数・時間・距離を入力 |
| F-07 | 練習メモ | セッションの「今日の振り返り」メモ＋メニュー項目ごとのメモ |
| F-08 | 写真添付 | （PRD-09 と連動、Pro 機能） |
| F-09 | 1日複数メニュー | 1日に複数の練習を記録 |
| F-10 | 練習記録の編集・削除 | 同じ日付でセッションを再保存して upsert（項目単位の PATCH は持たない）。削除はセッション単位／ログ単位の DELETE |

#### C. コンディションログ

| # | 機能 | 詳細 |
|---|----|----|
| F-11 | 疲労度 | `fatigue_level` 1〜4 の4段階 |
| F-12 | 体調 | `physical_level` 1〜4 の4段階 |
| F-13 | 睡眠時間 | 時間入力（0.5刻み） |
| F-14 | 気分 | プリセットチップ（好調/普通/不調）＋自由メモ |
| F-15 | 怪我・痛み | 部位選択 + メモ |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-16 | メニューマスター登録数 | 3つまで（`PlanLimits::PRACTICE_MENU_FREE_LIMIT`） | 無制限（entitlement: `unlimited_practice_menus`） |
| F-17 | 練習記録の保管期間 | 永続（制限を撤回） | 永続 |
| F-18 | コンディションログ | × | ◎（entitlement: `detailed_condition_log`） |
| F-19 | 過去データのカレンダー閲覧 | 全期間（制限を撤回） | 全期間 |
| F-20 | 写真・動画の添付（PRD-09） | 月3点 | 無制限 |
| F-21 | 練習量と成績の相関グラフ（Phase 2） | × | ◎ |

> F-17 / F-19 の無料制限は 2026-07-27 に撤回済み（上記「無料 / Pro 制限」参照）。実装にも保管期間・閲覧期間の制限は無い。

---

## データモデル（実装スキーマ）

### practice_menus テーブル

| カラム | 型 | 備考 |
|----|----|----|
| `user_id` | bigint, null: false | |
| `name` | string, null: false | 最大50文字 |
| `category` | string, null: false | `PracticeMenu::CATEGORIES`（8種） |
| `unit` | string, null: false | `count` / `minutes` / `distance` / `weight_reps` |
| `unit_label` | string | 表示用の単位（本・分・km 等）。最大10文字 |
| `default_value` | decimal(10,2) | |
| `is_favorite` | boolean, default: false, null: false | |
| `sort_order` | integer, default: 0, null: false | |
| `archived` | boolean, default: false, null: false | 削除は論理削除 |

- index: `[user_id, archived]`
- 部分ユニークインデックス: `name = '素振り' AND unit = 'count'` のメニューは1ユーザー1件（素振りカウンター連動用の自動マッピング先を一意にするため）

### practice_sessions テーブル

| カラム | 型 | 備考 |
|----|----|----|
| `user_id` | bigint, null: false | |
| `logged_on` | date, null: false | |
| `memo` | text | 今日の振り返り |

- ユニークインデックス: `[user_id, logged_on]`

### practice_logs テーブル

| カラム | 型 | 備考 |
|----|----|----|
| `user_id` | bigint, null: false | |
| `practice_menu_id` | bigint | メニュー削除時は nullify |
| `practice_session_id` | bigint | 当日セッションへの紐付け |
| `schedule_id` | bigint | 練習予定（`schedules`）との紐付け |
| `logged_on` | date, null: false | |
| `amount` | decimal(10,2) | 回数・分・km・レップ数 |
| `weight` | decimal(10,2) | 筋トレ（`weight_reps`）の重量 |
| `menu_name` | string, null: false | スナップショット |
| `unit_label` | string | スナップショット |
| `source` | string, default: "manual", null: false | `manual` / `shadow_swing` |
| `memo` | text | |

- index: `[user_id, logged_on]`
- 部分ユニークインデックス: `source = 'shadow_swing'` は `[user_id, logged_on]` で1件のみ
- 試合（`game_result`）との直接の紐付けは持たない。試合連動は `activity_logs.has_game` 側で扱う

### condition_logs テーブル

| カラム | 型 | 備考 |
|----|----|----|
| `user_id` | bigint, null: false | |
| `logged_on` | date, null: false | |
| `fatigue_level` | integer | 1〜4（`ConditionLog::LEVEL_RANGE`） |
| `physical_level` | integer | 1〜4 |
| `sleep_hours` | decimal(4,1) | 0〜24 |
| `mood` | string | プリセット文字列（好調/普通/不調） |
| `memo` | text | 自由メモ |
| `injuries` | jsonb, default: [], null: false | `[{part, memo}]` |

- ユニークインデックス: `[user_id, logged_on]`

---

## API 設計

実装は v2 系（`/api/v2/...`）。記録の主エンドポイントは
**`POST /api/v2/practice_sessions`（日付で upsert・複数メニュー項目＋コンディションを一括）**。
コンディション単独の `condition_logs` エンドポイントは持たず、セッションのペイロードに統合した。
お気に入りワンタップ用に `POST /api/v2/practice_logs`（単一メニュー）が併存する。

### Practice Menus

| メソッド | パス |
|--------|----|
| GET | `/api/v2/practice_menus` |
| POST | `/api/v2/practice_menus`（無料は4件目で 403） |
| PATCH | `/api/v2/practice_menus/:id` |
| DELETE | `/api/v2/practice_menus/:id`（`archived: true` の論理削除） |

### Practice Sessions

| メソッド | パス |
|--------|----|
| GET | `/api/v2/practice_sessions?from=&to=&improvement_theme_id=` |
| GET | `/api/v2/practice_sessions/:id` |
| GET | `/api/v2/practice_sessions/by_date?date=YYYY-MM-DD` |
| POST | `/api/v2/practice_sessions`（同日は upsert。コンディション同梱時に Pro 未加入なら 403） |
| DELETE | `/api/v2/practice_sessions/:id` |

リクエストボディ（`practice_session`）: `logged_on` / `memo` / `improvement_theme_ids[]` /
`items[]`（`practice_menu_id`・`amount`・`weight`・`memo`）/ `condition`（`fatigue_level`・`physical_level`・`sleep_hours`・`mood`・`memo`・`injuries[{part, memo}]`）。
`items` は `practice_menu_id` をキーに差分同期する（既存は更新・新規は作成・外れたものは削除）。`source = 'shadow_swing'` のログは同期対象外。

### Practice Logs（単一メニューの即記録）

| メソッド | パス |
|--------|----|
| GET | `/api/v2/practice_logs` |
| POST | `/api/v2/practice_logs` |
| DELETE | `/api/v2/practice_logs/:id` |

### 集計系

| メソッド | パス | 用途 |
|--------|----|----|
| GET | `/api/v2/practice_overview` | 練習全体のサマリー |
| GET | `/api/v2/practice_menu_summaries` | メニュー別の積み上げ |
| GET | `/api/v2/practice_menu_trends/:id` | メニュー別の推移（詳細は Pro: `practice_menu_trend_detail`） |
| GET | `/api/v2/activity_logs` / `/api/v2/activity_logs/streak` | 草・Streak（PRD-04） |

---

## UI 仕様

### ホーム画面の練習記録カード

```
┌────────────────────────────────┐
│  今日の練習を記録                │
│                                │
│  [+ 素振り 200本] (お気に入り)   │
│  [+ ランニング 5km] (お気に入り) │
│  [+ メニュー一覧から選ぶ]        │
│                                │
│  [📝 練習を記録]                 │
└────────────────────────────────┘
```

※ コンディション単独導線は廃止し、`📝練習を記録`（日次セッション）内の section として入力する。

### メニュー一覧

```
┌────────────────────────────────┐
│  練習メニュー                    │
│                                │
│  ★ お気に入り                   │
│   素振り 200回                  │
│   ランニング 5km                │
│                                │
│  バッティング                   │
│   素振り、ティー、トス...        │
│                                │
│  投手                           │
│   シャドウピッチング、遠投...    │
│                                │
│  [+ 新しいメニューを追加]        │
└────────────────────────────────┘
```

### コンディション入力

```
┌────────────────────────────────┐
│  今日のコンディション             │
│                                │
│  疲労度:  かなり疲れ/やや疲れ/  │
│           ふつう/元気（1〜4）   │
│  体調:    不調/やや不調/        │
│           ふつう/好調（1〜4）   │
│  睡眠:    [7.5] 時間            │
│                                │
│  気分: [好調][普通][不調]        │
│  メモ: 「今日は調子いい」        │
│                                │
│  怪我・痛み: [+ 追加]            │
│                                │
│  [   保存   ]                    │
└────────────────────────────────┘
```

---

## 連動仕様

### Streak / 草機能との連動

- practice_log が保存されると ActivityLog が更新される
- 1日のうちで複数 practice_log があれば intensity_level が上がる

### 素振りカウンターとの連動

- ShadowSwingSession 完了時に自動で PracticeLog（`source = 'shadow_swing'`）が作成され、当日セッションへ自動でぶら下がる
- メニュー: 名前「素振り」・`unit = count` のメニューへ自動マッピング（無ければ作成。部分ユニークインデックスで1ユーザー1件に固定）
- 値: 完了本数を `amount` にセット。同日に再度完了しても1件に upsert される

### 野球ノートとの連動（PRD-09）

- 練習記録（定量）と野球ノート（定性）は別データで、日次セッション単位で緩く紐付ける（`baseball_notes.practice_session_id` / `practice_log_id`）
- 写真・動画は野球ノート経由

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 無料ユーザーが4つ目のメニュー登録 | 403「Pro プランで練習メニューを無制限に登録できます」（archived を除く件数で判定） |
| 無料ユーザーがコンディションを含めてセッション保存 | 403「コンディション記録は Pro プラン限定です」（量ログ部分も保存されない） |
| 無料ユーザーの過去ログ閲覧 | 制限なし（全期間閲覧可。F-19 は撤回済み） |
| 既に削除されたメニューの記録 | `practice_logs.menu_name` / `unit_label` のスナップショットで表示（メニューは論理削除、FK は nullify） |
| Pro 解約後 | 既存データは保持、閲覧制限のみ |

---

## テスト要件

### 単体テスト

- [ ] PracticeMenu のバリデーション、archived の挙動
- [ ] PracticeLog のバリデーション
- [ ] ConditionLog の同日 upsert
- [ ] Pro / 無料 でのメニュー数制限

### 統合テスト

- [ ] メニュー作成 → 記録 → 編集 → 削除 のフルフロー
- [ ] 素振りカウンター完了 → 自動 PracticeLog 作成
- [ ] ActivityLog への反映

---

## 完了の定義（Definition of Done）

- [ ] メニューマスター登録が動作
- [ ] 練習記録の CRUD が動作
- [ ] コンディションログが動作
- [ ] 素振りカウンターと連動
- [ ] 草機能に反映
- [ ] Pro / 無料 の機能制限が正しく動作
- [ ] 写真添付（PRD-09）と連動

---

## 後で詰める論点

- [x] デフォルトのメニューマスター（プリセット）を提供するか → 作らない（プレースホルダー・例示で補助）
- [x] メニューカテゴリの細かい分類 → 8種で確定（走塁・筋トレ・ケアを追加）
- [x] 怪我・痛みの記録の詳細仕様 → 部位＋メモのみ（程度は持たない）
- [ ] 練習時間の自動測定（タイマー）は必要か
- [ ] チームメイトとの共有機能（Phase 2）
