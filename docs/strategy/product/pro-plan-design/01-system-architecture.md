# Design Doc: システムアーキテクチャ

**作成日**: 2026-05-12
**最終更新**: 2026-05-12（解約フロー・cancelled/billing_issue ステータス・データ保持ポリシー追加）
**Status**: Draft
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

- Android 課金の実装（Phase 2 以降）
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
| API | Rails 7.0 (API) + PostgreSQL 15.5 + devise_token_auth + AMS |
| Mobile | React Native + Expo SDK 55 + NativeWind v4 + axios |
| 認証 | devise_token_auth |
| エラー監視 | Sentry |

### 2. Pro 機能による追加コンポーネント

```
┌─────────────────────────────────────────────┐
│   front (Web)         mobile (iOS)          │
│   ├─ Stripe.js        ├─ react-native-      │
│   │                   │  google-mobile-ads  │
│   │                   ├─ react-native-      │
│   │                   │  purchases          │
│   │                   ├─ expo-tracking-     │
│   │                   │  transparency       │
│   └─ RevenueCat Web SDK                     │
│           ↓                                 │
│   ┌──────────────────────────┐              │
│   │     RevenueCat           │              │
│   │  サブスク状態管理         │              │
│   │  (Source of Truth)       │              │
│   └──────────────────────────┘              │
│           ↓ Webhook                         │
│   ┌──────────────────────────┐              │
│   │     back (Rails API)     │              │
│   └──────────────────────────┘              │
│           ↓                                 │
│   ┌──────────────────────────┐              │
│   │     PostgreSQL DB        │              │
│   └──────────────────────────┘              │
└─────────────────────────────────────────────┘
```

#### 新規追加サービス

| サービス | 用途 | 料金 |
|---------|----|----|
| RevenueCat | iOS IAP + Web Stripe のサブスク状態統合管理（決済はしない） | $2,500/月までは無料 |
| Stripe | Web 決済処理 | 3.6% + ¥10/件 |
| Apple App Store Connect | iOS IAP 設定、Promotional Offer 配布 | 30%（1年目）/ 15%（2年目以降） |
| AdMob | mobile アプリ広告配信（PRD-10 参照） | 30%（Google税） |

### 3. Source of Truth の階層

```
┌─────────────────────────────┐
│ Source of Truth: RevenueCat │
└─────────────────────────────┘
            ↓ Webhook（リアルタイム）
┌─────────────────────────────┐
│ Cache: Rails DB             │
│ - subscriptions テーブル    │
└─────────────────────────────┘
            ↓ API
┌─────────────────────────────┐
│ Cache: front / mobile       │
│ - useProStatus() で取得     │
│ - メモリキャッシュ          │
└─────────────────────────────┘
```

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

```ruby
class CreateSubscriptions < ActiveRecord::Migration[7.0]
  def change
    create_table :subscriptions do |t|
      t.references :user, null: false, foreign_key: true, index: { unique: true }
      t.string :status, null: false, default: 'free'
      t.string :plan_type                                # 'monthly'/'yearly'/nil
      t.string :platform                                 # 'ios'/'web'/'android'
      t.string :product_id                               # 'buzzbase_pro_monthly' 等
      t.datetime :started_at
      t.datetime :expires_at
      t.datetime :cancelled_at                           # 🆕 解約申請日時
      t.datetime :refunded_at                            # 🆕 返金日時
      t.datetime :billing_issue_at                       # 🆕 課金失敗日時
      t.boolean :has_used_trial, default: false          # 🆕 トライアル使用済みフラグ
      t.string :revenuecat_user_id
      t.string :revenuecat_entitlement_id, default: 'pro'
      t.boolean :is_early_subscriber, default: false
      t.datetime :last_synced_at
      t.timestamps
    end

    add_index :subscriptions, :status
    add_index :subscriptions, :revenuecat_user_id, unique: true
    add_index :subscriptions, :expires_at
  end
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
      t.json :raw_payload
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
  has_many :user_subscription_events, dependent: :destroy

  enum status: {
    free: 'free',
    trial: 'trial',
    active: 'active',
    cancelled: 'cancelled',
    billing_issue: 'billing_issue',
    expired: 'expired',
    pending: 'pending'
  }

  enum plan_type: {
    monthly: 'monthly',
    yearly: 'yearly'
  }, _prefix: :plan

  enum platform: {
    ios: 'ios',
    web: 'web',
    android: 'android'
  }, _prefix: :platform

  # Pro 機能が利用可能か
  # trial / active / cancelled / billing_issue は期限内なら利用可
  def pro_active?
    return true if force_pro_for_testing?
    return false unless %w[trial active cancelled billing_issue].include?(status)
    expires_at.nil? || expires_at > Time.current
  end

  def in_trial?
    trial? && expires_at&.> Time.current
  end

  def in_grace_period?
    cancelled? || billing_issue?
  end

  def days_remaining
    return nil unless expires_at
    [(expires_at.to_date - Date.current).to_i, 0].max
  end

  # トライアル可能か（再加入時の判定）
  def can_use_trial?
    !has_used_trial?
  end

  private

  def force_pro_for_testing?
    Rails.env.development? && user.admin?
  end
end
```

#### User モデルへの拡張（最小限）

```ruby
class User < ApplicationRecord
  include Entitlement

  has_one :subscription, dependent: :destroy

  def admin?
    is_admin?
  end

  def subscription_or_default
    subscription || Subscription.new(user: self, status: 'free')
  end

  def pro_active?
    subscription_or_default.pro_active?
  end

  def in_trial?
    subscription_or_default.in_trial?
  end
end
```

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

  PRO_FEATURES = %w[
    no_ads
    season_transition_graph
    grass_full_history
    unlimited_practice_menus
    unlimited_media_uploads
    media_long_term_storage
    unlimited_schedules
    unlimited_monthly_goals
    season_goals
    custom_notification_messages
    advanced_goal_tracking
    detailed_condition_log
  ].freeze

  ALL_FEATURES = FREE_FEATURES + PRO_FEATURES

  def has_entitlement?(feature_key)
    raise ArgumentError, "Unknown feature: #{feature_key}" unless ALL_FEATURES.include?(feature_key)
    return true if FREE_FEATURES.include?(feature_key)
    pro_active?
  end
end
```

### 8. データ保持ポリシー（ロック方式）🆕

#### 基本方針

- **DB にはデータを保持し続ける**（解約・期限切れでも削除しない）
- **UI 表示・API レスポンスで Pro 判定して制御**
- **再加入時に即座に全データ復活**（Loss Aversion でリテンション向上）

#### 機能ごとの挙動

| データ | Pro 期間中 | cancelled（期限内） | expired（無料に戻った後） |
|----|----|----|----|
| 練習メニュー（4個目以降） | 表示・編集可 | 表示・編集可 | **非表示・編集不可**（archived 表示なし） |
| 動画・画像（31日以上前） | 表示可 | 表示可 | **非表示** |
| 草機能（過去31日以上） | 表示可 | 表示可 | **非表示** |
| シーズン跨ぎグラフ | 表示可 | 表示可 | **閲覧不可** |
| 詳細統計 | 表示可 | 表示可 | **閲覧不可** |
| 試合記録（無料機能） | 表示・編集可 | 表示・編集可 | **表示・編集可** |
| 練習記録（基本） | 表示・編集可 | 表示・編集可 | **表示・編集可** |

#### 実装イメージ

```ruby
# 練習メニュー取得時
def practice_menus_for(user)
  scope = user.practice_menus.where(archived: false)
  scope = scope.limit(3) unless user.has_entitlement?('unlimited_practice_menus')
  scope
end

# 動画取得時
def media_attachments_for(user)
  scope = user.media_attachments
  unless user.has_entitlement?('unlimited_media_uploads')
    scope = scope.where(created_at: 30.days.ago..)
  end
  scope
end

# 草機能取得時
def heatmap_for(user, from:, to:)
  unless user.has_entitlement?('grass_full_history')
    from = [from, 30.days.ago.to_date].max  # 直近30日に制限
  end
  user.activity_logs.where(activity_date: from..to)
end
```

#### Business Rules メソッド（書き込み制限）

```ruby
class User < ApplicationRecord
  def can_create_practice_menu?
    return true if has_entitlement?('unlimited_practice_menus')
    practice_menus.where(archived: false).count < 3
  end

  def can_upload_media_this_month?
    return true if has_entitlement?('unlimited_media_uploads')
    media_attachments.where(created_at: Time.current.beginning_of_month..).count < 3
  end

  def can_create_schedule?
    return true if has_entitlement?('unlimited_schedules')
    schedules.where(active: true).count < 1
  end

  def can_create_monthly_goal?
    return true if has_entitlement?('unlimited_monthly_goals')
    goals.monthly.active.count < 1
  end

  def can_create_season_goal?
    has_entitlement?('season_goals')
  end
end
```

### 9. クライアント側の抽象化

#### useEntitlement カスタムフック

```typescript
// front / mobile 共通インターフェース
const FREE_FEATURES = [...] as const;
const PRO_FEATURES = [...] as const;

export type Feature = typeof FREE_FEATURES[number] | typeof PRO_FEATURES[number];

export function useEntitlement() {
  const { proStatus } = useProStatus();

  const hasEntitlement = useCallback((feature: Feature): boolean => {
    if ((FREE_FEATURES as readonly string[]).includes(feature)) return true;
    return proStatus.isActive;
  }, [proStatus.isActive]);

  return {
    isPro: proStatus.isActive,
    inTrial: proStatus.status === 'trial',
    inGracePeriod: ['cancelled', 'billing_issue'].includes(proStatus.status),
    hasEntitlement,
  };
}
```

#### ProGate ラッパーコンポーネント

```typescript
interface ProGateProps {
  feature: Feature;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ProGate({ feature, children, fallback }: ProGateProps) {
  const { hasEntitlement } = useEntitlement();
  if (hasEntitlement(feature)) return <>{children}</>;
  return <>{fallback ?? <PaywallModal feature={feature} />}</>;
}
```

#### PaywallModal 統一コンポーネント

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
      <Button onPress={() => showRewardedAd(feature)}>広告を見て1回お試し</Button>
      <Button onPress={onClose}>閉じる</Button>
    </Modal>
  );
}
```

### 10. API エンドポイント設計

| メソッド | パス | 用途 |
|--------|----|----|
| GET | `/api/v1/pro/status` | 現在のユーザーの Pro 状態取得 |
| POST | `/api/v1/pro/sync` | RevenueCat と Rails の Pro 状態を同期 |
| POST | `/api/v1/webhooks/revenuecat` | RevenueCat からの Webhook 受信 |
| GET | `/api/v1/pro/entitlements/check?key=xxx` | 特定機能の利用可否チェック |
| GET | `/api/v1/pro/entitlements` | 全ての Entitlement リスト取得 |

#### GET /api/v1/pro/status

```json
{
  "subscription": {
    "status": "active",
    "plan_type": "monthly",
    "platform": "ios",
    "started_at": "2026-05-31T00:00:00+09:00",
    "expires_at": "2026-06-30T00:00:00+09:00",
    "in_trial": false,
    "in_grace_period": false,
    "days_remaining": 18,
    "is_early_subscriber": true,
    "has_used_trial": true
  },
  "entitlements": [
    "no_ads",
    "season_transition_graph",
    "grass_full_history",
    // ...
  ]
}
```

### 11. 認証・セキュリティ

#### Webhook 認証

詳細は Design Doc-02 参照。

#### 環境変数

`.env` に追加が必要:

```
# RevenueCat
REVENUECAT_API_KEY_IOS=
REVENUECAT_API_KEY_WEB=
REVENUECAT_WEBHOOK_SECRET=

# Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
STRIPE_PRICE_ID_MONTHLY=
STRIPE_PRICE_ID_YEARLY=

# AdMob
ADMOB_IOS_APP_ID=
ADMOB_IOS_BANNER_UNIT_ID=
ADMOB_IOS_INTERSTITIAL_UNIT_ID=
ADMOB_IOS_REWARDED_UNIT_ID=
```

### 12. Sentry 監視追加

- `pro:webhook:failed` - Webhook 処理失敗
- `pro:sync:mismatch` - Rails / RevenueCat の状態不一致
- `pro:purchase:failed` - 購入処理失敗
- `pro:entitlement:check_failed` - Entitlement チェック失敗

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

## Open Questions

- [ ] Rails で Pundit を採用するか（初期は軽量で開始）
- [ ] Subscription を作成するタイミング（ユーザー登録時 free で作る or 初課金時に作る）
- [ ] entitlement キーの管理（Rails 側と front / mobile 側で重複定義になる）
- [ ] subscription の論理削除 vs 物理削除

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

`flipper`, `flipper-active_record`, `flipper-ui` を導入。

#### 主な Flag

| Flag | 用途 |
|----|----|
| `pro_features` | Pro 機能全体の有効化 |
| `cancellation_survey` | 解約理由アンケート |
| `pro_test_mode` | 本番テスト用 |

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

```typescript
// mobile/hooks/useFeatureFlags.ts
export function useFeatureFlags() {
  const { data } = useQuery({
    queryKey: ['feature_flags'],
    queryFn: () => axiosInstance.get('/api/v1/feature_flags'),
    staleTime: 5 * 60 * 1000,
  });
  return data?.flags ?? {};
}
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

### RevenueCat Custom Attributes

ユーザー属性を RevenueCat に渡してダッシュボードでセグメント分析:

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
