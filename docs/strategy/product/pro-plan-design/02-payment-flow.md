# Design Doc: 課金フロー

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（release/pro-202605 の実装に合わせて実クラス構成・テーブル定義・価格・Product ID を反映）
**Status**: Implemented（release/pro-202605）
**関連 PRD**: [`../pro-plan-prd/02-payment-flow.md`](../pro-plan-prd/02-payment-flow.md)
**前提 Design Doc**: [`./01-system-architecture.md`](./01-system-architecture.md)

---

## Background

iOS IAP + Web Stripe + RevenueCat を用いた Pro サブスクの課金フロー実装。
業界ベストプラクティスに沿って、Webhook の冪等性・非同期処理・イベント順序非依存設計を採用。
解約後のデータ保持、再加入時のトライアル禁止、課金失敗時の Grace Period 対応も含む。

---

## Goals

- iOS / Android / Web すべてで安定した課金体験を提供
- Webhook の信頼性を最大化（冪等性、リトライ、順序非依存）
- 通常トライアル（7日無料）を初回加入のユーザーにのみ付与
- 解約・返金・課金失敗の各フローを正しく処理
- 監査ログによる課金トラブルの追跡
- 適切なユーザー通知（解約完了、期限切れ前、課金失敗等）

---

## Non-goals

- 早期特典としての 30日無料トライアルの出し分け（`is_early_subscriber` の記録のみ実装）
- ファミリープラン・法人プラン

---

## Detailed Design

### 1. 加入フロー（ストア課金: iOS IAP / Google Play Billing）

```
ユーザーが Pro 機能をタップ
        ↓
Pro 案内モーダル（PaywallModal）表示
        ↓
「Pro に加入する」タップ
        ↓
react-native-purchases で purchasePackage() 呼び出し
  （services/revenueCatService.ts が SDK の薄いラッパー。
    未 configure 時は no-op / null フォールバックで開発環境を壊さない）
        ↓
StoreKit (iOS) / Google Play Billing (Android) で課金処理
  - 支払い方法はストアアカウント設定のものを使用
        ↓
RevenueCat に購入情報送信
        ↓
RevenueCat が back に Webhook 送信（POST /api/v1/webhooks/revenuecat）
        ↓
Solid Queue の RevenueCatWebhookJob が非同期で処理
        ↓
subscriptions.status を 'trial' or 'active' に更新
has_used_trial = true をセット
        ↓
アプリで Pro 機能解放
```

RevenueCat の `app_user_id` は必ず `String(user.id)` を渡す。back の `RevenueCat::UserResolver`
がこの文字列で User を引くため、ここがずれると課金済みでも entitlement が付与されない。

### 2. 加入フロー（Web Stripe）

```
ユーザーが Pro 機能をタップ
        ↓
Pro 案内ページ表示
        ↓
「Pro に加入する」タップ
        ↓
front の Server Action startProCheckout() → back の POST /api/v1/pro/checkout
  - Flipper :pro_features が無効なら Stripe を呼ばずに 403 feature_disabled
  - 加入中なら 409 already_subscribed
  - success_url / cancel_url はサーバー側の APP_URL から組み立てる
    （クライアント発の origin を受け取ると任意ドメインを差し込まれるため）
        ↓
back で Stripe Checkout Session 作成（App::Stripe::CheckoutSessionBuilder）
  - TrialDaysCalculator.for(user) で trial_period_days を決定（0 or 7）
  - 0 のときは trial_period_days キー自体を送らない（compact で除去）
        ↓
Stripe Checkout URL に redirect
        ↓
Stripe で決済情報入力（決済手段は Stripe ダッシュボード設定に委譲。
  payment_method_types はコード側で固定しない）
        ↓
[A] Stripe → back の POST /api/v1/webhooks/stripe
      checkout.session.completed で stripe_customer_id / stripe_subscription_id のみ保存
[B] Stripe → RevenueCat → back の POST /api/v1/webhooks/revenuecat
      status / plan_type / expires_at 等の状態遷移はこちらが唯一の信号
        ↓
Web で Pro 機能解放
```

Stripe Webhook は「Stripe ID の紐付け専用」で、状態遷移は担当しない。両者を混ぜると
二重に status を書き換えて順序依存になるため、責務を分けている。

`checkout.session.completed` の `data.object` は Checkout Session 自体であり、
`subscription_data.metadata`（Subscription オブジェクト側）とは別物。ハンドラは Session 側の
`metadata.user_id` を読むため、Session と subscription_data の両方に同じ metadata を渡す必要がある。

### 3. 解約フロー 🆕

#### ストア課金（iOS / Android。各ストアの規約準拠）

```
ユーザー: アプリ内で「Pro解約」タップ
  ↓
CancelGuideModal 表示（subscription.platform で ios / android を出し分け）
  ios     : 「設定 → Apple ID → サブスクリプション → BUZZ BASE Pro → 解約」
            https://apps.apple.com/account/subscriptions
  android : 「Google Play → お支払いと定期購入 → 定期購入 → BUZZ BASE Pro → 解約」
            https://play.google.com/store/account/subscriptions
  ↓
ユーザーが各ストアの管理画面で解約
  ↓
Apple / Google → RevenueCat → back に CANCELLATION Webhook
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
back: App::Stripe::SubscriptionUpdater#cancel_at_period_end
  Stripe で subscription.cancel_at_period_end = true を設定（local 状態は触らない）
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

#### ストア課金（Apple IAP / Google Play Billing）

| 支払い方法 | 対応 |
|----|----|
| ストアアカウント登録クレカ | ✅ |
| Apple Pay / Google Pay | ✅ |
| キャリア決済（au, docomo, SoftBank） | ✅ |
| ギフトカード残高 | ✅ |

→ ストアアカウントの設定に従う。BUZZ BASE 側で選択させない。

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
| `pro` | Pro 機能の利用権限。`RevenueCat::SubscriberSync::ENTITLEMENT_ID` と一致させる |

Product を Entitlement に紐付け忘れると、購入は成立するのに subscriber レスポンスの
`entitlements` が空になり Pro が付与されない。RevenueCat 側の設定漏れとして最も踏みやすい。

#### Product

Product ID → plan_type / store → platform の対応は back の `RevenueCat::PlanCatalog` が単一ソース。

| Product ID | プラットフォーム | 価格（税込） | トライアル |
|----------|------------|----|-------|
| `jp.buzzbase.mobile.pro.monthly` | iOS, Android | ¥480 / 月 | 7日無料 |
| `jp.buzzbase.mobile.pro.yearly` | iOS, Android | ¥4,800 / 年 | 7日無料 |
| `ENV['STRIPE_PRODUCT_ID_MONTHLY']` | Web | ¥480 / 月 | 7日無料 |
| `ENV['STRIPE_PRODUCT_ID_YEARLY']` | Web | ¥4,800 / 年 | 7日無料 |

Stripe の Product ID は test / live モードで値が変わるため定数化せず ENV で切り替える。
`PlanCatalog.stripe_plan_type_from` は product_id が blank のとき先に nil を返す
（ENV 未設定環境では `nil == nil` で誤って monthly と判定してしまうため）。

| store 値 | platform |
|----|----|
| `APP_STORE` / `MAC_APP_STORE` | `ios` |
| `PLAY_STORE` | `android` |
| `STRIPE` | `web` |

#### period_type の表記ゆれ（実装時の落とし穴）

同じ `period_type` でもデータソースで表記が異なる。

| データソース | 値の例 |
|----|----|
| Webhook ペイロード | `"TRIAL"`（大文字） |
| REST API `GET /v1/subscribers` | `"trial"`（小文字） |

比較ロジックを各所に散らすと片方だけ取りこぼすため、`RevenueCat::PeriodType.trial?`
（case-insensitive 比較）に集約し、`WebhookPayload#trial?` と `SubscriberSync` の双方から参照する。

#### Secret API Key のバージョン（実装時の落とし穴）

`RevenueCat::SubscriberClient` は `GET /v1/subscribers/{app_user_id}` を叩くため、
**V1 の Secret API Key** を `REVENUECAT_SECRET_API_KEY` に設定する。V2 キーを V1 エンドポイントに
使うと 403 になる（キー種別の取り違えはエラーメッセージから原因が読み取りにくい）。
設定漏れは一過性障害ではなくデプロイミスなので、`ENV.fetch` でデフォルト値を持たせず
KeyError で即座に気付けるようにしている。

### 9. Apple App Store Connect 設定

#### Subscription Group

| グループ名 | 内容 |
|------|----|
| BUZZ BASE Pro | 月額・年額を1グループにまとめる（業界推奨） |

#### Introductory Offer（通常トライアル）

| プラン | オファータイプ | 期間 |
|------|-----------|----|
| `jp.buzzbase.mobile.pro.monthly` | Free Trial | 1 week |
| `jp.buzzbase.mobile.pro.yearly` | Free Trial | 1 week |

#### Promotional Offer（早期特典）

未実装。30日無料の出し分けは見送り、早期加入かどうかは back の `is_early_subscriber`
フラグとして記録するだけにした（`TrialDaysCalculator.in_early_window?`）。

### 10. Webhook の冪等性

#### webhook_events テーブル

主要カラム（`provider` は `'revenuecat'` / `'stripe'`）:

| カラム | 用途 |
|----|----|
| `provider` + `external_event_id` | 冪等性キー。UNIQUE 制約でプロバイダの再送を吸収する |
| `event_type` | RevenueCat の `INITIAL_PURCHASE` 等 / Stripe の `checkout.session.completed` 等 |
| `payload` | 受信した生ペイロード |
| `received_at` / `enqueued_at` / `processed_at` | 受信〜enqueue〜処理完了の追跡 |
| `status` | `pending` / `processed` / `failed` / `skipped` |
| `error_message` | Sentry 紐付け用の短い説明 |

#### 冪等性の判定ロジック

冪等性は Ruby 側の分岐ではなく DB に委ねる。

1. `WebhookEvent.find_or_create_pending!` — `(provider, external_event_id)` の UNIQUE 制約で
   同一イベントの二重受信を吸収する。同時到達で `RecordNotUnique` になった敗者側は
   rescue して勝者の行を返すので 500 にならない
   （外側のトランザクション内から呼ぶとトランザクションが abort し rescue 節も道連れになるため、
   呼び出し元はトランザクション外であること）
2. `WebhookEvent#claim_for_enqueue!` — 「`pending` かつ `enqueued_at` が NULL または十分古い」を
   条件にした `update_all` 一発で enqueue 権を原子的に奪う。同時に呼ばれても成功するのは1回だけで、
   Ruby 側のロックは不要
3. `enqueued_at` が `STALE_ENQUEUE_THRESHOLD`（10分）より古ければ再 claim を許可する。
   enqueue 自体の失敗やジョブ基盤の障害でジョブがロストしても、再送で復旧できる

#### イベントの分岐

`case` 文ではなく `EventDispatcher`（event_type → Handler クラスの Hash）で分岐する。
新しい event_type への対応は `HANDLERS` に 1 行足すだけで済む。

| event_type | Handler |
|----|----|
| `INITIAL_PURCHASE` / `TRIAL_STARTED` | `Handlers::InitialPurchaseHandler` |
| `RENEWAL` | `Handlers::RenewalHandler` |
| `CANCELLATION` | `Handlers::CancellationHandler` |
| `EXPIRATION` | `Handlers::ExpirationHandler` |
| `BILLING_ISSUE` | `Handlers::BillingIssueHandler` |
| `REFUND` | `Handlers::RefundHandler` |
| `UNCANCELLATION` | `Handlers::UncancellationHandler` |
| `PRODUCT_CHANGE` | `Handlers::ProductChangeHandler` |
| 上記以外 | `Handlers::UnknownEventHandler`（受信記録のみ） |

Stripe 側も同じ構造で、現状 `checkout.session.completed` のみ Handler を持ち、
それ以外は `Handlers::UnhandledEventHandler` で受信記録のみとして再送ループを防ぐ。

ペイロードの文字列キー直アクセスは `RevenueCat::WebhookPayload` / `App::Stripe::WebhookPayload`
の値オブジェクトに集約し、ペイロード形式が変わったときの追随箇所を1か所に閉じ込める。

### 11. 非同期処理（Solid Queue）

ジョブキューは Sidekiq ではなく **Solid Queue** を採用した（`config/puma.rb` の
`plugin :solid_queue` により Puma プロセス内で supervisor が同時起動するため、
別 worker dyno を持たずに済む）。

Webhook コントローラは 10 秒以内に応答する必要があるため、受信時は `WebhookEvent` の記録と
enqueue のみを行い、状態遷移はジョブに委譲する。

```ruby
# app/controllers/api/v1/webhooks/revenuecat_controller.rb
webhook_event = WebhookEvent.find_or_create_pending!(
  provider: 'revenuecat',
  external_event_id: event_id,
  event_type:,
  payload: params.to_unsafe_h
)
RevenueCatWebhookJob.perform_later(webhook_event.id) if webhook_event.claim_for_enqueue!
head :ok
```

#### 署名検証

| プロバイダ | 方式 |
|----|----|
| RevenueCat | `Authorization: Bearer <REVENUECAT_WEBHOOK_SECRET>`。長さの差をタイミング情報として漏らさないよう、両辺を SHA256 で固定長化してから `fixed_length_secure_compare` する |
| Stripe | `Stripe::Webhook.construct_event(raw_body, Stripe-Signature, STRIPE_WEBHOOK_SECRET)`。Rails のミドルウェアが先に body を読み終えているケースに備えて `request.body.rewind` を前置する |

`event.id` が欠落したペイロードは冪等性キーを作れないため、Sentry に警告を出して 422 で返す。

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

各 Handler は `BaseHandler#with_resolved_subscription` で「User の解決」「Subscription の取得」
「未知 product_id / store のスキップ」を共通化し、`call` に固有処理だけを書く。

```ruby
# app/services/revenue_cat/handlers/initial_purchase_handler.rb
class InitialPurchaseHandler < BaseHandler
  def call
    with_resolved_subscription(require_persisted: false, require_known_product: true) do |user, subscription|
      is_trial = payload.trial?
      started_at = payload.event_timestamp

      subscription.update!(
        status: is_trial ? 'trial' : 'active',
        plan_type: PlanCatalog.plan_type_from(payload.product_id),
        platform: PlanCatalog.platform_from(payload.store),
        product_id: payload.product_id,
        started_at:,
        expires_at: payload.expiration_at,
        has_used_trial: is_trial || subscription.has_used_trial,
        is_early_subscriber: TrialDaysCalculator.in_early_window?(started_at),
        revenuecat_user_id: payload.app_user_id,
        last_synced_at: Time.current
      )
      event_recorder.record(user, subscription, is_trial ? 'trial_started' : 'initial_purchase')
    end
  end
end
```

他ハンドラの骨子（実装は `app/services/revenue_cat/handlers/` を参照）:

```ruby
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

Controller（`Api::V1::Pro::CheckoutController`）は Flipper のゲートと例外のマッピングだけを持ち、
Session 生成は `App::Stripe::CheckoutSessionBuilder` に委ねる。

```ruby
# app/services/app/stripe/checkout_session_builder.rb
def call
  raise InvalidPlanError unless VALID_PLANS.include?(@plan)
  raise AlreadySubscribedError if @user.subscription_or_default.pro_active?

  ::Stripe::Checkout::Session.create(
    mode: 'subscription',
    customer_email: @user.email,
    line_items: [{ price: stripe_price_id, quantity: 1 }],
    metadata: session_metadata,               # Session 側（checkout.session.completed が読む）
    subscription_data:,                       # Subscription 側
    success_url: @success_url,
    cancel_url: @cancel_url
  )
end
```

- `payment_method_types` は指定しない。有効な決済手段は Stripe ダッシュボード側の設定に委ねる
- `trial_period_days` は 0 のとき **キーごと送らない**（`compact`）。0 を渡すと
  「即時課金」ではなく「0日トライアル後課金」と解釈されうるため

#### エラーレスポンス

front / mobile が原因を判定できるよう、安定コード（`error`）と文言（`message`）を分ける。

| 状況 | HTTP | `error` |
|----|----|----|
| Flipper `:pro_features` 無効 | 403 | `feature_disabled` |
| すでに Pro 加入中 | 409 | `already_subscribed` |
| plan が monthly/yearly 以外 | 422 | `invalid_plan` |
| Stripe API 側の障害 | 502 | `stripe_api_error` |

#### トライアル日数の判定

`TrialDaysCalculator` が単一ソース。返す値は **0 か 7 のみ**（早期特典の 30 日は未実装）。

```ruby
class TrialDaysCalculator
  DEFAULT_WINDOW_START = '2026-05-31 00:00:00 +0900'
  DEFAULT_WINDOW_END   = '2026-06-06 23:59:59 +0900'
  NORMAL_TRIAL_DAYS = 7

  def self.for(user)
    return 0 if user.subscription&.has_used_trial?

    NORMAL_TRIAL_DAYS
  end

  # is_early_subscriber 用。リリース日が後ろ倒しになる可能性があるため ENV で override 可能。
  def self.in_early_window?(at = Time.current)
    window_start = Time.zone.parse(ENV.fetch('EARLY_SUBSCRIBER_WINDOW_START', DEFAULT_WINDOW_START))
    window_end   = Time.zone.parse(ENV.fetch('EARLY_SUBSCRIBER_WINDOW_END', DEFAULT_WINDOW_END))
    at.between?(window_start, window_end)
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

### 18. API エンドポイント

| メソッド / パス | 用途 |
|----|----|
| `GET /api/v1/pro/status` | Subscription と保有 entitlement キーの取得 |
| `POST /api/v1/pro/sync` | RevenueCat REST から現在状態を取り直して上書き（同期更新） |
| `GET /api/v1/pro/entitlements` | entitlement ごとの granted フラグ一覧 |
| `POST /api/v1/pro/checkout` | Web の Stripe Checkout Session 作成 |
| `DELETE /api/v1/pro/subscription` | Web の解約申請（cancel_at_period_end） |
| `PATCH /api/v1/pro/subscription` | Web のプラン変更（月額↔年額） |
| `POST /api/v1/pro/cancellation_feedbacks` | 解約理由アンケートの回答保存 |
| `POST /api/v1/webhooks/revenuecat` | RevenueCat Webhook 受信 |
| `POST /api/v1/webhooks/stripe` | Stripe Webhook 受信（Stripe ID の紐付けのみ） |

`/api/v1/pro/sync` は RevenueCat の subscriber を唯一の入力としてローカル状態を上書きする
（entitlement が無ければ `free` / `expired` に確定させる）。Stripe Checkout 直後は RevenueCat が
まだ加入を取り込んでいないため、**反映待ちのポーリングに使ってはいけない**。反映待ちは
読み取り専用の `GET /api/v1/pro/status` で行う。

### 19. UI 実装方針

| コンポーネント | 配置 | 役割 |
|----|----|----|
| `PaywallModal` | mobile | Pro 加入モーダル |
| `ProUpgradeModal` | front | Pro 加入モーダル（Web は専用 LP を持たない） |
| `CheckoutButton` | front | Stripe Checkout への遷移 |
| `CancelGuideModal` / `CancelGuide` | mobile / front | ストア課金の解約手順案内（ios / android を出し分け） |
| `WebCancelConfirmModal` / `CancelWebSubscription` | mobile / front | Web 解約の確認 |
| `CancellationSurveyModal` | front | 解約理由アンケート |
| `SubscriptionStatusCard` | mobile / front | 現在の Pro 状態と次回更新日 |
| `BillingIssueAlert` / `BillingIssueGuide` | mobile / front | Grace Period 中の警告表示 |
| `TrialExpiringBanner` | mobile / front | トライアル期限直前の予告 |
| `ProUpsellCard` / `ProUpsellOverlay` / `SampleDataLabel` | mobile / front | Pro 機能の訴求 |

解約導線は `subscription.platform` で必ず3分岐する（`web` / `ios` / `android`）。
`platform !== "web"` の2分岐にすると、Google Play 購読の Android ユーザーに
Apple ID の解約手順を案内してしまう。

### 20. テスト戦略

#### 単体テスト

- 各 Handler（INITIAL_PURCHASE / TRIAL_STARTED / RENEWAL / CANCELLATION / EXPIRATION / BILLING_ISSUE / REFUND / UNCANCELLATION / PRODUCT_CHANGE / 未知イベント）
- 冪等性（`find_or_create_pending!` の同時到達、`claim_for_enqueue!` の単一勝者、stale 再claim）
- イベント順序非依存設計
- `TrialDaysCalculator.for` / `.in_early_window?`
- `PlanCatalog` の未知 product_id / store のスキップ挙動
- `PeriodType.trial?` の大文字・小文字両対応
- `Subscription#pro_active?` の判定（trial/active/cancelled/billing_issue/pending 全パターン）

#### 統合テスト

- iOS IAP の購入フロー（Sandbox）
- Android の購入フロー（Play Console のライセンステスター）
- Web Stripe の購入フロー（Test Mode）
- 解約 → 期限切れ → 再加入 のフルフロー
- Billing Issue → Recovered のフロー
- 返金フロー
- Webhook 受信 → DB 更新 → 監査ログ記録
- クロスプラットフォーム同期

#### 手動テスト

- 早期特典期間内の加入で `is_early_subscriber` が立つこと
- 初回加入で7日トライアルになること
- トライアル期間中の解約
- トライアル終了時の自動課金
- 課金失敗時の通知
- 再加入時のトライアル無効化
- iOS / Android それぞれで解約導線の文言が正しいこと

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
- ジョブキュー（Solid Queue）の導入・運用が必要

### 受容理由
課金は事業の生命線。信頼性を優先する。

---

## Open Questions（解決済み）

- [x] ジョブキュー: Sidekiq ではなく Solid Queue を導入（Puma プロセス内で supervisor が起動）
- [x] Stripe Checkout の戻り URL: サーバー側の `APP_URL` から組み立てる固定ホスト。クライアント発の origin は受け取らない
- [x] Subscription 作成タイミング: 事前作成せず `User#subscription_or_default` で未加入時のデフォルトを返し、初回 Webhook / 同期で永続化する
- [x] 解約ガイドからストア管理画面への遷移: `Linking.openURL` で可能（iOS は `apps.apple.com/account/subscriptions`、Android は `play.google.com/store/account/subscriptions`）

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

受信〜enqueue の実装は「11. 非同期処理（Solid Queue）」を参照。ジョブ側は指数バックオフで
リトライする一方、リトライしても直らない永続的エラー（`PermanentWebhookError` のサブクラス。
metadata 欠落・解決不能な user_id など）はリトライせず `failed` に落として Sentry に上げる。

```ruby
class RevenueCatWebhookJob < ApplicationJob
  queue_as :default
  retry_on StandardError, wait: :polynomially_longer, attempts: 5

  # ActiveJob は後から登録したハンドラが優先されるため retry_on より後に置く。
  # 恒久的エラーは RevenueCat::PermanentWebhookError を継承させれば自動的に対象になる。
  discard_on RevenueCat::PermanentWebhookError

  def perform(webhook_event_id)
    webhook_event = WebhookEvent.find_by(id: webhook_event_id)
    return unless webhook_event

    RevenueCat::WebhookProcessor.new(webhook_event).process
  end
end
```

`WebhookProcessor#process` は `processed` のレコードのみガードする。`failed` は手動で再 enqueue
したときに再処理させたいため、あえて素通しにしている。
`RevenueCat::PermanentWebhookError` と `App::Stripe::PermanentWebhookError` は無関係な別クラスで、
互いに継承させてはいけない。

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
| `pending` | 課金処理中の遷移状態。Pro 機能は不可（`PRO_ACTIVE_STATUSES` に含めない） |

`pro_active?` は status が `trial` / `active` / `cancelled` / `billing_issue` のいずれかで、
かつ `expires_at` が未来（または nil）のときだけ true。「期限切れの cancelled」は無料扱いになる。

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
| Google | Play Console → 定期購入 → 猶予期間 | 無効 | **有効化** |

back 側は Grace Period 中の期限を `expires_at` に保存する（RevenueCat の
`grace_period_expires_date` を優先）。`pro_active?` / `in_grace_period?` がこのカラムを見るため、
猶予期間中も Pro 機能が維持される。

#### リリース前チェックリスト

- [ ] App Store Connect で Billing Grace Period を有効化（16日）
- [ ] Play Console で猶予期間を有効化
- [ ] Stripe で Smart Retries が有効化されているか確認
- [ ] Sandbox / Test Mode で Grace Period の挙動を検証

### 本番テスト戦略

| 環境 | テスト方法 |
|----|----|
| Web | 本番デプロイ + Flipper で ippei のみ有効化 + Stripe Test Mode |
| iOS | TestFlight 配信 + Sandbox テスター + RevenueCat Sandbox |
| Android | 内部テスト配信 + Play Console のライセンステスター + RevenueCat Sandbox |

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
| enqueue 失敗 / ジョブロスト | `enqueued_at` が10分以上古ければ再送時に再 claim して復旧 |
| Apple / Google の請求失敗 | 各ストアが自動リトライ + Billing Grace Period |
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
