# PRD-01: システムアーキテクチャ

**作成日**: 2026-05-12
**親ドキュメント**: `../pro-plan-prd-202605.md`
**関連戦略**: `../pro-plan-202605.md`

---

## 概要

BUZZ BASE Pro リリースに伴うシステム全体のアーキテクチャ設計。
既存の front / back / mobile の3サブモジュールに Pro 機能と課金基盤を追加する。

---

## 既存システム構成（前提）

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
| 認証 | devise_token_auth（access-token, client, uid ヘッダー） |
| エラー監視 | Sentry（buzzbase-frontend / buzzbase-backend / buzzbase-mobile） |

---

## Pro 機能による追加コンポーネント

### サービス連携の全体像

```
┌─────────────────────────────────────────────┐
│                                             │
│   front (Web)         mobile (iOS)          │
│   ├─ Stripe.js        ├─ react-native-      │
│   │                   │  google-mobile-ads  │
│   │                   ├─ react-native-      │
│   │                   │  iap (or RevenueCat │
│   │                   │  SDK)               │
│   │                   ├─ expo-tracking-     │
│   │                   │  transparency       │
│   │                   └─ RevenueCat SDK     │
│   └─ RevenueCat SDK                         │
│           ↓                                 │
│   ┌──────────────────────────┐              │
│   │     RevenueCat           │              │
│   │  サブスク統合管理         │              │
│   └──────────────────────────┘              │
│           ↓ Webhook                         │
│   ┌──────────────────────────┐              │
│   │     back (Rails API)     │              │
│   │  - Pro状態キャッシュ      │              │
│   │  - 機能制御              │              │
│   └──────────────────────────┘              │
│           ↓                                 │
│   ┌──────────────────────────┐              │
│   │     PostgreSQL DB        │              │
│   │  - user.pro_status       │              │
│   │  - 練習記録テーブル等     │              │
│   └──────────────────────────┘              │
│                                             │
└─────────────────────────────────────────────┘
```

### 新規追加サービス

| サービス | 用途 | 料金 |
|---------|----|----|
| **RevenueCat** | iOS IAP + Web Stripe のサブスク状態統合管理 | $2,500/月までは無料 |
| **Stripe** | Web 決済 | 3.6% + ¥10/件 |
| **Apple App Store Connect** | iOS IAP 設定、Promotional Offer 配布 | 30%（1年目）/ 15%（2年目以降） |
| **AdMob** | mobile アプリ広告配信 | 30%（Google税） |

---

## データモデル変更

### users テーブル拡張

```ruby
# Migration: add_pro_status_to_users
class AddProStatusToUsers < ActiveRecord::Migration[7.0]
  def change
    add_column :users, :pro_status, :string, default: 'free', null: false
    add_column :users, :pro_started_at, :datetime
    add_column :users, :pro_expires_at, :datetime
    add_column :users, :pro_platform, :string # 'ios', 'web', 'android'
    add_column :users, :revenuecat_user_id, :string
    add_column :users, :is_early_subscriber, :boolean, default: false

    add_index :users, :pro_status
    add_index :users, :revenuecat_user_id, unique: true
  end
end
```

#### pro_status の値

| 値 | 意味 |
|----|------|
| `free` | 無料ユーザー |
| `trial` | トライアル期間中 |
| `active` | Pro 加入中（課金中） |
| `expired` | 課金停止（解約後） |
| `pending` | 課金処理中（遷移状態） |

### 新規テーブル

各 Pro 機能のテーブルは個別 PRD で定義:

- **practice_logs**: 練習記録 → PRD-05
- **practice_menus**: 練習メニューマスター → PRD-05
- **condition_logs**: コンディションログ → PRD-05
- **shadow_swing_sessions**: 素振りカウンターのセッション記録 → PRD-03
- **goals**: 目標設定 → PRD-07
- **schedules**: 自主練スケジュール → PRD-08

### baseball_notes テーブル拡張

野球ノートに画像・動画 + 試合紐付けを追加:

```ruby
class ExtendBaseballNotes < ActiveRecord::Migration[7.0]
  def change
    add_reference :baseball_notes, :game_result, foreign_key: true, null: true
    add_column :baseball_notes, :media_urls, :text, array: true, default: []
    add_column :baseball_notes, :media_count, :integer, default: 0
  end
end
```

→ 詳細は PRD-09

---

## Pro 状態判定ロジック（共通）

### Rails 側

```ruby
# app/models/user.rb
class User < ApplicationRecord
  def pro_active?
    %w[trial active].include?(pro_status) &&
      (pro_expires_at.nil? || pro_expires_at > Time.current)
  end

  def can_use_pro_feature?(feature_key)
    pro_active? || feature_available_in_free?(feature_key)
  end

  private

  def feature_available_in_free?(feature_key)
    # 無料版でも一部利用可能な機能
    FREE_FEATURES.include?(feature_key)
  end

  FREE_FEATURES = %w[
    basic_game_record
    basic_stats
    group_ranking
    calculation_tools
    baseball_note_basic
    shadow_swing_basic
  ].freeze
end
```

### Web (Next.js) 側

```typescript
// front/app/lib/pro/useProStatus.ts
export type ProStatus = 'free' | 'trial' | 'active' | 'expired' | 'pending';

export interface UserProStatus {
  status: ProStatus;
  isActive: boolean;
  expiresAt: Date | null;
  platform: 'ios' | 'web' | 'android' | null;
}

export async function getProStatus(): Promise<UserProStatus> {
  // back API から取得
}
```

### Mobile (React Native) 側

```typescript
// mobile/services/proStatus.ts
import Purchases from 'react-native-purchases';

export async function getProStatus(): Promise<UserProStatus> {
  const customerInfo = await Purchases.getCustomerInfo();
  const isActive = customerInfo.entitlements.active['pro'] !== undefined;
  // back API とも同期確認
}
```

---

## API エンドポイント追加

### Pro 状態管理

| メソッド | パス | 用途 |
|--------|----|----|
| GET | `/api/v1/pro/status` | 現在のユーザーの Pro 状態取得 |
| POST | `/api/v1/pro/sync` | RevenueCat と Rails の Pro 状態を同期 |
| POST | `/api/v1/webhooks/revenuecat` | RevenueCat からの Webhook 受信 |

### 機能チェック

| メソッド | パス | 用途 |
|--------|----|----|
| GET | `/api/v1/pro/features/check?key=xxx` | 特定機能の利用可否チェック |

---

## 認証・セキュリティ

### Webhook の認証

RevenueCat の Webhook には Authorization ヘッダーで秘密トークンを設定:

```ruby
# config/initializers/revenuecat.rb
RevenuecatConfig = {
  webhook_secret: ENV['REVENUECAT_WEBHOOK_SECRET']
}

# app/controllers/api/v1/webhooks_controller.rb
class Api::V1::WebhooksController < ApplicationController
  skip_before_action :authenticate_user!
  before_action :verify_revenuecat_signature

  def revenuecat
    RevenueCatWebhookProcessor.new(params).process
    head :ok
  end

  private

  def verify_revenuecat_signature
    expected = "Bearer #{ENV['REVENUECAT_WEBHOOK_SECRET']}"
    head :unauthorized unless request.headers['Authorization'] == expected
  end
end
```

### 環境変数

`.env` に追加が必要な変数:

```
# RevenueCat
REVENUECAT_API_KEY_IOS=
REVENUECAT_API_KEY_WEB=
REVENUECAT_WEBHOOK_SECRET=

# Stripe
STRIPE_PUBLISHABLE_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# AdMob
ADMOB_IOS_APP_ID=
ADMOB_IOS_BANNER_UNIT_ID=
ADMOB_IOS_INTERSTITIAL_UNIT_ID=
ADMOB_IOS_REWARDED_UNIT_ID=
```

---

## エラーハンドリング

### Pro 状態同期エラー

| 状況 | 対応 |
|------|----|
| RevenueCat → Rails の同期失敗 | リトライ（指数バックオフ） + Sentry 通知 |
| ユーザー操作時にPro状態がキャッシュ古い | 「同期更新」ボタンを表示、即時取得 |
| 二重課金検出 | 加入済みステータスでブロック、サポート誘導 |

### Sentry 監視追加

- `pro:webhook:failed` - Webhook 処理失敗
- `pro:sync:mismatch` - Rails / RevenueCat の状態不一致
- `pro:purchase:failed` - 購入処理失敗

---

## 既存機能への影響

### back

- `User` モデルに pro_status 関連メソッド追加
- 各 Pro 機能のコントローラで `can_use_pro_feature?` チェック
- 既存機能は変更なし

### front

- ヘッダーに Pro 加入導線追加（プロフィールメニュー内）
- Pro 機能ページで Pro 状態判定
- Pro 加入ページ（/pro）新規作成
- 解約ページ（/account/subscription）新規作成

### mobile

- アプリ起動時に RevenueCat SDK 初期化
- ATT ダイアログを初回起動時に表示
- AdMob 表示（無料ユーザーのみ）
- Pro 加入導線をいくつかの画面に追加
- 設定画面に Pro 状態表示

---

## 開発タスク分解

### バックエンド（back）

- [ ] users テーブルマイグレーション
- [ ] User モデルに Pro 関連メソッド追加
- [ ] /api/v1/pro/status エンドポイント
- [ ] /api/v1/pro/sync エンドポイント
- [ ] /api/v1/webhooks/revenuecat エンドポイント
- [ ] RevenueCatWebhookProcessor サービス
- [ ] 環境変数設定

### フロントエンド（front）

- [ ] RevenueCat Web SDK 導入
- [ ] Stripe.js 導入
- [ ] Pro 状態取得カスタムフック
- [ ] Pro 加入ページ（/pro）
- [ ] 解約ページ（/account/subscription）
- [ ] ヘッダーに Pro 加入導線
- [ ] /help/pro/* 配下のヘルプページ

### モバイル（mobile）

- [ ] react-native-google-mobile-ads 導入
- [ ] expo-tracking-transparency 導入
- [ ] react-native-purchases (RevenueCat SDK) 導入
- [ ] ATT ダイアログ初回表示
- [ ] AdMob バナー・インタースティシャル・リワード実装
- [ ] Pro 加入画面
- [ ] 設定画面に Pro 状態表示
- [ ] EAS Build 設定更新

---

## 完了の定義（Definition of Done）

- [ ] 全エンドポイントが動作する
- [ ] iOS で IAP 経由の Pro 加入が動作する
- [ ] Web で Stripe 経由の Pro 加入が動作する
- [ ] iOS / Web 両方で同じユーザーの Pro 状態が同期される
- [ ] 解約フローが動作する
- [ ] Sentry でエラー監視が動いている
- [ ] 環境変数が全て設定されている
- [ ] テスト環境で全フローが動作確認できる
