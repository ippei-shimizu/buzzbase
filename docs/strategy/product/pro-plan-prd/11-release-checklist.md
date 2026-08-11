# PRD-11: リリースチェックリスト

**作成日**: 2026-05-12
**最終更新**: 2026-08-11（実装状況に合わせてチェック状態を更新）
**ステータス**: 開発項目は概ね完了。ストア対応・告知・運用準備が残（リリース日は再設定）
**親ドキュメント**: `../pro-plan-prd-202605.md`

---

## 概要

Pro プランリリースに向けた、開発・テスト・ストア対応・告知の完了チェックリスト。
リリース直前に再点検する。

当初の 2026-05-31 リリース目標は過ぎており、実装は `release/pro-202605` ブランチ上で継続中（未マージ）。
以下のチェック状態は **コードで裏付けが取れる開発項目のみ** を反映しており、ストア設定・外部 SaaS 設定・告知・
運用体制など、リポジトリ外の作業は確認できないため未チェックのままにしてある。

---

## 1. 開発完了チェックリスト

### バックエンド（back）

- [x] 課金状態テーブル作成（`subscriptions` / `user_subscription_events` / `cancellation_feedbacks`）
      ※ Pro 状態は users のカラムではなく `subscriptions` で保持し、`User#has_entitlement?` で判定する
- [x] practice_menus / practice_logs / practice_sessions / condition_logs テーブル作成
- [x] shadow_swing_sessions テーブル作成
- [x] goals / goal_badges テーブル作成
- [x] schedules / schedule_menus テーブル作成
- [x] activity_logs テーブル作成
- [x] media_attachments テーブル作成
- [x] baseball_notes テーブル拡張
- [x] /api/v1/pro/* エンドポイント実装（status / sync / entitlements / checkout / subscription / cancellation_feedbacks）
- [x] /api/v1/webhooks/revenuecat エンドポイント実装
- [x] 各 Pro 機能の API エンドポイント実装（v2 名前空間）
- [x] FinalizeGoalsJob 等のバッチジョブ設定（`config/recurring.yml`）
- [x] 期限切れメディアの掃除ジョブ設定（`PurgeStaleMediaAttachmentsJob` / `MediaAttachmentDeletionJob`）
- [x] GeneratePeriodicReviewJob（週次・月次レポート生成）設定
- [ ] 環境変数を本番に設定

### フロントエンド（front）

- [x] Pro 加入導線（`ProUpgradeModal` + `CheckoutButton`。Stripe Checkout の戻り先として `/pro/success` `/pro/cancel`）
      ※ 独立した加入ページ `/pro` は作らず、機能ごとの訴求から直接モーダルを開く形にした
- [x] 特定商取引法に基づく表記（/tokushoho、価格・無料トライアル条件を記載）
- [ ] 価格表示ページ（/help/pro/pricing）※ 未実装。価格は /tokushoho と加入モーダルに集約中
- [ ] FAQ ページ（/help/pro/faq）※ 未実装
- [x] 解約ページ（/account/subscription）
- [ ] ヘルプドキュメント（/help/pro/*）※ 未実装
- [x] 各 Pro 機能の UI 実装
- [x] 広告表示（Web AdSense は既存）
- [x] Stripe Checkout 連携
- [x] Pro 状態の同期（RevenueCat Web SDK は使わず、back の `/api/v1/pro/sync` 経由で RevenueCat REST を叩く）
- [x] Pro 訴求モーダル

### モバイル（mobile）

- [x] react-native-google-mobile-ads 導入
- [x] expo-tracking-transparency 導入
- [x] react-native-purchases (RevenueCat SDK) 導入
- [x] ATT ダイアログ実装（`services/trackingTransparencyService.ts`）
- [x] バナー広告実装（`AppBannerAd` / `InlineBannerAd`）
- [x] インタースティシャル広告実装（`services/interstitialAdService.ts`）
- [ ] リワード広告実装 ※ 未実装。初回リリースはバナー＋インタースティシャルのみで出す
- [x] iOS IAP 連携
- [x] Pro 加入画面（`app/pro/`）
- [x] 各 Pro 機能の UI 実装
- [x] 設定画面の Pro 状態表示（`app/account/subscription/`）
- [x] プッシュ通知（スケジュール・Streak リマインド）
- [x] EAS Build 設定更新

---

## 2. ストア対応チェックリスト

### App Store Connect

- [ ] アプリ情報更新
  - [ ] サブタイトル: 「もっと野球がしたくなる」
  - [ ] スクリーンショット更新（Pro 機能を含む）
  - [ ] プロモーションテキスト更新
  - [ ] What's New（リリースノート）
- [ ] サブスクリプション商品作成
  - [ ] `buzzbase_pro_monthly` - ¥480/月、Introductory Offer 7日無料
  - [ ] `buzzbase_pro_yearly` - ¥4,800/年（月あたり¥400相当）、Introductory Offer 7日無料

> 価格は 2026-08-10 に月額¥480 / 年額¥4,800 へ改定済み。App Store Connect の登録値を正とし、
> Web 側の表示は `front/app/components/pro/proPricing.ts` に集約している。
- [ ] Promotional Offer 作成
  - [ ] 30日無料（早期特典用）
  - [ ] オファーコード配布設定
- [ ] プライバシー情報更新
  - [ ] データ収集の宣言
  - [ ] サードパーティ SDK（AdMob、RevenueCat、Stripe）の宣言
- [ ] プライバシーマニフェスト（iOS 17+）
- [ ] アプリ内課金審査用テスト手順
- [ ] 13歳以上対象の確認
- [ ] App Tracking Transparency 設定

### Google Play Console（Android、後段）

- [ ] 内部テストから製品版リリースは Pro リリース後

### Web（Stripe）

- [ ] Stripe 商品作成
  - [ ] 月額プラン Price ID
  - [ ] 年額プラン Price ID
- [ ] Webhook エンドポイント設定
- [ ] 本番 API キー設定

### RevenueCat

- [ ] プロジェクト作成
- [ ] iOS / Web の各プラットフォーム連携
- [ ] Entitlement: `pro` 作成
- [ ] Webhook エンドポイント設定
- [ ] 本番モードへ切り替え

### AdMob

- [ ] AdMob アカウント作成
- [ ] iOS アプリ登録
- [ ] バナー / インタースティシャル / リワードの広告ユニット作成
- [ ] 子供向けコンテンツ設定: false
- [ ] 本番ユニットID を環境変数に設定

---

## 3. テスト計画

### 単体テスト

- [ ] 全ての新規モデル
- [ ] 全ての API エンドポイント
- [ ] 各サービスクラス

### 統合テスト

- [ ] iOS IAP のフルフロー（Sandbox）
- [ ] Web Stripe のフルフロー（Test Mode）
- [ ] iOS / Web のクロスプラットフォーム同期
- [ ] 早期特典 / 通常トライアルの切り替え

### 手動テスト

- [ ] 実機で全 Pro 機能の動作確認
- [ ] AdMob 実広告の表示確認
- [ ] ATT ダイアログの動作
- [ ] プッシュ通知の動作
- [ ] 画像・動画アップロードの動作
- [ ] 解約フローの動作

### 回帰テスト

- [ ] 既存機能の動作確認
  - [ ] 試合記録
  - [ ] 成績集計
  - [ ] グループ機能
  - [ ] 計算ツール
  - [ ] 野球ノート（基本）

---

## 4. ドキュメント

- [ ] Pro 機能一覧ページ（/help/pro/features）※ 未実装。加入モーダル内の機能比較表で代替中
- [ ] 料金プランページ（/help/pro/pricing）※ 未実装
- [ ] FAQ ページ（/help/pro/faq）※ 未実装
- [x] 解約方法の案内（`/account/subscription` の `CancelGuide` / `PlanChangeGuide` に集約。独立ページは作らない）
- [ ] リリース予告ページ（/help/pro/coming-soon）※ 未実装
- [x] プライバシーポリシー更新（front: /privacypolicy、mobile: `app/privacy-policy.tsx`。AdMob / RevenueCat / Stripe を明記）
- [x] 利用規約更新（front: /termsofservice、mobile: `app/terms-of-service.tsx`。Pro・サブスクリプション条項を追加）
- [x] 特定商取引法に基づく表記（front: /tokushoho、mobile: `app/tokushoho.tsx`）

---

## 5. 告知準備

> 以下の日付は 2026-05-31 リリースを前提にしたもの。リリース日が未確定のため、
> 「10日前 / 4日前 / 前夜 / 当日」の**相対スケジュールとして読み替える**（8, 9 章の日付も同様）。

### 5/20 頃（10日前）

- [ ] アプリ内バナー設置
- [ ] X 公式アカウント開設（@buzzbase_app）
- [ ] Instagram 公式アカウント開設
- [ ] TikTok / YouTube ハンドル確保
- [ ] 個人アカウントから誘導投稿
- [ ] 既存ユーザーへの予告（アプリ内通知）

### 5/27 頃（4日前）

- [ ] プッシュ通知で予告
- [ ] X 投稿: カウントダウン
- [ ] Instagram 投稿: 機能スクショ

### 5/30 前夜

- [ ] プッシュ通知: 「明日リリース」
- [ ] X / Instagram: 最終予告

### 5/31 当日

- [ ] リリース告知（X / Instagram）
- [ ] アプリ内モーダル: 「Pro リリース！」
- [ ] 既存ユーザーへの感謝メッセージ

---

## 6. 監視・運用準備

- [ ] Sentry エラー監視の確認
  - [ ] front / back / mobile の3プロジェクト
  - [ ] 新規追加箇所のエラー監視
- [ ] RevenueCat ダッシュボード設定
- [ ] AdMob ダッシュボード設定
- [ ] Stripe ダッシュボード確認
- [ ] レビュー監視体制
  - [ ] App Store レビューチェック
  - [ ] X / Instagram でのメンション監視

---

## 7. 緊急対応準備

### Hotfix 計画

- [ ] 緊急バグ修正の手順を整理
- [ ] iOS の Expedited Review 申請方法
- [ ] サブモジュール（front/back/mobile）ごとのデプロイ手順確認

### サポート体制

- [ ] サポート問い合わせフォーム（/contact）の動作確認
- [ ] よくある質問への回答テンプレート準備
- [ ] レビュー★1への対応テンプレート

---

## 8. リリース後の運用

### 1ヶ月後レビュー（2026-06-30 頃）

- [ ] First Month Review の準備
- [ ] KPI ダッシュボード確認
- [ ] レビュー対応の総括

### 3ヶ月後レビュー（2026-08-31 頃）

- [ ] コミット目標達成判定
- [ ] Failure Criteria に該当しないか確認
- [ ] Phase 2 機能の優先順位確定

---

## 9. リリース当日のフロー

```
05/31 06:00: 最終確認
  - [ ] 全環境変数チェック
  - [ ] サーバー監視確認
  - [ ] バックアップ完了確認

05/31 09:00: iOS リリース申請（必要な場合）
  - [ ] App Store Connect でリリース承認

05/31 12:00: 本番デプロイ
  - [ ] back デプロイ
  - [ ] front デプロイ
  - [ ] iOS は App Store 公開承認

05/31 13:00: リリース告知
  - [ ] アプリ内モーダル表示
  - [ ] X / Instagram 投稿
  - [ ] プッシュ通知

05/31 13:00〜: 監視
  - [ ] Sentry エラー監視
  - [ ] レビュー監視
  - [ ] 課金フローの動作確認

05/31 24:00: 一日の振り返り
  - [ ] Pro 加入者数集計
  - [ ] 初日の感想ツイート（個人アカウント）
```

---

## 10. リリース後の延期判断基準

リリースを延期すべきケース:

- [ ] 課金フローに致命的バグ
- [ ] App Store 審査リジェクト
- [ ] サーバー不安定
- [ ] 主要機能（素振りカウンター・草機能）の重大な不具合

→ 延期は **6/7 まで** が許容範囲。それ以上はマーケ計画再調整。
