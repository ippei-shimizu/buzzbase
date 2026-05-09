# 成績ページ実装計画

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** モバイルアプリのRecordタブを成績ページに差し替え、打球分布図・成績テーブル・試合統計を表示する

**Architecture:** バックエンドに成績集計用の新APIエンドポイント群を追加し、モバイルアプリに新しい成績ページUIを構築する。既存の打球方向データ（9方向）を13方向に拡張するDBマイグレーションを含む。

**Tech Stack:** Rails API (Ruby), React Native (Expo), react-native-svg, @tanstack/react-query, Zustand

**設計書:** `docs/superpowers/specs/2026-04-03-stats-page-design.md`

---

## ファイル構成

### バックエンド（back/）

```
db/migrate/
  XXXXXX_remap_batting_position_ids.rb           # 既存データのID再マッピング

app/controllers/api/v2/stats_controller.rb        # 成績集計API

app/services/stats/
  hit_direction_aggregator.rb                     # 打球方向集計
  plate_appearance_breakdown_service.rb           # 打席結果内訳
  batting_stats_table_service.rb                  # 打撃成績テーブル（年/月/日）
  pitching_stats_table_service.rb                 # 投球成績テーブル（年/月/日）
  game_summary_service.rb                         # 試合結果統計

config/routes.rb                                  # ルーティング追加

spec/requests/api/v2/stats_spec.rb                # APIテスト
spec/services/stats/                              # サービステスト
```

### モバイル（mobile/）

```
constants/battingData.ts                          # 修正: 13方向に拡張

types/stats.ts                                    # 新規: 成績ページ用型定義

services/statsService.ts                          # 新規: 成績API呼び出し

hooks/useStats.ts                                 # 新規: React Queryフック

components/stats/
  SprayChart.tsx                                  # 打球分布図（バブルチャート）
  PlateAppearanceDonut.tsx                        # 打席結果内訳（ドーナツ）
  StatsTable.tsx                                  # 成績テーブル（打撃・投球共用）
  PeriodToggle.tsx                                # 年/月/日切り替え
  GameResultSummary.tsx                           # 試合結果統計セクション
  WinLossCards.tsx                                # 勝敗カード + 勝率バー
  MatchTypeBreakdown.tsx                          # 試合種別
  MonthlyGameChart.tsx                            # 月別試合数棒グラフ
  OpponentRecord.tsx                              # 対戦相手別勝敗
  StatsFilters.tsx                                # フィルタUI（年度・種別・シーズン）

app/(tabs)/stats.tsx                              # 新規: 成績ページ（recordを差し替え）
app/(tabs)/_layout.tsx                            # 修正: タブ差し替え
```

---

## Task 1: バックエンド — batting_position_id マイグレーション

**Files:**
- Create: `back/db/migrate/XXXXXX_remap_batting_position_ids.rb`

既存の打球方向ID（7=左, 8=中, 9=右）を新体系（8=左, 10=中, 12=右）に再マッピングし、新しい4方向のスペースを確保する。

**新しいID体系:**

| 旧ID | 旧ラベル | 新ID | 新ラベル |
|------|---------|------|---------|
| 1 | 投 | 1 | 投 |
| 2 | 捕 | 2 | 捕 |
| 3 | 一 | 3 | 一 |
| 4 | 二 | 4 | 二 |
| 5 | 三 | 5 | 三 |
| 6 | 遊 | 6 | 遊 |
| 7 | 左 | 8 | 左 |
| 8 | 中 | 10 | 中 |
| 9 | 右 | 12 | 右 |
| — | — | 7 | 左線（三塁線） |
| — | — | 9 | 左中（左中間） |
| — | — | 11 | 右中（右中間） |
| — | — | 13 | 右線（一塁線） |

- [ ] **Step 1: マイグレーションファイルを作成**

```bash
docker compose exec back bundle exec rails generate migration RemapBattingPositionIds
```

- [ ] **Step 2: マイグレーション内容を記述**

```ruby
# back/db/migrate/XXXXXX_remap_batting_position_ids.rb
class RemapBattingPositionIds < ActiveRecord::Migration[7.0]
  def up
    # 衝突を避けるため、大きい番号から順に更新
    # 9(右) → 12
    execute "UPDATE plate_appearances SET batting_position_id = 12 WHERE batting_position_id = 9"
    # 8(中) → 10
    execute "UPDATE plate_appearances SET batting_position_id = 10 WHERE batting_position_id = 8"
    # 7(左) → 8
    execute "UPDATE plate_appearances SET batting_position_id = 8 WHERE batting_position_id = 7"
  end

  def down
    execute "UPDATE plate_appearances SET batting_position_id = 7 WHERE batting_position_id = 8"
    execute "UPDATE plate_appearances SET batting_position_id = 8 WHERE batting_position_id = 10"
    execute "UPDATE plate_appearances SET batting_position_id = 9 WHERE batting_position_id = 12"
  end
end
```

- [ ] **Step 3: マイグレーション実行**

```bash
docker compose exec back bundle exec rails db:migrate
```

- [ ] **Step 4: データ確認**

```bash
docker compose exec back bundle exec rails runner "
  puts 'ID分布:'
  PlateAppearance.group(:batting_position_id).count.sort.each { |id, c| puts \"  ID #{id}: #{c}件\" }
  puts '旧ID(7,8,9)の残存: ' + PlateAppearance.where(batting_position_id: [7, 8, 9]).count.to_s + '件（0であること）'
"
```

Expected: 旧ID 7,8,9 は0件。新ID 8,10,12 にデータが移動。

- [ ] **Step 5: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/back add -A
git -C /Users/shimizuippei/projects/dev/buzzbase/back commit -m "Fix: batting_position_idを新13方向体系にリマッピング"
```

---

## Task 2: バックエンド — 成績集計サービス群

**Files:**
- Create: `back/app/services/stats/hit_direction_aggregator.rb`
- Create: `back/app/services/stats/plate_appearance_breakdown_service.rb`
- Create: `back/app/services/stats/batting_stats_table_service.rb`
- Create: `back/app/services/stats/pitching_stats_table_service.rb`
- Create: `back/app/services/stats/game_summary_service.rb`

- [ ] **Step 1: servicesディレクトリ作成**

```bash
docker compose exec back mkdir -p app/services/stats
```

- [ ] **Step 2: 打球方向集計サービス**

```ruby
# back/app/services/stats/hit_direction_aggregator.rb
module Stats
  class HitDirectionAggregator
    DIRECTIONS = {
      1 => "投", 2 => "捕", 3 => "一", 4 => "二", 5 => "三", 6 => "遊",
      7 => "左線", 8 => "左", 9 => "左中", 10 => "中",
      11 => "右中", 12 => "右", 13 => "右線"
    }.freeze

    def initialize(user_id:, year: nil, match_type: nil, season_id: nil)
      @user_id = user_id
      @year = year
      @match_type = match_type
      @season_id = season_id
    end

    def call
      pa = PlateAppearance.joins(game_result: :match_result)
                          .where(user_id: @user_id)
                          .where.not(batting_position_id: [0, nil])

      pa = pa.where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", @year) if @year.present?
      pa = pa.where(match_results: { match_type: @match_type }) if @match_type.present? && @match_type != "全て"
      pa = pa.where(game_results: { season_id: @season_id }) if @season_id.present?

      counts = pa.group(:batting_position_id).count

      DIRECTIONS.map do |id, label|
        { id: id, label: label, count: counts[id] || 0 }
      end
    end
  end
end
```

- [ ] **Step 3: 打席結果内訳サービス**

```ruby
# back/app/services/stats/plate_appearance_breakdown_service.rb
module Stats
  class PlateAppearanceBreakdownService
    CATEGORIES = {
      "安打" => [7, 8, 9, 10],
      "ゴロ" => [1],
      "フライ" => [2, 3, 4],
      "三振" => [13, 14],
      "四死球" => [15, 16],
      "その他" => [5, 6, 11, 12, 17, 18, 19]
    }.freeze

    def initialize(user_id:, year: nil, match_type: nil, season_id: nil)
      @user_id = user_id
      @year = year
      @match_type = match_type
      @season_id = season_id
    end

    def call
      pa = PlateAppearance.joins(game_result: :match_result)
                          .where(user_id: @user_id)
                          .where.not(plate_result_id: [0, nil])

      pa = pa.where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", @year) if @year.present?
      pa = pa.where(match_results: { match_type: @match_type }) if @match_type.present? && @match_type != "全て"
      pa = pa.where(game_results: { season_id: @season_id }) if @season_id.present?

      result_counts = pa.group(:plate_result_id).count
      total = result_counts.values.sum

      CATEGORIES.map do |category, result_ids|
        count = result_ids.sum { |id| result_counts[id] || 0 }
        {
          category: category,
          count: count,
          percentage: total > 0 ? (count.to_f / total * 100).round(1) : 0.0
        }
      end
    end
  end
end
```

- [ ] **Step 4: 打撃成績テーブルサービス**

```ruby
# back/app/services/stats/batting_stats_table_service.rb
module Stats
  class BattingStatsTableService
    def initialize(user_id:, period: "yearly", year: nil)
      @user_id = user_id
      @period = period
      @year = year
    end

    def call
      case @period
      when "yearly" then yearly_stats
      when "monthly" then monthly_stats
      when "daily" then daily_stats
      end
    end

    private

    def yearly_stats
      years = MatchResult.joins(game_result: :batting_average)
                         .where(game_results: { user_id: @user_id })
                         .select("DISTINCT EXTRACT(YEAR FROM date_and_time) AS year")
                         .map { |r| r.year.to_i }
                         .sort

      rows = years.map { |y| build_batting_row(y.to_s, year: y) }
      rows << build_career_total_row if rows.any?
      rows
    end

    def monthly_stats
      return [] unless @year

      months = MatchResult.joins(game_result: :batting_average)
                          .where(game_results: { user_id: @user_id })
                          .where("EXTRACT(YEAR FROM date_and_time) = ?", @year)
                          .select("DISTINCT EXTRACT(MONTH FROM date_and_time) AS month")
                          .map { |r| r.month.to_i }
                          .sort

      rows = months.map { |m| build_batting_row("#{m}月", year: @year, month: m) }
      rows << build_year_total_row if rows.any?
      rows
    end

    def daily_stats
      return [] unless @year

      game_results = GameResult.includes(:match_result, :batting_average)
                               .where(user_id: @user_id)
                               .joins(:match_result)
                               .where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", @year)
                               .order("match_results.date_and_time ASC")

      rows = game_results.filter_map do |gr|
        next unless gr.batting_average
        ba = gr.batting_average
        mr = gr.match_result
        date_label = mr.date_and_time.strftime("%-m/%-d")
        opponent = mr.respond_to?(:opponent_team_name) ? mr.opponent_team_name : ""
        label = "#{date_label} vs #{opponent}"
        build_row_from_batting_average(label, ba, 1)
      end
      rows << build_year_total_row if rows.any?
      rows
    end

    def build_batting_row(label, year: nil, month: nil)
      scope = BattingAverage.joins(game_result: :match_result)
                            .where(game_results: { user_id: @user_id })
      scope = scope.where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", year) if year
      scope = scope.where("EXTRACT(MONTH FROM match_results.date_and_time) = ?", month) if month

      agg = scope.select(
        "COUNT(*) as games",
        "SUM(plate_appearances) as plate_appearances",
        "SUM(at_bats) as at_bats",
        "SUM(hit) as hit",
        "SUM(two_base_hit) as two_base_hit",
        "SUM(three_base_hit) as three_base_hit",
        "SUM(home_run) as home_run",
        "SUM(total_bases) as total_bases",
        "SUM(runs_batted_in) as runs_batted_in",
        "SUM(run) as run",
        "SUM(strike_out) as strike_out",
        "SUM(base_on_balls) as base_on_balls",
        "SUM(hit_by_pitch) as hit_by_pitch",
        "SUM(sacrifice_hit) as sacrifice_hit",
        "SUM(sacrifice_fly) as sacrifice_fly",
        "SUM(stealing_base) as stealing_base",
        "SUM(caught_stealing) as caught_stealing",
        "SUM(error) as error"
      ).take

      format_batting_row(label, agg)
    end

    def build_row_from_batting_average(label, ba, games)
      format_batting_row(label, ba, games_override: games)
    end

    def build_career_total_row
      build_batting_row("通算")
    end

    def build_year_total_row
      build_batting_row("通算", year: @year)
    end

    def format_batting_row(label, agg, games_override: nil)
      return nil unless agg

      at_bats = agg.at_bats.to_i
      hit = agg.hit.to_i
      two_base_hit = agg.two_base_hit.to_i
      three_base_hit = agg.three_base_hit.to_i
      home_run = agg.home_run.to_i
      total_bases = agg.total_bases.to_i
      bb = agg.base_on_balls.to_i
      hbp = agg.hit_by_pitch.to_i
      sf = agg.sacrifice_fly.to_i
      so = agg.strike_out.to_i
      pa = agg.plate_appearances.to_i

      batting_avg = at_bats > 0 ? (hit.to_f / at_bats).round(3) : 0.0
      slg = at_bats > 0 ? (total_bases.to_f / at_bats).round(3) : 0.0
      obp_denom = at_bats + bb + hbp + sf
      obp = obp_denom > 0 ? ((hit + bb + hbp).to_f / obp_denom).round(3) : 0.0
      ops = (obp + slg).round(3)
      iso = (slg - batting_avg).round(3)
      bb_k = so > 0 ? (bb.to_f / so).round(3) : 0.0
      # BABIP = (H - HR) / (AB - SO - HR + SF)
      babip_denom = at_bats - so - home_run + sf
      babip = babip_denom > 0 ? ((hit - home_run).to_f / babip_denom).round(3) : 0.0

      {
        label: label,
        games: games_override || (agg.respond_to?(:games) ? agg.games.to_i : 0),
        plate_appearances: pa,
        at_bats: at_bats,
        hit: hit,
        two_base_hit: two_base_hit,
        three_base_hit: three_base_hit,
        home_run: home_run,
        total_bases: total_bases,
        runs_batted_in: agg.runs_batted_in.to_i,
        run: agg.run.to_i,
        strike_out: so,
        base_on_balls: bb,
        hit_by_pitch: hbp,
        sacrifice_hit: agg.sacrifice_hit.to_i,
        sacrifice_fly: sf,
        stealing_base: agg.stealing_base.to_i,
        caught_stealing: agg.caught_stealing.to_i,
        error: agg.error.to_i,
        batting_average: batting_avg,
        slugging_percentage: slg,
        ops: ops,
        iso: iso,
        bb_per_k: bb_k,
        babip: babip
      }
    end
  end
end
```

- [ ] **Step 5: 投球成績テーブルサービス**

```ruby
# back/app/services/stats/pitching_stats_table_service.rb
module Stats
  class PitchingStatsTableService
    def initialize(user_id:, period: "yearly", year: nil)
      @user_id = user_id
      @period = period
      @year = year
    end

    def call
      case @period
      when "yearly" then yearly_stats
      when "monthly" then monthly_stats
      when "daily" then daily_stats
      end
    end

    private

    def yearly_stats
      years = MatchResult.joins(game_result: :pitching_result)
                         .where(game_results: { user_id: @user_id })
                         .select("DISTINCT EXTRACT(YEAR FROM date_and_time) AS year")
                         .map { |r| r.year.to_i }
                         .sort

      rows = years.map { |y| build_pitching_row(y.to_s, year: y) }
      rows << build_career_total_row if rows.any?
      rows
    end

    def monthly_stats
      return [] unless @year

      months = MatchResult.joins(game_result: :pitching_result)
                          .where(game_results: { user_id: @user_id })
                          .where("EXTRACT(YEAR FROM date_and_time) = ?", @year)
                          .select("DISTINCT EXTRACT(MONTH FROM date_and_time) AS month")
                          .map { |r| r.month.to_i }
                          .sort

      rows = months.map { |m| build_pitching_row("#{m}月", year: @year, month: m) }
      rows << build_year_total_row if rows.any?
      rows
    end

    def daily_stats
      return [] unless @year

      game_results = GameResult.includes(:match_result, :pitching_result)
                               .where(user_id: @user_id)
                               .joins(:match_result)
                               .where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", @year)
                               .order("match_results.date_and_time ASC")

      rows = game_results.filter_map do |gr|
        next unless gr.pitching_result
        pr = gr.pitching_result
        mr = gr.match_result
        date_label = mr.date_and_time.strftime("%-m/%-d")
        opponent = mr.respond_to?(:opponent_team_name) ? mr.opponent_team_name : ""
        label = "#{date_label} vs #{opponent}"
        build_row_from_pitching_result(label, pr, 1)
      end
      rows << build_year_total_row if rows.any?
      rows
    end

    def build_pitching_row(label, year: nil, month: nil)
      scope = PitchingResult.joins(game_result: :match_result)
                            .where(game_results: { user_id: @user_id })
      scope = scope.where("EXTRACT(YEAR FROM match_results.date_and_time) = ?", year) if year
      scope = scope.where("EXTRACT(MONTH FROM match_results.date_and_time) = ?", month) if month

      agg = scope.select(
        "COUNT(*) as appearances",
        "SUM(win) as win", "SUM(loss) as loss",
        "SUM(hold) as hold", "SUM(saves) as saves",
        "SUM(innings_pitched) as innings_pitched",
        "SUM(hits_allowed) as hits_allowed",
        "SUM(home_runs_hit) as home_runs_hit",
        "SUM(strikeouts) as strikeouts",
        "SUM(base_on_balls) as base_on_balls",
        "SUM(hit_by_pitch) as hit_by_pitch",
        "SUM(run_allowed) as run_allowed",
        "SUM(earned_run) as earned_run",
        "SUM(CASE WHEN got_to_the_distance THEN 1 ELSE 0 END) as complete_games"
      ).take

      format_pitching_row(label, agg)
    end

    def build_row_from_pitching_result(label, pr, appearances)
      format_pitching_row(label, pr, appearances_override: appearances)
    end

    def build_career_total_row
      build_pitching_row("通算")
    end

    def build_year_total_row
      build_pitching_row("通算", year: @year)
    end

    def format_pitching_row(label, agg, appearances_override: nil)
      return nil unless agg

      ip = agg.innings_pitched.to_f
      er = agg.earned_run.to_i
      ha = agg.hits_allowed.to_i
      bb = agg.base_on_balls.to_i
      so = agg.strikeouts.to_i
      w = agg.win.to_i
      l = agg.loss.to_i

      era = ip > 0 ? (er.to_f / ip * 9).round(2) : 0.0
      whip = ip > 0 ? ((ha + bb).to_f / ip).round(2) : 0.0
      k9 = ip > 0 ? (so.to_f / ip * 9).round(2) : 0.0
      bb9 = ip > 0 ? (bb.to_f / ip * 9).round(2) : 0.0
      k_bb = bb > 0 ? (so.to_f / bb).round(2) : 0.0
      win_pct = (w + l) > 0 ? (w.to_f / (w + l)).round(3) : 0.0

      {
        label: label,
        appearances: appearances_override || (agg.respond_to?(:appearances) ? agg.appearances.to_i : 0),
        win: w, loss: l,
        hold: agg.hold.to_i, saves: agg.saves.to_i,
        complete_games: agg.respond_to?(:complete_games) ? agg.complete_games.to_i : (agg.got_to_the_distance ? 1 : 0),
        shutouts: 0,
        innings_pitched: ip,
        hits_allowed: ha,
        home_runs_hit: agg.home_runs_hit.to_i,
        strikeouts: so,
        base_on_balls: bb,
        hit_by_pitch: agg.hit_by_pitch.to_i,
        earned_run: er,
        era: era, whip: whip, k_per_nine: k9, bb_per_nine: bb9,
        k_bb: k_bb, win_percentage: win_pct
      }
    end
  end
end
```

- [ ] **Step 6: 試合結果統計サービス**

```ruby
# back/app/services/stats/game_summary_service.rb
module Stats
  class GameSummaryService
    def initialize(user_id:, year: nil)
      @user_id = user_id
      @year = year
    end

    def call
      {
        win_loss: win_loss_summary,
        match_type_breakdown: match_type_breakdown,
        monthly_games: monthly_games,
        opponent_records: opponent_records
      }
    end

    private

    def base_scope
      scope = MatchResult.joins(:game_result).where(game_results: { user_id: @user_id })
      scope = scope.where("EXTRACT(YEAR FROM date_and_time) = ?", @year) if @year.present?
      scope
    end

    def win_loss_summary
      results = base_scope.pluck(:my_team_score, :opponent_team_score)
      wins = results.count { |my, opp| my > opp }
      losses = results.count { |my, opp| my < opp }
      draws = results.count { |my, opp| my == opp }
      total = results.size
      {
        wins: wins, losses: losses, draws: draws, total: total,
        win_rate: (wins + losses) > 0 ? (wins.to_f / (wins + losses)).round(3) : 0.0
      }
    end

    def match_type_breakdown
      ["公式戦", "オープン戦"].map do |mt|
        records = base_scope.where(match_type: mt).pluck(:my_team_score, :opponent_team_score)
        wins = records.count { |my, opp| my > opp }
        losses = records.count { |my, opp| my < opp }
        draws = records.count { |my, opp| my == opp }
        {
          match_type: mt, total: records.size,
          wins: wins, losses: losses, draws: draws,
          win_rate: (wins + losses) > 0 ? (wins.to_f / (wins + losses)).round(3) : 0.0
        }
      end
    end

    def monthly_games
      base_scope
        .group("EXTRACT(MONTH FROM date_and_time)")
        .count
        .map { |month, count| { month: month.to_i, count: count } }
        .sort_by { |r| r[:month] }
    end

    def opponent_records
      opponent_teams = base_scope.joins("INNER JOIN teams ON teams.id = match_results.opponent_team_id")
                                 .select("teams.name as team_name, match_results.my_team_score, match_results.opponent_team_score")

      grouped = opponent_teams.group_by(&:team_name)
      grouped.map do |name, records|
        wins = records.count { |r| r.my_team_score > r.opponent_team_score }
        losses = records.count { |r| r.my_team_score < r.opponent_team_score }
        draws = records.count { |r| r.my_team_score == r.opponent_team_score }
        { team_name: name, wins: wins, losses: losses, draws: draws, total: records.size }
      end.sort_by { |r| -r[:total] }
    end
  end
end
```

- [ ] **Step 7: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/back add app/services/stats/
git -C /Users/shimizuippei/projects/dev/buzzbase/back commit -m "Add: 成績集計サービス群を追加（打球方向・打席内訳・成績テーブル・試合統計）"
```

---

## Task 3: バックエンド — Stats APIコントローラー + ルーティング

**Files:**
- Create: `back/app/controllers/api/v2/stats_controller.rb`
- Modify: `back/config/routes.rb`

- [ ] **Step 1: コントローラー作成**

```ruby
# back/app/controllers/api/v2/stats_controller.rb
module Api
  module V2
    class StatsController < ApplicationController
      before_action :authenticate_api_v1_user!

      def hit_directions
        result = Stats::HitDirectionAggregator.new(
          user_id: target_user_id,
          year: params[:year],
          match_type: params[:match_type],
          season_id: params[:season_id]
        ).call

        render json: { directions: result }
      end

      def plate_appearance_breakdown
        result = Stats::PlateAppearanceBreakdownService.new(
          user_id: target_user_id,
          year: params[:year],
          match_type: params[:match_type],
          season_id: params[:season_id]
        ).call

        render json: { breakdown: result }
      end

      def batting
        result = Stats::BattingStatsTableService.new(
          user_id: target_user_id,
          period: params[:period] || "yearly",
          year: params[:year]
        ).call

        render json: { rows: result }
      end

      def pitching
        result = Stats::PitchingStatsTableService.new(
          user_id: target_user_id,
          period: params[:period] || "yearly",
          year: params[:year]
        ).call

        render json: { rows: result }
      end

      def game_summary
        result = Stats::GameSummaryService.new(
          user_id: target_user_id,
          year: params[:year]
        ).call

        render json: result
      end

      private

      def target_user_id
        params[:user_id] || current_api_v1_user.id
      end
    end
  end
end
```

- [ ] **Step 2: ルーティング追加**

`back/config/routes.rb` の `namespace :v2` ブロック内に追加:

```ruby
# namespace :v2 do ブロック内、既存のresource :dashboardの後に追加
resource :stats, only: [], controller: 'stats' do
  get :hit_directions, on: :member
  get :plate_appearance_breakdown, on: :member
  get :batting, on: :member
  get :pitching, on: :member
  get :game_summary, on: :member
end
```

- [ ] **Step 3: ルーティング確認**

```bash
docker compose exec back bundle exec rails routes | grep stats
```

Expected:
```
hit_directions_stats GET /api/v2/stats/hit_directions
plate_appearance_breakdown_stats GET /api/v2/stats/plate_appearance_breakdown
batting_stats GET /api/v2/stats/batting
pitching_stats GET /api/v2/stats/pitching
game_summary_stats GET /api/v2/stats/game_summary
```

- [ ] **Step 4: APIの動作確認（Railsコンソール）**

```bash
docker compose exec back bundle exec rails runner "
  user = User.first
  puts '=== Hit Directions ==='
  puts Stats::HitDirectionAggregator.new(user_id: user.id).call.inspect
  puts '=== PA Breakdown ==='
  puts Stats::PlateAppearanceBreakdownService.new(user_id: user.id).call.inspect
  puts '=== Batting Yearly ==='
  puts Stats::BattingStatsTableService.new(user_id: user.id, period: 'yearly').call.length.to_s + ' rows'
  puts '=== Game Summary ==='
  puts Stats::GameSummaryService.new(user_id: user.id).call.inspect
"
```

- [ ] **Step 5: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/back add app/controllers/api/v2/stats_controller.rb config/routes.rb
git -C /Users/shimizuippei/projects/dev/buzzbase/back commit -m "Add: 成績集計APIエンドポイントを追加（v2/stats）"
```

---

## Task 4: バックエンド — APIリクエストスペック

**Files:**
- Create: `back/spec/requests/api/v2/stats_spec.rb`

- [ ] **Step 1: テストファイル作成**

```ruby
# back/spec/requests/api/v2/stats_spec.rb
require 'rails_helper'

RSpec.describe "Api::V2::Stats", type: :request do
  let(:user) { create(:user) }
  let(:auth_headers) { user.create_new_auth_token }

  before do
    team = create(:team, name: "テストチーム")
    opponent = create(:team, name: "相手チーム")

    gr = create(:game_result, user: user)
    create(:match_result,
      game_result: gr, user: user,
      my_team_id: team.id, opponent_team_id: opponent.id,
      my_team_score: 5, opponent_team_score: 3,
      match_type: "公式戦", date_and_time: Time.zone.local(2025, 6, 15))
    create(:batting_average, game_result: gr, user: user, hit: 2, at_bats: 4, plate_appearances: 5)
    create(:plate_appearance, game_result: gr, user: user, batting_position_id: 8, plate_result_id: 7, batter_box_number: 1)
    create(:plate_appearance, game_result: gr, user: user, batting_position_id: 10, plate_result_id: 1, batter_box_number: 2)
  end

  describe "GET /api/v2/stats/hit_directions" do
    it "returns direction counts" do
      get "/api/v2/stats/hit_directions", headers: auth_headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["directions"]).to be_an(Array)
      expect(json["directions"].length).to eq(13)
    end
  end

  describe "GET /api/v2/stats/plate_appearance_breakdown" do
    it "returns category breakdown" do
      get "/api/v2/stats/plate_appearance_breakdown", headers: auth_headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["breakdown"]).to be_an(Array)
      expect(json["breakdown"].map { |b| b["category"] }).to include("安打", "ゴロ")
    end
  end

  describe "GET /api/v2/stats/batting" do
    it "returns yearly batting stats" do
      get "/api/v2/stats/batting", params: { period: "yearly" }, headers: auth_headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["rows"]).to be_an(Array)
      expect(json["rows"].last["label"]).to eq("通算")
    end
  end

  describe "GET /api/v2/stats/pitching" do
    it "returns yearly pitching stats" do
      get "/api/v2/stats/pitching", params: { period: "yearly" }, headers: auth_headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json["rows"]).to be_an(Array)
    end
  end

  describe "GET /api/v2/stats/game_summary" do
    it "returns game summary" do
      get "/api/v2/stats/game_summary", headers: auth_headers
      expect(response).to have_http_status(:ok)
      json = JSON.parse(response.body)
      expect(json).to have_key("win_loss")
      expect(json).to have_key("match_type_breakdown")
      expect(json).to have_key("monthly_games")
      expect(json).to have_key("opponent_records")
    end
  end
end
```

- [ ] **Step 2: テスト実行**

```bash
docker compose exec back bundle exec rspec spec/requests/api/v2/stats_spec.rb
```

Expected: 5 examples, 0 failures（factoryが不足している場合は調整が必要）

- [ ] **Step 3: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/back add spec/requests/api/v2/
git -C /Users/shimizuippei/projects/dev/buzzbase/back commit -m "Test: 成績集計APIのリクエストスペックを追加"
```

---

## Task 5: モバイル — 打球方向定数を13方向に拡張

**Files:**
- Modify: `mobile/constants/battingData.ts`

- [ ] **Step 1: battingResultsPositionsを更新**

`mobile/constants/battingData.ts` の `battingResultsPositions` を以下に置き換え:

```typescript
export const battingResultsPositions = [
  { id: 0, label: "-" },
  { id: 1, label: "投" },
  { id: 2, label: "捕" },
  { id: 3, label: "一" },
  { id: 4, label: "二" },
  { id: 5, label: "三" },
  { id: 6, label: "遊" },
  { id: 7, label: "左線" },
  { id: 8, label: "左" },
  { id: 9, label: "左中" },
  { id: 10, label: "中" },
  { id: 11, label: "右中" },
  { id: 12, label: "右" },
  { id: 13, label: "右線" },
];
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

Expected: エラーなし（IDは数値なので型の影響なし）

- [ ] **Step 3: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add constants/battingData.ts
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Update: 打球方向を9方向から13方向に拡張"
```

---

## Task 6: モバイル — 成績ページ用の型定義 + サービス + フック

**Files:**
- Create: `mobile/types/stats.ts`
- Create: `mobile/services/statsService.ts`
- Create: `mobile/hooks/useStats.ts`

- [ ] **Step 1: 型定義**

```typescript
// mobile/types/stats.ts

export interface HitDirection {
  id: number;
  label: string;
  count: number;
}

export interface PlateAppearanceCategory {
  category: string;
  count: number;
  percentage: number;
}

export interface BattingStatsRow {
  label: string;
  games: number;
  plate_appearances: number;
  at_bats: number;
  hit: number;
  two_base_hit: number;
  three_base_hit: number;
  home_run: number;
  total_bases: number;
  runs_batted_in: number;
  run: number;
  strike_out: number;
  base_on_balls: number;
  hit_by_pitch: number;
  sacrifice_hit: number;
  sacrifice_fly: number;
  stealing_base: number;
  caught_stealing: number;
  error: number;
  batting_average: number;
  slugging_percentage: number;
  ops: number;
  iso: number;
  bb_per_k: number;
  babip: number;
}

export interface PitchingStatsRow {
  label: string;
  appearances: number;
  win: number;
  loss: number;
  hold: number;
  saves: number;
  complete_games: number;
  shutouts: number;
  innings_pitched: number;
  hits_allowed: number;
  home_runs_hit: number;
  strikeouts: number;
  base_on_balls: number;
  hit_by_pitch: number;
  earned_run: number;
  era: number;
  whip: number;
  k_per_nine: number;
  bb_per_nine: number;
  k_bb: number;
  win_percentage: number;
}

export interface WinLossSummary {
  wins: number;
  losses: number;
  draws: number;
  total: number;
  win_rate: number;
}

export interface MatchTypeRecord {
  match_type: string;
  total: number;
  wins: number;
  losses: number;
  draws: number;
  win_rate: number;
}

export interface MonthlyGame {
  month: number;
  count: number;
}

export interface OpponentRecord {
  team_name: string;
  wins: number;
  losses: number;
  draws: number;
  total: number;
}

export interface GameSummary {
  win_loss: WinLossSummary;
  match_type_breakdown: MatchTypeRecord[];
  monthly_games: MonthlyGame[];
  opponent_records: OpponentRecord[];
}

export type StatsPeriod = "yearly" | "monthly" | "daily";
```

- [ ] **Step 2: APIサービス**

```typescript
// mobile/services/statsService.ts
import axiosInstance from "@utils/axiosInstance";
import { API_BASE_URL } from "@constants/api";
import type {
  HitDirection,
  PlateAppearanceCategory,
  BattingStatsRow,
  PitchingStatsRow,
  GameSummary,
  StatsPeriod,
} from "../types/stats";
import type { StatsFilters } from "../types/profile";

const STATS_URL = `${API_BASE_URL}/api/v2/stats`;

export const getHitDirections = async (
  filters: StatsFilters,
): Promise<HitDirection[]> => {
  const params = new URLSearchParams();
  if (filters.year) params.append("year", filters.year);
  if (filters.matchType) params.append("match_type", filters.matchType);
  if (filters.seasonId) params.append("season_id", filters.seasonId);
  const res = await axiosInstance.get(`${STATS_URL}/hit_directions?${params}`);
  return res.data.directions;
};

export const getPlateAppearanceBreakdown = async (
  filters: StatsFilters,
): Promise<PlateAppearanceCategory[]> => {
  const params = new URLSearchParams();
  if (filters.year) params.append("year", filters.year);
  if (filters.matchType) params.append("match_type", filters.matchType);
  if (filters.seasonId) params.append("season_id", filters.seasonId);
  const res = await axiosInstance.get(
    `${STATS_URL}/plate_appearance_breakdown?${params}`,
  );
  return res.data.breakdown;
};

export const getBattingStatsTable = async (
  period: StatsPeriod,
  year?: string,
): Promise<BattingStatsRow[]> => {
  const params = new URLSearchParams();
  params.append("period", period);
  if (year) params.append("year", year);
  const res = await axiosInstance.get(`${STATS_URL}/batting?${params}`);
  return res.data.rows;
};

export const getPitchingStatsTable = async (
  period: StatsPeriod,
  year?: string,
): Promise<PitchingStatsRow[]> => {
  const params = new URLSearchParams();
  params.append("period", period);
  if (year) params.append("year", year);
  const res = await axiosInstance.get(`${STATS_URL}/pitching?${params}`);
  return res.data.rows;
};

export const getGameSummary = async (year?: string): Promise<GameSummary> => {
  const params = year ? `?year=${year}` : "";
  const res = await axiosInstance.get(`${STATS_URL}/game_summary${params}`);
  return res.data;
};
```

- [ ] **Step 3: React Queryフック**

```typescript
// mobile/hooks/useStats.ts
import { useQuery } from "@tanstack/react-query";
import {
  getHitDirections,
  getPlateAppearanceBreakdown,
  getBattingStatsTable,
  getPitchingStatsTable,
  getGameSummary,
} from "../services/statsService";
import type { StatsFilters } from "../types/profile";
import type { StatsPeriod } from "../types/stats";

export const useHitDirections = (filters: StatsFilters) =>
  useQuery({
    queryKey: ["hitDirections", filters],
    queryFn: () => getHitDirections(filters),
  });

export const usePlateAppearanceBreakdown = (filters: StatsFilters) =>
  useQuery({
    queryKey: ["paBreakdown", filters],
    queryFn: () => getPlateAppearanceBreakdown(filters),
  });

export const useBattingStatsTable = (period: StatsPeriod, year?: string) =>
  useQuery({
    queryKey: ["battingTable", period, year],
    queryFn: () => getBattingStatsTable(period, year),
  });

export const usePitchingStatsTable = (period: StatsPeriod, year?: string) =>
  useQuery({
    queryKey: ["pitchingTable", period, year],
    queryFn: () => getPitchingStatsTable(period, year),
  });

export const useGameSummary = (year?: string) =>
  useQuery({
    queryKey: ["gameSummary", year],
    queryFn: () => getGameSummary(year),
  });
```

- [ ] **Step 4: 型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

- [ ] **Step 5: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add types/stats.ts services/statsService.ts hooks/useStats.ts
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 成績ページ用の型定義・サービス・フックを追加"
```

---

## Task 7: モバイル — SprayChart コンポーネント

**Files:**
- Create: `mobile/components/stats/SprayChart.tsx`

- [ ] **Step 1: コンポーネント作成**

```typescript
// mobile/components/stats/SprayChart.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, {
  Path,
  Polygon,
  Line,
  Circle,
  Text as SvgText,
  Defs,
  LinearGradient,
  Stop,
} from "react-native-svg";
import type { HitDirection } from "../../types/stats";

interface SprayChartProps {
  directions: HitDirection[];
}

const WIDTH = 340;
const HEIGHT = 260;

// 各方向のフィールド上の座標 (x, y)
const DIRECTION_POSITIONS: Record<number, { x: number; y: number }> = {
  1: { x: 170, y: 210 },  // 投
  2: { x: 170, y: 245 },  // 捕
  3: { x: 230, y: 190 },  // 一
  4: { x: 200, y: 175 },  // 二
  5: { x: 110, y: 175 },  // 三
  6: { x: 140, y: 190 },  // 遊
  7: { x: 48, y: 140 },   // 左線
  8: { x: 65, y: 115 },   // 左
  9: { x: 100, y: 85 },   // 左中
  10: { x: 170, y: 65 },  // 中
  11: { x: 240, y: 85 },  // 右中
  12: { x: 275, y: 115 }, // 右
  13: { x: 292, y: 140 }, // 右線
};

const getBubbleRadius = (count: number, maxCount: number): number => {
  if (count === 0 || maxCount === 0) return 0;
  const minR = 8;
  const maxR = 22;
  return minR + (count / maxCount) * (maxR - minR);
};

const getBubbleColor = (count: number, maxCount: number): string => {
  if (maxCount === 0) return "#6b7280";
  const ratio = count / maxCount;
  if (ratio >= 0.7) return "#ef4444";
  if (ratio >= 0.4) return "#f59e0b";
  return "#3b82f6";
};

const getBubbleOpacity = (count: number, maxCount: number): number => {
  if (maxCount === 0) return 0;
  return 0.4 + (count / maxCount) * 0.5;
};

export const SprayChart = ({ directions }: SprayChartProps) => {
  const maxCount = Math.max(...directions.map((d) => d.count), 1);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>打球分布図</Text>
      <Svg width={WIDTH} height={HEIGHT} viewBox={`0 0 ${WIDTH} ${HEIGHT}`}>
        <Defs>
          <LinearGradient id="fieldGrad" x1="0%" y1="0%" x2="0%" y2="100%">
            <Stop offset="0%" stopColor="#1a3a1a" />
            <Stop offset="100%" stopColor="#0d1f0d" />
          </LinearGradient>
        </Defs>

        {/* Outfield arc */}
        <Path
          d={`M 15,${HEIGHT - 10} Q ${WIDTH / 2},10 ${WIDTH - 15},${HEIGHT - 10}`}
          fill="url(#fieldGrad)"
          stroke="#2a5a2a"
          strokeWidth={1.5}
        />

        {/* Infield diamond */}
        <Polygon
          points={`${WIDTH / 2},${HEIGHT - 30} ${WIDTH / 2 + 45},${HEIGHT - 70} ${WIDTH / 2},${HEIGHT - 110} ${WIDTH / 2 - 45},${HEIGHT - 70}`}
          fill="none"
          stroke="#4a3a2a"
          strokeWidth={1}
          opacity={0.4}
        />

        {/* Foul lines */}
        <Line
          x1={WIDTH / 2} y1={HEIGHT}
          x2={15} y2={70}
          stroke="#444" strokeWidth={0.5} strokeDasharray="3,3"
        />
        <Line
          x1={WIDTH / 2} y1={HEIGHT}
          x2={WIDTH - 15} y2={70}
          stroke="#444" strokeWidth={0.5} strokeDasharray="3,3"
        />

        {/* Home plate */}
        <Polygon
          points={`${WIDTH / 2},${HEIGHT - 12} ${WIDTH / 2 - 4},${HEIGHT - 6} ${WIDTH / 2},${HEIGHT} ${WIDTH / 2 + 4},${HEIGHT - 6}`}
          fill="white"
          opacity={0.6}
        />

        {/* Bubbles */}
        {directions.map((dir) => {
          const pos = DIRECTION_POSITIONS[dir.id];
          if (!pos || dir.count === 0) return null;
          const r = getBubbleRadius(dir.count, maxCount);
          const color = getBubbleColor(dir.count, maxCount);
          const opacity = getBubbleOpacity(dir.count, maxCount);
          return (
            <React.Fragment key={dir.id}>
              <Circle cx={pos.x} cy={pos.y} r={r} fill={color} opacity={opacity} />
              <SvgText
                x={pos.x} y={pos.y + 4}
                textAnchor="middle"
                fill="white"
                fontSize={r > 14 ? 11 : 9}
                fontWeight="700"
              >
                {dir.count}
              </SvgText>
            </React.Fragment>
          );
        })}

        {/* Labels for zero-count directions */}
        {directions.map((dir) => {
          const pos = DIRECTION_POSITIONS[dir.id];
          if (!pos || dir.count > 0) return null;
          return (
            <SvgText
              key={`label-${dir.id}`}
              x={pos.x} y={pos.y + 3}
              textAnchor="middle"
              fill="#555"
              fontSize={8}
            >
              {dir.label}
            </SvgText>
          );
        })}
      </Svg>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#0d1f0d",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 8,
  },
});
```

- [ ] **Step 2: 型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

- [ ] **Step 3: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add components/stats/SprayChart.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 打球分布図（SprayChart）コンポーネントを追加"
```

---

## Task 8: モバイル — PlateAppearanceDonut コンポーネント

**Files:**
- Create: `mobile/components/stats/PlateAppearanceDonut.tsx`

- [ ] **Step 1: コンポーネント作成**

```typescript
// mobile/components/stats/PlateAppearanceDonut.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle, Text as SvgText } from "react-native-svg";
import type { PlateAppearanceCategory } from "../../types/stats";

interface PlateAppearanceDonutProps {
  breakdown: PlateAppearanceCategory[];
  totalPlateAppearances: number;
}

const COLORS: Record<string, string> = {
  "安打": "#ef4444",
  "ゴロ": "#6b7280",
  "フライ": "#3b82f6",
  "三振": "#f59e0b",
  "四死球": "#10b981",
  "その他": "#8b5cf6",
};

const SIZE = 120;
const STROKE_WIDTH = 18;
const RADIUS = (SIZE - STROKE_WIDTH) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export const PlateAppearanceDonut = ({
  breakdown,
  totalPlateAppearances,
}: PlateAppearanceDonutProps) => {
  let accumulatedOffset = 0;

  const segments = breakdown
    .filter((cat) => cat.count > 0)
    .map((cat) => {
      const dashLength = (cat.percentage / 100) * CIRCUMFERENCE;
      const dashGap = CIRCUMFERENCE - dashLength;
      const offset = -accumulatedOffset + CIRCUMFERENCE * 0.25; // start from top
      accumulatedOffset += dashLength;
      return {
        ...cat,
        dashArray: `${dashLength} ${dashGap}`,
        dashOffset: offset,
        color: COLORS[cat.category] || "#6b7280",
      };
    });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>打席結果の内訳</Text>
      <View style={styles.row}>
        <Svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`}>
          <Circle
            cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
            fill="none" stroke="#222" strokeWidth={STROKE_WIDTH}
          />
          {segments.map((seg) => (
            <Circle
              key={seg.category}
              cx={SIZE / 2} cy={SIZE / 2} r={RADIUS}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_WIDTH}
              strokeDasharray={seg.dashArray}
              strokeDashoffset={seg.dashOffset}
            />
          ))}
          <SvgText
            x={SIZE / 2} y={SIZE / 2 - 6}
            textAnchor="middle" fill="#fff" fontSize={16} fontWeight="700"
          >
            {totalPlateAppearances}
          </SvgText>
          <SvgText
            x={SIZE / 2} y={SIZE / 2 + 10}
            textAnchor="middle" fill="#888" fontSize={9}
          >
            打席
          </SvgText>
        </Svg>

        <View style={styles.legend}>
          {breakdown.map((cat) => (
            <View key={cat.category} style={styles.legendItem}>
              <View
                style={[
                  styles.legendDot,
                  { backgroundColor: COLORS[cat.category] || "#6b7280" },
                ]}
              />
              <Text style={styles.legendLabel}>{cat.category}</Text>
              <Text style={styles.legendValue}>{cat.percentage}%</Text>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#111",
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
  },
  title: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 10,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  legend: {
    flex: 1,
    gap: 4,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendLabel: {
    color: "#ccc",
    fontSize: 11,
    flex: 1,
  },
  legendValue: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },
});
```

- [ ] **Step 2: 型チェック + コミット**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add components/stats/PlateAppearanceDonut.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 打席結果内訳（PlateAppearanceDonut）コンポーネントを追加"
```

---

## Task 9: モバイル — PeriodToggle + StatsTable コンポーネント

**Files:**
- Create: `mobile/components/stats/PeriodToggle.tsx`
- Create: `mobile/components/stats/StatsTable.tsx`

- [ ] **Step 1: PeriodToggle（年/月/日切り替え）**

```typescript
// mobile/components/stats/PeriodToggle.tsx
import React from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { StatsPeriod } from "../../types/stats";

interface PeriodToggleProps {
  value: StatsPeriod;
  onChange: (period: StatsPeriod) => void;
}

const OPTIONS: { value: StatsPeriod; label: string }[] = [
  { value: "yearly", label: "年" },
  { value: "monthly", label: "月" },
  { value: "daily", label: "日" },
];

export const PeriodToggle = ({ value, onChange }: PeriodToggleProps) => (
  <View style={styles.container}>
    {OPTIONS.map((opt) => (
      <TouchableOpacity
        key={opt.value}
        style={[styles.option, value === opt.value && styles.optionActive]}
        onPress={() => onChange(opt.value)}
      >
        <Text
          style={[styles.label, value === opt.value && styles.labelActive]}
        >
          {opt.label}
        </Text>
      </TouchableOpacity>
    ))}
  </View>
);

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    backgroundColor: "#111",
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  option: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  optionActive: {
    backgroundColor: "#f59e0b",
  },
  label: {
    fontSize: 11,
    color: "#666",
    fontWeight: "600",
  },
  labelActive: {
    color: "#000",
  },
});
```

- [ ] **Step 2: StatsTable（共用成績テーブル）**

```typescript
// mobile/components/stats/StatsTable.tsx
import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import type { BattingStatsRow, PitchingStatsRow } from "../../types/stats";

interface Column<T> {
  key: keyof T;
  label: string;
  width: number;
  format?: (value: number) => string;
  highlight?: boolean;
}

interface StatsTableProps<T> {
  rows: T[];
  columns: Column<T>[];
  labelKey: keyof T;
}

const fmt3 = (v: number) => v.toFixed(3).replace(/^0/, "");
const fmt2 = (v: number) => v.toFixed(2);
const fmtInt = (v: number) => String(v);

export const BATTING_COLUMNS: Column<BattingStatsRow>[] = [
  { key: "batting_average", label: "打率", width: 50, format: fmt3, highlight: true },
  { key: "games", label: "試合", width: 40, format: fmtInt },
  { key: "plate_appearances", label: "打席", width: 40, format: fmtInt },
  { key: "at_bats", label: "打数", width: 40, format: fmtInt },
  { key: "hit", label: "安打", width: 40, format: fmtInt },
  { key: "two_base_hit", label: "二塁打", width: 44, format: fmtInt },
  { key: "three_base_hit", label: "三塁打", width: 44, format: fmtInt },
  { key: "home_run", label: "本塁打", width: 44, format: fmtInt },
  { key: "total_bases", label: "塁打", width: 40, format: fmtInt },
  { key: "runs_batted_in", label: "打点", width: 40, format: fmtInt },
  { key: "run", label: "得点", width: 40, format: fmtInt },
  { key: "strike_out", label: "三振", width: 40, format: fmtInt },
  { key: "base_on_balls", label: "四球", width: 40, format: fmtInt },
  { key: "hit_by_pitch", label: "死球", width: 40, format: fmtInt },
  { key: "sacrifice_hit", label: "犠打", width: 40, format: fmtInt },
  { key: "sacrifice_fly", label: "犠飛", width: 40, format: fmtInt },
  { key: "stealing_base", label: "盗塁", width: 40, format: fmtInt },
  { key: "caught_stealing", label: "盗塁死", width: 44, format: fmtInt },
  { key: "error", label: "併殺打", width: 44, format: fmtInt },
  { key: "slugging_percentage", label: "長打率", width: 50, format: fmt3 },
  { key: "ops", label: "OPS", width: 50, format: fmt3 },
  { key: "iso", label: "ISO", width: 50, format: fmt3 },
  { key: "bb_per_k", label: "BB/K", width: 50, format: fmt3 },
  { key: "babip", label: "BABIP", width: 50, format: fmt3 },
];

export const PITCHING_COLUMNS: Column<PitchingStatsRow>[] = [
  { key: "era", label: "防御率", width: 50, format: fmt2, highlight: true },
  { key: "appearances", label: "登板", width: 40, format: fmtInt },
  { key: "win", label: "勝利", width: 40, format: fmtInt },
  { key: "loss", label: "敗戦", width: 40, format: fmtInt },
  { key: "hold", label: "ホールド", width: 50, format: fmtInt },
  { key: "saves", label: "セーブ", width: 44, format: fmtInt },
  { key: "complete_games", label: "完投", width: 40, format: fmtInt },
  { key: "shutouts", label: "完封", width: 40, format: fmtInt },
  { key: "innings_pitched", label: "投球回", width: 48, format: fmt2 },
  { key: "hits_allowed", label: "被安打", width: 44, format: fmtInt },
  { key: "home_runs_hit", label: "被本塁打", width: 52, format: fmtInt },
  { key: "strikeouts", label: "三振", width: 40, format: fmtInt },
  { key: "base_on_balls", label: "四球", width: 40, format: fmtInt },
  { key: "hit_by_pitch", label: "死球", width: 40, format: fmtInt },
  { key: "earned_run", label: "自責点", width: 44, format: fmtInt },
  { key: "whip", label: "WHIP", width: 50, format: fmt2 },
  { key: "k_per_nine", label: "K/9", width: 46, format: fmt2 },
  { key: "bb_per_nine", label: "BB/9", width: 46, format: fmt2 },
  { key: "k_bb", label: "K/BB", width: 46, format: fmt2 },
];

export function StatsTable<T extends { label: string }>({
  rows,
  columns,
  labelKey,
}: StatsTableProps<T>) {
  const isCareerRow = (row: T) => row.label === "通算";

  return (
    <View style={styles.tableContainer}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View>
          {/* Header */}
          <View style={styles.headerRow}>
            <View style={styles.stickyCell}>
              <Text style={styles.headerLabelText}>
                {String(labelKey) === "label" ? "" : String(labelKey)}
              </Text>
            </View>
            {columns.map((col) => (
              <View key={String(col.key)} style={[styles.cell, { width: col.width }]}>
                <Text style={styles.headerText}>{col.label}</Text>
              </View>
            ))}
          </View>

          {/* Data rows */}
          {rows.map((row, i) => {
            const career = isCareerRow(row);
            return (
              <View
                key={i}
                style={[
                  styles.dataRow,
                  career && styles.careerRow,
                  !career && i < rows.length - 1 && styles.rowBorder,
                ]}
              >
                <View style={[styles.stickyCell, career && styles.careerStickyCell]}>
                  <Text style={[styles.labelText, career && styles.careerLabelText]}>
                    {row[labelKey] as string}
                  </Text>
                </View>
                {columns.map((col) => {
                  const val = row[col.key] as number;
                  const formatted = col.format ? col.format(val) : String(val);
                  return (
                    <View key={String(col.key)} style={[styles.cell, { width: col.width }]}>
                      <Text
                        style={[
                          styles.cellText,
                          col.highlight && styles.highlightText,
                          career && styles.careerCellText,
                        ]}
                      >
                        {formatted}
                      </Text>
                    </View>
                  );
                })}
              </View>
            );
          })}
        </View>
      </ScrollView>
      <Text style={styles.scrollHint}>← スクロール →</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tableContainer: { marginBottom: 12 },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#1a1a1a",
  },
  dataRow: { flexDirection: "row" },
  rowBorder: { borderBottomWidth: 1, borderBottomColor: "#1a1a1a" },
  careerRow: {
    backgroundColor: "#2a1a00",
    borderTopWidth: 2,
    borderTopColor: "#f59e0b",
  },
  stickyCell: {
    width: 60,
    paddingVertical: 7,
    paddingHorizontal: 8,
    backgroundColor: "#000",
    borderRightWidth: 1,
    borderRightColor: "#333",
    position: "relative",
  },
  careerStickyCell: { backgroundColor: "#2a1a00" },
  cell: {
    paddingVertical: 7,
    paddingHorizontal: 4,
    alignItems: "center",
  },
  headerText: { color: "#aaa", fontSize: 10, fontWeight: "600" },
  headerLabelText: { color: "#f59e0b", fontSize: 10, fontWeight: "700" },
  labelText: { color: "#ccc", fontSize: 10, fontWeight: "600" },
  careerLabelText: { color: "#f59e0b", fontWeight: "700" },
  cellText: { color: "#ccc", fontSize: 10 },
  highlightText: { color: "#f59e0b", fontWeight: "700" },
  careerCellText: { fontWeight: "600" },
  scrollHint: {
    textAlign: "right",
    color: "#444",
    fontSize: 9,
    marginTop: 2,
    paddingRight: 8,
  },
});
```

- [ ] **Step 3: 型チェック + コミット**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add components/stats/PeriodToggle.tsx components/stats/StatsTable.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: PeriodToggle・StatsTable コンポーネントを追加"
```

---

## Task 10: モバイル — GameResultSummary コンポーネント群

**Files:**
- Create: `mobile/components/stats/WinLossCards.tsx`
- Create: `mobile/components/stats/MatchTypeBreakdown.tsx`
- Create: `mobile/components/stats/MonthlyGameChart.tsx`
- Create: `mobile/components/stats/OpponentRecord.tsx`
- Create: `mobile/components/stats/GameResultSummary.tsx`

- [ ] **Step 1: WinLossCards**

```typescript
// mobile/components/stats/WinLossCards.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { WinLossSummary } from "../../types/stats";

interface WinLossCardsProps {
  summary: WinLossSummary;
}

export const WinLossCards = ({ summary }: WinLossCardsProps) => {
  const total = summary.wins + summary.losses + summary.draws;
  const winPct = total > 0 ? (summary.wins / total) * 100 : 0;
  const lossPct = total > 0 ? (summary.losses / total) * 100 : 0;
  const drawPct = total > 0 ? (summary.draws / total) * 100 : 0;

  return (
    <View>
      <View style={styles.cards}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>勝利</Text>
          <Text style={[styles.cardValue, { color: "#ef4444" }]}>{summary.wins}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>敗北</Text>
          <Text style={[styles.cardValue, { color: "#3b82f6" }]}>{summary.losses}</Text>
        </View>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>引分</Text>
          <Text style={[styles.cardValue, { color: "#6b7280" }]}>{summary.draws}</Text>
        </View>
      </View>
      <View style={styles.rateRow}>
        <Text style={styles.rateLabel}>勝率</Text>
        <Text style={styles.rateValue}>
          {summary.win_rate.toFixed(3).replace(/^0/, "")}
        </Text>
      </View>
      <View style={styles.bar}>
        {winPct > 0 && <View style={[styles.barSegment, { width: `${winPct}%`, backgroundColor: "#ef4444" }]} />}
        {lossPct > 0 && <View style={[styles.barSegment, { width: `${lossPct}%`, backgroundColor: "#3b82f6" }]} />}
        {drawPct > 0 && <View style={[styles.barSegment, { width: `${drawPct}%`, backgroundColor: "#6b7280" }]} />}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cards: { flexDirection: "row", gap: 8, marginBottom: 12 },
  card: {
    flex: 1, backgroundColor: "#1a2332", borderRadius: 8,
    padding: 10, alignItems: "center",
  },
  cardLabel: { fontSize: 10, color: "#888" },
  cardValue: { fontSize: 22, fontWeight: "700" },
  rateRow: {
    flexDirection: "row", justifyContent: "space-between",
    marginBottom: 4,
  },
  rateLabel: { fontSize: 11, color: "#888" },
  rateValue: { fontSize: 11, color: "#f59e0b", fontWeight: "700" },
  bar: {
    height: 6, backgroundColor: "#222", borderRadius: 3,
    flexDirection: "row", overflow: "hidden", marginBottom: 16,
  },
  barSegment: { height: "100%" },
});
```

- [ ] **Step 2: MatchTypeBreakdown**

```typescript
// mobile/components/stats/MatchTypeBreakdown.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { MatchTypeRecord } from "../../types/stats";

interface MatchTypeBreakdownProps {
  breakdown: MatchTypeRecord[];
}

export const MatchTypeBreakdown = ({ breakdown }: MatchTypeBreakdownProps) => (
  <View>
    <Text style={styles.sectionTitle}>試合種別</Text>
    <View style={styles.row}>
      {breakdown.map((mt) => (
        <View
          key={mt.match_type}
          style={[
            styles.card,
            { borderLeftColor: mt.match_type === "公式戦" ? "#f59e0b" : "#6b7280" },
          ]}
        >
          <Text
            style={[
              styles.typeLabel,
              { color: mt.match_type === "公式戦" ? "#f59e0b" : "#aaa" },
            ]}
          >
            {mt.match_type}
          </Text>
          <Text style={styles.totalText}>{mt.total}試合</Text>
          <Text style={styles.detailText}>
            {mt.wins}勝 {mt.losses}敗 {mt.draws}分 ({mt.win_rate.toFixed(3).replace(/^0/, "")})
          </Text>
        </View>
      ))}
    </View>
  </View>
);

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#ccc", marginBottom: 8 },
  row: { flexDirection: "row", gap: 8, marginBottom: 16 },
  card: {
    flex: 1, backgroundColor: "#111", borderRadius: 8,
    padding: 12, borderLeftWidth: 3,
  },
  typeLabel: { fontSize: 11, fontWeight: "600", marginBottom: 4 },
  totalText: { fontSize: 12, color: "#ccc" },
  detailText: { fontSize: 11, color: "#888", marginTop: 2 },
});
```

- [ ] **Step 3: MonthlyGameChart**

```typescript
// mobile/components/stats/MonthlyGameChart.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";
import type { MonthlyGame } from "../../types/stats";

interface MonthlyGameChartProps {
  games: MonthlyGame[];
}

const CHART_HEIGHT = 80;
const BAR_GAP = 4;

export const MonthlyGameChart = ({ games }: MonthlyGameChartProps) => {
  if (games.length === 0) return null;

  const maxCount = Math.max(...games.map((g) => g.count), 1);
  const barWidth = Math.min(30, (300 - BAR_GAP * games.length) / games.length);

  return (
    <View>
      <Text style={styles.sectionTitle}>月別試合数</Text>
      <View style={styles.chartContainer}>
        <Svg
          width={games.length * (barWidth + BAR_GAP)}
          height={CHART_HEIGHT + 24}
        >
          {games.map((g, i) => {
            const x = i * (barWidth + BAR_GAP);
            const barH = (g.count / maxCount) * CHART_HEIGHT;
            const y = CHART_HEIGHT - barH;
            return (
              <React.Fragment key={g.month}>
                <SvgText
                  x={x + barWidth / 2} y={y - 4}
                  textAnchor="middle" fill="#aaa" fontSize={9}
                >
                  {g.count}
                </SvgText>
                <Rect
                  x={x} y={y}
                  width={barWidth} height={barH}
                  rx={3} fill="#f59e0b"
                  opacity={0.5 + (g.count / maxCount) * 0.5}
                />
                <SvgText
                  x={x + barWidth / 2} y={CHART_HEIGHT + 14}
                  textAnchor="middle" fill="#555" fontSize={10}
                >
                  {g.month}月
                </SvgText>
              </React.Fragment>
            );
          })}
        </Svg>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#ccc", marginBottom: 8 },
  chartContainer: { alignItems: "center", marginBottom: 16 },
});
```

- [ ] **Step 4: OpponentRecord**

```typescript
// mobile/components/stats/OpponentRecord.tsx
import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import type { OpponentRecord as OpponentRecordType } from "../../types/stats";

interface OpponentRecordProps {
  records: OpponentRecordType[];
}

const INITIAL_SHOW = 3;

export const OpponentRecordList = ({ records }: OpponentRecordProps) => {
  const [expanded, setExpanded] = useState(false);
  const displayed = expanded ? records : records.slice(0, INITIAL_SHOW);

  return (
    <View>
      <Text style={styles.sectionTitle}>対戦相手別</Text>
      <View style={styles.list}>
        {displayed.map((r) => (
          <View key={r.team_name} style={styles.item}>
            <Text style={styles.teamName} numberOfLines={1}>{r.team_name}</Text>
            <Text style={[styles.stat, { color: "#ef4444" }]}>{r.wins}勝</Text>
            <Text style={[styles.stat, { color: "#3b82f6" }]}>{r.losses}敗</Text>
            <Text style={[styles.stat, { color: "#6b7280" }]}>{r.draws}分</Text>
          </View>
        ))}
      </View>
      {records.length > INITIAL_SHOW && (
        <TouchableOpacity onPress={() => setExpanded(!expanded)}>
          <Text style={styles.toggle}>
            {expanded ? "閉じる ▲" : "すべて表示 ▼"}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  sectionTitle: { fontSize: 13, fontWeight: "600", color: "#ccc", marginBottom: 8 },
  list: { gap: 6 },
  item: {
    flexDirection: "row", alignItems: "center",
    backgroundColor: "#111", borderRadius: 8,
    paddingVertical: 10, paddingHorizontal: 12,
  },
  teamName: { flex: 1, color: "#ccc", fontSize: 12 },
  stat: { fontWeight: "700", fontSize: 12, marginLeft: 12 },
  toggle: { textAlign: "center", color: "#555", fontSize: 12, paddingVertical: 8 },
});
```

- [ ] **Step 5: GameResultSummary（統合コンテナ）**

```typescript
// mobile/components/stats/GameResultSummary.tsx
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { WinLossCards } from "./WinLossCards";
import { MatchTypeBreakdown } from "./MatchTypeBreakdown";
import { MonthlyGameChart } from "./MonthlyGameChart";
import { OpponentRecordList } from "./OpponentRecord";
import type { GameSummary } from "../../types/stats";

interface GameResultSummaryProps {
  summary: GameSummary;
}

export const GameResultSummary = ({ summary }: GameResultSummaryProps) => (
  <View style={styles.container}>
    <Text style={styles.sectionHeader}>試合結果</Text>
    <WinLossCards summary={summary.win_loss} />
    <MatchTypeBreakdown breakdown={summary.match_type_breakdown} />
    <MonthlyGameChart games={summary.monthly_games} />
    <OpponentRecordList records={summary.opponent_records} />
  </View>
);

const styles = StyleSheet.create({
  container: { paddingTop: 16, borderTopWidth: 1, borderTopColor: "#222" },
  sectionHeader: {
    fontSize: 15, fontWeight: "700", color: "#fff", marginBottom: 16,
  },
});
```

- [ ] **Step 6: 型チェック + コミット**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add components/stats/
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 試合結果統計コンポーネント群を追加"
```

---

## Task 11: モバイル — StatsFilters コンポーネント

**Files:**
- Create: `mobile/components/stats/StatsFilters.tsx`

既存の`StatsOverview`で使われている`FilterDropdown`パターンを踏襲する。

- [ ] **Step 1: コンポーネント作成**

```typescript
// mobile/components/stats/StatsFilters.tsx
import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  FlatList,
  StyleSheet,
} from "react-native";
import type { StatsFilters as StatsFiltersType } from "../../types/profile";

interface StatsFiltersProps {
  filters: StatsFiltersType;
  onFiltersChange: (filters: StatsFiltersType) => void;
  availableYears: number[];
  availableSeasons?: { id: string; name: string }[];
}

type FilterKey = "year" | "matchType" | "seasonId";

const MATCH_TYPES = [
  { value: undefined, label: "全て" },
  { value: "公式戦", label: "公式戦" },
  { value: "オープン戦", label: "オープン戦" },
];

export const StatsFilters = ({
  filters,
  onFiltersChange,
  availableYears,
  availableSeasons = [],
}: StatsFiltersProps) => {
  const [activeDropdown, setActiveDropdown] = useState<FilterKey | null>(null);

  const yearOptions = [
    { value: undefined, label: "通算" },
    ...availableYears.map((y) => ({ value: String(y), label: `${y}年` })),
  ];

  const seasonOptions = [
    { value: undefined, label: "全シーズン" },
    ...availableSeasons.map((s) => ({ value: s.id, label: s.name })),
  ];

  const getDisplayLabel = (key: FilterKey): string => {
    switch (key) {
      case "year":
        return filters.year ? `${filters.year}年` : "通算";
      case "matchType":
        return filters.matchType || "全て";
      case "seasonId": {
        const season = availableSeasons.find((s) => s.id === filters.seasonId);
        return season?.name || "シーズン";
      }
    }
  };

  const getOptions = (key: FilterKey) => {
    switch (key) {
      case "year": return yearOptions;
      case "matchType": return MATCH_TYPES;
      case "seasonId": return seasonOptions;
    }
  };

  const handleSelect = (key: FilterKey, value: string | undefined) => {
    onFiltersChange({ ...filters, [key]: value });
    setActiveDropdown(null);
  };

  const filterKeys: FilterKey[] = ["year", "matchType", "seasonId"];

  return (
    <View style={styles.container}>
      {filterKeys.map((key) => (
        <TouchableOpacity
          key={key}
          style={styles.filterButton}
          onPress={() => setActiveDropdown(activeDropdown === key ? null : key)}
        >
          <Text style={styles.filterText}>{getDisplayLabel(key)} ▼</Text>
        </TouchableOpacity>
      ))}

      {activeDropdown && (
        <Modal transparent animationType="fade" onRequestClose={() => setActiveDropdown(null)}>
          <TouchableOpacity
            style={styles.overlay}
            activeOpacity={1}
            onPress={() => setActiveDropdown(null)}
          >
            <View style={styles.dropdown}>
              <FlatList
                data={getOptions(activeDropdown)}
                keyExtractor={(item) => item.value ?? "none"}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.dropdownItem}
                    onPress={() => handleSelect(activeDropdown, item.value)}
                  >
                    <Text
                      style={[
                        styles.dropdownText,
                        filters[activeDropdown] === item.value && styles.dropdownTextActive,
                      ]}
                    >
                      {item.label}
                    </Text>
                  </TouchableOpacity>
                )}
              />
            </View>
          </TouchableOpacity>
        </Modal>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flexDirection: "row", gap: 6, paddingVertical: 8 },
  filterButton: {
    backgroundColor: "#111",
    borderWidth: 1,
    borderColor: "#333",
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  filterText: { color: "#aaa", fontSize: 11 },
  overlay: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center", alignItems: "center",
  },
  dropdown: {
    backgroundColor: "#222", borderRadius: 12,
    width: 200, maxHeight: 300, padding: 8,
  },
  dropdownItem: { paddingVertical: 10, paddingHorizontal: 12 },
  dropdownText: { color: "#ccc", fontSize: 14 },
  dropdownTextActive: { color: "#f59e0b", fontWeight: "700" },
});
```

- [ ] **Step 2: 型チェック + コミット**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add components/stats/StatsFilters.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 成績ページ用フィルタコンポーネントを追加"
```

---

## Task 12: モバイル — 成績ページ組み立て + タブ差し替え

**Files:**
- Create: `mobile/app/(tabs)/stats.tsx`
- Modify: `mobile/app/(tabs)/_layout.tsx`
- Delete: `mobile/app/(tabs)/record.tsx`

- [ ] **Step 1: 成績ページ作成**

```typescript
// mobile/app/(tabs)/stats.tsx
import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { StatsFilters } from "@components/stats/StatsFilters";
import { SprayChart } from "@components/stats/SprayChart";
import { PlateAppearanceDonut } from "@components/stats/PlateAppearanceDonut";
import { StatsTable, BATTING_COLUMNS, PITCHING_COLUMNS } from "@components/stats/StatsTable";
import { PeriodToggle } from "@components/stats/PeriodToggle";
import { GameResultSummary } from "@components/stats/GameResultSummary";
import {
  useHitDirections,
  usePlateAppearanceBreakdown,
  useBattingStatsTable,
  usePitchingStatsTable,
  useGameSummary,
} from "@hooks/useStats";
import type { StatsFilters as StatsFiltersType } from "../../types/profile";
import type { StatsPeriod } from "../../types/stats";

type StatsTab = "batting" | "pitching";

export default function StatsScreen() {
  const [activeTab, setActiveTab] = useState<StatsTab>("batting");
  const [filters, setFilters] = useState<StatsFiltersType>({});
  const [battingPeriod, setBattingPeriod] = useState<StatsPeriod>("yearly");
  const [pitchingPeriod, setPitchingPeriod] = useState<StatsPeriod>("yearly");
  const [tableYear, setTableYear] = useState<string | undefined>();

  // Data hooks
  const hitDirections = useHitDirections(filters);
  const paBreakdown = usePlateAppearanceBreakdown(filters);
  const battingTable = useBattingStatsTable(battingPeriod, battingPeriod !== "yearly" ? tableYear : undefined);
  const pitchingTable = usePitchingStatsTable(pitchingPeriod, pitchingPeriod !== "yearly" ? tableYear : undefined);
  const gameSummary = useGameSummary(filters.year);

  const isLoading =
    hitDirections.isLoading || paBreakdown.isLoading ||
    battingTable.isLoading || pitchingTable.isLoading ||
    gameSummary.isLoading;

  const isRefreshing =
    hitDirections.isRefetching || paBreakdown.isRefetching ||
    battingTable.isRefetching || gameSummary.isRefetching;

  const handleRefresh = useCallback(() => {
    hitDirections.refetch();
    paBreakdown.refetch();
    battingTable.refetch();
    pitchingTable.refetch();
    gameSummary.refetch();
  }, [hitDirections, paBreakdown, battingTable, pitchingTable, gameSummary]);

  const handlePeriodChange = (period: StatsPeriod, tab: StatsTab) => {
    if (tab === "batting") {
      setBattingPeriod(period);
    } else {
      setPitchingPeriod(period);
    }
    // 月・日モードに切り替え時、年が未選択なら現在年をセット
    if (period !== "yearly" && !tableYear) {
      setTableYear(String(new Date().getFullYear()));
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#d08000" />
      </View>
    );
  }

  const totalPA = paBreakdown.data?.reduce((sum, cat) => sum + cat.count, 0) ?? 0;

  return (
    <ScrollView
      style={styles.screen}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor="#d08000"
        />
      }
    >
      {/* Tabs */}
      <View style={styles.tabRow}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "batting" && styles.tabActive]}
          onPress={() => setActiveTab("batting")}
        >
          <Text style={[styles.tabText, activeTab === "batting" && styles.tabTextActive]}>
            打撃
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "pitching" && styles.tabActive]}
          onPress={() => setActiveTab("pitching")}
        >
          <Text style={[styles.tabText, activeTab === "pitching" && styles.tabTextActive]}>
            投球
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      <View style={styles.section}>
        <StatsFilters
          filters={filters}
          onFiltersChange={setFilters}
          availableYears={[2024, 2025, 2026]}
        />
      </View>

      {/* Batting Tab Content */}
      {activeTab === "batting" && (
        <View style={styles.section}>
          {hitDirections.data && <SprayChart directions={hitDirections.data} />}

          {paBreakdown.data && (
            <PlateAppearanceDonut
              breakdown={paBreakdown.data}
              totalPlateAppearances={totalPA}
            />
          )}

          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>打撃成績</Text>
            <PeriodToggle
              value={battingPeriod}
              onChange={(p) => handlePeriodChange(p, "batting")}
            />
          </View>

          {battingTable.data && (
            <StatsTable
              rows={battingTable.data}
              columns={BATTING_COLUMNS}
              labelKey="label"
            />
          )}
        </View>
      )}

      {/* Pitching Tab Content */}
      {activeTab === "pitching" && (
        <View style={styles.section}>
          <View style={styles.tableHeader}>
            <Text style={styles.tableTitle}>投球成績</Text>
            <PeriodToggle
              value={pitchingPeriod}
              onChange={(p) => handlePeriodChange(p, "pitching")}
            />
          </View>

          {pitchingTable.data && (
            <StatsTable
              rows={pitchingTable.data}
              columns={PITCHING_COLUMNS}
              labelKey="label"
            />
          )}
        </View>
      )}

      {/* Game Summary (common section) */}
      <View style={styles.section}>
        {gameSummary.data && <GameResultSummary summary={gameSummary.data} />}
      </View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#2E2E2E" },
  loadingContainer: {
    flex: 1, alignItems: "center", justifyContent: "center",
    backgroundColor: "#2E2E2E",
  },
  tabRow: { flexDirection: "row", gap: 4, paddingHorizontal: 16, paddingTop: 8 },
  tab: {
    paddingVertical: 7, paddingHorizontal: 20,
    borderRadius: 20, backgroundColor: "#222",
  },
  tabActive: { backgroundColor: "#f59e0b" },
  tabText: { fontSize: 13, color: "#888" },
  tabTextActive: { color: "#000", fontWeight: "700" },
  section: { paddingHorizontal: 16 },
  tableHeader: {
    flexDirection: "row", justifyContent: "space-between",
    alignItems: "center", marginBottom: 8,
  },
  tableTitle: { fontSize: 12, fontWeight: "600", color: "#aaa" },
});
```

- [ ] **Step 2: _layout.tsx を更新 — recordタブをstatsに差し替え**

`mobile/app/(tabs)/_layout.tsx` のrecordタブ定義を以下に置き換え:

```typescript
// 既存のRecordIconインポートを削除し、以下を追加（アイコンは既存のBallIconを一時流用するか、新アイコンを追加）
// import { StatsIcon } from "@components/icon/StatsIcon";

// Tabs.Screen name="record" のブロックを以下に置き換え:
<Tabs.Screen
  name="stats"
  options={{
    title: "成績",
    headerStyle: { backgroundColor: "#2E2E2E" },
    headerTintColor: "#F4F4F4",
    tabBarIcon: ({ color, size }) => (
      <RecordIcon size={size} color={color} />
    ),
  }}
/>
```

注意: `RecordIcon`は一時的に流用。後日専用アイコンに差し替え可能。
`listeners`プロパティ（game-recordへのリダイレクト）は削除。

- [ ] **Step 3: record.tsxを削除**

```bash
rm /Users/shimizuippei/projects/dev/buzzbase/mobile/app/\(tabs\)/record.tsx
```

- [ ] **Step 4: 型チェック**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn typecheck
```

- [ ] **Step 5: 動作確認**

```bash
cd /Users/shimizuippei/projects/dev/buzzbase/mobile && yarn start
```

iOSシミュレータで:
- タブバーに「成績」が表示される
- タップすると成績ページが表示される
- 打撃/投球タブ切り替えが動作する
- フィルタが動作する（API接続後）

- [ ] **Step 6: コミット**

```bash
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile add app/\(tabs\)/stats.tsx app/\(tabs\)/_layout.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile rm app/\(tabs\)/record.tsx
git -C /Users/shimizuippei/projects/dev/buzzbase/mobile commit -m "Add: 成績ページを追加し、Recordタブを差し替え"
```

---

## 実装順序の依存関係

```
Task 1 (DBマイグレーション)
  → Task 2 (サービス群)
    → Task 3 (APIコントローラー)
      → Task 4 (APIテスト)

Task 5 (定数拡張) ← 独立して実行可能

Task 6 (型・サービス・フック) ← Task 3完了後
  → Task 7 (SprayChart)
  → Task 8 (Donut)
  → Task 9 (StatsTable)
  → Task 10 (GameResultSummary)
  → Task 11 (StatsFilters)
    → Task 12 (ページ組み立て) ← Task 7-11すべて完了後
```

バックエンド（Task 1-4）とモバイル定数（Task 5）は並列実行可能。
モバイルUIコンポーネント（Task 7-11）も並列実行可能。
