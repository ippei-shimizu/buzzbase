# PRD-03: 素振りカウンター機能

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（実装（release/pro-202605）に合わせてデータモデル・API・無料/Pro境界・提供プラットフォームを修正）
**ステータス**: 実装済み（mobile / Web 両方）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`
**設計**: [`../pro-plan-design/03-ux-information-architecture.md`](../pro-plan-design/03-ux-information-architecture.md) §2〜§3

---

## 概要

野球選手の自主練「素振り」をリズム音 + 自動カウントでサポートする業界初の機能。
練習記録と連動し、Streak（草機能）にも反映される。

---

## UI/UX 確定事項（2026-08-11 実装反映）

設計検討で確定し、実装時にさらに調整された内容。以降の「機能要件」「Pro機能」「UI 仕様」と差異がある場合は**本セクションを優先**する。

### 配置・起動

- ホーム > 活動タブ クイック記録「⚾ 素振りを始める」から起動。設定 → 実行 → 完了 の3画面
- **mobile / Web の両方で提供**（当初は mobile 限定の想定だったが、Web 版も実装した）
  - mobile: `app/(shadow-swing)/setup.tsx` / `counter.tsx` / `complete.tsx`
  - Web: `app/(app)/practice/shadow-swing/`（`ShadowSwingSetup` / `ShadowSwingCounter` / `ShadowSwingComplete`）
- Web はブラウザ制約があるため、画面スリープ抑止に Screen Wake Lock、バイブは `navigator.vibrate` の有無で可否を判定する（非対応ブラウザでは Pro でも設定不可）

### 完了時は自動保存（手動保存ボタンは廃止）

- 完了と同時に「素振り」の練習ログ（practice_log）を**自動生成**し、activity_logs（草・Streak）に反映
- 完了画面は結果表示＋ `[もう一度]` `[閉じる]`。**手動の「練習記録に保存」ボタンは作らない**
- **ノート誘導は出さない**（素振りは高頻度の反復のため摩擦を最小化。ノート誘導は「📝練習を記録」フル版の保存後のみ）

### 無料 / Pro 境界（実装確定）

- **本数は無料で無制限**。サーバー側の検証は `target_count > 0` のみ。Web の入力上限は 9,999本（桁の打ち間違い防止）
- **インターバルは無料で5〜8秒のみ**（`ShadowSwingSession::FREE_INTERVAL_RANGE`）。その外（1〜20秒の範囲）は Pro（`shadow_swing_custom_interval`）
- **バイブレーションは Pro 限定**（`shadow_swing_vibration`）。無料は音・読み上げのみ
- **バックグラウンド継続実行は Pro 限定**（`shadow_swing_background`）。無料はバックグラウンド遷移で一時停止
- **累計本数（今日／今月／通算）は無料で全期間表示**。Pro 限定なのは「素振りの推移詳細」（`practice_menu_trend_detail`、`GET /api/v2/shadow_swing_sessions/trend`）
- Pro 限定設定はクライアントのロック表示だけでなく、`ShadowSwingSession` の `validate :pro_settings_within_entitlements`（create 時）でサーバー側でも検証する
- ※ 当初の「無料100本まで・100本以上Pro」(F-12) は**撤回**。本数では課金しない（草の L3/L4 にも無料で届く）
- ※ 当初の「累計本数30日以上は Pro」(F-15) も**撤回**。累計は無料で全期間表示する

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

> 朝6:00に出勤前の素振り。集中したいので音を出さずバイブのみに設定（バイブは Pro 限定）。
> 100本完了後、アプリは自動的に停止。

---

## 機能要件

### 必須機能

| # | 機能 | 詳細 | 状態 |
|---|----|----|----|
| F-01 | 目標本数の設定 | 1本以上（サーバー検証は `> 0` のみ。Web の入力上限は 9,999本、既定値 200本） | 実装済み |
| F-02 | インターバル設定 | 1〜20秒。選択肢は 1 / 1.5 / 2 / 3 / 4 …… 20 秒（既定 5秒）。無料は 5〜8秒のみ | 実装済み |
| F-03 | 開始 / 一時停止 / 終了 | 通常の音楽プレイヤーと同様 | 実装済み |
| F-04 | 自動カウントアップ | インターバルごとに+1 | 実装済み |
| F-05 | 合図音の再生 | 笛の音（`whistle.wav`）。Web は笛とカウント読み上げを排他選択 | 実装済み |
| F-06 | 合図の種類切り替え | `sound_enabled` / `voice_enabled`（読み上げ）/ `vibration_enabled` の独立フラグ。単一選択の `sound_setting` ではない | 実装済み |
| F-07 | 進捗表示 | 「現在 / 目標」を大きく表示 | 実装済み |
| F-08 | 完了時の達成感演出 | 振動 + 効果音 + 達成アニメ | 実装済み |
| F-09 | 練習記録への自動保存 | 完了時に `practice_logs`（`source: 'shadow_swing'`）を自動生成／同日は加算 | 実装済み |
| F-10 | 累計本数の表示 | 今日 / 今月 / 通算（`GET /api/v2/shadow_swing_sessions/stats`） | 実装済み |

### Pro機能（無料との差別化）

| # | 機能 | entitlement | 無料 | Pro | 状態 |
|---|----|----|----|----|----|
| F-11 | 基本利用（本数無制限） | `shadow_swing_basic` | ◎ | ◎ | 実装済み |
| F-12 | 100本以上の目標設定 | — | ◎ | ◎ | 撤回（本数では課金しない） |
| F-13 | カスタムインターバル（無料の5〜8秒の外） | `shadow_swing_custom_interval` | ✕ | ◎ | 実装済み |
| F-14 | カスタムリズム音（アップロード） | — | ✕ | ◎ | 未着手（Phase 2） |
| F-15 | 累計本数の表示 | — | ◎ | ◎ | 撤回（無料で全期間表示） |
| F-16 | バックグラウンド継続実行 | `shadow_swing_background` | ✕ | ◎ | 実装済み（mobile） |
| F-17 | バイブレーション設定 | `shadow_swing_vibration` | ✕ | ◎ | 実装済み |
| F-18 | 素振りの推移詳細（年 / 月 / 日別） | `practice_menu_trend_detail` | ✕ | ◎ | 実装済み |

---

## データモデル

### shadow_swing_sessions テーブル（実装済み）

```ruby
create_table :shadow_swing_sessions do |t|
  t.bigint  :user_id, null: false
  t.date    :logged_on, null: false                              # JST の実施日
  t.integer :target_count, null: false                           # 目標本数
  t.integer :swing_count, default: 0, null: false                # 実際の本数
  t.datetime :completed_at                                       # nil の間は未完了
  t.bigint  :practice_log_id                                     # 完了時に紐付く練習ログ
  t.decimal :interval_seconds, precision: 4, scale: 1, default: 5.0, null: false
  t.boolean :vibration_enabled, default: false, null: false
  t.boolean :sound_enabled, default: true, null: false
  t.boolean :voice_enabled, default: false, null: false          # カウントの読み上げ
  t.timestamps
end

add_index :shadow_swing_sessions, [:user_id, :logged_on]
```

- 当初案の `completed_count` / `duration_seconds` / `sound_setting` / `started_at` / `ended_at` は**採用しなかった**。実施日は `logged_on`（JST の日付）、完了時刻は `completed_at` で持ち、所要時間はクライアント側の表示のみで永続化しない
- 合図の設定は単一の `sound_setting` ではなく、音・読み上げ・バイブの独立したフラグで持つ

### 完了処理（`ShadowSwingSession#complete!`）

- `completed_at` が入っていれば何もしない（リトライによる二重加算を防ぐ冪等処理）
- 同日・`source: 'shadow_swing'` の練習ログがあれば行ロック下で本数を加算、無ければ新規作成（同日は1レコードにまとめる）
- **0本での完了は練習ログを作らない**。`amount` 0 のログが1件の活動として草・Streak を薄めてしまうため。セッションだけ完了扱いにする
- 「素振り」という名前の既存練習メニューが `count` 単位ならそれに紐付け、無ければ `count` 単位で新規作成する。`count` 以外の単位の同名メニューがある場合は紐付けない（数値の意味が壊れるため）
- 練習ログの `after_commit` で当日の `activity_logs`（草・Streak）が再計算される

### 累計集計（practice_logs から集計）

累計は `shadow_swing_sessions` ではなく `practice_logs`（`source: 'shadow_swing'`）から集計する。
未完了セッションを含めない／同日の複数セッションを二重計上しないため。

```ruby
logs = user.practice_logs.where(source: 'shadow_swing')
logs.where(logged_on: today).sum(:amount)                          # 今日
logs.where(logged_on: today.beginning_of_month..today).sum(:amount) # 今月
logs.sum(:amount)                                                   # 通算
```

---

## API 設計

v2（`Api::V2::ShadowSwingSessionsController`）で実装。当初案の v1・カウント中の中間更新（PATCH）・セッション一覧（index）は**実装していない**。

| メソッド | パス | 用途 | 権限 |
|--------|----|----|----|
| POST | `/api/v2/shadow_swing_sessions` | セッション開始 | 無料 |
| POST | `/api/v2/shadow_swing_sessions/:id/complete` | セッション完了 | 無料 |
| GET | `/api/v2/shadow_swing_sessions/stats` | 累計統計（今日 / 今月 / 通算） | 無料 |
| GET | `/api/v2/shadow_swing_sessions/trend` | 推移詳細（年 / 月 / 日別） | Pro（`practice_menu_trend_detail`） |

### POST /api/v2/shadow_swing_sessions

リクエスト（`shadow_swing_session` でラップ）:
```json
{
  "shadow_swing_session": {
    "target_count": 200,
    "interval_seconds": 2.0,
    "vibration_enabled": false,
    "sound_enabled": true,
    "voice_enabled": false
  }
}
```

レスポンス（201, `V2::ShadowSwingSessionSerializer`）:
```json
{
  "id": 123,
  "logged_on": "2026-05-31",
  "target_count": 200,
  "swing_count": 0,
  "completed_at": null,
  "practice_log_id": null,
  "interval_seconds": 2.0,
  "vibration_enabled": false,
  "sound_enabled": true,
  "voice_enabled": false
}
```

Pro 限定の設定値を無料ユーザーが送ると 422（`{"errors": [...]}`）。クライアントはレスポンスの設定値をそのままカウンター画面へ渡し、**サーバーが受理した設定でしか実行できない**ようにする。

### POST /api/v2/shadow_swing_sessions/:id/complete

リクエスト:
```json
{ "shadow_swing_session": { "swing_count": 200 } }
```

レスポンスは同じセッションのシリアライズ結果（`swing_count` / `completed_at` / `practice_log_id` が確定）。
Streak は別途 `GET /api/v2/activity_logs/streak` で取得する（完了レスポンスには含めない）。

### GET /api/v2/shadow_swing_sessions/stats

```json
{ "today_count": 200, "month_count": 4500, "total_count": 12450 }
```

---

## UI 仕様

### 設定画面（開始前）

```
┌────────────────────────────────┐
│  素振りカウンター               │
│                                │
│  目標本数: [  200  ] 本         │
│  インターバル: [ 5.0 ] 秒        │
│   （無料は5〜8秒。外はPro🔒）   │
│                                │
│  合図: [笛の音] [読み上げ]       │
│  バイブレーション: [   ] 🔒Pro   │
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
│   練習記録に保存しました         │
│                                │
│   今日:  200本                  │
│   今月:  4,500本                │
│   通算:  12,450本               │
│                                │
│   [ もう一度 ]   [ 閉じる ]      │
└────────────────────────────────┘
```

保存はセッション完了と同時に自動で行うため、手動の「練習記録に保存」ボタンは無い。所要時間・平均インターバルは表示しない（永続化もしない）。
通信エラーで保存できなかった場合のみ、達成本数の下に保存失敗の旨を表示する（達成演出自体は出す）。

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| アプリをバックグラウンドにした | Pro（`shadow_swing_background`）: 無音ループ再生で継続実行 / 無料: 一時停止 |
| 画面ロック（Web） | Screen Wake Lock で画面スリープを抑止 |
| 設定範囲外の数値入力 | クライアントでブロックし、サーバー側でも `ShadowSwingSession` のバリデーションで検証 |
| Pro 判定がまだ確定していない | mobile は解放扱い（Pro ユーザーへのロック表示フラッシュを防ぐ）、Web は無料扱いのうえ「確認中」表示。いずれも最終判定はサーバー側 |
| バイブ非対応ブラウザ（iOS Safari 等） | Pro でも設定不可（`navigator.vibrate` の有無を優先判定） |
| 0本のまま終了 | セッションは完了扱いにするが練習ログは作らない（草・Streak を薄めないため） |
| 完了リクエストのリトライ | `completed_at` 済みなら何もしない冪等処理で二重加算を防ぐ |
| 同日に複数セッション | 同日の素振り練習ログ1件に行ロック下で加算（一意制約違反はリトライして先勝ち行へ加算） |
| インターバル中に手動カウントしたい | （Phase 2）手動カウントモード |

---

## テスト要件

### 単体テスト

- [ ] ShadowSwingSession モデルのバリデーション
- [ ] 累計集計のクエリ
- [ ] practice_log との紐付け

### 統合テスト

- [ ] セッション開始 → 完了 の API フロー
- [ ] Pro 設定のサーバー側ブロック（無料ユーザーの範囲外インターバル・バイブ有効化）

### 手動テスト

- [ ] iOS で合図音が正しく再生される
- [ ] バックグラウンド継続実行（Pro機能）
- [ ] バイブレーションの動作確認

---

## 完了の定義（Definition of Done）

- [x] iOS で設定→実行→完了→保存のフルフローが動作
- [x] 本数は無料でも制限しない（サーバー検証は `> 0` のみ）
- [x] 無料ユーザーはインターバル5〜8秒・バイブ不可に制限される（サーバー側でも検証）
- [x] 練習記録と自動連動する
- [x] Streak（草機能）に反映される
- [x] 累計本数が正しく集計される
- [ ] Sentry でエラー監視できる

---

## 後で詰める論点

- [x] Web 版でも提供するか? → 提供する（実装済み）
- [x] バックグラウンド実行の iOS 仕様確認 → 無音ループ再生で継続実行（Pro 限定）
- [ ] 合図音のデフォルト音源（楽曲使用権の確認）
- [ ] 手動カウントモードは Phase 2 で良いか
- [ ] 「失敗」検知（インターバルより長く間が空いた）の実装可否
- [ ] カスタム合図音のアップロード（F-14）を Phase 2 で実装するか
