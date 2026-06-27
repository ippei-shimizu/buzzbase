# PRD-05: 練習記録機能

**作成日**: 2026-05-12
**最終更新**: 2026-06-27（練習記録を日次セッション＝日付＋複数メニュー＋コンディションの野球ノート形式へ再設計）
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`
**設計**: [`../pro-plan-design/03-ux-information-architecture.md`](../pro-plan-design/03-ux-information-architecture.md) §2〜§5

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
- メニュー作成フォーム: 名前（placeholder「例: 素振り、ティー、ランニング」）／カテゴリ／計測タイプ（回数/時間/距離 のセグメント）／単位表示ラベル／既定値（任意）／お気に入りトグル
- 計測タイプを選ぶと**単位ラベルと既定値のプレースホルダーが自動切替**（回数→本/例200、時間→分/例30、距離→km/例5）

### カテゴリ（確定）

バッティング / 投手 / 守備 / 走塁 / トレーニング / その他

### 練習記録フロー（日次セッション・一括入力）

- `📝練習を記録 → 日付選択 → 複数メニューを選択して各回数を入力 → （Pro）コンディション → 今日の振り返りメモ → 保存 → ノート誘導（モデルA）`
- 1画面で**日付＋複数メニュー＋回数を一括入力**する（旧「一括入力フォームは作らない」方針を撤回）。同じ日付に再保存すると同一セッションを upsert し、メニュー項目を `practice_menu_id` ベースで差分同期する
- 各メニュー項目: 既定値プリセット・単位ラベル付き。日付は過去遡及可。写真（Pro/月3点）は項目単位で添付
- お気に入りワンタップは単一メニューの即記録として併存し、作成された量ログは当日セッションへ自動でぶら下がる

### コンディション入力（Pro限定・練習記録に統合）

- **練習記録（日次セッション）の中の section** として入力する。コンディション単独の記録画面・動線は持たない
- バックエンドは引き続き `condition_logs`（user × `logged_on` で1日1件・upsert）に保存し、セッションの保存ペイロードに含める。Pro 未加入時はコンディション部分のみ 403
- 疲労度・体調: **4段階**（poor/fair/good/excellent）
- 睡眠: 0.5刻みステッパー＋直接入力
- 気分: プリセットチップ（好調/普通/不調）＋任意自由メモ
- 怪我・痛み: 部位プリセット（肩/肘/手首/腰/股関節/膝/足首/その他）＋任意自由メモ（**程度は持たない**）。`injuries` = `[{part, memo}]`
- 全項目とも任意・部分保存可

### データモデルの変更点（後述スキーマへの追記）

- `practice_sessions`（新規）: 日次の親。`user_id` × `logged_on` で一意、任意の `memo`（今日の振り返り）を持つ
- `practice_logs`: `practice_session_id`(nullable) を追加し、各量ログを当日セッションへ束ねる。作成時に当日セッションを find_or_create して自動でぶら下げる
- `practice_menus`: `unit` を `count`(回数)/`minutes`(時間)/`distance`(距離) の3種に正規化、`unit_label`(string) を追加
- `practice_logs`: `menu_name`(string)・`unit_label`(string) のスナップショット列を追加（メニュー改名・削除でも履歴が壊れない）
- `condition_logs.injuries`: `[{part, memo}]`（severity は持たない）。`logged_on` でセッションと 1:1 対応

### activity_logs への集約（草・Streak 連動）

- `activity_logs` はユーザー×日付の集計テーブル。practice_log / game_result / shadow_swing の書き込み時に **after_commit でその日分を再計算**
- 保持: `practice_menu_count`（distinct メニュー数）/ `total_swing_count` / `has_game` / `intensity_level`(0〜4)
- 強度レベル: L1=メニュー1種 / L2=2種 or 素振り100本+ / L3=3種 or 300本+ / L4=4種+ or 500本+ or 試合あり
- Streak = `intensity_level >= 1` の連続日数（現在＋最長）、日付は JST ローカルで集計
- **コンディションログは草・Streak に影響させない**（休養日でも記録するため）
- `activity_logs` のスキーマ・強度閾値の**正本は PRD-04（草 / #320）**。本機能は「練習ログ → activity_logs 反映」を担う

### 無料 / Pro 制限（2026-06-27 更新）

- 練習メニュー登録: **無料5つまで** / Pro 無制限（F-16 の「3つまで」を更新）
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
| F-01 | カスタムメニュー登録 | 名前、カテゴリ、単位（回・分・km等）、デフォルト値 |
| F-02 | カテゴリ分類 | バッティング / 投手 / 守備 / 体力 / 筋トレ / その他 |
| F-03 | お気に入りメニュー | よく使うメニューを上位表示 |
| F-04 | メニュー編集・削除 | 既存記録に影響しない設計 |

#### B. 練習量記録

| # | 機能 | 詳細 |
|---|----|----|
| F-05 | 日付選択（カレンダー） | 過去日付の遡及入力可 |
| F-06 | メニュー選択 + 値入力 | マスターから選択して回数・時間・距離を入力 |
| F-07 | 練習メモ | フリーテキスト |
| F-08 | 写真添付 | （PRD-09 と連動、Pro 機能） |
| F-09 | 1日複数メニュー | 1日に複数の練習を記録 |
| F-10 | 練習記録の編集・削除 | 過去記録の修正可 |

#### C. コンディションログ

| # | 機能 | 詳細 |
|---|----|----|
| F-11 | 疲労度 | ◎ / ○ / △ / × の4段階 |
| F-12 | 体調 | ◎ / ○ / △ / × の4段階 |
| F-13 | 睡眠時間 | 時間入力（0.5刻み） |
| F-14 | 気分 | 自由テキスト or 絵文字選択 |
| F-15 | 怪我・痛み | 部位選択 + メモ |

### Pro機能（無料との差別化）

| # | 機能 | 無料 | Pro |
|---|----|----|----|
| F-16 | メニューマスター登録数 | 3つまで | 無制限 |
| F-17 | 練習記録の保管期間 | 1年 | 永続 |
| F-18 | コンディションログ | × | ◎ |
| F-19 | 過去データのカレンダー閲覧 | 直近1ヶ月 | 全期間 |
| F-20 | 写真・動画の添付（PRD-09） | 月3点 | 無制限 |
| F-21 | 練習量と成績の相関グラフ（Phase 2） | × | ◎ |

---

## データモデル

### practice_menus テーブル（新規）

```ruby
class CreatePracticeMenus < ActiveRecord::Migration[7.0]
  def change
    create_table :practice_menus do |t|
      t.references :user, null: false, foreign_key: true
      t.string :name, null: false                # "素振り" "ランニング"
      t.string :category, null: false            # "batting" "pitching" 等
      t.string :unit, null: false                # "count" "minutes" "km"
      t.float :default_value
      t.boolean :is_favorite, default: false
      t.integer :sort_order, default: 0
      t.boolean :archived, default: false
      t.timestamps
    end
  end
end
```

### practice_logs テーブル（新規）

```ruby
class CreatePracticeLogs < ActiveRecord::Migration[7.0]
  def change
    create_table :practice_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.references :practice_menu, foreign_key: true
      t.date :practiced_on, null: false
      t.float :value                              # 回数・分・km
      t.text :memo
      t.references :game_result, foreign_key: true, null: true  # 試合と紐付け可能
      t.timestamps
    end

    add_index :practice_logs, [:user_id, :practiced_on]
  end
end
```

### condition_logs テーブル（新規）

```ruby
class CreateConditionLogs < ActiveRecord::Migration[7.0]
  def change
    create_table :condition_logs do |t|
      t.references :user, null: false, foreign_key: true
      t.date :recorded_on, null: false
      t.string :fatigue_level     # 'excellent' / 'good' / 'fair' / 'poor'
      t.string :body_condition    # 同上
      t.float :sleep_hours
      t.text :mood
      t.json :injuries            # [{"body_part": "shoulder", "memo": "..."}]
      t.timestamps
    end

    add_index :condition_logs, [:user_id, :recorded_on], unique: true
  end
end
```

---

## API 設計

> 実装は v2 系（`/api/v2/...`）。日次セッションの導入に伴い、記録の主エンドポイントは
> **`POST /api/v2/practice_sessions`（日付で upsert・複数メニュー項目＋コンディションを一括）**、
> 取得は `GET /api/v2/practice_sessions`・`GET /api/v2/practice_sessions/by_date?date=`。
> コンディション単独の `condition_logs` エンドポイントは廃止し、セッションのペイロードに統合した。
> お気に入りワンタップ用に `POST /api/v2/practice_logs`（単一メニュー）は併存する。
> 以下は初期検討時の v1 案であり、上記を正とする。

### Practice Menus

| メソッド | パス |
|--------|----|
| GET | `/api/v1/practice_menus` |
| POST | `/api/v1/practice_menus` |
| PATCH | `/api/v1/practice_menus/:id` |
| DELETE | `/api/v1/practice_menus/:id` |

### Practice Logs

| メソッド | パス |
|--------|----|
| GET | `/api/v1/practice_logs?from=&to=` |
| POST | `/api/v1/practice_logs` |
| PATCH | `/api/v1/practice_logs/:id` |
| DELETE | `/api/v1/practice_logs/:id` |
| GET | `/api/v1/practice_logs/by_date?date=YYYY-MM-DD` |

### Condition Logs

| メソッド | パス |
|--------|----|
| GET | `/api/v1/condition_logs?from=&to=` |
| POST | `/api/v1/condition_logs`（upsert: 同日は更新） |
| PATCH | `/api/v1/condition_logs/:id` |

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
│  コンディション: [今日を記録]    │
└────────────────────────────────┘
```

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
│  疲労度:  ◎ ○ ● △ ×          │
│  体調:    ● ○ △ ×              │
│  睡眠:    [7.5] 時間            │
│                                │
│  気分: 「今日は調子いい」        │
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

- ShadowSwingSession 完了時に自動で PracticeLog が作成される
- メニュー: 「素振り」を自動マッピング
- 値: completed_count を value にセット

### 野球ノートとの連動（PRD-09）

- 練習記録の memo は野球ノート機能を流用
- 写真・動画は野球ノート経由

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 無料ユーザーが4つ目のメニュー登録 | エラー: 「Pro でメニュー無制限に」 |
| 無料ユーザーが過去2ヶ月の記録閲覧 | 直近1ヶ月のみ表示、Pro 訴求 |
| 既に削除されたメニューの記録 | メニュー名は practice_logs に保存しておく |
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

- [ ] デフォルトのメニューマスター（プリセット）を提供するか
- [ ] メニューカテゴリの細かい分類
- [ ] 怪我・痛みの記録の詳細仕様
- [ ] 練習時間の自動測定（タイマー）は必要か
- [ ] チームメイトとの共有機能（Phase 2）
