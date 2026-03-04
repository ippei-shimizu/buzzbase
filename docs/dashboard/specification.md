# ダッシュボード画面 仕様書

## 概要

ログインユーザー専用のホーム画面。個人の成績サマリー・直近の試合結果・グループ内ランキングを一画面で確認でき、試合記録の新規作成にもすぐアクセスできる。

- **URL**: `/dashboard`
- **認証**: 必須（未ログイン時は `/signup?auth_required=true` にリダイレクト）
- **API**: `GET /api/v2/dashboard`

---

## 画面構成

### レイアウト順序

| 順序 | セクション | 説明 |
|------|-----------|------|
| 1 | **試合記録ボタン（RecordGameButton）** | 新規試合記録の作成ボタン |
| 2 | **成績概要（StatsOverview）** | メインセクション。通算成績 + 期間/試合種別フィルタ |
| 3 | **直近の試合結果（RecentGameResults）** | 最新3件の試合結果カード |
| 4 | **グループランキング（GroupRankings）** | 所属グループ内の順位表示 |

> **変更点**: 現在の実装では RecordGameButton → RecentGameResults → StatsOverview → GroupRankings の順。成績概要を2番目に移動し、直近の試合結果・グループランキングより上に配置する。

---

## セクション詳細

### 1. 成績概要（StatsOverview）

ユーザーの打撃・投手成績を表示するメインセクション。

#### 現在の実装

- 通算成績のみ表示
- 打撃6指標 + 投手6指標を3列グリッドで表示
- フィルタ機能なし

#### 改善後の仕様

##### フィルタ機能

| フィルタ | 選択肢 | デフォルト | UI |
|---------|--------|-----------|-----|
| **期間** | 通算 / 各年度（例: 2026, 2025, ...） | 通算 | セレクトボックス |
| **試合種別** | 全て / 公式戦 / オープン戦 | 全て | セレクトボックス |

- 年度リストはユーザーの試合記録から動的に取得（`available_years`）
- フィルタ変更時にAPIを再呼び出しし、表示を更新
- フィルタはClient Component化が必要（ユーザー操作による状態管理）

##### 表示指標

**打撃成績**

| 指標名 | APIフィールド | 表示形式 | 備考 |
|--------|-------------|---------|------|
| 試合数 | `aggregate.number_of_matches` | 整数 | |
| 打率 | `calculated.batting_average` | 小数3桁 | |
| 本塁打 | `aggregate.home_run` | 整数 | |
| 打点 | `aggregate.runs_batted_in` | 整数 | |
| 安打 | `aggregate.hit` | 整数 | |
| 盗塁 | `aggregate.stealing_base` | 整数 | |
| 出塁率 | `calculated.on_base_percentage` | 小数3桁 | |
| 長打率 | `calculated.slugging_percentage` | 小数3桁 | |
| OPS | `calculated.ops` | 小数3桁 | |
| 打席数 | `aggregate.times_at_bat` | 整数 | |
| 打数 | `aggregate.at_bats` | 整数 | |
| 四球 | `aggregate.base_on_balls` | 整数 | |
| 三振 | `aggregate.strike_out` | 整数 | |
| ISO | `calculated.iso` | 小数3桁 | |
| BB/K | `calculated.bb_per_k` | 小数2桁 | |

**投手成績**

| 指標名 | APIフィールド | 表示形式 | 備考 |
|--------|-------------|---------|------|
| 登板数 | `aggregate.number_of_appearances` | 整数 | |
| 防御率 | `calculated.era` | 小数2桁 | |
| 勝利 | `aggregate.win` | 整数 | |
| 敗北 | `aggregate.loss` | 整数 | |
| セーブ | `aggregate.saves` | 整数 | |
| HP | `aggregate.hold` | 整数 | |
| 投球回 | `aggregate.innings_pitched` | 小数1桁 | |
| 奪三振 | `aggregate.strikeouts` | 整数 | |
| 自責点 | `aggregate.earned_run` | 整数 | |
| 勝率 | `calculated.win_percentage` | 小数3桁 | |
| WHIP | `calculated.whip` | 小数2桁 | |
| K/9 | `calculated.k_per_nine` | 小数2桁 | |
| BB/9 | `calculated.bb_per_nine` | 小数2桁 | |
| K/BB | `calculated.k_bb` | 小数2桁 | |

> 現在は打撃6指標・投手6指標のみ表示。改善後はAPIが返却する全指標を表示する。

##### 空状態

成績データがない場合:
- 「成績がありません」メッセージ
- 「試合を記録すると成績が表示されます」の補足テキスト

---

### 2. 試合記録ボタン（RecordGameButton）

| 項目 | 内容 |
|------|------|
| コンポーネント | HeroUI `Button` |
| ラベル | 「試合を記録する」 |
| アイコン | `PlusIcon`（右端） |
| スタイル | `color="primary"`, `variant="solid"`, `radius="full"`, `fullWidth` |
| 動作 | `createGameResult()` → localStorage に `gameResultId` を保存 → `/game-result/record` に遷移 |

---

### 3. 直近の試合結果（RecentGameResults）

最新3件の試合結果を表示。

#### 各カードの表示内容

| 項目 | 表示 |
|------|------|
| 日付 | `月/日` 形式 |
| 試合種別 | 「公式戦」/「オープン戦」バッジ |
| 対戦相手 | `vs {チーム名}` |
| スコア | `自チーム得点 - 相手得点`（勝利時はスコアを黄色表示） |
| 打撃成績 | `安打/打数`, HR数, 打点数 |
| 投手成績 | `投球回`, 奪三振(K), 自責点 |

#### リンク

- ヘッダー右側に「すべて見る」リンク → `/game-result/lists`

#### 空状態

- 「試合記録がありません」メッセージ
- 「試合を記録する」ボタンからの案内テキスト

---

### 4. グループランキング（GroupRankings）

ユーザーが所属するグループごとのランキングを表示。

#### グループヘッダー

| 項目 | 表示 |
|------|------|
| アイコン | グループアイコン（未設定時: `group-default-yellow.svg`）, HeroUI `Avatar` |
| グループ名 | テキスト |
| メンバー数 | `{N}人` |

#### ランキング項目

**打撃ランキング（6指標）**

| 指標 | ラベル |
|------|--------|
| batting_average | 打率 |
| home_run | 本塁打 |
| runs_batted_in | 打点 |
| hit | 安打 |
| stealing_base | 盗塁 |
| on_base_percentage | 出塁率 |

**投手ランキング（6指標）**

| 指標 | ラベル |
|------|--------|
| era | 防御率 |
| win | 勝利 |
| saves | セーブ |
| hold | HP |
| strikeouts | 奪三振 |
| win_percentage | 勝率 |

#### 各項目の表示

| 要素 | 説明 |
|------|------|
| 順位バッジ | 1位=金, 2位=銀, 3位=銅, 4位以降=グレー |
| 指標ラベル | 日本語名 |
| 現在の値 | 数値 |
| 変動インジケータ | ↑{N}（緑）/ ↓{N}（赤）/ →（グレー） |

#### ランキング変動ロジック

- `change = previous_rank - current_rank`
- 前回スナップショットとの差分で算出
- スナップショットは毎日JST 0時に `ranking:snapshot_daily` タスクで記録

#### 空状態

- 「所属グループはありません」メッセージ
- 「グループに参加するとランキングが表示されます」の補足テキスト

---

## API仕様

### `GET /api/v2/dashboard`

#### リクエスト

| ヘッダー | 説明 |
|---------|------|
| access-token | 認証トークン |
| client | クライアントID |
| uid | ユーザーID |

**クエリパラメータ（改善後に追加）**

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|-----------|-----|------|-----------|------|
| year | string | No | なし（通算） | 年度フィルタ（例: "2025"） |
| match_type | string | No | なし（全て） | 試合種別（"regular" / "open"） |

> `year` / `match_type` は `batting_stats` と `pitching_stats` にのみ適用される。`recent_game_results` と `group_rankings` には影響しない。

#### レスポンス

```json
{
  "batting_stats": {
    "aggregate": {
      "number_of_matches": 10,
      "hit": 15,
      "home_run": 3,
      "runs_batted_in": 12,
      "stealing_base": 5,
      "times_at_bat": 45,
      "at_bats": 40,
      "base_on_balls": 5,
      "strike_out": 8
    },
    "calculated": {
      "batting_average": 0.375,
      "on_base_percentage": 0.444,
      "slugging_percentage": 0.625,
      "ops": 1.069,
      "iso": 0.250,
      "bb_per_k": 0.625
    }
  },
  "pitching_stats": {
    "aggregate": {
      "number_of_appearances": 5,
      "win": 3,
      "loss": 1,
      "saves": 0,
      "hold": 1,
      "innings_pitched": 30.0,
      "strikeouts": 25,
      "earned_run": 8
    },
    "calculated": {
      "era": 2.40,
      "win_percentage": 0.750,
      "whip": 1.10,
      "k_per_nine": 7.50,
      "bb_per_nine": 2.10,
      "k_bb": 3.57
    }
  },
  "recent_game_results": [
    {
      "id": 1,
      "date": "2026-02-20T00:00:00.000+09:00",
      "opponent_team_name": "チームA",
      "my_team_score": 5,
      "opponent_team_score": 3,
      "match_type": "regular",
      "batting_average": {
        "hit": 2,
        "at_bats": 4,
        "home_run": 1,
        "runs_batted_in": 3
      },
      "pitching_result": null
    }
  ],
  "group_rankings": [
    {
      "group_id": 1,
      "group_name": "グループ名",
      "group_icon": "/uploads/group/icon/1/image.png",
      "total_members": 10,
      "batting_rankings": [
        {
          "stat_type": "batting_average",
          "label": "打率",
          "current_rank": 2,
          "previous_rank": 3,
          "change": 1,
          "value": 0.375
        }
      ],
      "pitching_rankings": []
    }
  ],
  "available_years": [2026, 2025]
}
```

---

## ナビゲーション

### メニュー項目

| メニュー名 | ログイン時の遷移先 | 未ログイン時の遷移先 |
|-----------|------------------|-------------------|
| ダッシュボード（ログイン時） / トップ（未ログイン時） | `/dashboard` | `/` |
| 野球ノート | `/note` | `/signup?auth_required=true` |
| 記録 | `/game-result/record` | `/signup?auth_required=true` |
| グループ | `/groups` | `/signup?auth_required=true` |

> **変更点**: 「記録」の遷移先を `/game-result/lists`（試合一覧）→ `/game-result/record`（新規記録作成）に変更する。

### 「記録」メニュータップ時の動作

ナビから「記録」をタップした場合、localStorageに `gameResultId` が存在しない状態で `/game-result/record` に遷移する。この場合、record ページ側で `createGameResult()` を自動呼び出しして `gameResultId` を生成・保存する。

---

## データベース

### group_ranking_snapshots テーブル

グループ内ランキングの日次スナップショットを記録。

| カラム | 型 | 制約 | 説明 |
|-------|-----|------|------|
| id | bigint | PK | |
| group_id | bigint | FK(groups), NOT NULL | グループID |
| user_id | bigint | FK(users), NOT NULL | ユーザーID |
| stat_type | string | NOT NULL | 成績指標名 |
| rank | integer | NOT NULL, > 0 | 順位 |
| value | decimal(10,3) | NOT NULL | その時点の成績値 |
| snapshot_date | date | NOT NULL | スナップショット日付 |
| created_at | datetime | | |
| updated_at | datetime | | |

**ユニーク制約**: `[group_id, user_id, stat_type, snapshot_date]`

**インデックス**: `snapshot_date`

### ランキングスナップショット Rakeタスク

```
rake ranking:snapshot_daily
```

- 毎日JST 0時に実行（cron等で設定）
- 全グループの全メンバーについて、打撃6指標 + 投手6指標のランキングを記録
- ソート順: ERA のみ昇順（低い方が上位）、その他は降順

---

## コンポーネント構成

```
front/app/(app)/dashboard/
├── page.tsx                        # Server Component（認証チェック + データ取得）
├── actions.ts                      # Server Action（API呼び出し）
└── _components/
    ├── DashboardContent.tsx         # Client Component（レイアウト管理）
    ├── StatsOverview.tsx            # Client Component（成績表示 + フィルタ操作）
    ├── RecordGameButton.tsx         # Client Component（記録ボタン）
    ├── RecentGameResults.tsx        # Presentational Component（試合結果リスト）
    └── GroupRankings.tsx            # Presentational Component（グループランキング）
```

---

## 変更サマリー

| 項目 | 現在 | 改善後 |
|------|------|--------|
| セクション順序 | ボタン → 試合結果 → 成績 → ランキング | **ボタン → 成績 → 試合結果 → ランキング** |
| 成績表示 | 通算のみ、6+6指標 | **フィルタ付き（年度/試合種別）、全指標表示** |
| 「記録」メニュー遷移先 | `/game-result/lists` | **`/game-result/record`** |
| record ページの gameResultId | localStorage にない場合はエラー | **自動で `createGameResult()` を呼び出し** |
| API レスポンス | フィルタなし | **`year` / `match_type` パラメータ対応 + `available_years` 追加** |
