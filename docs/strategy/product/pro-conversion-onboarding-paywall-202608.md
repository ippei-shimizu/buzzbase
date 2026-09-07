# BUZZ BASE Pro 加入率向上のための Paywall / オンボーディング改修設計（2026年8月）

作成日: 2026-08-27
対象: BUZZ BASE モバイルアプリ（Expo / React Native）
関連: `onboarding-research-202606.md`（獲得・活性化の改修）/ `pro-plan-prd-202605.md`（Pro の機能・価格）
外部参考: Superwall「Multi-page onboarding paywalls convert 37% better than single-page」（2026年2〜5月、オンボーディング配置のペイウォール表示4,000万件超の分析。1画面型 9.07% に対しマルチページ型 12.41%）

## 1. 狙い

Pro 加入率（トライアル開始率）を上げる。課金はまだ本番リリース前のため、リリース前に計測と導線を作り切り、リリース直後から改善サイクルを回せる状態にする。

## 2. 現状

### 2-1. オンボーディングに Pro 訴求が無い

`app/(onboarding)/welcome.tsx` は `constants/onboarding.ts` の3スライド（自動計算 / ランキング / 成長グラフ）を横スクロールで見せ、「はじめる」でサインアップへ送るだけ。Pro には一切触れていない。

参考記事が扱う「オンボーディング配置のペイウォール」自体が存在しないため、記事の知見（1画面 → 複数画面）は、そのままでは適用先が無い。

### 2-2. Paywall は典型的な1画面完結型

`components/pro/PaywallModal.tsx`（1252行）が、1つの縦スクロールに以下を積んでいる。

1. ハイライトカード（トリガーになった機能の訴求）
2. 「PRO でできること」= 全31機能のグループ別比較表（`FEATURE_GROUPS`）
3. プラン選択（月額 / 年額）
4. CTA・復元・規約リンク

参考記事が「1画面型の敗因」として挙げる「価値の説明・不安の解消・価格の提示・支払いの要求を同時に1画面へ詰め込む」構造そのもの。特に31項目の比較表は縦に長く、価格に到達する前にスクロール疲れを起こしている可能性がある。

表示タイミングは機能ゲート到達時のみ（成績分析 / 目標 / 素振り / グループ参加 / ノート / 振り返り）。`app/pro/index.tsx` へは設定画面と特商法ページからのみ遷移できる。

### 2-3. Paywall のファネルを計測できていない

PostHog は導入済み（`posthog-react-native`）だが、`utils/analytics.ts` にある Pro 関連イベントは `trackProFeatureTapped` のみ。Paywall の表示・プラン選択・購入開始 / 完了・離脱のイベントが無く、参考記事が定義するような CVR（表示ユーザーのうちトライアル開始または購入した割合）を算出できない。

改修の前に、ここを埋める必要がある。

### 2-4. 初回記録直後は既に割り込みが混雑している

`app/(game-record)/summary.tsx` の `handleComplete` は、記録保存後に次の順で処理する。

1. ストアレビュー促進プロンプト（`tryShowPrePrompt("complete")`）。出た場合はここで終了
2. インタースティシャル広告（`showMatchSaveInterstitial`。`no_ads` エンタイトルメント保持者はスキップ）
3. 試合結果一覧へ遷移

ただしレビュー促進は `hooks/useStoreReview.ts:19` の `MIN_DAYS_SINCE_INSTALL = 7` により、インストールから7日未満は発火しない。初回記録はほぼ初日に発生する（7日以内記録率 57.9%、ほぼ初日で確定）ため、**初回記録直後にレビュープロンプトが競合する可能性は低い**。実質の競合はインタースティシャル広告のみ。

## 3. 制約と前提

- **ターゲットは中高生**。自分の決済手段を持たない層が一定いるため、KPI は「購入」ではなく「トライアル開始」を主指標に置く
- **登録後 ever 試合記録率は 61.1%**（`onboarding-research-202606.md` の本番DB真値。過去2ヶ月 956人中 584人）。「初回記録後」に Paywall を置くと、リーチできるのは登録者の約6割にとどまる。この制約を承知のうえで、価値を体験した層に絞って訴求する判断とする
- **記録アプリは初回起動時点では価値が実感されない**。1試合も記録していない状態での課金訴求はジャンル的に不利。参考記事の「支払いを求める前に価値を確立する」を、この文脈では「アプリ内の説明」ではなく「実際に1試合記録して自動計算を体験させること」で満たす
- **iOS 審査**: 自動表示する Paywall には常に閉じる導線が必要。既存 `PaywallModal` は閉じるボタンを持つのでこれを踏襲する
- **`pro_features` フラグ**: OFF の間は購入導線（プラン一覧・加入・復元）が出ない設計（`PaywallModal.tsx:481-524`）。計測とオンボ改修は課金リリース前に先行して入れられる

## 4. KPI 定義

分母・分子を固定する。参考記事の定義に揃える。

| 指標 | 定義 |
| ---- | ---- |
| Paywall CVR（主指標） | `paywall_viewed` したユニークユーザーのうち、`paywall_purchase_completed`（トライアル開始を含む）に至った割合。配置（placement）別に算出 |
| ステップ通過率 | マルチページ Paywall の各ステップの `paywall_step_viewed` ユニークユーザー数の推移 |
| 初回記録到達率 | 登録ユーザーのうち初回試合記録を完了した割合（既存の課題指標。Paywall のリーチ上限を規定する） |
| トライアル → 有料転換率 | トライアル開始者のうち初回課金に至った割合。back の `subscription` ステータス遷移から算出 |

表示回数が極端に少ない配置・バリアントは判断材料から外す。

## 5. 施策

### Phase 0: ファネル計測の整備（最優先・課金リリース前に完了させる）

`utils/analytics.ts` に以下を追加する。既存の命名（`posthog?.capture("...")`）に合わせる。

| イベント | プロパティ |
| ---- | ---- |
| `onboarding_step_viewed` | `step_index`, `illustration` |
| `onboarding_completed` | `skipped`（スキップ経由か） |
| `paywall_viewed` | `placement`, `trigger_feature`, `variant` |
| `paywall_step_viewed` | `placement`, `step_index` |
| `paywall_plan_selected` | `plan_type`, `placement` |
| `paywall_purchase_started` | `plan_type`, `placement`, `is_trial_eligible` |
| `paywall_purchase_completed` | `plan_type`, `placement`, `is_trial` |
| `paywall_dismissed` | `placement`, `step_index`（どのステップで閉じたか） |
| `paywall_restore_tapped` | `placement` |

`placement` の値は `feature_gate` / `first_record` / `settings` / `onboarding` を想定し、定数として一元管理する。

購入完了イベントは `PaywallModal` と `app/pro/index.tsx` の両方の購入処理に入れる（同じロジックが二重にあるため、共通フックへの切り出しを合わせて検討する）。

### Phase 1: 初回記録完了直後のマルチページ Paywall

**トリガー**: 初回（1試合目）の試合記録完了時のみ。2試合目以降は出さない。

判定は端末ローカルではなくサーバー側の記録件数を使う（機種変更・再インストールで再表示しないため）。試合結果一覧 API が `pagination.total_count` を返す（`types/gameResult.ts:85-93`）ので、保存後の `total_count === 1` で初回と判定でき、専用 API の追加は不要。

**構成（3ステップ）**: 参考記事の「支払いを求める前に価値を確立する2〜3画面」に沿う。

| ステップ | 役割 | 内容 |
| ---- | ---- | ---- |
| 1 | 達成の承認とパーソナライズ | 「初めての記録おつかれさま」。いま記録した試合から自動計算された自分の指標を提示する。ユーザー自身のデータを見せることが最大の価値証明になる |
| 2 | Pro の価値 | 下記3項目に絞って提示する。31項目の比較表はここでは出さない（「もっと見る」の展開に留める） |
| 3 | 価格と支払い | 月額 / 年額、トライアル、CTA、復元、規約 |

ステップ2で見せる3項目は以下に確定する。

| 項目 | 対応する Pro 機能 | 選定理由 |
| ---- | ---- | ---- |
| 成績の深掘り分析 | `season_transition_graph` / `hit_direction_average` / `count_situation_average` / `pitch_type_average` / `pitcher_faceoff_average` | いま記録したデータの延長線上にあり、ステップ1で見せた指標から文脈が途切れない |
| 目標管理・振り返り | 目標管理グループ / `advanced_periodic_review` | 中高生の「うまくなりたい」という動機に直接訴える |
| 練習記録・野球ノート | 練習を記録グループ / 野球ノートグループ | 試合日以外も使う機能で、継続利用に直結する |

広告非表示（`no_ads`）はステップ2に含めない。この配置では Paywall を閉じた直後にインタースティシャル広告が出るため、「広告非表示」を訴求してから広告を見せる順序になり、逆効果になりうる。機能ゲート経由の Paywall では従来どおり比較表に含める。

各ステップに閉じる導線を置き、`paywall_dismissed` にステップ番号を含めてどこで落ちたかを測る。

**割り込みの優先順位**: 初回記録完了時に限り、以下の順で1つだけ出す。

1. Paywall（初回記録時のみ）
2. インタースティシャル広告

レビュー促進は前述のとおり初回記録時には発火しないため、調停の対象は広告のみとなる。`no_ads` は Pro 特典なので、広告を見せた直後に「広告非表示は Pro で」と出す順序は避ける（不快感が上回る）。Paywall を先に出し、閉じられた場合のみ広告を出す。

### Phase 2: 既存 PaywallModal のステップ分割

機能ゲート経由の Paywall（`placement: feature_gate`）も、Phase 1 で作るマルチステップ基盤に載せ替える。

| ステップ | 内容 |
| ---- | ---- |
| 1 | トリガーになった機能の訴求（現在の `contextMessage` + ハイライトカード） |
| 2 | Pro でできること（`FEATURE_GROUPS` の比較表。ここに隔離する） |
| 3 | 価格と支払い |

現行の1画面型はバリアントとして残し、Phase 3 で比較する。

### Phase 3: A/B テストと最適化

PostHog の feature flag でバリアントを出し分ける。

- 比較軸1: 1画面型 vs マルチステップ型（参考記事の主張の自社検証）
- 比較軸2: 初回記録直後の Paywall あり / なし
- 比較軸3: プラン初期選択（月額 / 年額。別途 ippei-shimizu/buzzbase#557 で月額デフォルトへ変更予定）

判定は Phase 0 で定義した CVR を使い、表示回数が少ないバリアントは除外する。

## 6. 主な変更対象

| 役割 | パス |
| ---- | ---- |
| 計測イベント定義 | `mobile/utils/analytics.ts` |
| Paywall 本体 | `mobile/components/pro/PaywallModal.tsx` |
| Pro 単独画面 | `mobile/app/pro/index.tsx` |
| 記録完了フロー | `mobile/app/(game-record)/summary.tsx` |
| オンボーディング | `mobile/app/(onboarding)/welcome.tsx` / `mobile/constants/onboarding.ts` |
| 機能ゲートからの呼び出し | `app/(tabs)/stats.tsx` / `app/(goal)/*` / `app/(shadow-swing)/setup.tsx` / `app/(tabs)/(groups)/join.tsx` / `app/(review)/list.tsx` ほか |

## 7. リスク

| リスク | 対応 |
| ---- | ---- |
| 初回記録直後の Paywall が離脱を招く | 閉じる導線を各ステップに置く。`paywall_dismissed` のステップ別分布を見て、離脱が集中するステップを削る |
| リーチが登録者の約6割に限られる | 記録到達率の改善（`onboarding-research-202606.md` の施策）と並行して進める。Paywall 改修だけでは上限に当たる |
| 中高生が決済手段を持たない | 主指標をトライアル開始に置く。保護者との共有を想定した文言（App Store のファミリー共有は月額プランで「オンにする」が未設定）は別途検討 |
| 割り込みが3重になる | 初回記録時は1つだけ出す優先順位を実装で強制する |
| 参考記事のデータが自社と条件が違う | グローバル・多ジャンルの集計値なので、そのまま当てはめず A/B で自社検証する |

## 8. 決定事項

2026-08-27 時点で以下を確定した。

| 論点 | 決定 | 補足 |
| ---- | ---- | ---- |
| ステップ2の訴求項目 | 成績の深掘り分析 / 目標管理・振り返り / 練習記録・野球ノート の3項目 | 広告非表示は表示順序の問題で除外 |
| front（Web）の対応 | mobile 先行 | 課金の中心が iOS のため。効果を確認してから front へ展開する |
| 自動表示のトリガー | 初回記録完了時のみ | まず1箇所で検証し、データを見てから増やすか判断する |

## 9. 未決事項

- Phase 1 の効果が確認できた後、front（Web）の `ProUpgradeModal` をどのタイミングで揃えるか
- 初回記録以外のトリガー（N試合目、グループ参加時など）を追加するかどうか。Phase 0 の計測データを見て判断する
