# PRD-02: 課金フロー

**作成日**: 2026-05-12
**親ドキュメント**: `../pro-plan-prd-202605.md`
**関連戦略**: `../pro-plan-202605.md` のステップ9, 12, 13
**前提PRD**: `01-system-architecture.md`

---

## 概要

iOS IAP + Web Stripe + RevenueCat を用いた Pro サブスクの課金フロー実装。
早期特典（30日無料）と通常トライアル（7日無料）を含む。

---

## 機能要件

### サブスクプラン

| プラン | 価格 | トライアル（通常） | トライアル（早期特典） |
|------|----|------------|-------------|
| 月額プラン | ¥300 | 7日無料 | 30日無料 |
| 年額プラン | ¥2,980 | 7日無料 | 30日無料 |

### 早期特典の条件

- 期間: 2026-05-31 00:00:00 〜 2026-06-06 23:59:59 (JST)
- 対象: この期間内にPro申込を完了したユーザー
- 特典: 30日間の無料トライアル

---

## ユーザーストーリー

### US-01: 初めてPro加入する大学生（翔太）

> 翔太は5月31日のリリース当日にBUZZ BASEを開き、Pro機能の案内モーダルを見る。
> 「30日無料」というメッセージに惹かれ、Pro加入ボタンをタップ。
> Apple ID認証だけで簡単に30日無料トライアルが始まる。
> Founder Badge は付与されないが、30日後の課金開始日が通知される。

### US-02: Web で加入する社会人（健）

> 健は通勤中にスマホでBUZZ BASEのWebサイトを見る。
> Pro加入バナーをタップ → Stripe Checkout 画面で決済。
> 決済完了後、即座にPro機能が解放される。
> 後でiOSアプリを開いてもPro状態が同期されている。

### US-03: トライアル期間中に解約

> ユーザーがトライアル期間中に Pro が合わないと判断。
> 設定 → サブスクリプション管理 → 解約ボタンをタップ。
> トライアル期間中は一切課金されない。

---

## 課金フロー設計

### iOS IAP フロー

```
┌──────────────────────────────┐
│ ユーザーが Pro 機能をタップ    │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Pro 案内モーダル表示           │
│ - 機能紹介                    │
│ - 月額¥300 / 年額¥2,980       │
│ - トライアル期間（7日 or 30日）│
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ 「Pro に加入する」タップ       │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ react-native-purchases で     │
│ presentPaywall() or           │
│ purchasePackage() 呼び出し    │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ StoreKit (iOS IAP) で課金処理 │
│ - Apple ID 認証                │
│ - 購入確認ダイアログ           │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ RevenueCat に購入情報送信     │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ RevenueCat が back に Webhook │
│ 送信                          │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ back で users.pro_status を   │
│ 更新                          │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ アプリで Pro 機能解放          │
└──────────────────────────────┘
```

### Web Stripe フロー

```
┌──────────────────────────────┐
│ ユーザーが Pro 機能をタップ    │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Pro 案内ページ表示             │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ 「Pro に加入する」タップ       │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ front から back の            │
│ POST /api/v1/pro/checkout を  │
│ 呼び出し                       │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ back で Stripe Checkout       │
│ Session を作成                 │
│ - trial_period_days を動的設定 │
│ - 早期期間内なら30、それ以外7   │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Stripe Checkout URL に redirect│
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Stripe で決済情報入力          │
│ - クレジットカード             │
│ - 確認                        │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Stripe → RevenueCat → back    │
│ Webhook で状態更新             │
└──────────────────────────────┘
              ↓
┌──────────────────────────────┐
│ Web で Pro 機能解放            │
└──────────────────────────────┘
```

---

## RevenueCat 設定

### Entitlement 設定

| Entitlement | 説明 |
|----------|----|
| `pro` | Pro 機能の利用権限 |

### Product 設定

| Product ID | プラットフォーム | 価格 | トライアル |
|----------|------------|----|-------|
| `buzzbase_pro_monthly` | iOS, Web | ¥300 | 7日無料 |
| `buzzbase_pro_yearly` | iOS, Web | ¥2,980 | 7日無料 |

### Offer 設定（早期特典）

| Offer ID | 用途 | 期間 |
|--------|----|----|
| `early_30days_free` | リリース後7日以内の特典 | 30日無料 |

### Apple App Store Connect 設定

#### Introductory Offer

| プラン | オファータイプ | 期間 |
|------|-----------|----|
| `buzzbase_pro_monthly` | Free Trial | 1 week |
| `buzzbase_pro_yearly` | Free Trial | 1 week |

#### Promotional Offer（早期特典）

| プラン | オファータイプ | 期間 | 配布 |
|------|-----------|----|----|
| `buzzbase_pro_monthly` | Free Trial | 1 month | アプリ内で Offer Code 自動配布 |
| `buzzbase_pro_yearly` | Free Trial | 1 month | 同上 |

---

## API 実装詳細

### POST /api/v1/pro/checkout (Web Stripe 用)

#### リクエスト

```json
{
  "plan": "monthly", // or "yearly"
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
      payment_method_types: ['card'],
      line_items: [{
        price: stripe_price_id(plan),
        quantity: 1
      }],
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

### POST /api/v1/webhooks/revenuecat

RevenueCat の Webhook イベントを受信して User の pro_status を更新。

#### 主要イベント

| イベント | 処理 |
|------|----|
| `INITIAL_PURCHASE` | pro_status = 'trial' or 'active' |
| `RENEWAL` | pro_status = 'active', pro_expires_at 更新 |
| `CANCELLATION` | pro_status = 'expired' (期限まで利用可) |
| `EXPIRATION` | pro_status = 'expired', 機能無効化 |
| `BILLING_ISSUE` | pro_status = 'expired', ユーザー通知 |
| `PRODUCT_CHANGE` | プラン変更（月額↔年額） |

#### 実装

```ruby
class Api::V1::WebhooksController < ApplicationController
  skip_before_action :authenticate_user!
  before_action :verify_revenuecat_signature

  def revenuecat
    event = params[:event]
    processor = RevenueCatWebhookProcessor.new(event)
    processor.process
    head :ok
  rescue StandardError => e
    Sentry.capture_exception(e)
    head :internal_server_error
  end
end

class RevenueCatWebhookProcessor
  def initialize(event)
    @event = event
  end

  def process
    user = User.find_by(revenuecat_user_id: @event[:app_user_id])
    return unless user

    case @event[:type]
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
    end
  end

  private

  def handle_initial_purchase(user)
    is_trial = @event[:period_type] == 'TRIAL'
    user.update!(
      pro_status: is_trial ? 'trial' : 'active',
      pro_started_at: Time.zone.at(@event[:event_timestamp_ms] / 1000),
      pro_expires_at: Time.zone.at(@event[:expiration_at_ms] / 1000),
      pro_platform: detect_platform(@event[:store]),
      is_early_subscriber: in_early_window?(@event[:event_timestamp_ms])
    )
  end

  def handle_renewal(user)
    user.update!(
      pro_status: 'active',
      pro_expires_at: Time.zone.at(@event[:expiration_at_ms] / 1000)
    )
  end

  def handle_cancellation(user)
    user.update!(pro_status: 'expired')
    # 期限までは pro_expires_at を維持して機能利用可能
  end

  def handle_expiration(user)
    user.update!(pro_status: 'expired', pro_expires_at: nil)
  end

  def in_early_window?(timestamp_ms)
    time = Time.zone.at(timestamp_ms / 1000)
    early_start = Time.zone.parse('2026-05-31 00:00:00')
    early_end = Time.zone.parse('2026-06-06 23:59:59')
    time.between?(early_start, early_end)
  end

  def detect_platform(store)
    case store
    when 'APP_STORE' then 'ios'
    when 'STRIPE' then 'web'
    when 'PLAY_STORE' then 'android'
    end
  end
end
```

---

## UI 仕様

### iOS - Pro 加入モーダル

```
┌────────────────────────────────┐
│  もっと野球がしたくなる         │
│                                │
│  [Pro機能のスクショ]            │
│                                │
│  ・素振りカウンター             │
│  ・草機能（ヒートマップ）       │
│  ・シーズン跨ぎグラフ           │
│  ・練習記録                    │
│  ・広告なし                    │
│                                │
│  [月額¥300] [年額¥2,980 17%off]│
│                                │
│  💡 30日無料でお試し（早期特典）│
│  💡 7日無料でお試し（通常時）   │
│                                │
│  [   Pro に加入する  ]          │
│  [   後で                ]      │
└────────────────────────────────┘
```

### Web - Pro 加入ページ（/pro）

```
┌────────────────────────────────┐
│  もっと野球がしたくなる         │
│                                │
│  [LP用ヒーロー画像]             │
│                                │
│  Proで使える機能:               │
│  - 練習機能（5機能）            │
│  - 素振りカウンター             │
│  - 草機能                       │
│  - シーズン跨ぎグラフ           │
│  - 目標管理                     │
│  - 広告非表示                   │
│                                │
│  [月額プラン]      [年額プラン] │
│  ¥300/月          ¥2,980/年     │
│                   (17% off)    │
│                                │
│  💡 リリース後7日以内なら       │
│     30日無料！                  │
│                                │
│  [Pro に加入する]               │
└────────────────────────────────┘
```

### 解約フロー (Web)

```
ユーザー: 設定 → サブスクリプション
  ↓
[現在のプラン]
  プラン: 月額プラン
  次回課金日: 2026-07-15
  金額: ¥300
  [解約する]
  ↓
[解約確認画面]
  「本当に解約しますか?」
  ・解約しても次回課金日まで Pro 機能を利用できます
  ・また加入する場合は再度お試しいただけます
  [はい、解約する] [キャンセル]
  ↓
[解約完了]
  「ご利用ありがとうございました」
  次回課金日まで Pro 機能を利用可能
```

### 解約フロー (iOS)

iOS では Apple の規約により自前で解約処理ができない。
設定 → サブスクリプション管理画面へ誘導する:

```
[アプリ設定画面]
  Pro 状態: 加入中
  プラン: 月額プラン
  次回課金日: 2026-07-15
  [解約方法を見る]
  ↓
[解約方法の説明]
  「iOS アプリの設定から解約してください:
   設定 → Apple ID → サブスクリプション →
   BUZZ BASE Pro → 解約」
  [設定アプリを開く]
```

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| Apple ID未連携で iOS IAP 失敗 | ユーザーに Apple ID 設定を促す |
| Web 決済中にネットワーク切断 | Stripe が自動リトライ、状態を確認後通知 |
| トライアル期間中にプラン変更（月額→年額） | RevenueCat の `PRODUCT_CHANGE` で処理 |
| 二重課金（Web と iOS で別々に） | 加入済みステータスを検知してブロック |
| Webhook 受信失敗 | Sentry 通知、RevenueCat が自動リトライ |
| 早期特典期間に多重申込 | 1ユーザー1回のみ、2回目は通常トライアル |
| 既に解約済みユーザーの再加入 | 通常の購入フロー、トライアルは適用されない場合あり（Apple仕様） |

---

## テスト要件

### 単体テスト

- [ ] RevenueCatWebhookProcessor の各イベントタイプ
- [ ] determine_trial_days のロジック（早期 / 通常）
- [ ] User.pro_active? の判定

### 統合テスト

- [ ] iOS IAP 経由の購入フロー（Sandbox）
- [ ] Web Stripe 経由の購入フロー（Stripe Test Mode）
- [ ] Webhook 受信 → DB 更新
- [ ] iOS 購入後、Web で Pro 状態が反映されるか
- [ ] Web 購入後、iOS で Pro 状態が反映されるか

### 手動テスト

- [ ] 早期特典期間（5/31〜6/6）の動作確認
- [ ] 通常トライアル期間（6/7以降）の動作確認
- [ ] トライアル期間中の解約
- [ ] トライアル終了時の自動課金開始
- [ ] 解約後の機能制限タイミング

---

## 完了の定義（Definition of Done）

- [ ] iOS Sandbox で IAP 経由の Pro 加入が動作
- [ ] Stripe Test Mode で Web 経由の Pro 加入が動作
- [ ] iOS / Web の Pro 状態が双方向に同期する
- [ ] 早期特典期間に申込んだユーザーが30日無料になる
- [ ] 通常期間に申込んだユーザーが7日無料になる
- [ ] トライアル中に解約しても課金されない
- [ ] トライアル終了時に自動課金が始まる
- [ ] 解約フローが iOS / Web で動作する
- [ ] Webhook の認証が正しく機能する
- [ ] Sentry でエラー監視できる
- [ ] 全ての環境変数が本番環境に設定されている
