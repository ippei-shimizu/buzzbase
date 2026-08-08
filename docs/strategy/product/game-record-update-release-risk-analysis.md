# 試合記録アップデート リリース前 本番データ分析・リスク評価

**作成日**: 2026-06-13
**対象リリースブランチ**: `release/game-stats-202605`
**関連 Design Doc**: `game-record-update-design-doc.md`
**関連 Issue**: ippei-shimizu/buzzbase#335
**関連 PR (mobile)**: ippei-shimizu/buzzbase_mobile#113

## 背景

Issue #335（mobile 試合詳細・打席編集・削除UI）の実装検討中に、本番リリース時に **既存ユーザーの集計データ（`batting_averages`）が破壊されるリスク** が判明したため、本番 DB を SQL で実態確認し、必要な対応をまとめる。

確認は DBeaver から本番 RDS（AWS）に SELECT 専用接続で実施。

## エグゼクティブサマリ

| 項目 | 数値 | 評価 |
|---|---:|---|
| 旧 PA 総数 | 14,440 | - |
| 旧 PA を含む試合数 | 4,653 | - |
| **集計破壊リスクのある試合** | **2,552** | **致命的** |
| 消失リスクの打点合計 | 2,832 | - |
| 消失リスクの得点合計 | 2,679 | - |
| 消失リスクの盗塁合計 | 2,347 | - |
| 消失リスクの盗塁死合計 | 162 | - |
| `hit_direction_id` 持ち | 5,651 (39%) | A-1 分布図が 6 割欠落 |
| `batting_position_id` 持ち | 13,903 (96%) | A-2 方向別分析はほぼ網羅 |
| `batting_result` 連結文字列 | 大半が方向付き | 表示は安全 |

**結論**: 本リリースには `back/app/services/stats/batting_average_recalculator.rb` の **混在試合保護ロジック追加が必須**。Mobile PR #113 はそのままマージしてはいけない。

---

## 本番データの実態

### 1. 旧 PA の打球方向・守備位置の記録率

```sql
SELECT
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE hit_direction_id IS NOT NULL)    AS with_direction,
  COUNT(*) FILTER (WHERE hit_direction_id IS NULL)        AS without_direction,
  COUNT(*) FILTER (WHERE batting_position_id IS NOT NULL) AS with_position,
  COUNT(*) FILTER (WHERE batting_position_id IS NULL)     AS without_position
FROM plate_appearances;
```

| total | with_direction | without_direction | with_position | without_position |
|---:|---:|---:|---:|---:|
| 14,440 | 5,651 (39%) | 8,789 (61%) | 13,903 (96%) | 537 (4%) |

### 2. `batting_result` の文字列パターン（上位30）

| 順位 | batting_result | 件数 | 順位 | batting_result | 件数 |
|---:|---|---:|---:|---|---:|
| 1 | 四球 | 1,866 | 16 | 右飛 | 217 |
| 2 | 三振 | 1,847 | 17 | 二飛 | 209 |
| 3 | 中安 | 691 | 18 | 遊飛 | 208 |
| 4 | 左安 | 687 | 19 | 中二 | 193 |
| 5 | 遊ゴ | 610 | 20 | 一飛 | 171 |
| 6 | 三ゴ | 604 | 21 | 遊安 | 168 |
| 7 | 二ゴ | 575 | 22 | 三安 | 164 |
| 8 | 右安 | 502 | 23 | 右二 | 148 |
| 9 | 中飛 | 365 | 24 | 三失 | 147 |
| 10 | 投ゴ | 362 | 25 | 遊失 | 139 |
| 11 | 一ゴ | 331 | 26 | 投飛 | 130 |
| 12 | 死球 | 318 | 27 | 安 | 126 |
| 13 | 左飛 | 292 | 28 | 三飛 | 124 |
| 14 | ゴ | 225 | 29 | 投犠打 | 123 |
| 15 | 左二 | 222 | 30 | 二失 | 94 |

**観察**: 上位は「四球」「三振」「死球」など方向不要結果と、「中安」「三ゴ」のような方向付き連結文字列。素ラベル単体（「ゴ」225 / 「安」126）は少数。

### 3. 影響試合数

| affected_games |
|---:|
| 4,653 |

### 4. `batting_averages` の現状値（破壊リスクの母数）

| total | with_rbi | with_run | with_stolen | with_caught | total_rbi | total_run | total_stolen | total_caught |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 4,868 | 1,470 (30%) | 1,585 (33%) | 1,078 (22%) | 144 (3%) | 2,832 | 2,679 | 2,347 | 162 |

### 5. 破壊リスク試合数

```sql
SELECT COUNT(DISTINCT ba.game_result_id) AS at_risk_games
FROM batting_averages ba
WHERE ba.runs_batted_in > 0
   OR ba.run > 0
   OR ba.stealing_base > 0
   OR ba.caught_stealing > 0;
```

| at_risk_games |
|---:|
| **2,552** |

### A. `plate_result_id` × 方向あり/なし

`plate_result_id` の id↔name マッピングは `mobile/constants/battingData.ts:36-57` に従う。

| plate_result_id | 名前 | total | with_direction | 方向必須？ |
|---:|---|---:|---:|:---:|
| 1 | ゴロ | 2,769 | 1,484 (54%) | ○ |
| 7 | ヒット | 2,757 | 1,507 (55%) | ○ |
| 2 | フライ | 1,930 | 1,097 (57%) | ○ |
| 15 | 四球 | 1,837 | 5 (0%) | × |
| 13 | 三振 | 1,835 | 14 (1%) | × |
| 8 | 二塁打 | 836 | 463 (55%) | ○ |
| 5 | エラー | 549 | 318 (58%) | ○ |
| 16 | 死球 | 315 | 2 (1%) | × |
| 11 | 犠打 | 287 | 169 (59%) | ○ |
| 9 | 三塁打 | 287 | 133 (46%) | ○ |
| 4 | ライナー | 286 | 155 (54%) | ○ |
| 10 | 本塁打 | 285 | 159 (56%) | ○ |
| 3 | ファールフライ | 128 | 67 (52%) | ○ |
| 12 | 犠飛 | 115 | 40 (35%) | ○ |
| 14 | 振り逃げ | 92 | 0 (0%) | × |
| 6 | フィルダースチョイス | 62 | 26 (42%) | ○ |
| 19 | 併殺打 | 51 | 16 (31%) | ○ |
| 0 | - (未記録) | 8 | 0 | - |
| 18 | 走塁妨害 | 7 | 0 (0%) | × |
| NULL | - | 5 | 0 | - |
| 17 | 打撃妨害 | 4 | 0 (0%) | × |

**観察**: 方向必須の結果でも、本番の旧 PA は **方向が埋まっているのは約 50〜60%**。残り 40〜50% は方向選び忘れ。

### B. 守備位置 `batting_position_id` の分布

`batting_position_id` の id↔name マッピングは `mobile/constants/battingData.ts:1-16` の `battingResultsPositions` に準拠。

| batting_position_id | ラベル | 件数 |
|---:|---|---:|
| 0 | - (未選択) | 4,136 |
| 7 | 左 | 1,897 |
| 8 | 左中 | 1,490 |
| 9 | 左中 | 1,230 |
| 6 | 遊 | 1,206 |
| 5 | 三 | 1,167 |
| 4 | 二 | 1,021 |
| 1 | 投 | 822 |
| 3 | 一 | 727 |
| NULL | - | 537 |
| 2 | 捕 | 212 |

**観察**: 守備位置自体は 96% が値持ちだが、内訳は `0`（未選択）が 4,136 件と最多。実質の方向ラベル付き保存は 9,767 件。

### C. `hit_direction_id` の分布（13方向）

| hit_direction_id | ラベル | 件数 |
|---:|---|---:|
| NULL | - | 8,790 |
| 10 | 中 | 754 |
| 8 | 左 | 735 |
| 6 | 遊 | 693 |
| 5 | 三 | 671 |
| 4 | 二 | 595 |
| 12 | 右 | 535 |
| 3 | 一 | 446 |
| 1 | 投 | 443 |
| 9 | 左中 | 245 |
| 7 | 左線 | 245 |
| 2 | 捕 | 121 |
| 11 | 右中 | 115 |
| 13 | 右線 | 57 |

### D. `batting_result` × `plate_result_id` × `hit_direction_id` パターン（上位）

| batting_result | plate_result_id | hit_direction_id | 件数 |
|---|---:|---:|---:|
| 四球 | 15 | NULL | 1,822 |
| 三振 | 13 | NULL | 1,807 |
| 左安 | 7 | 8 | 377 |
| 遊ゴ | 1 | 6 | 372 |
| 中安 | 7 | 10 | 370 |
| 三ゴ | 1 | 5 | 356 |
| 二ゴ | 1 | 4 | 337 |
| 中安 | 7 | NULL | 321 |
| 死球 | 16 | NULL | 312 |
| 左安 | 7 | NULL | 308 |
| 右安 | 7 | 12 | 265 |
| 三ゴ | 1 | NULL | 249 |
| 遊ゴ | 1 | NULL | 239 |
| 二ゴ | 1 | NULL | 238 |
| 右安 | 7 | NULL | 237 |
| ゴ | 1 | NULL | 225 |
| 中飛 | 2 | 10 | 207 |
| 投ゴ | 1 | 1 | 199 |
| 一ゴ | 1 | 3 | 192 |
| 左飛 | 2 | 8 | 168 |
| 投ゴ | 1 | NULL | 163 |
| 中飛 | 2 | NULL | 158 |
| 一ゴ | 1 | NULL | 139 |
| 安 | 7 | NULL | 126 |

**重要な観察**:

1. **`batting_result` は `batting_position_id` ベースで連結されている**（mobile の `getResultText(positionId, resultId)` を通る）。`hit_direction_id` は別途のサーバー側分析用フィールド
2. `batting_result = "中安"` の中に `hit_direction_id = NULL` の 321 件が存在する → 「打球方向は別フィールドだが、`batting_result` 文字列内には『中』方向が含まれている」状態
3. つまり「方向ラベル付き文字列があるかどうか」と「`hit_direction_id` が埋まっているかどうか」は独立した観点

### E. `batting_averages` の値分布

| avg_rbi | max_rbi | avg_run | max_run | avg_stolen | max_stolen | avg_caught | max_caught | avg_hit | max_hit |
|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| 1.11 | 110 | 1.05 | 110 | 0.92 | 557 | 0.06 | 11 | 0.80 | 6 |

**注意**: `max_rbi/max_run = 110`、`max_stolen = 557` は外れ値（テストデータか集計ミスの可能性）。dev データ生成では 0〜数件のレンジを採用すべき。

---

## 致命的リスクの詳細

### リスク1: `batting_averages` の集計破壊（致命的）

#### メカニズム

1. リリースのマイグレーションで全旧 PA に新カラム (`rbi`, `run_scored`, `stolen_bases`, `caught_stealing`) が **NULL で追加**、`is_new_format = false` がセットされる
2. ユーザーが試合詳細から打席カードをタップ → `PlateAppearanceWizard` で 1 件編集 → 保存
3. `back/app/controllers/api/v2/plate_appearances_controller.rb:36` で当該 PA に `is_new_format = true` が **強制セット**される
4. `back/app/services/stats/batting_average_recalculator.rb:67-69` の `new_format_game?` は **試合内に 1 件でも is_new_format=true があれば true** を返す:

   ```ruby
   def new_format_game?
     PlateAppearance.exists?(game_result_id: @game_result_id, is_new_format: true)
   end
   ```

5. Recalculator が試合全体を再集計。集計式 (`batting_average_recalculator.rb:88-91`):

   ```ruby
   runs_batted_in:  scope.sum(:rbi).to_i,
   run:             scope.sum(:run_scored).to_i,
   stealing_base:   scope.sum(:stolen_bases).to_i,
   caught_stealing: scope.sum(:caught_stealing).to_i,
   ```

   - 編集した 1 件のみ per-PA 値あり（編集で入力された値、通常 0 〜 数件）
   - 他の旧 PA は **NULL → SUM で 0 扱い**
   - → `batting_averages` の打点・得点・盗塁・盗塁死が **編集 1 件分のみの値に上書き保存**される
6. 旧フローで `batting_averages` 直書きされていた合計値（例: 打点3）が **`0` または `1` に上書き**されて消失

#### なぜ復元不能か

旧仕様時代の `plate_appearances` に per-PA の `rbi` 等のカラムが存在しなかったため、当該打席で誰が何点を生んだかの **原データが残っていない**。`batting_averages` を上書きした瞬間、合計値は失われる。

#### 影響範囲（本番実数値）

- **2,552 試合**が編集 1 件で集計破壊しうる
- 消失リスク総数: 打点 2,832 + 得点 2,679 + 盗塁 2,347 + 盗塁死 162 = **7,820 件**

### リスク2: 打球分布図 (A-1) の旧データ欠落

- A-1 は `hit_location_x` / `hit_location_y`（絶対座標）ベース
- 旧 PA は全件 NULL のため、**旧試合の打席は分布図にプロットされない**
- 旧ユーザーの大半（4,653 試合）の分布図がスカスカに見える
- データ破壊ではないが、UX として混乱を招く

### リスク3: 編集UI でグラウンドキャンバスのマーカーが立たない

- `mobile/stores/battingRecordStore.ts:131-133` の `initializeFromExisting`:

  ```ts
  hitDirectionId: pa.hit_direction_id,
  hitLocationX: parseLocationString(pa.hit_location_x),   // NULL → null
  hitLocationY: parseLocationString(pa.hit_location_y),   // NULL → null
  ```

- `PlateAppearanceWizard` の `hitLocation` 判定:

  ```ts
  const hitLocation = hitLocationX !== null && hitLocationY !== null ? {...} : null;
  ```

- 旧 PA は `hitLocation = null` → グラウンドにマーカーなしで起動
- ユーザーから見ると「方向データが無い打席」に見える（実際は `hit_direction_id` を持っている可能性あり）

### リスク4: 方向別分析 (A-2) は `hit_direction_id` 持ちのみ集計

- A-2 は `hit_direction_id` を集計対象
- 旧 PA で 39% (5,651 件) しか方向 id を持たないため、61% (8,789 件) は方向別分析から欠落
- ただしそのうち「四球」「三振」「死球」などは元から方向の概念がないため、欠落は意味的に妥当
- 「ゴ」「安」など方向選び忘れの素ラベル（数百件オーダー）は復元不能

---

## 対応案

### 必須（リリース阻止条件）

#### A. back の `BattingAverageRecalculator` を混在試合保護対応に修正（推奨）

`new_format_game?` の判定を「**全 PA が `is_new_format=true` のときだけ true**」に変更:

```ruby
def new_format_game?
  game_pa_relation = PlateAppearance.where(game_result_id: @game_result_id)
  game_pa_relation.exists? &&
    !game_pa_relation.exists?(is_new_format: false)
end
```

これにより:

- 旧 PA が 1 件でも残っている試合では Recalculator が動かず、既存 `batting_averages` は永久保護
- ユーザーが旧試合の全打席を新仕様 UI で編集し直すと、初めて再集計が走る（理想的な移行）
- 完全新仕様試合は今まで通り再集計

工数は数行 + テスト。最もシンプルかつ安全。

#### B. mobile 側ガード（A の補強）

Mobile PR #113 で `GameResultDetail` の `PlateAppearanceCard` の `onPress` / `onLongPress` を **`pa.is_new_format === true` の打席のみ有効化**し、旧 PA はタップ無効 + ヒント表示。

A の修正が back に入れば不要だが、A のデプロイ前に mobile を出すなら必須のガード。

### 望ましい（UX 改善・別 Issue）

#### C. 編集 UI のマーカー初期化

旧 PA を編集モードで開いたとき、`hit_direction_id` から `DIRECTION_LABEL_POSITIONS[id]` で座標を逆引きしてマーカー初期表示する:

```ts
// initializeFromExisting 内
const fallbackLocation = pa.hit_location_x === null && pa.hit_direction_id !== null
  ? DIRECTION_LABEL_POSITIONS[pa.hit_direction_id]
  : null;
hitLocationX: parseLocationString(pa.hit_location_x) ?? fallbackLocation?.x ?? null,
hitLocationY: parseLocationString(pa.hit_location_y) ?? fallbackLocation?.y ?? null,
```

これで旧 PA でも編集起動時にグラウンドキャンバスに点が立ち、「方向タップ済み状態」として動作する。

#### D. A-1 分布図の注記

「分布図は新仕様で記録した打席のみ集計しています」のような注記を A-1 画面に追加。

---

## 開発環境データ生成タスク (`dev_data_creator.rb`) の現状と改修方針

### 改修方針（前提）

QA 担当者が「**リリース前の本番相当データ** で新機能を試して、既存データへの影響を確認できる」ことを目的とする。

- 新仕様カラム (`rbi` / `run_scored` / `stolen_bases` / `caught_stealing` / `is_new_format`) は **触らない**（全件 NULL / false 維持）
- 旧仕様データのみ生成し、本番 DB の分布に寄せる
- リリース後の QA で実データに近い動作確認ができる状態にする

### 本番との乖離

`back/lib/tasks/dev_data_creator.rb:581-602` の現状実装は以下の点で本番と乖離:

| 項目 | 本番 | 現状 dev_data_creator | 改修要否 |
|---|---|---|---|
| `batting_position_id` | 13,903 / 14,440 (96%) 埋まり | 全件 `nil` | **要改修** |
| `hit_direction_id` | 5,651 / 14,440 (39%) 埋まり | ヒット系のみランダム | **要改修**（割合調整） |
| `batting_result` | mobile `getResultText` 連結文字列 | `plate_result.name` のみ | **要改修** |
| `plate_result_id` 分布 | クエリ A の分布 | ランダム均一 | **要改修**（重み付け） |
| `is_new_format` | 全件 false | 全件 false | OK |
| 新仕様カラム | 全件 NULL（マイグレ前） | カラム無し | リリース後 NULL 維持 |

### 改修内容

1. **`RESULT_SHORT_FORMS` 定数の追加**（mobile `getResultText` の `resultShortForms` を Ruby 移植）:

   ```ruby
   RESULT_SHORT_FORMS = {
     'ヒット' => '安', '二塁打' => '二', '三塁打' => '三', '本塁打' => '本',
     'ゴロ' => 'ゴ', 'フライ' => '飛',
     '打撃妨害' => '打妨', '走塁妨害' => '走妨', '併殺打' => '併'
   }.freeze
   ```

2. **`POSITION_LABELS` の追加**（mobile `battingResultsPositions` を Ruby 移植、`Stats::HitDirectionAggregator::DIRECTION_LABELS` とは別の旧 13 ラベル）:

   ```ruby
   POSITION_LABELS = {
     1 => '投', 2 => '捕', 3 => '一', 4 => '二', 5 => '三', 6 => '遊',
     7 => '左線', 8 => '左', 9 => '左中', 10 => '中', 11 => '右中', 12 => '右', 13 => '右線'
   }.freeze
   ```

3. **`create_plate_appearances` の改修**:
   - `plate_result_id` をクエリ A の分布で重み付けランダム選択
   - 方向必須結果のみ `batting_position_id` を 1〜13 で重み付け選択（NULL を残すのは方向不要結果のみ）
   - `hit_direction_id` を方向必須結果の 55% 程度に埋め（本番分布に合わせる）
   - `batting_result` を `"#{POSITION_LABELS[position_id]}#{RESULT_SHORT_FORMS[name] || name}"` で連結

4. **`batting_averages` の値**:
   - 打点・得点は 0〜5 程度
   - 盗塁は 0〜2 程度
   - 盗塁死は 0〜1 程度
   - 外れ値（rbi=110 など）は採用しない

### 留意事項

- 既存 dev データの再投入が必要（`rake dev_data:reset`）
- 改修は別ブランチで main 直行（`release/game-stats-202605` には載せない）
- リリース後のマイグレーションで自動的に新仕様カラムが NULL 追加されるので、改修した dev データもそのまま新機能 QA に使える

---

## 再現用 SQL クエリ集

接続: `DBeaver → 本番 RDS → SELECT 専用接続`。Heroku 経由なら `heroku pg:psql --app <app-name>`。

```sql
-- 1. 旧 PA の打球方向・守備位置の記録率
SELECT
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE hit_direction_id IS NOT NULL)    AS with_direction,
  COUNT(*) FILTER (WHERE hit_direction_id IS NULL)        AS without_direction,
  COUNT(*) FILTER (WHERE batting_position_id IS NOT NULL) AS with_position,
  COUNT(*) FILTER (WHERE batting_position_id IS NULL)     AS without_position
FROM plate_appearances;

-- 2. batting_result の文字列パターン上位30
SELECT batting_result, COUNT(*) AS cnt
FROM plate_appearances
GROUP BY batting_result
ORDER BY cnt DESC
LIMIT 30;

-- 3. 影響試合数
SELECT COUNT(DISTINCT game_result_id) AS affected_games
FROM plate_appearances;

-- 4. batting_averages の現状値
SELECT
  COUNT(*)                                       AS total,
  COUNT(*) FILTER (WHERE runs_batted_in > 0)     AS with_rbi,
  COUNT(*) FILTER (WHERE run > 0)                AS with_run,
  COUNT(*) FILTER (WHERE stealing_base > 0)      AS with_stolen,
  COUNT(*) FILTER (WHERE caught_stealing > 0)    AS with_caught,
  COALESCE(SUM(runs_batted_in), 0)               AS total_rbi,
  COALESCE(SUM(run), 0)                          AS total_run,
  COALESCE(SUM(stealing_base), 0)                AS total_stolen,
  COALESCE(SUM(caught_stealing), 0)              AS total_caught
FROM batting_averages;

-- 5. 破壊リスク試合数
SELECT COUNT(DISTINCT ba.game_result_id) AS at_risk_games
FROM batting_averages ba
WHERE ba.runs_batted_in > 0
   OR ba.run > 0
   OR ba.stealing_base > 0
   OR ba.caught_stealing > 0;

-- A. plate_result_id × 方向あり/なし
SELECT
  pa.plate_result_id,
  COUNT(*)                                                AS total,
  COUNT(*) FILTER (WHERE pa.hit_direction_id IS NOT NULL) AS with_direction
FROM plate_appearances pa
GROUP BY pa.plate_result_id
ORDER BY total DESC;

-- B. 守備位置の分布
SELECT batting_position_id, COUNT(*) AS cnt
FROM plate_appearances
GROUP BY batting_position_id
ORDER BY cnt DESC;

-- C. 打球方向の分布
SELECT hit_direction_id, COUNT(*) AS cnt
FROM plate_appearances
GROUP BY hit_direction_id
ORDER BY cnt DESC;

-- D. batting_result × plate_result_id × hit_direction_id パターン頻度
SELECT
  pa.batting_result,
  pa.plate_result_id,
  pa.hit_direction_id,
  COUNT(*) AS cnt
FROM plate_appearances pa
GROUP BY pa.batting_result, pa.plate_result_id, pa.hit_direction_id
ORDER BY cnt DESC
LIMIT 50;

-- E. batting_averages の値分布
SELECT
  AVG(runs_batted_in)  AS avg_rbi,    MAX(runs_batted_in)  AS max_rbi,
  AVG(run)             AS avg_run,    MAX(run)             AS max_run,
  AVG(stealing_base)   AS avg_stolen, MAX(stealing_base)   AS max_stolen,
  AVG(caught_stealing) AS avg_caught, MAX(caught_stealing) AS max_caught,
  AVG(hit)             AS avg_hit,    MAX(hit)             AS max_hit
FROM batting_averages
WHERE runs_batted_in > 0 OR run > 0 OR stealing_base > 0 OR caught_stealing > 0;
```

---

## 進め方の提案

1. **本ドキュメントを起点に Issue を 3 件起票**:
   - 必須: `BattingAverageRecalculator` の混在試合保護（back）
   - 必須: mobile 側の旧 PA 編集ガード（PR #113 への追加 or 別 PR、back デプロイ前の暫定）
   - 別: `dev_data_creator.rb` の本番相当データ生成（main 直行）
2. **PR #113 は back 修正 or mobile ガード追加までブロック**
3. **A-1 分布図の旧データ欠落・編集 UI マーカー初期化は Issue 化して後続フェーズで対応**

## 参照

- Design Doc: `docs/strategy/product/game-record-update-design-doc.md`
- Recalculator: `back/app/services/stats/batting_average_recalculator.rb`
- v2 PA Controller: `back/app/controllers/api/v2/plate_appearances_controller.rb`
- v1 batting result 生成: `mobile/constants/battingData.ts:100-107`
- v1 dev データ生成: `back/lib/tasks/dev_data_creator.rb:581-602`
- Issue: ippei-shimizu/buzzbase#335
- PR (mobile): ippei-shimizu/buzzbase_mobile#113
