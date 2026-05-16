# PRD-10: mobile AdMob 実装

**作成日**: 2026-05-12
**ステータス**: ドラフト（実装直前に詳細化）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`

---

## 概要

5/31 リリースで Pro と同時導入する mobile アプリの広告配信。
バナー + インタースティシャル + リワード広告のフル装備で、Pro 機能チラ見せにも活用。

---

## 背景・目的

- 戦略ドキュメントのステップ11.5 で確定
- 無料ユーザーへの収益化と Pro 加入導線の両面で活用
- ATT ダイアログを表示（収益最大化）
- Pro 加入者には全広告非表示

---

## 機能要件

### 採用する広告フォーマット（3種類）

| フォーマット | 配置 | 表示頻度 | eCPM |
|----------|----|--------|------|
| バナー広告（320×50） | ダッシュボード下部、試合一覧下部、設定画面下部 | 常時 | 50-100円 |
| インタースティシャル | 試合記録保存完了直後 | 1日2回上限 | 200-400円 |
| リワード広告 | Pro 機能のチラ見せ用 | ユーザー任意 | 150-300円 |

### リワード広告の Pro チラ見せ活用

| シーン | リワード広告の発火 |
|------|--------------|
| シーズン跨ぎ推移グラフを開く（PRD-06） | 「広告30秒 → 1回だけグラフを表示」 |
| 動画アップロード上限超え（PRD-09） | 「広告30秒 → 今日1点追加」 |
| 草機能の過去31日以上を見る（PRD-04） | 「広告30秒 → 過去3ヶ月閲覧」 |
| 4つ目のメニュー登録（PRD-05） | 「広告30秒 → 1メニュー追加」 |

### 広告表示ルール（UX 保護）

| ルール | 詳細 |
|------|----|
| インタースティシャルは達成感のある瞬間のみ | 試合記録保存直後 |
| 1日2回上限 | 過剰表示防止 |
| スキップボタンは5秒後必ず表示 | UX 配慮 |
| アプリ起動直後・編集中の表示は禁止 | 集中を妨げない |
| 練習中（素振りカウンター中等）は非表示 | コア体験保護 |
| Pro 加入者は全広告非表示 | Pro 価値の核 |

---

## Apple ATT（App Tracking Transparency）対応

### ATT ダイアログを表示する（決定）

#### 表示タイミング

- アプリ初回起動時、機能チュートリアル後
- 既存ユーザーは初回 Pro リリース版アップデート後の起動時

#### 表示文言

```
「BUZZ BASE」のアクティビティを追跡することを許可しますか？

あなたに最適な広告を表示するために
トラッキングの許可をお願いします。
広告は無料機能の継続提供に役立てられます。

[許可しない]  [許可]
```

#### app.json への設定

```json
{
  "expo": {
    "ios": {
      "infoPlist": {
        "NSUserTrackingUsageDescription": "あなたに最適な広告を表示するためにトラッキングの許可をお願いします。広告は無料機能の継続提供に役立てられます。"
      }
    }
  }
}
```

---

## 技術スタック

### ライブラリ

| ライブラリ | 用途 |
|---------|----|
| `react-native-google-mobile-ads` | AdMob SDK ラッパー |
| `expo-tracking-transparency` | ATT ダイアログ表示 |

### ビルド

- EAS Build 必須（Expo Go では動作不可）
- 既存の `expo-dev-client` があるので基盤はある

### 子供向け設定

- `tagForChildDirectedTreatment` = `false`
- `tagForUnderAgeOfConsent` = `false`
- ターゲットは13歳以上の大学生・社会人

---

## 実装詳細

### バナー広告

```typescript
// mobile/components/ads/BannerAd.tsx
import { BannerAd, BannerAdSize, TestIds } from 'react-native-google-mobile-ads';
import { useProStatus } from '@hooks/useProStatus';

const adUnitId = __DEV__
  ? TestIds.BANNER
  : process.env.EXPO_PUBLIC_ADMOB_BANNER_UNIT_ID;

export const AppBannerAd = () => {
  const { isPro } = useProStatus();
  if (isPro) return null;

  return (
    <BannerAd
      unitId={adUnitId}
      size={BannerAdSize.BANNER}
      requestOptions={{ requestNonPersonalizedAdsOnly: false }}
    />
  );
};
```

### インタースティシャル広告

```typescript
// mobile/services/interstitialAd.ts
import { InterstitialAd, AdEventType } from 'react-native-google-mobile-ads';

const interstitial = InterstitialAd.createForAdRequest(adUnitId);

export class InterstitialAdManager {
  private static todayShownCount = 0;
  private static readonly DAILY_LIMIT = 2;

  static async show(): Promise<void> {
    if (this.todayShownCount >= this.DAILY_LIMIT) return;
    if (await isPro()) return;

    interstitial.load();
    interstitial.show();
    this.todayShownCount++;
  }

  static resetDailyCount() {
    this.todayShownCount = 0;
  }
}
```

### リワード広告

```typescript
// mobile/services/rewardedAd.ts
import { RewardedAd, RewardedAdEventType } from 'react-native-google-mobile-ads';

export class RewardedAdManager {
  static async showForReward(rewardType: ProRewardType): Promise<boolean> {
    return new Promise((resolve) => {
      const rewarded = RewardedAd.createForAdRequest(adUnitId);

      rewarded.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        unlockProFeatureOnce(rewardType);
        resolve(true);
      });

      rewarded.addAdEventListener(RewardedAdEventType.CLOSED, () => {
        resolve(false);
      });

      rewarded.load();
      rewarded.show();
    });
  }
}

type ProRewardType =
  | 'view_season_graph'
  | 'add_media_attachment'
  | 'view_grass_history'
  | 'add_practice_menu';
```

---

## 配置場所の詳細

### バナー広告の配置

| 画面 | 配置場所 | 表示条件 |
|----|------|----|
| ダッシュボード | 画面下部固定 | 常時 |
| 試合一覧 | リスト下部 | スクロール末尾 |
| 設定画面 | 画面下部 | 常時 |
| プロフィール | 画面下部 | 常時 |

### バナー非表示画面

| 画面 | 理由 |
|----|----|
| 素振りカウンター実行中 | 集中を妨げない |
| 練習記録の入力中 | 集中を妨げない |
| 試合記録の入力中 | 集中を妨げない |
| Pro 加入画面 | UX 配慮 |
| ローディング画面 | 表示時間短い |

### インタースティシャル広告の発火

| トリガー | 条件 |
|------|----|
| 試合記録保存完了直後 | 1日2回上限 |

→ それ以外の場所では発火させない

---

## バックエンド連携

### AdMob 同意状態の管理

```ruby
# app/models/user.rb
class User
  # ATT 同意状態（iOS）
  # 'authorized' / 'denied' / 'not_determined' / 'restricted'
  attribute :ios_att_status, :string
end
```

### 広告表示ログ（オプション）

実装規模によっては:

```ruby
# 広告表示回数ログ（分析用）
class CreateAdImpressions < ActiveRecord::Migration[7.0]
  def change
    create_table :ad_impressions do |t|
      t.references :user, null: false
      t.string :ad_type   # 'banner' / 'interstitial' / 'rewarded'
      t.string :placement
      t.datetime :shown_at, null: false
    end
  end
end
```

---

## 期待広告収益試算（再掲）

DAU = MAU × 5% 前提、加重平均 eCPM 約100円:

| 時期 | MAU | DAU | 月間広告収益（額面） | 手取り（70%） |
|------|-----|-----|--------------|-----------|
| 2026-09末 コミット | 2,000 | 100 | ¥3,400 | ¥2,380 |
| 2026-09末 ストレッチ | 3,000 | 150 | ¥5,100 | ¥3,570 |
| 2027-05末 コミット | 3,500 | 175 | ¥5,950 | ¥4,165 |
| 2027-05末 ストレッチ | 6,500 | 325 | ¥11,050 | ¥7,735 |

---

## エッジケース・エラーハンドリング

| ケース | 対応 |
|------|----|
| 広告読み込み失敗 | 静かに非表示、ログ記録 |
| インタースティシャル表示時にアプリクラッシュ | Sentry で監視 |
| ATT 拒否 | 非パーソナライズ広告で配信継続 |
| 機内モード | バナーは「広告なし」状態、Pro 訴求バナーを代替表示も検討 |
| Pro 加入直後 | キャッシュクリアで広告非表示を即時反映 |

---

## テスト要件

### 単体テスト

- [ ] AdMob ユニットIDの環境変数読み込み
- [ ] Pro 加入者の広告非表示判定

### 統合テスト

- [ ] バナー広告が無料ユーザーで表示される
- [ ] バナー広告が Pro ユーザーで非表示
- [ ] インタースティシャル広告が1日2回上限で動作
- [ ] リワード広告で Pro 機能チラ見せが動作

### 手動テスト

- [ ] iOS 実機でテスト広告が表示される
- [ ] ATT ダイアログが初回起動時に表示される
- [ ] ATT 拒否でも広告が表示される（非パーソナライズ）

---

## 完了の定義（Definition of Done）

- [ ] iOS で AdMob テスト広告が表示される
- [ ] ATT ダイアログが初回起動時に表示
- [ ] Pro 加入で全広告非表示
- [ ] バナー / インタースティシャル / リワードの3種類が動作
- [ ] リワード広告で Pro 機能チラ見せが動作
- [ ] AdMob 本番ユニットID で動作確認
- [ ] EAS Build で実機テスト通過

---

## 後で詰める論点

- [ ] AdMob 本番ユニットID の取得
- [ ] ネイティブ広告（フィード型）の追加検討（Phase 2）
- [ ] App Open Ad の検討（UX 影響大）
- [ ] 広告表示ログの記録方法
- [ ] Android リリース時の Google Play Billing 連携
