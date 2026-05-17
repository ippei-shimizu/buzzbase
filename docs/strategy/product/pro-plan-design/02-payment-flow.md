# Design Doc: 課金フロー

**作成日**: 2026-05-12
**最終更新**: 2026-05-12（解約・返金・課金失敗フロー、支払い方法、ユーザー通知を追加）
**Status**: Draft
**関連 PRD**: [`../pro-plan-prd/02-payment-flow.md`](../pro-plan-prd/02-payment-flow.md)
**前提 Design Doc**: [`./01-system-architecture.md`](./01-system-architecture.md)

---

## Background

iOS IAP + Web Stripe + RevenueCat を用いた Pro サブスクの課金フロー実装。
業界ベストプラクティスに沿って、Webhook の冪等性・非同期処理・イベント順序非依存設計を採用。
解約後のデータ保持、再加入時のトライアル禁止、課金失敗時の Grace Period 対応も含む。

---

## Goals

- iOS / Web 両方で安定した課金体験を提供
- Webhook の信頼性を最大化（冪等性、リトライ、順序非依存）
- 早期特典（30日無料）と通常トライアル（7日無料）を正しく出し分け
- 解約・返金・課金失敗の各フローを正しく処理
- 監査ログによる課金トラブルの追跡
- 適切なユーザー通知（解約完了、期限切れ前、課金失敗等）

---

## Non-goals

- Android 課金（Phase 2）
- プラン変更（月額↔年額）の実装（Phase 2）
- 解約理由アンケート（Phase 2）

---

## Detailed Design

### 1. 加入フロー（iOS IAP）

```
ユーザーが Pro 機能をタップ
        ↓
Pro 案内モーダル表示
        ↓
「Pro に加入する」タップ
        ↓
react-native-purchases で purchasePackage() 呼び出し
        ↓
StoreKit (iOS IAP) で課金処理
  - Apple ID 認証（Touch ID / Face ID）
  - 支払い方法は Apple ID 設定のものを使用
        ↓
RevenueCat に購入情報送信
        ↓
RevenueCat が back に Webhook 送信
        ↓
Sidekiq が非同期で処理
        ↓
subscriptions.status を 'trial' or 'active' に更新
has_used_trial = true をセット
        ↓
アプリで Pro 機能解放
```

### 2. 加入フロー（Web Stripe）

```
ユーザーが Pro 機能をタップ
        ↓
Pro 案内ページ表示
        ↓
「Pro に加入する」タップ
        ↓
front から back の POST /api/v1/pro/checkout 呼び出し
        ↓
back で Stripe Checkout Session 作成
  - trial_period_days を動的設定（早期/通常）
  - has_used_trial が true なら trial_period_days = 0
        ↓
Stripe Checkout URL に redirect
        ↓
Stripe で決済情報入力（クレカ / Apple Pay / Google Pay）
        ↓
Stripe → RevenueCat → back Webhook で状態更新（非同期）
        ↓
Web で Pro 機能解放
```

### 3. 解約フロー 🆕

#### iOS（Apple 規約準拠）

```
ユーザー: アプリ内で「Pro解約」タップ
  ↓
解約方法ガイドモーダル表示
  「設定 → Apple ID → サブスクリプション → BUZZ BASE Pro → 解約」
  ↓
ユーザーが iOS 設定アプリで解約
  ↓
Apple → RevenueCat → back に CANCELLATION Webhook
  ↓
back: subscription.status を 'cancelled' に更新
  - cancelled_at = now
  - expires_at は維持（期限まで Pro 機能利用可）
  ↓
ユーザー通知（メール）
  「次回更新日（X月X日）まで Pro 機能をご利用いただけます」
  ↓
期限到来時に EXPIRATION Webhook
  ↓
back: subscription.status を 'expired' に
  ↓
Pro 機能無効化、無料機能のみ利用可
```

#### Web（自前画面）

```
ユーザー: /account/subscription → 「解約する」タップ
  ↓
解約確認モーダル
  「次回課金日まで Pro 機能を利用できます」
  「解約しますか？」
  ↓
front から back の DELETE /api/v1/pro/subscription 呼び出し
  ↓
back: Stripe で subscription.cancel_at_period_end = true を設定
  ↓
Stripe → RevenueCat → back に CANCELLATION Webhook
  ↓
back: subscription.status を 'cancelled' に更新
  ↓
解約完了画面表示
  ↓
ユーザー通知（メール）
```

### 4. 課金失敗フロー（Billing Issue）🆕

```
クレカ期限切れ等で課金失敗
  ↓
Apple/Google/Stripe が自動リトライ（Billing Grace Period 中）
  ↓
RevenueCat → back に BILLING_ISSUE Webhook
  ↓
back: subscription.status を 'billing_issue' に更新
  - billing_issue_at = now
  - expires_at は維持（Grace Period 中は Pro 機能利用可）
  ↓
ユーザー通知（プッシュ通知 + メール）
  「決済情報を確認してください」
  ↓
パターンA: ユーザーが決済情報更新
  → RENEWAL Webhook
  → subscription.status を 'active' に戻す
  → 'recovered' イベント記録

パターンB: Grace Period 終了
  → EXPIRATION Webhook
  → subscription.status を 'expired' に
  → Pro 機能無効化
```

### 5. 返金フロー（Refund）🆕

```
ユーザーが Apple/Stripe に返金請求
  ↓
返金承認後、REFUND Webhook
  ↓
back: subscription.status を 'expired' に
  - refunded_at = now
  - expires_at = now（即時期限切れ）
  ↓
Pro 機能即時無効化
  ↓
ユーザー通知（メール）
  「返金が完了しました」
```

### 6. 再加入フロー 🆕

```
解約済み（expired）ユーザーが再加入
  ↓
Pro 加入ボタンタップ
  ↓
iOS / Web の各フローで購入処理
  - has_used_trial = true なので、トライアル無し
  - 即時課金開始
  ↓
INITIAL_PURCHASE Webhook 受信
  ↓
back: subscription.status を 'active' に
  - has_used_trial は true のまま
  - 過去データ全復活
  ↓
Pro 機能即時利用可能
```

### 7. 支払い方法の対応

#### iOS（Apple IAP）

| 支払い方法 | 対応 |
|----|----|
| Apple ID 登録クレカ | ✅ |
| Apple Pay | ✅ |
| キャリア決済（au, docomo, SoftBank） | ✅ |
| iTunes ギフトカード残高 | ✅ |

→ Apple ID の設定に従う。BUZZ BASE 側で選択させない。

#### Web（Stripe）

Stripe ダッシュボードで有効化する決済手段:

| 支払い方法 | 有効化 | 理由 |
|----|----|----|
| クレジットカード（Visa, Mastercard, JCB, AMEX） | ✅ | 必須、最も普及 |
| Apple Pay | ✅ | モバイル決済UX向上 |
| Google Pay | ✅ | Android Web ユーザー向け |
| Link（Stripe 保存決済） | ✅ | デフォルト有効、再利用UX◎ |
| コンビニ払い | ❌ | 即時性なく Pro 即時開始と相性悪い |
| 口座振替 | ❌ | 入金確認に時間 |
| キャリア決済 | ❌ | Stripe で非対応 |

→ クレカ + Apple Pay + Google Pay + Link の組み合わせで運用。

### 8. RevenueCat 設定

#### Entitlement

| Entitlement | 説明 |
|----------|----|
| `pro` | Pro 機能の利用権限 |

#### Product

| Product ID | プラットフォーム | 価格 | トライアル |
|----------|------------|----|-------|
| `buzzbase_pro_monthly` | iOS, Web | ¥300 | 7日無料 |
| `buzzbase_pro_yearly` | iOS, Web | ¥2,980 | 7日無料 |

#### Offer（早期特典）

| Offer ID | 用途 | 期間 |
|--------|----|----|
| `early_30days_free` | リリース後7日以内の特典 | 30日無料 |

### 9. Apple App Store Connect 設定

#### Subscription Group

| グループ名 | 内容 |
|------|----|
| BUZZ BASE Pro | 月額・年額を1グループにまとめる（業界推奨） |

#### Introductory Offer（通常トライアル）

| プラン | オファータイプ | 期間 |
|------|-----------|----|
| `buzzbase_pro_monthly` | Free Trial | 1 week |
| `buzzbase_pro_yearly` | Free Trial | 1 week |

#### Promotional Offer（早期特典）

| プラン | オファータイプ | 期間 | 配布方法 |
|------|-----------|----|----|
| `buzzbase_pro_monthly` | Free Trial | 1 month | アプリ内で Offer Code 自動付与 |
| `buzzbase_pro_yearly` | Free Trial | 1 month | 同上 |

### 10. Webhook の冪等性

#### webhook_events テーブル

```ruby
class CreateWebhookEvents < ActiveRecord::Migration[7.0]
  def change
    create_table :webhook_events do |t|
      t.string :provider, null: false        # 'revenuecat' / 'stripe'
      t.string :event_id, null: false
      t.string :event_type, null: false
      t.json :payload
      t.datetime :received_at, null: false
      t.datetime :processed_at
      t.string :processing_status            # 'pending'/'success'/'failed'
      t.text :error_message
      t.timestamps
    end
    add_index :webhook_events, [:provider, :event_id], unique: true
    add_index :webhook_events, :processing_status
  end
end
```

#### 冪等性の判定ロジック

```ruby
class RevenueCatWebhookProcessor
  def initialize(webhook_event)
    @webhook_event = webhook_event
    @payload = webhook_event.payload
    @event_data = @payload['event']
  end

  def process
    return if @webhook_event.processed_at.present?

    begin
      handle_event
      @webhook_event.update!(processing_status: 'success', processed_at: Time.current)
    rescue StandardError => e
      @webhook_event.update!(processing_status: 'failed', error_message: e.message)
      Sentry.capture_exception(e, tags: { source: 'revenuecat_webhook' })
      raise
    end
  end

  private

  def handle_event
    user = User.find_by(id: extract_user_id)
    return unless user

    case @event_data['type']
    when 'INITIAL_PURCHASE', 'TRIAL_STARTED'
      handle_initial_purchase(user)
    when 'RENEWAL'
      handle_renewal(user)
    when 'CANCELLATION'
      handle_cancellation(user)
    when 'EXPIRATION'
      handle_expiration(user)
    when 'BILLING_ISSUE'
      handle_billing_issue(user)
    when 'PRODUCT_CHANGE'
      handle_product_change(user)
    when 'REFUND'
      handle_refund(user)
    end

    record_subscription_event(user)
  end
end
```

### 11. 非同期処理（Sidekiq）

```ruby
class Api::V1::WebhooksController < ApplicationController
  skip_before_action :authenticate_user!
  before_action :verify_revenuecat_signature

  def revenuecat
    webhook_event = WebhookEvent.find_or_create_by!(
      provider: 'revenuecat',
      event_id: params[:event][:id]
    ) do |we|
      we.event_type = params[:event][:type]
      we.payload = params.to_unsafe_h
      we.received_at = Time.current
      we.processing_status = 'pending'
    end

    if webhook_event.processing_status == 'pending'
      RevenueCatWebhookJob.perform_later(webhook_event.id)
    end

    head :ok
  rescue StandardError => e
    Sentry.capture_exception(e)
    head :internal_server_error
  end

  private

  def verify_revenuecat_signature
    expected = "Bearer #{ENV['REVENUECAT_WEBHOOK_SECRET']}"
    head :unauthorized unless request.headers['Authorization'] == expected
  end
end

class RevenueCatWebhookJob < ApplicationJob
  queue_as :default

  def perform(webhook_event_id)
    webhook_event = WebhookEvent.find(webhook_event_id)
    RevenueCatWebhookProcessor.new(webhook_event).process
  end
end
```

### 12. イベント順序非依存設計

```ruby
class RevenueCatWebhookProcessor
  def handle_renewal(user)
    new_expires_at = Time.zone.at(@event_data['expiration_at_ms'] / 1000)
    subscription = user.subscription || user.build_subscription

    # 既に新しいイベントで更新済みなら無視
    return if subscription.expires_at.present? && subscription.expires_at >= new_expires_at

    subscription.update!(
      status: 'active',
      expires_at: new_expires_at,
      last_synced_at: Time.current
    )
  end
end
```

### 13. 各イベントハンドラの実装

```ruby
def handle_initial_purchase(user)
  subscription = user.subscription || user.build_subscription
  is_trial = @event_data['period_type'] == 'TRIAL'

  subscription.update!(
    status: is_trial ? 'trial' : 'active',
    plan_type: detect_plan_type(@event_data['product_id']),
    platform: detect_platform(@event_data['store']),
    product_id: @event_data['product_id'],
    started_at: Time.zone.at(@event_data['event_timestamp_ms'] / 1000),
    expires_at: Time.zone.at(@event_data['expiration_at_ms'] / 1000),
    has_used_trial: is_trial || subscription.has_used_trial,
    is_early_subscriber: in_early_window?(@event_data['event_timestamp_ms']),
    last_synced_at: Time.current
  )
end

def handle_cancellation(user)
  subscription = user.subscription
  return unless subscription

  subscription.update!(
    status: 'cancelled',
    cancelled_at: Time.current,
    last_synced_at: Time.current
  )

  # ユーザー通知
  SubscriptionCancelledNotificationJob.perform_later(user.id)
end

def handle_expiration(user)
  subscription = user.subscription
  return unless subscription

  subscription.update!(
    status: 'expired',
    last_synced_at: Time.current
  )

  SubscriptionExpiredNotificationJob.perform_later(user.id)
end

def handle_billing_issue(user)
  subscription = user.subscription
  return unless subscription

  subscription.update!(
    status: 'billing_issue',
    billing_issue_at: Time.current,
    last_synced_at: Time.current
  )

  BillingIssueNotificationJob.perform_later(user.id)
end

def handle_refund(user)
  subscription = user.subscription
  return unless subscription

  subscription.update!(
    status: 'expired',
    refunded_at: Time.current,
    expires_at: Time.current,
    last_synced_at: Time.current
  )

  RefundNotificationJob.perform_later(user.id)
end
```

### 14. ユーザー通知の実装

| イベント | 通知内容 | 手段 |
|----|----|----|
| 解約申請 完了 | 「次回更新日（X月X日）まで Pro 機能を利用できます」 | アプリ内 + メール |
| 期限切れ 3日前 | 「あと3日で Pro 期間が終了します」 | プッシュ通知 |
| 期限切れ 当日 | 「Pro 期間が終了しました」 | アプリ内 + メール |
| 課金失敗 | 「決済情報を確認してください」 | プッシュ通知 + メール |
| 返金処理完了 | 「返金が完了しました」 | メール |
| トライアル終了 3日前 | 「あと3日でトライアル終了、課金が始まります」 | プッシュ通知 |

#### 期限切れ前リマインダーの実装

```ruby
# 毎日 00:00 に実行
class TrialExpiringReminderJob < ApplicationJob
  def perform
    Subscription.where(status: 'trial')
                .where(expires_at: 3.days.from_now.beginning_of_day..3.days.from_now.end_of_day)
                .find_each do |subscription|
      SubscriptionMailer.trial_expiring_soon(subscription.user).deliver_later
      PushNotificationService.send_trial_expiring(subscription.user)
    end
  end
end

class ProExpiringReminderJob < ApplicationJob
  def perform
    Subscription.where(status: %w[cancelled billing_issue])
                .where(expires_at: 3.days.from_now.beginning_of_day..3.days.from_now.end_of_day)
                .find_each do |subscription|
      SubscriptionMailer.pro_expiring_soon(subscription.user).deliver_later
      PushNotificationService.send_pro_expiring(subscription.user)
    end
  end
end
```

### 15. POST /api/v1/pro/checkout（Web Stripe 用）

#### リクエスト

```json
{
  "plan": "monthly",
  "success_url": "https://buzzbase.jp/pro/success",
  "cancel_url": "https://buzzbase.jp/pro/cancel"
}
```

#### レスポンス

```json
{
  "checkout_url": "https://checkout.stripe.com/c/pay/xxxx"
}
```

#### 実装

```ruby
class Api::V1::ProController < ApplicationController
  def checkout
    plan = params[:plan]
    return render_error('Invalid plan') unless %w[monthly yearly].include?(plan)

    trial_days = determine_trial_days(current_user)

    session = Stripe::Checkout::Session.create({
      customer_email: current_user.email,
      payment_method_types: %w[card],
      line_items: [{ price: stripe_price_id(plan), quantity: 1 }],
      mode: 'subscription',
      subscription_data: {
        trial_period_days: trial_days,
        metadata: {
          user_id: current_user.id,
          plan: plan
        }
      },
      success_url: params[:success_url],
      cancel_url: params[:cancel_url]
    })

    render json: { checkout_url: session.url }
  end

  private

  def determine_trial_days(user)
    # 再加入時はトライアルなし
    return 0 if user.subscription&.has_used_trial?

    early_window_start = Time.zone.parse('2026-05-31 00:00:00')
    early_window_end = Time.zone.parse('2026-06-06 23:59:59')

    if Time.current.between?(early_window_start, early_window_end)
      30
    else
      7
    end
  end

  def stripe_price_id(plan)
    case plan
    when 'monthly' then ENV['STRIPE_PRICE_ID_MONTHLY']
    when 'yearly' then ENV['STRIPE_PRICE_ID_YEARLY']
    end
  end
end
```

### 16. 監査ログへの記録

```ruby
def record_subscription_event(user)
  UserSubscriptionEvent.create!(
    user: user,
    subscription: user.subscription,
    event_type: @event_data['type'].downcase,
    platform: detect_platform(@event_data['store']),
    product_id: @event_data['product_id'],
    period_type: @event_data['period_type'],
    occurred_at: Time.zone.at(@event_data['event_timestamp_ms'] / 1000),
    raw_payload: @event_data,
    revenuecat_event_id: @event_data['id']
  )
rescue ActiveRecord::RecordNotUnique
  # 既に記録済み（冪等性）
end
```

### 17. プライバシーマニフェスト（iOS 17+）

#### 必須対応項目

| 項目 | 内容 |
|----|----|
| `NSPrivacyTracking` | true（ATT 対応のため） |
| `NSPrivacyTrackingDomains` | トラッキングに使用するドメイン |
| `NSPrivacyCollectedDataTypes` | 収集するデータ種別 |
| `NSPrivacyAccessedAPITypes` | 使用する Apple API の理由 |

#### サードパーティ SDK の宣言

| SDK | 提供データ | 必要な宣言 |
|----|-------|----|
| RevenueCat SDK | 購入情報 | 最新版が自動対応 |
| AdMob SDK | 広告情報、IDFA | NSPrivacyTracking = true、ドメイン宣言 |
| Sentry SDK | エラー情報 | データ収集の宣言 |

### 18. UI 実装方針

- `ProSubscriptionModal`（mobile）/ `ProSubscriptionPage`（web）
- `SubscriptionCancelPage`（web）
- `SubscriptionStatusCard`（共通）
- `PaywallModal`（Design Doc-01 で定義）
- `BillingIssueAlert`（共通、Grace Period 中の警告表示）
- `TrialExpiringBanner`（トライアル期限直前の予告）

### 19. テスト戦略

#### 単体テスト

- RevenueCatWebhookProcessor の各イベントタイプ（PURCHASE, RENEWAL, CANCELLATION, EXPIRATION, BILLING_ISSUE, REFUND）
- 冪等性の判定ロジック
- イベント順序非依存設計
- determine_trial_days のロジック（早期 / 通常 / 再加入時）
- Subscription.pro_active? の判定（trial/active/cancelled/billing_issue 全パターン）

#### 統合テスト

- iOS IAP の購入フロー（Sandbox）
- Web Stripe の購入フロー（Test Mode）
- 解約 → 期限切れ → 再加入 のフルフロー
- Billing Issue → Recovered のフロー
- 返金フロー
- Webhook 受信 → DB 更新 → 監査ログ記録
- クロスプラットフォーム同期

#### 手動テスト

- 早期特典期間（5/31〜6/6）の動作
- 通常トライアル期間（6/7以降）の動作
- トライアル期間中の解約
- トライアル終了時の自動課金
- 課金失敗時の通知
- 再加入時のトライアル無効化

---

## Alternatives Considered

### Alternative 1: Webhook を同期処理

#### Cons
- 10秒タイムアウトに引っかかる可能性
- 重い処理で 5xx が出る
- リトライ嵐になる

#### 却下理由
業界ベストプラクティスに反する。

### Alternative 2: 自前で冪等性チェック（テーブルなし）

#### Cons
- プロセス再起動で揮発
- マルチプロセスで競合
- 監査ログとして残らない

#### 却下理由
信頼性が低い。

### Alternative 3: Stripe Webhook を直接受信（RevenueCat 経由しない）

#### Cons
- iOS IAP との統合が困難
- クロスプラットフォーム同期を自前で実装
- RevenueCat の標準化されたイベント形式を享受できない

#### 却下理由
RevenueCat 採用方針と矛盾。

### Alternative 4: コンビニ払い・口座振替も Stripe で有効化

#### Cons
- 入金確認に時間がかかる（Pro 即時開始と相性悪い）
- UX 複雑化

#### 却下理由
Pro 即時利用と相性悪い。

---

## Trade-offs

### メリット
- Webhook の信頼性最大化
- イベント順序が乱れても正しい状態を保てる
- 非同期処理で API レスポンスが速い
- 監査ログによる課金トラブルの追跡可能
- 解約後もデータ保持し、再加入動機を強化

### デメリット
- 実装が複雑（冪等性、非同期、順序非依存、Grace Period）
- 複数テーブル（subscriptions / webhook_events / user_subscription_events）の保守必要
- Sidekiq 等のジョブキュー導入が必要

### 受容理由
課金は事業の生命線。信頼性を優先する。

---

## Open Questions

- [ ] BUZZ BASE に Sidekiq は既に導入されているか？（未導入なら追加必要）
- [ ] Stripe Checkout の戻り URL は固定 or 動的？
- [ ] Subscription 作成タイミング: ユーザー登録時に free で作るか、初課金時か
- [ ] iOS の解約ガイドモーダルから iOS 設定アプリへの遷移は Linking.openURL で可能か

---

## Implementation Plan

### Phase A: 事前準備（5/13）

- [ ] RevenueCat アカウント作成 + プロジェクト設定
- [ ] App Store Connect でサブスク商品作成
- [ ] App Store Connect で Promotional Offer 設定
- [ ] Stripe アカウントで商品作成
- [ ] Stripe ダッシュボードで決済手段有効化（クレカ + Apple Pay + Google Pay + Link）
- [ ] AdMob アカウント作成

### Phase B: バックエンド実装（5/14-5/17）

- [ ] webhook_events テーブルマイグレーション
- [ ] /api/v1/pro/checkout エンドポイント
- [ ] /api/v1/pro/subscription エンドポイント（Web解約用）
- [ ] /api/v1/webhooks/revenuecat エンドポイント
- [ ] RevenueCatWebhookProcessor サービス（全イベント対応）
- [ ] RevenueCatWebhookJob
- [ ] Stripe Webhook 受信処理
- [ ] 期限切れ前リマインダーバッチ
- [ ] 各種通知メーラー
- [ ] 環境変数設定（development / production）

### Phase C: クライアント実装（5/17-5/19）

- [ ] mobile: iOS IAP 経由の Pro 加入フロー
- [ ] mobile: 解約ガイドモーダル
- [ ] front: Stripe Checkout 経由の Pro 加入フロー
- [ ] front: 解約フロー（/account/subscription）
- [ ] 共通: BillingIssueAlert、TrialExpiringBanner

### Phase D: 法務対応（5/13-5/20）

- [ ] 特定商取引法に基づく表記
- [ ] 利用規約のサブスク条項追加
- [ ] プライバシーポリシーの改訂
- [ ] プライバシーマニフェスト（iOS 17+）

### Phase E: 統合テスト（5/19-5/22）

- [ ] iOS Sandbox で全フロー動作確認
- [ ] Stripe Test Mode で全フロー動作確認
- [ ] 解約 → 期限切れ → 再加入のフルフロー
- [ ] クロスプラットフォーム同期
- [ ] 冪等性の検証（同一イベント二重送信）
- [ ] イベント順序逆転時の挙動確認
- [ ] Billing Issue 通知の確認

---

## 追加設計事項（2026-05-17 更新）

### Solid Queue による Webhook 非同期処理

```ruby
# Gemfile
gem 'solid_queue'

# config/application.rb
config.active_job.queue_adapter = :solid_queue

# Webhook 受信時
class Api::V1::WebhooksController < ApplicationController
  def revenuecat
    webhook_event = WebhookEvent.find_or_create_by!(
      provider: 'revenuecat',
      event_id: params[:event][:id]
    ) do |we|
      we.event_type = params[:event][:type]
      we.payload = params.to_unsafe_h
      we.received_at = Time.current
      we.processing_status = 'pending'
    end

    RevenueCatWebhookJob.perform_later(webhook_event.id) if webhook_event.processing_status == 'pending'
    head :ok
  end
end

# Job クラス
class RevenueCatWebhookJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :exponentially_longer, attempts: 5

  def perform(webhook_event_id)
    webhook_event = WebhookEvent.find(webhook_event_id)
    RevenueCatWebhookProcessor.new(webhook_event).process
  end
end
```

### UNCANCELLATION イベント対応

ユーザーが Apple/Stripe で「自動更新ON」に戻した場合の処理:

```ruby
def handle_uncancellation(user)
  subscription = user.subscription
  return unless subscription&.cancelled?

  subscription.update!(
    status: 'active',
    cancelled_at: nil,
    last_synced_at: Time.current
  )

  record_subscription_event(user, 'uncancelled')
end
```

### メール変更時の Stripe Customer 同期

```ruby
class User < ApplicationRecord
  after_update :sync_stripe_customer_email, if: :saved_change_to_email?

  private

  def sync_stripe_customer_email
    return unless subscription&.platform_web?
    StripeCustomerUpdateJob.perform_later(id)
  end
end

class StripeCustomerUpdateJob < ApplicationJob
  queue_as :default

  def perform(user_id)
    user = User.find(user_id)
    return unless user.subscription&.stripe_customer_id
    Stripe::Customer.update(user.subscription.stripe_customer_id, email: user.email)
  end
end
```

### アカウント削除前のサブスク強制解約

```ruby
class User < ApplicationRecord
  before_destroy :prevent_destroy_if_pro_active

  private

  def prevent_destroy_if_pro_active
    return unless subscription&.pro_active?
    errors.add(:base, 'Pro 加入中のため、先に解約してください')
    throw :abort
  end
end

# Controller
class Api::V1::UsersController < ApplicationController
  def destroy
    if current_user.subscription&.pro_active?
      render json: {
        error: 'pro_active',
        message: 'Pro 加入中のため、先に解約してください'
      }, status: :unprocessable_entity
    else
      current_user.destroy!
      head :no_content
    end
  end
end
```

### UI: Pro 期限の表示

設定画面に Pro 状態を表示:

| 状態 | 表示内容 |
|----|----|
| `active` | 「Pro 加入中: 次回更新 2026-06-30」 |
| `trial` | 「トライアル中: あと 5日（2026-06-22 まで）」 |
| `cancelled` | 「解約済み: 2026-06-30 まで Pro 機能利用可」 |
| `billing_issue` | 「決済情報の確認が必要です」（赤いバナー） |
| `expired` | 「無料プラン」+ Pro 加入ボタン |
| `free` | 「無料プラン」+ Pro 加入ボタン |

### プラン変更（月額↔年額）

ファーストリリースに含める。

#### iOS

App Store の Subscription Group 内のプラン変更は Apple が自動対応:
- 同一 Group 内で別 product 選択
- Apple が proration 計算
- ユーザーへの返金・追加課金を自動処理

#### Web (Stripe)

```ruby
class Api::V1::ProController < ApplicationController
  def change_plan
    new_plan = params[:plan]  # 'monthly' or 'yearly'
    subscription = current_user.subscription

    Stripe::Subscription.update(
      subscription.stripe_subscription_id,
      items: [{
        id: subscription.stripe_item_id,
        price: stripe_price_id(new_plan)
      }],
      proration_behavior: 'create_prorations'
    )

    render json: { ok: true }
  end
end
```

### 解約引き止め + 解約理由アンケート

#### フロー

```
1. ユーザー: 「解約する」タップ
2. 引き止めモーダル表示
   - 「次回更新日まで Pro 機能を利用できます」
   - 「Pro 期間に蓄積したデータは閲覧不可になります」
   - 「[使い続ける]」ボタン（メイン）
   - 「[解約を続ける]」リンク（サブ）
3. 解約理由アンケート（Flipper.enabled?(:cancellation_survey) で制御）
   - 価格が高い
   - 使う機会が減った
   - 期待した機能がなかった
   - 競合サービスに移った
   - その他（テキスト）
4. 解約完了
```

#### データモデル

```ruby
class CreateCancellationFeedbacks < ActiveRecord::Migration[7.1]
  def change
    create_table :cancellation_feedbacks do |t|
      t.references :user, null: false, foreign_key: true
      t.references :subscription, foreign_key: true
      t.string :reason  # 'expensive'/'less_usage'/'feature_missing'/'competitor'/'other'
      t.text :note
      t.timestamps
    end
  end
end
```

### グレース期間の設定方法

| プラットフォーム | 設定場所 | デフォルト | 推奨設定 |
|----|----|----|----|
| Apple | App Store Connect → アプリ内課金 → Billing Grace Period | 無効 | **有効化（16日）** |
| Stripe | Stripe ダッシュボード → Settings → Subscriptions and emails → Smart Retries | 有効（4回） | デフォルトのまま |
| Google | Phase 2（Android リリース時） | - | - |

#### リリース前チェックリスト

- [ ] App Store Connect で Billing Grace Period を有効化（16日）
- [ ] Stripe で Smart Retries が有効化されているか確認
- [ ] Sandbox / Test Mode で Grace Period の挙動を検証

### 本番テスト戦略

| 環境 | テスト方法 |
|----|----|
| Web | 本番デプロイ + Flipper で ippei のみ有効化 + Stripe Test Mode |
| iOS | TestFlight 配信 + Sandbox テスター + RevenueCat Sandbox |

#### Stripe Test Mode の活用

```ruby
# 環境変数で切り替え
Stripe.api_key = if ENV['USE_STRIPE_TEST_MODE'] == 'true'
                   ENV['STRIPE_SECRET_KEY_TEST']
                 else
                   ENV['STRIPE_SECRET_KEY']
                 end
```

#### iOS Sandbox の準備

- App Store Connect → ユーザーとアクセス → Sandbox → テスター作成
- TestFlight 配信のアプリで Sandbox Apple ID でログイン
- 課金は実お金不要

### 課金エラー対応プラン（詳細版）

#### Level 1: 自動回復（ユーザー操作不要）

| 状況 | 対応 |
|----|----|
| Webhook 一時失敗 | RevenueCat が最大72時間自動リトライ |
| Apple の請求失敗 | Apple が自動リトライ + Billing Grace Period（16日） |
| Stripe の請求失敗 | Smart Retries（最大4回、最大15日間リトライ） |
| Solid Queue Job 失敗 | 指数バックオフでリトライ（最大5回） |

#### Level 2: ユーザー対応（決済情報更新）

| 状況 | 対応 |
|----|----|
| クレカ期限切れ | プッシュ通知 + メール「決済情報を確認してください」 |
| 残高不足 | 同上 |
| アプリ内 | `BillingIssueAlert` コンポーネントで警告表示 |

#### Level 3: 開発者対応（個別調査）

| 状況 | 対応 |
|----|----|
| Sentry でエラー検知 | ippei さんに通知 |
| 二重課金疑惑 | RevenueCat / Stripe ダッシュボードで個別調査 |
| 同期不整合 | 管理画面から手動で subscription 状態修正、`/api/v1/pro/sync` で再同期 |

#### Level 4: 緊急モード（Flipper 活用）

| 状況 | 対応 |
|----|----|
| 課金エラー多発 | `Flipper.disable(:pro_features)` で即時新規加入停止 |
| 課金フロー全停止が必要 | Pro 加入ページを「メンテナンス中」に切り替え |
| RevenueCat 全体障害 | ローカルキャッシュで継続、新規購入のみ一時停止 |

#### 監視・アラート設定

| ツール | 監視内容 | アラート閾値 |
|----|----|----|
| Sentry | 課金エラー率 | > 5% で通知 |
| RevenueCat | 日次の購入失敗数 | > 10/日 で通知 |
| Stripe | チャージ失敗数 | > 10/日 で通知 |

#### リリース当日の特別対応

| 時刻 | 対応 |
|----|----|
| 09:00 | 各ダッシュボード確認、Flipper の状態確認 |
| 12:00 | 本番デプロイ、Flipper.enable で全員有効化 |
| 12:00〜18:00 | Sentry / RevenueCat / Stripe を1時間ごとに確認 |
| 18:00 | 1日目のサマリー、エラー多発時は緊急対応 |

---

## 参考資料

- [Best practices I wish we knew when integrating Stripe webhooks](https://www.stigg.io/blog-posts/best-practices-i-wish-we-knew-when-integrating-stripe-webhooks)
- [Stripe Webhook Best Practices](https://hookray.com/blog/stripe-webhook-best-practices-2026)
- [Idempotent requests | Stripe API Reference](https://docs.stripe.com/api/idempotent_requests)
- [Apple Auto-renewable Subscriptions](https://developer.apple.com/app-store/subscriptions/)
- [How to Avoid SaaS Failed Payments](https://www.chargebee.com/blog/saas-failed-payments/)
- [Flipper Documentation](https://www.flippercloud.io/docs)
- [Solid Queue](https://github.com/rails/solid_queue)
