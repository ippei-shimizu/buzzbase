# PRD-10: mobile AdMob 実装

**作成日**: 2026-05-12
**最終更新**: 2026-07-29（issue #444対応にあたり広告設計を全面見直し。リワード広告を廃止しバナー+インタースティシャルの2種類に縮小）
**ステータス**: 実装直前に確定（issue #444で着手予定）
**親ドキュメント**: `../pro-plan-prd-202605.md`
**前提PRD**: `01-system-architecture.md`

---

## 概要

mobile アプリの広告配信。バナー + インタースティシャルの2種類のみを採用する。

当初案（2026-05-12時点）はバナー+インタースティシャル+リワード広告のフル装備で、
リワード広告をPro機能のチラ見せにも活用する計画だった。issue #444の実装着手にあたり
再設計し、リワード広告は廃止した。理由は「実装状況」節を参照。

---

## 背景・目的

- 戦略ドキュメントのステップ11.5 で確定
- 無料ユーザーへの収益化と Pro 加入導線の両面で活用
- ATT ダイアログを表示（収益最大化）
- Pro 加入者には全広告（バナー・インタースティシャル）非表示
- 広告はあくまで無料ユーザー体験を支える補完的収益。収益の主軸は Pro 課金であり、
  広告表示を控えめにして「Pro に加入する価値がある」という体験を守ることを優先する

---

## 実装状況（2026-07-29 追記）

issue #444（Pro Epicリリース前レビューで発覚、PRD-10は書かれたが実装ゼロだった）の着手にあたり、
広告設計を全面的に見直した。

### リワード広告を廃止した理由

PRD-10当初案は、以下4つのPro機能を「広告30秒視聴で1回だけ解放」するリワード広告導線を想定していた。

| # | 機能 | 検証結果 |
|---|---|---|
| 1 | シーズン跨ぎ推移グラフ（PRD-06） | 実装は `hasEntitlement("season_transition_graph")` による `PaywallModal` 直接誘導のみ。リワード広告フックは存在しない |
| 2 | 動画アップロード上限超え（PRD-09） | PRD-09が2026-06-27付けで方針転換済み。「リワード広告ボタンは撤去し、Pro加入導線のみ」と明記されている |
| 3 | 草機能の過去31日以上を見る（PRD-04） | 前提の詳細画面（月別ナビ・日付タップ詳細・年ビュー）をissue #446で実装したが、プロダクト判断で不要と却下されPRクローズ（`buzzbase_mobile#167`、未マージ）。「見るには広告」というUIフック自体が存在しない |
| 4 | 4つ目のメニュー登録（PRD-05） | #1と同様、`hasEntitlement("unlimited_practice_menus")` による `PaywallModal` のハードペイウォールのみ |

4機能とも既に「広告視聴による一時解放」ではなく「Paywallへの直接誘導」という設計に収束済みだった。
個別の導線が1つ崩れたのではなく、コンセプト自体を維持する理由が無くなっていたため、リワード広告は
今回のスコープから完全に削除する。ネイティブ広告（フィード型）も Phase 2 のまま据え置く（「後で詰める論点」参照）。

理由は収益インパクトの小ささ（広告収益全体でも「期待広告収益試算」の通り月¥2,380〜7,735規模）に加え、
「広告視聴で機能解放」という体験が、データ志向の大人ユーザーが一定数いる本アプリの客層には安っぽく映り、
Pro転換の説得力（＝お金を払う価値がある、という納得感）を毀損しかねないという判断による。

---

## 機能要件

### 採用する広告フォーマット（2種類）

| フォーマット | 配置 | 表示頻度 | eCPM |
|----------|----|--------|------|
| バナー広告（320×50） | Home・試合結果・成績・グループ・マイページ、各タブのルート画面のみ（ボトムナビ直上） | 常時 | 50-100円 |
| インタースティシャル | 試合記録保存完了直後 | 1日1回上限、初回起動後の猶予期間あり | 200-400円 |

リワード広告は廃止（「実装状況」節参照）。ネイティブ広告（フィード型）はPhase 2で再検討する。

### 広告表示ルール（UX 保護）

| ルール | 詳細 |
|------|----|
| インタースティシャルは達成感のある瞬間のみ | 試合記録保存直後 |
| 1日1回上限 | 過剰表示防止（当初案の1日2回から引き下げ） |
| 初回起動後の猶予期間 | 直近7日 or 起動5回目までは表示しない（初回体験の質を守る） |
| スキップボタンは5秒後必ず表示 | UX 配慮 |
| アプリ起動直後・編集中の表示は禁止 | 集中を妨げない |
| 練習中（素振りカウンター中等）は非表示 | コア体験保護 |
| バナーはタブのルート画面のみ、ネストされた画面には表示しない | 試合詳細・野球ノート一覧/詳細・練習記録の入力/編集・グループ詳細等は対象外 |
| Pro 加入者はバナー・インタースティシャルとも全広告非表示 | Pro 価値の核 |

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

// 初回起動後しばらくは広告を出さず、初回体験の質を守る猶予期間。
const GRACE_PERIOD_DAYS = 7;
const GRACE_PERIOD_LAUNCH_COUNT = 5;

export class InterstitialAdManager {
  private static todayShownCount = 0;
  private static readonly DAILY_LIMIT = 1;

  static async show(): Promise<void> {
    if (this.todayShownCount >= this.DAILY_LIMIT) return;
    if (await isPro()) return;
    if (await isWithinGracePeriod(GRACE_PERIOD_DAYS, GRACE_PERIOD_LAUNCH_COUNT)) return;

    interstitial.load();
    interstitial.show();
    this.todayShownCount++;
  }

  static resetDailyCount() {
    this.todayShownCount = 0;
  }
}
```

---

## 配置場所の詳細

### バナー広告の配置

ボトムナビゲーション（Home・試合結果・成績・グループ・マイページの5タブ）の**ルート画面のみ**、
ボトムナビ直上に配置する。タブレイアウト（`(tabs)/_layout.tsx`）側で共通マウントすると
ネストされた画面にも意図せず波及するため、**5つのルート画面それぞれに個別実装**する。

| 画面 | 配置場所 | 表示条件 |
|----|------|----|
| Home（ダッシュボード） | ボトムナビ直上 | 常時 |
| 試合結果一覧 | ボトムナビ直上 | 常時 |
| 成績 | ボトムナビ直上 | 常時 |
| グループ一覧 | ボトムナビ直上 | 常時 |
| マイページ | ボトムナビ直上 | 常時 |

### バナー非表示画面

上記5画面のルート以外はすべて非表示（デフォルトOFF）。特に以下は明示的に対象外とする。

| 画面 | 理由 |
|----|----|
| 試合詳細・野球ノート一覧/詳細等、タブ配下のネスト画面 | ルート画面のみという設計上、対象外 |
| 練習記録の入力・編集（`(practice-record)`） | タブ外の独立画面かつ集中を妨げない |
| 素振りカウンター実行中 | 集中を妨げない |
| 試合記録の入力中 | 集中を妨げない |
| Pro 加入画面 | UX 配慮 |
| ローディング画面 | 表示時間短い |

### インタースティシャル広告の発火

| トリガー | 条件 |
|------|----|
| 試合記録保存完了直後 | 1日1回上限、初回起動後7日 or 起動5回目までは非表示 |

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
      t.string :ad_type   # 'banner' / 'interstitial'
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

> この規模感の通り、広告収益は Pro 課金に比べ小規模な補完的収益である。
> 広告フォーマットの追加・表示頻度の引き上げを検討する際は、収益インパクトと
> UX 毀損リスクを比較し、Pro 課金への転換を阻害しないことを優先する。

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

- [ ] バナー広告がタブのルート画面で無料ユーザーに表示される
- [ ] バナー広告がタブ配下のネスト画面では表示されない
- [ ] バナー広告が Pro ユーザーで非表示
- [ ] インタースティシャル広告が1日1回上限で動作
- [ ] インタースティシャル広告が初回起動後の猶予期間中は表示されない
- [ ] インタースティシャル広告が Pro ユーザーで非表示

### 手動テスト

- [ ] iOS 実機でテスト広告が表示される
- [ ] ATT ダイアログが初回起動時に表示される
- [ ] ATT 拒否でも広告が表示される（非パーソナライズ）

---

## 完了の定義（Definition of Done）

- [ ] iOS で AdMob テスト広告が表示される
- [ ] ATT ダイアログが初回起動時に表示
- [ ] Pro 加入で全広告（バナー・インタースティシャル）非表示
- [ ] バナー / インタースティシャルの2種類が動作
- [ ] バナーがタブの5ルート画面のみに表示され、ネスト画面には表示されない
- [ ] AdMob 本番ユニットID で動作確認
- [ ] EAS Build で実機テスト通過

---

## 後で詰める論点

- [ ] AdMob 本番ユニットID の取得
- [ ] ネイティブ広告（フィード型）の追加検討（Phase 2。今回は見送り。利用データが溜まってから要否判断）
- [ ] App Open Ad の検討（UX 影響大）
- [ ] 広告表示ログの記録方法
- [ ] Android リリース時の Google Play Billing 連携
