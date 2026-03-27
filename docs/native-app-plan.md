# BUZZ BASE ネイティブアプリ対応方針

## 関連Issue

- [#110 Feature: ネイティブアプリ対応](https://github.com/ippei-shimizu/buzzbase/issues/110)

## 目的

- ストア配信（App Store / Google Play）によるユーザー獲得の拡大
- Web版は継続運用し、ネイティブアプリを追加する

## アーキテクチャ

```
┌─────────────┐  ┌──────────────────┐
│  Next.js    │  │  React Native    │
│  (Web)      │  │  (Expo)          │
│  front/     │  │  mobile/         │
└──────┬──────┘  └────────┬─────────┘
       │                  │
       └────────┬─────────┘
                │ REST API
         ┌──────┴──────┐
         │  Rails API  │
         │  back/      │
         └─────────────┘
```

- **Web版 (Next.js)**: 継続運用
- **ネイティブアプリ**: React Native (Expo) で新規開発
- **バックエンド**: 既存の Rails API を共用（変更なし）

## フレームワーク選定

### 採用: React Native (Expo)

選定理由:

- 既存のReact/TypeScriptスキルをそのまま活かせる
- Expo で開発〜ビルド〜配信まで一気通貫で個人開発でも回せる
- ネイティブUIで描画されるため、ストア審査のリジェクトリスクが低い
- ネイティブの操作感がユーザー評価・レビューに直結する

### 比較した選択肢

| 選択肢 | 不採用理由 |
|--------|-----------|
| PWA | ストア配信ができない |
| Capacitor | WebViewラップのためApple審査リジェクトリスクあり、UXがWeb寄り |
| Flutter | Dart の新規学習が必要、既存のReact/TS資産が活かせない |
| ネイティブ (Swift/Kotlin) | iOS/Android 別々に開発が必要、個人開発では負担が大きい |

---

## 技術スタック詳細リサーチ（2026年3月時点）

### 1. Expo SDK

| 項目 | 内容 |
|------|------|
| 最新バージョン | **SDK 55**（2026年2月リリース） |
| ベース | React Native 0.83.1 / React 19.2.0 |
| New Architecture | **必須化**（Legacy Architectureは削除済み） |
| パッケージバージョン | expo-* パッケージはSDKと同じメジャーバージョン（例: expo-camera@^55.0.0） |

### 2. ナビゲーション

| 項目 | Expo Router v55 | React Navigation v8 (alpha) |
|------|-----------------|---------------------------|
| ルーティング方式 | ファイルベース（`app/`ディレクトリ構造 = ルート） | 宣言的なNavigator/Screenコンポーネント |
| ディープリンク | **自動**（設定不要） | 手動設定が必要（v8で改善） |
| TypeScript | ファイル構造から**自動生成** | v8でパスパターンから自動推論 |
| 初期ロード | ~1.4s（静的生成で~0.8s） | ~1.2s |
| 関係性 | React Navigation の上に構築されたスーパーセット | 基盤ライブラリ |
| 推奨度 | **Expoプロジェクトの公式推奨・デフォルト** | bare RNプロジェクト向け |

**結論: Expo Router** -- Next.jsのファイルベースルーティングと同じ思想で学習コストが低い。Expoの公式推奨。

### 3. UIライブラリ

| ライブラリ | バージョン | スタイリング | パフォーマンス | TailwindCSS親和性 | 活発度 |
|-----------|-----------|------------|--------------|-----------------|--------|
| **NativeWind** | v4.2.2 (v5 pre) | Tailwind CSSクラス | コンパイル時抽出 | **最高** | 週634Kダウンロード |
| **Gluestack UI** | v3 | NativeWind + Tailwindクラス | コンパイル時 | **高い** | NativeWind上に構築 |
| **Tamagui** | v2.0.0-rc | 独自API + 最適化コンパイラ | **最速** | 中程度（異なるAPI） | 12K GitHub stars |
| **RN Paper** | v5.15.0 | StyleSheet + Material Design | ランタイム | 低い | Callstack提供 |
| **UI Kitten** | v5.3.1 | Eva Design | ランタイム | 低い | **メンテ停止** |
| **Unistyles** | v3.1.1 | StyleSheet拡張（C++/JSI） | **最速級** | なし | 活発 |

補足:
- **NativeWindUI**: NativeWind上に構築された30+のネイティブ風コンポーネント集
- **React Native Reusables**: NativeWind上に構築、shadcn/uiにインスパイアされたコピペコンポーネント集
- **Gluestack UI v3**: NativeWind上で動作する「RNのshadcn/ui」的な位置づけ

**結論: NativeWind + Gluestack UI（またはReact Native Reusables）** -- TailwindCSS経験を直接活かせる。Gluestack UIでアクセシブルなコンポーネントも利用可能。

### 4. データ取得

| ライブラリ | バージョン | バンドルサイズ | RN対応 | オフラインサポート |
|-----------|-----------|-------------|--------|-----------------|
| **TanStack Query** | v5.90.x | ~13KB | **ファーストクラス**（onlineManager, AppState連携） | **優秀**（persist-client, optimistic updates） |
| **SWR** | v2.4.1 | ~4KB | 手動設定が必要（AppState/NetInfo自前実装） | 基本的（永続化は自前） |
| **RTK Query** | v2.10.x | ~15KB+ | UI非依存で動作 | 限定的（Redux Persist経由） |

**結論: TanStack Query** -- RNファーストクラスサポート、オフライン対応、エコシステムの成熟度で圧倒的。

### 5. 状態管理（クライアントステート）

| ライブラリ | バージョン | バンドルサイズ | 特徴 | 週間DL |
|-----------|-----------|-------------|------|--------|
| **Zustand** | v5.x | ~1-3KB | Provider不要、最小ボイラープレート | **9M** |
| **Jotai** | v2.x | ~2.1KB | アトムベース、細粒度リアクティビティ | 1.1M |
| **Redux Toolkit** | v2.10.x | ~15KB | 厳格なパターン、DevTools | 7M+ |
| **Recoil** | v0.7.7 | - | **アーカイブ済み（使用非推奨）** | - |
| **Legend State** | v3 | ~4KB | オフラインファースト設計、シグナルベース | 成長中 |

**結論: Zustand** -- 軽量・シンプル・Provider不要。2026年のデファクトスタンダード。

### 6. HTTPクライアント

| ライブラリ | RN対応 | 特徴 |
|-----------|--------|------|
| **axios** | **安定** | 最も成熟、インターセプタ、自動JSON、エラーハンドリング |
| **ofetch** | **明示的サポート** | 軽量、リトライ、インターセプタ。axiosより小さい |
| **ky** | **非対応**（ブラウザ専用） | RNでは使用不可 |
| **native fetch** | 動作する | 手動JSON解析、エラーチェック必要 |

**結論: axios** -- Web版と共通化でき、エコシステムが最も成熟。

### 7. ユーティリティ

| 用途 | ライブラリ | 備考 |
|------|-----------|------|
| 認証トークン管理 | **expo-secure-store** | iOS Keychain / Android Keystore。暗号化済み |
| 画像 | **expo-image** | Expo公式。キャッシュ、blurhash対応、トランジション |
| プッシュ通知 | **expo-notifications** (v55) | FCM/APNs統合API。Expo Go Android非対応（Dev Client必須） |

### 8. 開発環境・ビルド

| ツール | 用途 | 備考 |
|--------|------|------|
| **Expo Go** | プロトタイピング | カスタムネイティブモジュール不可、通知Android非対応 |
| **Dev Client** | 本番開発 | フルカスタマイズ可能。ストア配信前に移行推奨 |
| **EAS Build** | クラウドビルド | Free tierあり（キュー待ち）。Starter $19/月 |
| **EAS Submit** | ストア申請 | App Store / Google Play。Mac不要でiOS申請可能 |
| **EAS Update** | OTAアップデート | JSバンドル更新。段階的ロールアウト対応 |

---

## 推奨技術スタック（最終案）

| カテゴリ | ライブラリ | 選定理由 |
|---------|-----------|---------|
| フレームワーク | **Expo SDK 55** | 最新、New Architecture標準 |
| ナビゲーション | **Expo Router** | ファイルベース、Next.jsと同思想、公式推奨 |
| UIスタイリング | **NativeWind v4** | TailwindCSS経験を直接活用 |
| UIコンポーネント | **Gluestack UI v3** or **React Native Reusables** | NativeWind上のアクセシブルなコンポーネント集 |
| データ取得 | **TanStack Query v5** | RNファーストクラス、オフライン対応 |
| 状態管理 | **Zustand v5** | 軽量、シンプル、デファクトスタンダード |
| HTTPクライアント | **axios** | Web版と共通、成熟したエコシステム |
| 認証トークン | **expo-secure-store** | 暗号化ストレージ |
| 画像 | **expo-image** | Expo公式、高性能キャッシュ |
| プッシュ通知 | **expo-notifications** | FCM/APNs統合 |
| ビルド・配信 | **EAS Build / Submit / Update** | クラウドビルド、OTAアップデート |

## リポジトリ構成

既存のモノレポにサブモジュールとして `mobile/` を追加（front/back と同じ方式）。

```
buzzbase/
├── front/          # Web版 (Next.js) - サブモジュール
├── back/           # Rails API - サブモジュール
├── mobile/         # ネイティブアプリ (Expo) - サブモジュール
└── docker-compose.yml
```

## 検討事項

### 認証方式

- 現在 `devise_token_auth` を使用
- ネイティブアプリではトークンベース認証（Authorization ヘッダー）が基本
- Rails API側がトークン認証に対応しているか確認が必要

### API接続先

| 環境 | Web版 | ネイティブアプリ |
|------|-------|----------------|
| 開発 | `http://back:3000` (Docker内) | ローカルIPアドレス |
| 本番 | Heroku URL | Heroku URL |

### 開発環境

- Expo Go でプロトタイピング → Dev Client で本番開発に移行
- EAS Build でストア用ビルド
- EAS Submit でストア申請

## ステータス

- [x] フレームワーク選定（React Native / Expo）
- [x] 技術スタック詳細リサーチ・比較
- [ ] 既存API の認証方式確認・ネイティブ対応調査
- [ ] mobile リポジトリ作成・Expo プロジェクト初期セットアップ
- [ ] 基本画面の実装
- [ ] ストア申請
