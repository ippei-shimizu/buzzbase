# PRD-11: リリースチェックリスト

**作成日**: 2026-05-12
**ステータス**: ドラフト（リリース直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`

---

## 概要

2026年5月31日リリースに向けた、開発・テスト・ストア対応・告知の完了チェックリスト。
リリース直前に再点検する。

---

## 1. 開発完了チェックリスト

### バックエンド（back）

- [ ] users テーブルマイグレーション完了
- [ ] practice_menus / practice_logs / condition_logs テーブル作成
- [ ] shadow_swing_sessions テーブル作成
- [ ] goals / goal_badges テーブル作成
- [ ] schedules / schedule_menus テーブル作成
- [ ] activity_logs テーブル作成
- [ ] media_attachments テーブル作成
- [ ] baseball_notes テーブル拡張
- [ ] /api/v1/pro/* エンドポイント実装
- [ ] /api/v1/webhooks/revenuecat エンドポイント実装
- [ ] 各 Pro 機能の API エンドポイント実装
- [ ] FinalizeGoalsJob 等のバッチジョブ設定
- [ ] CleanupExpiredMediaJob 設定
- [ ] Stripe Webhook 受信処理
- [ ] 環境変数を本番に設定

### フロントエンド（front）

- [ ] Pro 加入ページ（/pro）
- [ ] 価格表示ページ（/help/pro/pricing）
- [ ] FAQ ページ（/help/pro/faq）
- [ ] 解約ページ（/account/subscription）
- [ ] ヘルプドキュメント（/help/pro/*）
- [ ] 各 Pro 機能の UI 実装
- [ ] 広告表示（Web AdSense は既存）
- [ ] Stripe Checkout 連携
- [ ] RevenueCat Web SDK 連携
- [ ] Pro 訴求モーダル

### モバイル（mobile）

- [ ] react-native-google-mobile-ads 導入
- [ ] expo-tracking-transparency 導入
- [ ] react-native-purchases (RevenueCat SDK) 導入
- [ ] ATT ダイアログ実装
- [ ] バナー広告実装
- [ ] インタースティシャル広告実装
- [ ] リワード広告実装
- [ ] iOS IAP 連携
- [ ] Pro 加入画面
- [ ] 各 Pro 機能の UI 実装
- [ ] 設定画面の Pro 状態表示
- [ ] プッシュ通知（スケジュール）
- [ ] EAS Build 設定更新

---

## 2. ストア対応チェックリスト

### App Store Connect

- [ ] アプリ情報更新
  - [ ] サブタイトル: 「もっと野球がしたくなる」
  - [ ] スクリーンショット更新（Pro 機能を含む）
  - [ ] プロモーションテキスト更新
  - [ ] What's New（リリースノート）
- [ ] サブスクリプション商品作成
  - [ ] `buzzbase_pro_monthly` - ¥300/月、Introductory Offer 7日無料
  - [ ] `buzzbase_pro_yearly` - ¥2,980/年、Introductory Offer 7日無料
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

- [ ] Pro 機能一覧ページ（/help/pro/features）
- [ ] 料金プランページ（/help/pro/pricing）
- [ ] FAQ ページ（/help/pro/faq）
- [ ] 解約方法ページ（/help/pro/cancel）
- [ ] リリース予告ページ（/help/pro/coming-soon）
- [ ] プライバシーポリシー更新（/privacy）
- [ ] 利用規約更新（/terms）

---

## 5. 告知準備

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
