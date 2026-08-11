# Design Doc: システムアーキテクチャ

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（release/pro-202605 の実装を正としてデータモデル・Entitlement・API・環境変数を実態に同期）
**Status**: Implemented
**関連 PRD**: [`../pro-plan-prd/01-system-architecture.md`](../pro-plan-prd/01-system-architecture.md)

---

## Background

BUZZ BASE Pro リリースに伴い、ユーザーの Pro 加入状態を管理し、機能アクセス権を判定するアーキテクチャが必要。
既存システムは front / back / mobile の3サブモジュール構成。
権限管理はこれまで `is_admin` カラムのみで運用。

業界ベストプラクティス（Entitlement Pattern、Wrapper Pattern、FlagProvider 抽象化、分離された Subscription エンティティ）を採用する。

---

## Goals

- ユーザーごとに「Pro 加入状態」「機能アクセス権」を判定できるバックエンド・フロントエンドの仕組み
- iOS / Web で一貫したインターフェース
- 拡張可能なデータモデル（将来の複数プラン、ファミリープラン対応）
- 解約後の Pro 機能データを保持しつつ、適切にロックする
- 監査ログによる課金トラブル追跡

---

## Non-goals

- マルチテナンシー設計
- Pro 機能の個別実装（各機能 Design Doc で設計）

---

## Detailed Design

### 1. 既存システム構成（前提）

```
front (Next.js + TypeScript)
  ↓
back (Rails API、PostgreSQL)
  ↑
mobile (React Native + Expo SDK 55)
```

| 層 | 既存スタック |
|---|---------|
| Web | Next.js + TypeScript + TailwindCSS + Server Components |
| API | Rails 7.1 (API) + PostgreSQL 15.5 + devise_token_auth + AMS |
| Mobile | React Native + Expo SDK 55 + NativeWind v4 + axios |
| 認証 | devise_token_auth |
| エラー監視 | Sentry |

### 2. Pro 機能による追加コンポーネント

```
┌──────────────────────────────────────────────────┐
│  front (Web)            mobile (iOS / Android)   │
│  └─ @stripe/stripe-js   ├─ react-native-         │
│     （Checkout へ遷移）  │  google-mobile-ads     │
│                         ├─ react-native-purchases│
│                         └─ expo-tracking-        │
│                            transparency          │
│         ↓                        ↓               │
│  ┌────────────┐          ┌────────────┐          │
│  │   Stripe   │          │ RevenueCat │          │
│  └────────────┘          └────────────┘          │
│         ↓ Webhook                ↓ Webhook       │
│  ┌────────────────────────────────────┐          │
│  │           back (Rails API)         │          │
│  │  webhook_events に記録 → Job で処理 │          │
│  └────────────────────────────────────┘          │
│                    ↓                             │
│  ┌────────────────────────────────────┐          │
│  │           PostgreSQL DB            │          │
│  └────────────────────────────────────┘          │
└──────────────────────────────────────────────────┘
```

front には RevenueCat Web SDK を入れず、`POST /api/v1/pro/checkout` で back が Stripe Checkout Session を発行し、
その URL へ遷移させる。Web 課金の状態反映は Stripe Webhook（`App::Stripe::WebhookProcessor`）が担う。
mobile は react-native-purchases 経由で RevenueCat を使い、状態反映は RevenueCat Webhook が担う。

#### 新規追加サービス

| サービス | 用途 | 料金 |
|---------|----|----|
| RevenueCat | iOS IAP + Web Stripe のサブスク状態統合管理（決済はしない） | $2,500/月までは無料 |
| Stripe | Web 決済処理 | 3.6% + ¥10/件 |
| Apple App Store Connect | iOS IAP 設定、Promotional Offer 配布 | 30%（1年目）/ 15%（2年目以降） |
| AdMob | mobile アプリ広告配信（PRD-10 参照） | 30%（Google税） |

### 3. Source of Truth の階層

```
┌──────────────────────────────────────┐
│ Source of Truth                      │
│ - iOS / Android: RevenueCat          │
│ - Web: Stripe                        │
└──────────────────────────────────────┘
            ↓ Webhook（リアルタイム）
┌──────────────────────────────────────┐
│ Cache: Rails DB                      │
│ - subscriptions テーブル             │
└──────────────────────────────────────┘
            ↓ API（GET /api/v1/pro/status）
┌──────────────────────────────────────┐
│ Cache: front / mobile                │
│ - useProStatus() で取得              │
│ - front は ProStatusProvider が保持   │
└──────────────────────────────────────┘
```

front の Server Component からは `getCachedProStatus()`（`app/(app)/pro/proStatus.ts`）で
リクエスト単位にメモ化して取得する。Client Component は `ProStatusProvider` 配下の
`useProStatus()` を使う。

### 4. Subscription の状態機械

```
                    [free]
                       ↓ INITIAL_PURCHASE
                    [trial]
                       ↓ TRIAL_CONVERTED
                    [active]
              ↙       ↓       ↘
       [cancelled]   [billing_issue]
            ↓               ↓
       [expired] ← ← ← [expired]
                ↓
       [trial/active] ← 再加入（トライアルなし）
```

#### 状態定義

| 状態 | 意味 | Pro 機能利用可否 |
|----|----|----|
| `free` | 一度も加入していない、または完全期限切れ | ❌ |
| `trial` | トライアル期間中 | ✅（期限内） |
| `active` | 課金中 | ✅（期限内） |
| `cancelled` | 解約申請済み、期限まで利用可 | ✅（期限内） |
| `billing_issue` | 課金失敗、Grace Period 中 | ✅（期限内） |
| `expired` | 期限切れ | ❌ |
| `pending` | 課金処理中（遷移状態） | ❌ |

### 5. データモデル

#### subscriptions テーブル

実装後の `db/schema.rb` 相当（Stripe 連携カラムが後から追加されている）:

```ruby
create_table 'subscriptions' do |t|
  t.bigint   'user_id', null: false
  t.string   'status', default: 'free', null: false
  t.string   'plan_type'                    # 'monthly'/'yearly'/nil
  t.string   'platform'                     # 'ios'/'web'/'android'
  t.string   'product_id'
  t.datetime 'started_at'
  t.datetime 'expires_at'
  t.datetime 'cancelled_at'                 # 解約申請日時
  t.datetime 'refunded_at'                  # 返金日時
  t.datetime 'billing_issue_at'             # 課金失敗日時
  t.boolean  'has_used_trial', default: false, null: false
  t.string   'revenuecat_user_id'
  t.string   'revenuecat_entitlement_id'    # デフォルト値は持たせない
  t.boolean  'is_early_subscriber', default: false, null: false
  t.datetime 'last_synced_at'
  t.timestamps
  t.string   'stripe_customer_id'           # Web 課金用
  t.string   'stripe_subscription_id'       # Web 課金用

  t.index ['user_id'], unique: true
  t.index ['status']
  t.index ['expires_at']
  t.index ['revenuecat_user_id'], unique: true
  t.index ['stripe_customer_id'], unique: true, where: 'stripe_customer_id IS NOT NULL'
  t.index ['stripe_subscription_id'], unique: true, where: 'stripe_subscription_id IS NOT NULL'
end
```

#### users テーブル拡張

users は認証専用。Pro 関連カラムは持たない。

→ **既存の users テーブルへの変更なし**

#### user_subscription_events テーブル（監査ログ）

```ruby
class CreateUserSubscriptionEvents < ActiveRecord::Migration[7.0]
  def change
    create_table :user_subscription_events do |t|
      t.references :user, null: false, foreign_key: true
      t.references :subscription, foreign_key: true
      t.string :event_type, null: false  # 'trial_started'/'purchased'/'cancelled'/'expired'/'refunded'/'billing_issue'/'recovered' 等
      t.string :platform
      t.string :product_id
      t.string :period_type                             # 'TRIAL'/'NORMAL'/'INTRO'
      t.datetime :occurred_at, null: false
      t.jsonb :raw_payload
      t.string :revenuecat_event_id                     # 冪等性用
      t.timestamps
    end
    add_index :user_subscription_events, :revenuecat_event_id, unique: true
    add_index :user_subscription_events, [:user_id, :occurred_at]
    add_index :user_subscription_events, :event_type
  end
end
```

### 6. モデル設計

#### Subscription モデル

```ruby
class Subscription < ApplicationRecord
  belongs_to :user
  # イベントは監査ログなので subscription 削除時も残す
  has_many :user_subscription_events, dependent: :nullify

  STATUSES = %w[free trial active cancelled billing_issue expired pending].freeze
  PRO_ACTIVE_STATUSES = %w[trial active cancelled billing_issue].freeze
  GRACE_STATUSES = %w[cancelled billing_issue].freeze

  enum status: { free: 'free', trial: 'trial', active: 'active', cancelled: 'cancelled',
                 billing_issue: 'billing_issue', expired: 'expired', pending: 'pending' }
  enum plan_type: { monthly: 'monthly', yearly: 'yearly' }, _prefix: :plan
  enum platform: { ios: 'ios', web: 'web', android: 'android' }, _prefix: :platform

  validates :status, inclusion: { in: STATUSES }

  def pro_active?
    return false unless PRO_ACTIVE_STATUSES.include?(status)

    expires_at.nil? || expires_at > Time.current
  end

  def in_trial?
    trial? && (expires_at.nil? || expires_at > Time.current)
  end

  # 「期限切れの cancelled / billing_issue」は無料状態と見なすため false
  def in_grace_period?
    return false unless GRACE_STATUSES.include?(status)

    expires_at.nil? || expires_at > Time.current
  end

  def days_remaining
    return nil unless expires_at

    [(expires_at.to_date - Date.current).to_i, 0].max
  end

  def can_use_trial?
    !has_used_trial?
  end
end
```

**admin の強制 Pro モード（`Rails.env.development? && user.admin?` で `pro_active?` を true にする案）は未実装**。
`pro_active?` に環境依存の分岐は入っておらず、開発時の Pro 確認は subscription レコードを直接書き換えて行う。

#### User モデルへの拡張（最小限）

```ruby
class User < ApplicationRecord
  include Entitlement
  include PlanLimits
  include SubscriptionCallbacks

  has_one :subscription, dependent: :destroy
  has_many :user_subscription_events, dependent: :destroy

  # subscription 未生成のユーザーでも nil 安全に判定できるよう、未保存の free レコードを返す
  def subscription_or_default
    subscription || Subscription.new(user: self, status: 'free')
  end

  delegate :pro_active?, to: :subscription_or_default
  delegate :in_trial?, to: :subscription_or_default
end
```

`SubscriptionCallbacks`（`app/models/concerns/subscription_callbacks.rb`）に Subscription 関連の
コールバックを集約している:

- `after_create :create_default_subscription` — 登録時に `status: 'free'` を作成
- `before_destroy :prevent_destroy_if_pro_active` — Pro 加入中は退会をブロック（外部の自動課金が続くため）
- `after_update :sync_stripe_customer_email` — Web 課金ユーザーの email 変更を Stripe Customer に追従

### 7. Entitlement Module

```ruby
# app/models/concerns/entitlement.rb
module Entitlement
  extend ActiveSupport::Concern

  FREE_FEATURES = %w[
    basic_game_record
    basic_stats
    group_ranking
    calculation_tools
    baseball_note_basic
    shadow_swing_basic
    practice_log_basic
    grass_recent_30days
    monthly_goal_single
    schedule_single
  ].freeze
  # monthly_goal_single: 個人の期間目標（月次/週次/年間）は無料でも 2 つまで作成可
  #                      （カスタム期間は Pro 限定の custom_period_goals）
  # schedule_single:     自主練スケジュールは無料でも無制限に作成可（キー名は初期案の名残）

  # Pro 機能の追加に伴い実装時点で 30 件超まで拡張されている。
  # 最新の正はコード（app/models/concerns/entitlement.rb）を参照。
  PRO_FEATURES = %w[
    no_ads
    season_transition_graph
    grass_full_history
    unlimited_practice_menus
    unlimited_media_uploads
    schedule_copy_next_week
    unlimited_menu_sets
    unlimited_monthly_goals
    season_goals
    tournament_goals
    custom_notification_messages
    detailed_condition_log
    unlimited_improvement_themes
    correlation_insights
    unlimited_reflection_templates
    advanced_periodic_review
    note_tags
    multi_game_result_notes
    multi_improvement_theme_links
    practice_menu_trend_detail
    custom_period_goals
    manual_metric_goals
    shadow_swing_custom_interval
    shadow_swing_vibration
    shadow_swing_background
    schedule_calendar_full_history
    unlimited_groups
    hit_direction_average
    count_situation_average
    pitch_type_average
    pitcher_faceoff_average
  ].freeze

  ALL_FEATURES = FREE_FEATURES + PRO_FEATURES

  def has_entitlement?(feature_key)
    raise ArgumentError, "Unknown feature: #{feature_key}" unless ALL_FEATURES.include?(feature_key)
    return true if FREE_FEATURES.include?(feature_key)
    pro_active?
  end
end
```

初期案にあった `media_long_term_storage` / `unlimited_schedules` / `advanced_goal_tracking` は
キー自体を廃止した。メディア保管期間は `unlimited_media_uploads` に統合し、
自主練スケジュールは無料でも無制限としたためキーが不要になった。

### 8. データ保持ポリシー（ロック方式）🆕

#### 基本方針

- **DB にはデータを保持し続ける**（解約・期限切れでも削除しない）
- **UI 表示・API レスポンスで Pro 判定して制御**
- **再加入時に即座に全データ復活**（Loss Aversion でリテンション向上）

#### 機能ごとの挙動

| データ | Pro 期間中 | cancelled（期限内） | expired（無料に戻った後） | ロックの実装箇所 |
|----|----|----|----|----|
| 練習メニュー（4個目以降） | 表示・編集可 | 表示・編集可 | **非表示・編集不可** | front / mobile（`hasEntitlement`） |
| 動画・画像 | 制限なし | 制限なし | 月3点・動画30秒/480p・画像5MB まで | back `MediaAttachments::LimitValidator` |
| 草機能（過去31日以上） | 表示可 | 表示可 | **非表示** | back `Api::V2::ActivityLogsController` |
| シーズン跨ぎグラフ | 表示可 | 表示可 | **閲覧不可** | front / mobile |
| 詳細統計 | 表示可 | 表示可 | **閲覧不可** | front / mobile |
| 試合記録（無料機能） | 表示・編集可 | 表示・編集可 | **表示・編集可** | — |
| 練習記録（基本） | 表示・編集可 | 表示・編集可 | **表示・編集可** | — |

**メディアの「30日で非表示」は実装していない**。過去にアップロードした動画・画像は無料に戻っても
閲覧できる。無料/Pro の差は「当月アップロード可能な点数」と「動画の長さ・解像度、画像サイズ」で表現する。

#### 実装イメージ

back で絞り込むのは草機能のみ。練習メニュー等の一覧ロックはクライアント側で行う。

```ruby
# 草機能取得時（Api::V2::ActivityLogsController）
def heatmap_for(user, from:, to:)
  unless user.has_entitlement?('grass_full_history')
    from = [from, Date.current - (FREE_WINDOW_DAYS - 1)].max
  end
  user.activity_logs.where(activity_date: from..to)
end

# メディアアップロード（MediaAttachments::LimitValidator）
# 無料: 動画 30秒 / 長辺 480px、画像 5MB
# Pro : 動画 180秒 / 長辺 1280px、画像 10MB
```

#### Business Rules メソッド（書き込み制限）

`app/models/concerns/plan_limits.rb` の `PlanLimits` concern に集約し、User に include する。
上限値は定数で持ち、`can_*?` は「Entitlement があれば即 true、無ければ現在の保有数で判定」の形に統一する。

```ruby
module PlanLimits
  extend ActiveSupport::Concern

  PRACTICE_MENU_FREE_LIMIT = 3
  MEDIA_UPLOAD_FREE_LIMIT_PER_MONTH = 3
  MENU_SET_FREE_LIMIT = 2
  MONTHLY_GOAL_FREE_LIMIT = 2
  IMPROVEMENT_THEME_FREE_LIMIT = 2
  REFLECTION_TEMPLATE_FREE_LIMIT = 1
  GROUP_FREE_LIMIT = 1
  INSIGHT_COMBINATION_LIMIT = 20  # 機能自体が Pro 限定のため Pro 内での歯止め

  def can_create_practice_menu?
    return true if has_entitlement?('unlimited_practice_menus')

    practice_menus.where(archived: false).count < PRACTICE_MENU_FREE_LIMIT
  end

  # 以下同型: can_upload_media_this_month? / can_create_menu_set? /
  # can_create_monthly_goal? / can_create_improvement_theme? /
  # can_create_reflection_template? / can_create_or_join_group?

  # Pro 限定機能はそのまま entitlement を返す
  def can_create_season_goal? = has_entitlement?('season_goals')
  def can_create_tournament_goal? = has_entitlement?('tournament_goals')
  def can_create_custom_period_goal? = has_entitlement?('custom_period_goals')
  def can_create_manual_metric_goal? = has_entitlement?('manual_metric_goals')
end
```

- 自主練スケジュールは無料でも無制限にしたため `can_create_schedule?` は存在しない
- 個人の期間目標（月次/週次/年間/カスタム）は無料枠 2 件を共有する（初期案の 1 件から変更）
- 当月のメディア件数は `failed` と放置された `pending`（1時間経過）を除外して数える

### 9. クライアント側の抽象化

#### useEntitlement カスタムフック

```typescript
// front / mobile 共通インターフェース
const FREE_FEATURES = [...] as const;
const PRO_FEATURES = [...] as const;

export type Feature = typeof FREE_FEATURES[number] | typeof PRO_FEATURES[number];

export function useEntitlement() {
  const { proStatus, isPro, isLoading } = useProStatus();

  // サーバーが返した保有キー配列をそのまま参照する（クライアントで Pro 判定を再実装しない）
  const hasEntitlement = useCallback((feature: Feature): boolean => {
    if ((FREE_FEATURES as readonly string[]).includes(feature)) return true;
    return proStatus.entitlements.includes(feature);
  }, [proStatus.entitlements]);

  return {
    isPro,                                          // = subscription.pro_active
    inTrial: proStatus.subscription.in_trial,
    inGracePeriod: proStatus.subscription.in_grace_period,
    isLoading,                                      // 未確定の間だけ true
    hasEntitlement,
  };
}
```

`inTrial` / `inGracePeriod` はサーバーが期限判定済みのフラグを使う。`status` 文字列からクライアントで
判定すると、期限切れの `cancelled` / `billing_issue` を Pro 扱いしてしまうため。

`isLoading` は必須。Pro 状態が確定する前に無料扱いで描画すると、加入済みユーザーにロック UI が
一瞬見える（フリッカー）。

#### ProGate ラッパーコンポーネント

```typescript
interface ProGateProps {
  feature: Feature;
  children: ReactNode;
  /** 未加入時に children の代わりに出す静的ノード */
  fallback?: ReactNode;
  /** タップで加入モーダルを開くロックトリガー。fallback より優先 */
  renderLockedTrigger?: (open: () => void) => ReactNode;
}

export default function ProGate({ feature, children, fallback, renderLockedTrigger }: ProGateProps) {
  const { hasEntitlement, isLoading } = useEntitlement();
  const { open } = useProUpgradeModal();

  if (isLoading) return null;
  if (hasEntitlement(feature)) return <>{children}</>;
  if (renderLockedTrigger) return <>{renderLockedTrigger(() => open({ trigger: feature }))}</>;
  return <>{fallback ?? null}</>;
}
```

ProGate 自身はモーダルをレンダリングしない。front では `ProUpgradeModalProvider` が
モーダルを常設し、ProGate は `open()` を渡すだけにしている（ゲートの数だけモーダルが
マウントされるのを避けるため）。

#### Paywall 統一コンポーネント

front は `ProUpgradeModal` + `paywallCopy.ts`、mobile は `PaywallModal` として実装した。
どちらも「機能キー → 訴求コピー」のマップを1つ持ち、機能ごとに別モーダルは作らない。

```typescript
const PAYWALL_COPY: Record<ProFeature, { title: string; description: string }> = {
  season_transition_graph: {
    title: 'シーズンを跨いだ成長を可視化',
    description: '過去複数シーズンの成績を折れ線グラフで比較できます。',
  },
  grass_full_history: {
    title: '練習履歴を全期間で確認',
    description: '草機能の全期間ヒートマップで、長期の継続を実感できます。',
  },
  // ...
};

export function PaywallModal({ feature, onClose }: PaywallModalProps) {
  const copy = PAYWALL_COPY[feature as ProFeature];
  const router = useRouter();

  return (
    <Modal onClose={onClose}>
      <Title>{copy.title}</Title>
      <Description>{copy.description}</Description>
      <Button onPress={() => router.push('/pro')}>Pro に加入する</Button>
      <Button onPress={onClose}>閉じる</Button>
    </Modal>
  );
}
```

初期案にあった「広告を見て1回お試し」（リワード広告での一時解放）は実装していない。

### 10. API エンドポイント設計

| メソッド | パス | 用途 |
|--------|----|----|
| GET | `/api/v1/pro/status` | 現在のユーザーの Pro 状態 + 保有 entitlement 取得 |
| POST | `/api/v1/pro/sync` | RevenueCat と Rails の Pro 状態を同期 |
| GET | `/api/v1/pro/entitlements` | 全 entitlement キーの granted 一覧取得 |
| POST | `/api/v1/pro/checkout` | Web 加入用の Stripe Checkout Session を発行 |
| PATCH | `/api/v1/pro/subscription` | プラン変更（monthly / yearly） |
| DELETE | `/api/v1/pro/subscription` | Web 課金の解約 |
| POST | `/api/v1/pro/cancellation_feedbacks` | 解約理由アンケートの送信 |
| POST | `/api/v1/webhooks/revenuecat` | RevenueCat からの Webhook 受信 |
| POST | `/api/v1/webhooks/stripe` | Stripe からの Webhook 受信 |
| GET | `/api/v1/feature_flags?keys[]=...` | Flipper の flag 状態取得（ホワイトリスト方式） |

`/pro/entitlements/check?key=xxx`（単一キー照会）は作らなかった。`/pro/status` が保有キーの配列を
返すため、クライアントは1回の取得で全判定でき、キーごとのリクエストが不要になる。

#### GET /api/v1/pro/status

```json
{
  "subscription": {
    "status": "active",
    "plan_type": "monthly",
    "platform": "ios",
    "started_at": "2026-05-31T00:00:00+09:00",
    "expires_at": "2026-06-30T00:00:00+09:00",
    "pro_active": true,
    "in_trial": false,
    "in_grace_period": false,
    "days_remaining": 18,
    "is_early_subscriber": true,
    "has_used_trial": true
  },
  "entitlements": [
    "basic_game_record",
    "no_ads",
    "season_transition_graph",
    "grass_full_history"
  ]
}
```

`entitlements` は無料機能キーも含む「現在保有している全キー」。
`pro_active` はサーバー側で期限判定まで済ませたフラグで、クライアントの Pro 判定はこれを単一の真実とする
（`status` から判定すると、期限切れの `cancelled` / `billing_issue` を誤って Pro 扱いしてしまう）。

#### GET /api/v1/pro/entitlements

```json
{
  "entitlements": [
    { "key": "basic_game_record", "granted": true },
    { "key": "season_transition_graph", "granted": false }
  ]
}
```

#### エラーレスポンス

Pro 関連の 4xx は「安定した機械可読コード（`error`）」を返す。文言はクライアント側で持つ。

| コード | ステータス | 意味 |
|----|----|----|
| `feature_disabled` | 403 | Flipper `pro_features` が無効 |
| `already_subscribed` | 409 | 既に Pro 加入中 |
| `invalid_plan` | 422 | 未知のプラン指定 |
| `no_active_subscription` | 422 | 変更・解約対象の契約が無い |
| `stripe_api_error` / `revenuecat_api_error` | 502 | 決済プロバイダ側の障害 |

### 11. 認証・セキュリティ

#### Webhook 認証

詳細は Design Doc-02 参照。

#### 環境変数

back（`.env`）:

```
REVENUECAT_SECRET_API_KEY=       # REST API から subscriber を取得する用
REVENUECAT_WEBHOOK_SECRET=       # Authorization: Bearer <secret> を検証

STRIPE_SECRET_KEY=
STRIPE_SECRET_KEY_TEST=
USE_STRIPE_TEST_MODE=            # true のときテストキー・テスト商品を使う
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=
STRIPE_PRODUCT_ID_MONTHLY=
STRIPE_PRODUCT_ID_YEARLY=
```

mobile（`EXPO_PUBLIC_*`。AdMob のユニット ID は iOS / Android × 配置画面ごとに分ける）:

```
EXPO_PUBLIC_REVENUECAT_API_KEY_IOS=
EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID=
EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID_{HOME,STATS,GAME_RESULTS,GROUPS,PROFILE,BOTTOM_NAV}_{IOS,ANDROID}=
EXPO_PUBLIC_ADMOB_INTERSTITIAL_UNIT_ID_{IOS,ANDROID}=
```

front は RevenueCat SDK を使わず、Stripe Checkout の URL は back が返すため、Pro 固有の
公開環境変数は持たない。リワード広告は未実装のため `REWARDED` 系のユニット ID も無い。

### 12. Sentry 監視追加

独自イベント名は定義せず、例外をそのまま送って `tags: { source: ... }` で発生箇所を切り分ける。

```ruby
Sentry.capture_exception(e, tags: { source: 'revenuecat_webhook_controller' })
```

主な `source`: `revenuecat_webhook_controller` / `stripe_webhook_controller` /
`pro_sync_controller` / `pro_checkout_controller`

---

## Alternatives Considered

### Alternative 1: users テーブルに直接 Pro 関連カラム追加

#### Pros
- マイグレーション・実装がシンプル
- JOIN 不要でクエリが早い

#### Cons
- **God Table アンチパターン**: users にカラムが増え続ける
- **責務違反**: 認証情報と課金情報が同じテーブル
- **業界標準と乖離**: Stripe / Shopify / Slack は Subscription を別エンティティ
- **将来の拡張困難**

#### 却下理由
責務分離・拡張性を優先。

### Alternative 2: データを物理削除（解約後）

#### Pros
- DB がクリーン
- ストレージコスト削減

#### Cons
- 再加入時にデータが復活しない
- Loss Aversion を活用できない（再加入動機が弱い）
- 業界標準と乖離（Strava、Notion 等はデータ保持）

#### 却下理由
リテンション戦略上、データ保持が有利。

### Alternative 3: 解約後即時に Pro 機能無効化（期限を無視）

#### Pros
- 単純な実装
- 解約しても期限まで使えるのは「無料化」と見なせる

#### Cons
- ユーザー不満（「お金払った分は使わせて」）
- 業界標準と乖離（Apple/Stripe ともに期限まで利用可が標準）

#### 却下理由
ユーザー体験を優先。

---

## Trade-offs

### メリット
- 業界ベストプラクティスと整合
- 責務分離・拡張性が高い
- データ保持で再加入動機を作る
- クライアント側で `if (isPro)` が散らばらない

### デメリット
- 初期実装の複雑性がやや高い（テーブル増・状態多い）
- データロックの UI 表示制御が機能ごとに必要
- ストレージコストは増える（解約後もデータ保持）

### 受容理由
個人開発でも長期保守性は重要。初期コストは小、長期メリット大。

---

## Open Questions（実装で決着した分）

- [x] Rails で Pundit を採用するか → **採用せず**。Entitlement / PlanLimits の concern と
      コントローラの `has_entitlement?` 判定で足りている
- [x] Subscription を作成するタイミング → **ユーザー登録時に `status: 'free'` で作成**
      （`SubscriptionCallbacks#create_default_subscription`）
- [x] entitlement キーの管理 → **Rails と front / mobile で重複定義のまま**。
      サーバーが `/pro/status` で保有キー配列を返し、クライアントは判定ロジックを持たず
      配列の包含チェックだけを行うことで、乖離の影響を「キー名の typo」に閉じ込めている
- [ ] subscription の論理削除 vs 物理削除（未決着。現状は `has_one :subscription, dependent: :destroy`
      で物理削除だが、監査ログの `user_subscription_events` は `dependent: :nullify` で残す）

---

## Implementation Plan

### Phase A: バックエンド基盤（5/13-5/16）

- [ ] subscriptions テーブルマイグレーション（新ステータス含む）
- [ ] user_subscription_events テーブルマイグレーション
- [ ] webhook_events テーブルマイグレーション（Design Doc-02 連動）
- [ ] Subscription モデル
- [ ] Entitlement Module
- [ ] User モデルに Business Rules メソッド追加
- [ ] /api/v1/pro/status エンドポイント
- [ ] /api/v1/pro/sync エンドポイント
- [ ] /api/v1/pro/entitlements エンドポイント

### Phase B: クライアント基盤（5/16-5/18）

- [ ] front: RevenueCat Web SDK 導入
- [ ] front: useProStatus / useEntitlement フック
- [ ] front: ProGate / PaywallModal コンポーネント
- [ ] mobile: react-native-purchases 導入
- [ ] mobile: useProStatus / useEntitlement フック
- [ ] mobile: ProGate / PaywallModal コンポーネント

### Phase C: データ表示制御（5/18-5/20）

各 Pro 機能で「Pro でないデータをロック」表示制御:
- [ ] 練習メニューの3つ上限表示
- [ ] 動画・画像の30日制限
- [ ] 草機能の30日制限
- [ ] シーズン跨ぎグラフの Pro 限定
- [ ] 目標管理の数量制限

### Phase D: 統合テスト（5/20-5/22）

- [ ] iOS Sandbox で動作確認
- [ ] Stripe Test Mode で動作確認
- [ ] クロスプラットフォーム同期確認
- [ ] 解約 → 期限切れ → 再加入のフルフロー確認
- [ ] 強制 Pro モード確認

---

## 追加設計事項（2026-05-17 更新）

### ジョブキュー: Solid Queue 採用

Webhook 非同期処理のためのバックエンド:

| 項目 | 内容 |
|----|----|
| 採用 | Solid Queue（Rails 8 標準、Rails 7.1+ で利用可能） |
| 必要要件 | Rails 7.1+ へのアップグレード（issue #329 で対応） |
| 利点 | Postgres ベース、Redis 不要、追加コストゼロ |
| ダッシュボード | mission_control-jobs（別 gem、admin 限定でマウント） |

#### 設定例

```ruby
# Gemfile
gem 'solid_queue'

# config/application.rb
config.active_job.queue_adapter = :solid_queue
```

### Feature Flag: Flipper 採用

`flipper`, `flipper-active_record` を導入（`flipper-ui` は入れず、操作は Rails console から行う）。

#### 主な Flag

| Flag | 用途 |
|----|----|
| `pro_features` | 新規販売の kill switch（無効時は checkout を 403 で止める） |
| `cancellation_survey` | 解約理由アンケート（無効時はエンドポイントを 404 で隠す） |

クライアントに公開する flag は `Api::V1::FeatureFlagsController::PUBLIC_KEYS` のホワイトリストで
制限する（社内検証用 flag が漏れるのを防ぐため）。`pro_test_mode` は作らなかった。

#### Flag 制御パターン

```ruby
# 特定ユーザーのみ
Flipper.enable_actor(:pro_features, ippei)

# admin グループ
Flipper.register(:admins) { |user| user.respond_to?(:admin?) && user.admin? }
Flipper.enable_group(:pro_features, :admins)

# 段階的リリース（10%）
Flipper.enable_percentage_of_actors(:pro_features, 10)

# 全員に有効化
Flipper.enable(:pro_features)

# 緊急無効化
Flipper.disable(:pro_features)
```

#### mobile での Flag 取得

mobile（React Native）には Flipper を直接導入できないが、`/api/v1/feature_flags` API 経由で flag の状態を取得して制御する。
取得したい flag は `keys[]` で明示し、レスポンスは `{ "<key>": boolean }` のフラットなマップを返す。

```
GET /api/v1/feature_flags?keys[]=pro_features&keys[]=cancellation_survey
→ { "pro_features": true, "cancellation_survey": false }
```

### リリース戦略

- リリースブランチ運用 + Flipper 併用（ダブルセーフ）
- 開発: ippei さんのみ有効化（`Flipper.enable_actor`）
- 審査: 審査者アカウントに有効化（`Flipper.enable_group(:reviewers)`）
- 5/31 リリース: 全員に有効化（`Flipper.enable`）
- 緊急時: 即座に無効化（`Flipper.disable`）

### Subscription 作成タイミング

**ユーザー登録時に `subscription { status: 'free' }` を作成**。
これにより `user.subscription` が常に存在する前提でコードが書ける。

```ruby
class User < ApplicationRecord
  after_create :create_default_subscription

  private

  def create_default_subscription
    create_subscription!(status: 'free')
  end
end
```

### 既存ユーザーマイグレーション（モデル非使用）

Rails のマイグレーションベストプラクティスに従い、**モデルを介さず純 SQL で実行**:

```ruby
class CreateDefaultSubscriptionsForExistingUsers < ActiveRecord::Migration[7.1]
  def up
    execute <<~SQL
      INSERT INTO subscriptions (user_id, status, created_at, updated_at)
      SELECT id, 'free', NOW(), NOW()
      FROM users
      WHERE id NOT IN (SELECT user_id FROM subscriptions);
    SQL
  end

  def down
    execute "DELETE FROM subscriptions WHERE status = 'free';"
  end
end
```

理由: モデルの定義が将来変更されると、過去のマイグレーションが動かなくなる。

### RevenueCat Custom Attributes（未実装）

`Purchases.setAttributes()` の呼び出しは入れていない。将来ダッシュボードでセグメント分析したく
なったときの案として残す:

```typescript
// mobile / front
Purchases.setAttributes({
  '$email': user.email,
  'user_role': user.is_admin ? 'admin' : 'user',
  'registration_date': user.created_at,
  'is_early_subscriber': inEarlyWindow ? 'true' : 'false',
});
```

---

## 参考資料

- [Data Modeling Entitlements and Pricing for SaaS Applications](https://garrettdimon.com/journal/posts/data-modeling-saas-entitlements-and-pricing)
- [Feature Gating: How We Built a Freemium SaaS](https://dev.to/aniefon_umanah_ac5f21311c/feature-gating-how-we-built-a-freemium-saas-without-duplicating-components-1lo6)
- [Feature Flags in Mobile Apps – Architecture & Use Cases](https://www.appsonair.com/blogs/feature-flags-in-mobile-apps-architecture-use-cases)
- [Cross-platform subscription state](https://www.revenuecat.com/blog/engineering/cross-platform-subscription/)
- [Database Design Patterns](https://www.bytebase.com/blog/database-design-patterns/)
- [Flipper Documentation](https://www.flippercloud.io/docs)
- [Solid Queue](https://github.com/rails/solid_queue)
