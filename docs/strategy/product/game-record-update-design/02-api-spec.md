# 02. API 仕様

**親ドキュメント**: `../game-record-update-design-doc.md`
**前提**: `01-data-model.md`
**関連 Issue**: #331（API拡張）/ #337（Pro分析API）

---

## 1. 設計方針

- **v2 名前空間** で実装（既存 v1 はそのまま残す）
- レスポンス整形は **シリアライザ** で行う（`V2::` 名前空間）
- 認証: `authenticate_api_v1_user!`（既存 DeviseTokenAuth）
- リソース取得は `current_api_v1_user.xxx.find(params[:id])` でスコープを絞る
- **非公開アカウントガード**: 他ユーザーのデータを返す前に `user.profile_visible_to?(current_api_v1_user)`
- **Pro 機能ガード**: Pro 専用エンドポイントは `before_action :require_pro_plan!`
- レスポンスはすべて snake_case JSON

---

## 2. ルーティング追加

```ruby
# back/config/routes.rb の v2 namespace 内に追記
namespace :v2 do
  # 打席記録 CRUD
  resources :plate_appearances, only: %i[create update destroy] do
    collection do
      get 'by_game/:game_result_id', action: :by_game
    end
  end

  # マスタAPI
  resources :stadiums, only: %i[index create]
  resources :pitch_types, only: %i[index]
  resources :contact_qualities, only: %i[index]
  resources :timings, only: %i[index]
  resources :hit_depths, only: %i[index]

  # hit_directions: 既存 stats#hit_directions と区別するため masters 名前空間
  resources :hit_directions, only: %i[index]

  # 分析API（無料/Pro 共通エンドポイント、内部で認可ガード）
  resource :stats, only: [], controller: 'stats' do
    # 既存（変更なし）
    get :hit_directions, on: :member
    get :plate_appearance_breakdown, on: :member
    get :batting, on: :member
    get :pitching, on: :member
    get :era_trend, on: :member
    get :game_summary, on: :member

    # 新規: 無料
    get :batted_ball_types, on: :member          # D-1
    get :in_scoring_position, on: :member        # B-1

    # 新規: Pro
    get :hit_depths, on: :member                 # A-3
    get :hit_type_depth_matrix, on: :member      # A-4
    get :first_pitch_swing, on: :member          # B-2
    get :ahead_in_count, on: :member             # B-3
    get :behind_in_count, on: :member            # B-4
    get :contact_qualities, on: :member          # C-1
    get :timings, on: :member                    # C-2
    get :contact_quality_results, on: :member    # C-3
    get :go_ao_ratio, on: :member                # D-2
    get :pitch_types, on: :member                # E-1
    get :pitch_type_directions, on: :member      # E-2
    get :innings, on: :member                    # F-1
    get :stadiums, on: :member                   # F-2
  end
end
```

---

## 3. 打席記録 CRUD

### 3.1 POST `/api/v2/plate_appearances`

1打席を新規作成（**1打席完了ボタンでリアルタイム送信**）。

**認証**: 必須

**リクエスト**:

```json
{
  "plate_appearance": {
    "game_result_id": 123,
    "batter_box_number": 1,
    "plate_result_id": 7,
    "out_type": null,
    "hit_type": 1,
    "hit_direction_id": 10,
    "hit_location_x": 0.4823,
    "hit_location_y": 0.6712,
    "rbi": 1,
    "run_scored": 0,
    "stolen_bases": 0,
    "caught_stealing": 0,
    "final_balls": 2,
    "final_strikes": 1,
    "final_outs": 1,
    "first_pitch_swing": false,
    "runners_state": 2,
    "inning": 3,
    "contact_quality_id": 1,
    "timing_id": 1,
    "pitch_type_id": 5,
    "hit_depth_id": 2,
    "self_analysis_memo": "外角低めをうまく逆方向へ",
    "opponent_memo": "右投手、スライダー多め"
  }
}
```

**任意フィールド**:
- `hit_location_x/y`: タップ不要結果（三振など）では null
- `out_type` / `hit_type`: 結果に応じてどちらか1つだけ入る
- 詳細データ系 (`final_*`, `first_pitch_swing`, `runners_state`, `inning`, `*_id`, メモ): すべて任意

**レスポンス**: 201 Created

```json
{
  "id": 4567,
  "game_result_id": 123,
  "user_id": 45,
  "batter_box_number": 1,
  "batting_result": "中安",
  "plate_result_id": 7,
  "hit_type": "single",
  "out_type": null,
  "hit_direction_id": 10,
  "hit_location_x": "0.4823",
  "hit_location_y": "0.6712",
  "rbi": 1,
  "run_scored": 0,
  "stolen_bases": 0,
  "caught_stealing": 0,
  "final_balls": 2,
  "final_strikes": 1,
  "final_outs": 1,
  "first_pitch_swing": false,
  "runners_state": "second",
  "inning": 3,
  "contact_quality": { "id": 1, "name": "真芯" },
  "timing": { "id": 1, "name": "ドンピシャ" },
  "pitch_type": { "id": 5, "name": "スライダー系" },
  "hit_depth": { "id": 2, "name": "外野" },
  "self_analysis_memo": "外角低めをうまく逆方向へ",
  "opponent_memo": "右投手、スライダー多め",
  "created_at": "2026-05-17T12:34:56Z",
  "updated_at": "2026-05-17T12:34:56Z"
}
```

**サーバー側処理**:
1. `batting_result` 表示テキストをサーバー側で自動生成して保存（例: `中安`、`三ゴロ`、`左本`）
2. `after_commit` で `batting_average` を自動再計算

**エラー**:
- 401: 未認証
- 422: バリデーションエラー（`{ "errors": ["..."] }`）

### 3.2 PATCH `/api/v2/plate_appearances/:id`

打席の編集（詳細データの後追記含む）。

**認証**: 必須（自分の打席のみ更新可）

**リクエスト**: POST と同じフィールドを部分更新

**レスポンス**: 200 OK（POST と同形式）

**エラー**:
- 401: 未認証
- 403: 他ユーザーの打席を編集しようとした場合
- 404: 該当打席なし
- 422: バリデーションエラー

### 3.3 DELETE `/api/v2/plate_appearances/:id`

打席削除。

**認証**: 必須

**レスポンス**: 200 OK
```json
{ "message": "打席結果を削除しました" }
```

**サーバー側処理**:
1. `after_commit` で `batting_average` を自動再計算

### 3.4 GET `/api/v2/plate_appearances/by_game/:game_result_id`

特定試合の打席一覧。

**認証**: 必須

**非公開ガード**: 他ユーザーの試合は `profile_visible_to?` で判定

**レスポンス**: 200 OK
```json
{
  "plate_appearances": [
    { /* 3.1 と同じ形式 */ }
  ]
}
```

`batter_box_number` 昇順で返却。

---

## 4. マスタ API

### 4.1 GET `/api/v2/stadiums`

**認証**: 必須

**クエリパラメータ**:
- `q` (string, 任意): 球場名の部分一致検索
- `prefecture_id` (integer, 任意): 都道府県絞り込み
- `per_page` (integer, default: 20)

**レスポンス**:
```json
{
  "stadiums": [
    {
      "id": 1,
      "name": "東京ドーム",
      "prefecture": { "id": 13, "name": "東京都" }
    }
  ],
  "pagination": { /* 共通形式 */ }
}
```

### 4.2 POST `/api/v2/stadiums`

ユーザーによる球場マスタ追加（チームAPIと同様）。

**認証**: 必須

**リクエスト**:
```json
{
  "stadium": {
    "name": "○○野球場",
    "prefecture_id": 13
  }
}
```

**レスポンス**: 201 Created
```json
{
  "id": 42,
  "name": "○○野球場",
  "prefecture": { "id": 13, "name": "東京都" }
}
```

サーバー側で `created_by_user_id = current_api_v1_user.id` を自動設定。

### 4.3 GET `/api/v2/pitch_types`

**認証**: 必須

**レスポンス**:
```json
{
  "pitch_types": [
    { "id": 1, "name": "ストレート系", "display_order": 1 },
    { "id": 2, "name": "ツーシーム系", "display_order": 2 }
  ]
}
```

`display_order` 昇順で返却。

### 4.4 GET `/api/v2/contact_qualities` / `/api/v2/timings` / `/api/v2/hit_depths`

同様のフォーマット。各マスタの全件を `display_order` 昇順で返却。

### 4.5 GET `/api/v2/hit_directions`

**ゾーン定義込み** で返却。新規UIの「タップ座標 → 方向ID 自動判定」用。

**認証**: 必須

**レスポンス**:
```json
{
  "hit_directions": [
    {
      "id": 1,
      "name": "投",
      "zone_polygon": [
        { "x": 0.45, "y": 0.30 },
        { "x": 0.55, "y": 0.30 },
        { "x": 0.55, "y": 0.50 },
        { "x": 0.45, "y": 0.50 }
      ]
    }
  ]
}
```

**注意**: 既存の `/api/v2/stats/hit_directions` （分析API）と区別する。

---

## 5. 分析 API

### 5.1 共通クエリパラメータ

すべての分析エンドポイントで以下を受け付ける（既存 stats API と同等）:

| パラメータ | 型 | 説明 |
|----------|-----|------|
| `year` | string | 年度フィルタ（`通算` で無効化） |
| `match_type` | string | 試合種別（`全て` で無効化） |
| `season_id` | integer | シーズンID |
| `tournament_id` | integer | 大会ID |

### 5.2 無料: GET `/api/v2/stats/in_scoring_position`（B-1 得点圏打率）

**認証**: 必須 / Pro: 不要

**レスポンス**:
```json
{
  "in_scoring_position": {
    "at_bats": 23,
    "hits": 8,
    "batting_average": 0.348,
    "rbi": 12,
    "home_runs": 1
  },
  "non_scoring_position": {
    "at_bats": 56,
    "hits": 18,
    "batting_average": 0.321
  }
}
```

### 5.3 無料: GET `/api/v2/stats/batted_ball_types`（D-1 打球種類比率）

**認証**: 必須 / Pro: 不要

**レスポンス**:
```json
{
  "ground_out": 12,
  "fly_out": 8,
  "line_out": 3,
  "double_play": 2,
  "foul_fly": 1,
  "total": 26
}
```

### 5.4 Pro: GET `/api/v2/stats/hit_depths`（A-3 深さ分析）

**認証**: 必須 / Pro: 必要

**レスポンス**:
```json
{
  "results": [
    { "hit_depth": { "id": 1, "name": "内野" }, "at_bats": 10, "hits": 2 },
    { "hit_depth": { "id": 2, "name": "外野" }, "at_bats": 30, "hits": 12 },
    { "hit_depth": { "id": 3, "name": "フェンス際" }, "at_bats": 5, "hits": 4 }
  ]
}
```

### 5.5 Pro: GET `/api/v2/stats/hit_type_depth_matrix`（A-4 クロスマトリクス）

**レスポンス**:
```json
{
  "matrix": [
    {
      "hit_type": "ground_out",
      "by_depth": [
        { "depth_id": 1, "count": 8 },
        { "depth_id": 2, "count": 4 }
      ]
    }
  ]
}
```

### 5.6 Pro: GET `/api/v2/stats/first_pitch_swing`（B-2 初球打率）

**レスポンス**:
```json
{
  "first_pitch_swing": {
    "at_bats": 15,
    "hits": 7,
    "batting_average": 0.467
  },
  "non_first_pitch_swing": {
    "at_bats": 64,
    "hits": 19,
    "batting_average": 0.297
  }
}
```

### 5.7 Pro: GET `/api/v2/stats/ahead_in_count`（B-3 ボール先行時打率）

判定: `final_balls > final_strikes`

**レスポンス**: B-2 と同形式

### 5.8 Pro: GET `/api/v2/stats/behind_in_count`（B-4 追い込まれ打率）

判定: `final_strikes = 2`

**レスポンス**: B-2 と同形式

### 5.9 Pro: GET `/api/v2/stats/contact_qualities`（C-1 打球の質グラフ）

**レスポンス**:
```json
{
  "results": [
    {
      "contact_quality": { "id": 1, "name": "真芯" },
      "count": 12,
      "at_bats": 12,
      "hits": 10,
      "batting_average": 0.833
    }
  ]
}
```

### 5.10 Pro: GET `/api/v2/stats/timings`（C-2 タイミンググラフ）

C-1 と同形式（マスタが timings になる）。

### 5.11 Pro: GET `/api/v2/stats/contact_quality_results`（C-3 クロス）

打球の質×結果のクロス集計。詳細フォーマットは実装時に確定。

### 5.12 Pro: GET `/api/v2/stats/go_ao_ratio`（D-2 GO/AO比率）

**レスポンス**:
```json
{
  "ground_outs": 12,
  "air_outs": 9,
  "go_ao_ratio": 1.33
}
```

`air_outs` = `fly_out` + `line_out` + `foul_fly`

### 5.13 Pro: GET `/api/v2/stats/pitch_types`（E-1 球種別打率）

**レスポンス**:
```json
{
  "results": [
    {
      "pitch_type": { "id": 1, "name": "ストレート系" },
      "at_bats": 30,
      "hits": 11,
      "batting_average": 0.367,
      "slugging_percentage": 0.500
    }
  ]
}
```

### 5.14 Pro: GET `/api/v2/stats/pitch_type_directions`（E-2 球種別打球分布）

球種ごとの打球方向ヒートマップ用データ。

**レスポンス**:
```json
{
  "results": [
    {
      "pitch_type": { "id": 1, "name": "ストレート系" },
      "directions": [
        { "direction_id": 10, "count": 5 },
        { "direction_id": 8, "count": 3 }
      ]
    }
  ]
}
```

### 5.15 Pro: GET `/api/v2/stats/innings`（F-1 イニング別打率）

**レスポンス**:
```json
{
  "results": [
    { "inning": 1, "at_bats": 12, "hits": 4, "batting_average": 0.333 },
    { "inning": 2, "at_bats": 10, "hits": 3, "batting_average": 0.300 }
  ]
}
```

### 5.16 Pro: GET `/api/v2/stats/stadiums`（F-2 球場別成績）

**レスポンス**: 2試合以上の球場のみ返却

```json
{
  "results": [
    {
      "stadium": { "id": 1, "name": "東京ドーム" },
      "games": 3,
      "at_bats": 12,
      "hits": 5,
      "home_runs": 1,
      "batting_average": 0.417
    }
  ]
}
```

---

## 6. Pro 機能の認可ガード

### 6.1 実装方針

既存 Pro PRD（`pro-plan-prd/01-system-architecture.md`）の実装パターンに揃える。本Docでは仮インターフェースのみ示す:

```ruby
module Api
  module V2
    class StatsController < ApplicationController
      PRO_ACTIONS = %i[
        hit_depths hit_type_depth_matrix
        first_pitch_swing ahead_in_count behind_in_count
        contact_qualities timings contact_quality_results
        go_ao_ratio pitch_types pitch_type_directions
        innings stadiums
      ].freeze

      before_action :authenticate_api_v1_user!
      before_action :require_pro_plan!, only: PRO_ACTIONS

      private

      def require_pro_plan!
        return if current_api_v1_user.pro_active?
        render json: { error: 'Pro プラン契約が必要です' }, status: :payment_required
      end
    end
  end
end
```

**注意**: `current_api_v1_user.pro_active?` の具体実装は既存 Pro PRD に従う。本 Doc 範囲外。

### 6.2 レスポンス（Pro 未契約時）

- HTTP 402 Payment Required
- `{ "error": "Pro プラン契約が必要です" }`
- フロント側で Pro 訴求モーダルを表示

---

## 7. シリアライザ

### 7.1 `V2::PlateAppearanceSerializer`

```ruby
module V2
  class PlateAppearanceSerializer < ActiveModel::Serializer
    attributes :id, :game_result_id, :user_id,
               :batter_box_number, :batting_result,
               :plate_result_id, :hit_direction_id,
               :hit_location_x, :hit_location_y,
               :out_type, :hit_type,
               :rbi, :run_scored, :stolen_bases, :caught_stealing,
               :final_balls, :final_strikes, :final_outs,
               :first_pitch_swing, :runners_state, :inning,
               :self_analysis_memo, :opponent_memo,
               :has_detail_data,
               :created_at, :updated_at

    has_one :contact_quality, serializer: V2::ContactQualitySerializer
    has_one :timing, serializer: V2::TimingSerializer
    has_one :pitch_type, serializer: V2::PitchTypeSerializer
    has_one :hit_depth, serializer: V2::HitDepthSerializer

    # 「詳細未入力」バッジ判定用
    def has_detail_data
      object.contact_quality_id.present? ||
        object.timing_id.present? ||
        object.pitch_type_id.present? ||
        object.hit_depth_id.present? ||
        object.final_balls.present? ||
        object.first_pitch_swing.present? ||
        object.runners_state.present? ||
        object.inning.present? ||
        object.self_analysis_memo.present? ||
        object.opponent_memo.present?
    end
  end
end
```

### 7.2 マスタ系シリアライザ

```ruby
module V2
  class StadiumSerializer < ActiveModel::Serializer
    attributes :id, :name
    has_one :prefecture
  end

  class PitchTypeSerializer < ActiveModel::Serializer
    attributes :id, :name, :display_order
  end

  class ContactQualitySerializer < ActiveModel::Serializer
    attributes :id, :name, :display_order
  end

  class TimingSerializer < ActiveModel::Serializer
    attributes :id, :name, :display_order
  end

  class HitDepthSerializer < ActiveModel::Serializer
    attributes :id, :name, :display_order
  end

  class HitDirectionSerializer < ActiveModel::Serializer
    attributes :id, :name, :zone_polygon
  end
end
```

---

## 8. サービスオブジェクト

### 8.1 `Stats::BattingResultTextGenerator`

`batting_result` 表示テキストをサーバー側で生成。

```ruby
class Stats::BattingResultTextGenerator
  # @param plate_appearance [PlateAppearance]
  # @return [String] 例: "中安"、"三ゴロ"、"左本"
  def self.generate(plate_appearance)
    # plate_result_id / out_type / hit_type / hit_direction_id から生成
  end
end
```

`PlateAppearance` モデルの `before_save` で呼び出して保存。

### 8.2 `Stats::SituationalBattingAggregator`

状況別打率（B-1〜B-4）の集計。

```ruby
class Stats::SituationalBattingAggregator
  def initialize(user:, situation:, **filters)
    @user = user
    @situation = situation  # :in_scoring_position | :first_pitch_swing | :ahead_in_count | :behind_in_count
    @filters = filters
  end

  def call
    scope = base_scope
    case @situation
    when :in_scoring_position then scope.in_scoring_position
    when :first_pitch_swing   then scope.first_pitch_swung
    when :ahead_in_count      then scope.ahead_in_count
    when :behind_in_count     then scope.behind_in_count
    end.then { |s| compute_stats(s) }
  end
end
```

### 8.3 既存 `Stats::BattingAverageRecalculator`

`01-data-model.md` §5 を参照。

---

## 9. v1 API の扱い

### 9.1 既存 `/api/v1/plate_appearances` の維持

- 既存エンドポイント・パラメータは **そのまま残す**（後方互換）
- 既存 web/mobile の旧画面が引き続き動作することを保証
- 新仕様の画面は v2 を使用

### 9.2 v1 と v2 のデータ共存

- 同じ `plate_appearances` テーブルを参照
- v1 で作成された打席（新カラム null）は v2 でも `has_detail_data = false` として返却
- v2 で作成された打席（新カラム入り）も v1 で参照可能（新カラムは無視される）

---

## 10. 既存データ保全の API レベル検証

- v2 エンドポイント追加によって v1 の挙動が変わらないこと
- v2 で打席を保存しても、既存 `batting_average` レコードを **改変しない**（既存試合のみ）
- マスタAPIは新規追加のみで既存マスタ（`plate_results`, `hit_directions`）の値を変えない

### RSpec 例

```ruby
RSpec.describe 'Api::V2::PlateAppearances', type: :request do
  context '既存試合に v2 で打席追加した時' do
    it '既存 batting_average の値を改変しない' do
      # 既存試合の batting_average を作成
      # v2 で同じ game_result に打席追加（新カラムなし）
      # → batting_average は変わらない
    end

    it '新仕様で打席追加すると batting_average が再計算される' do
      # ...
    end
  end
end
```
