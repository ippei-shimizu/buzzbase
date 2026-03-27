# オンボーディング UI/UX リサーチ

> 調査日: 2026-03-17
> 目的: BUZZ BASE モバイルアプリリリースに向けた、ユーザー登録〜オンボーディングの UI/UX 改善

---

## 1. 調査ソース

- [Onbo Hub](https://onbo-hub.com/) - アプリオンボーディング事例集
- [UXCam - App Onboarding Guide 2026](https://uxcam.com/blog/10-apps-with-great-user-onboarding/)
- [Plotline - Best Mobile App Onboarding Examples 2026](https://www.plotline.so/blog/mobile-app-onboarding-examples)
- [VWO - The Ultimate Mobile App Onboarding Guide 2026](https://vwo.com/blog/mobile-app-onboarding-guide/)
- [Appcues - Essential Guide to Mobile User Onboarding](https://www.appcues.com/blog/essential-guide-mobile-user-onboarding-ui-ux)
- [Cal AI Onboarding Breakdown (Figma)](https://www.figma.com/community/file/1540803063078176882/cal-ais-onboarding-broken-down)
- [How Cal AI Made $1M/month by Month 7](https://newsletter.chrisjkoerner.com/p/1m-month-by-month-7-fed4)
- [Duolingo Onboarding UX Breakdown](https://userguiding.com/blog/duolingo-onboarding-ux)
- [Strava Onboarding Flow - App Fuel](https://www.theappfuel.com/examples/strava_onboarding)
- [Nike Run Club Onboarding - Mobbin](https://mobbin.com/explore/flows/c3b7c06f-bba1-47ee-8036-2361f1d6002a)
- [RevenueCat - State of Subscription Apps 2025](https://www.revenuecat.com/state-of-subscription-apps-2025/)
- [Adapty - State of In-App Subscriptions 2026](https://adapty.io/state-of-in-app-subscriptions/)
- [AppAgent - Paywall Optimization Strategies](https://appagent.com/blog/mobile-app-onboarding-5-paywall-optimization-strategies/)
- [UserGuiding - 100+ Onboarding Statistics 2026](https://userguiding.com/blog/user-onboarding-statistics)
- [Appcues - Why Onboarding Is Most Important](https://www.appcues.com/blog/user-onboarding-customer-journey)
- [RevenueCat - Fix Your Onboarding Funnel First](https://www.revenuecat.com/blog/growth/fix-onboarding-funnels/)
- [Lead Alchemists - Endowed Progress Effect](https://www.leadalchemists.com/marketing-psychology/cognitive-biases-marketing/endowed-progress-effect/)
- [DEV Community - Onboarding Flows That Convert](https://dev.to/paywallpro/designing-onboarding-flows-that-convert-how-to-build-trust-before-the-paywall-knp)

---

## 2. Onbo Hub 掲載アプリの分析

Onbo Hub のカテゴリ: All / Health & Fitness / Productivity / Lifestyle / Sports

| アプリ | 画面数 | 推定MRR | 注目ポイント |
|--------|--------|---------|-------------|
| **Cal AI** | 28画面 | $4,000,000/mo | 33ステップの詳細パーソナライゼーション → ハードペイウォール |
| **QUITTR** | 45画面 | $250,000/mo | 段階的ユーザー教育が充実 |
| **Life Reset** | 63画面 | $170,000/mo | 業界最大規模のオンボーディング |
| **Puff Count** | 27画面 | $40,000/mo | コンパクトなオンボーディング設計 |
| **prayer lock** | 45画面 | $40,000/mo | スピリチュアル系アプリのUXパターン |
| **Catche** | 19画面 | $40,000/mo | ミニマル設計のベストプラクティス |
| **Pushscroll** | 41画面 | $30,000/mo | スクロール機構の活用パターン |
| **Brainrot** | 37画面 | $30,000/mo | ゲーミング系のエンゲージメント施策 |
| **Wrestle AI** | 27画面 | $22,000/mo | スポーツ関連（レスリング）のUIパターン |
| **GlowUp** | 28画面 | $15,000/mo | ビューティー系アプリのデザイン |
| **Lovelee** | 15画面 | $5,000/mo | 最小限の初期設定アプローチ |

### 発見

- 画面数が多い＝離脱が多いではない
- **Cal AI は28画面で月$400万**を達成しており、パーソナライゼーション質問の量と収益は正の相関がある
- 各アプリは「タップしてアンロック」という段階的公開メカニズムを採用

---

## 3. 高収益アプリのオンボーディングパターン

### Cal AI（月商$400万、$30M ARR）

- **パーソナライゼーション重視**: 体重目標、ライフスタイル、モチベーションを詳細にヒアリング
- **「あなたの目標は現実的です」バリデーション画面**: ユーザーの自信を早期に高める
- **ハードペイウォール**: オンボーディング完了後、コア機能にアクセスするにはトライアル開始が必須
- **年間プラン推し**: 収益の大部分が年額プランから
- **インフルエンサー戦略**: 150人以上のインフルエンサーが定期的にコンテンツ投稿

### Duolingo（世界最大の語学アプリ）

- **遅延サインアップ**: 登録を最後まで遅らせ、まず価値を体験させる
- **7ステップの段階的質問**: 目標言語 → 動機 → 経験レベル → 学習ゴール
- **即座の価値提供**: カスタマイズ直後にレベルテストで体験開始
- **マスコット活用**: Duo というキャラクターが全体を案内

### Strava / Nike Run Club（スポーツ系）

- **Nike Run Club**: 最小限のオンボーディング。数問答えたらすぐ走れる（低フリクション重視）
- **Runna（Strava傘下）**: 詳細ヒアリング型。ゴール・走力レベル・利用可能日数・開始日を聞き、パーソナライズドプランを作成

### Fastic（2,600万ユーザーの断食アプリ）

- 温かみのあるフレンドリーなコピー
- 質問の間に定期的な「期待設定」の休憩を挟む

### MyFitnessPal

- 機能が多いにも関わらず、ユーザーフレンドリーなオンボーディングが高評価

---

## 4. 2025-2026年の主要オンボーディングパターン

### A. プログレッシブ・オンボーディング

使いながら学ぶ方式。コンテキストに応じたツールチップやヒントを表示。静的なスワイプ画面より効果が高い。

### B. 遅延サインアップ（Delayed Signup）

登録をフローの後半に配置。先にアプリの価値を体験させてから登録を促す。DoorDash、Duolingo が代表例。

### C. パーソナライゼーション質問

ユーザーに「自分専用」と感じさせる。高収益アプリほどこの質問が多い傾向。

### D. 即座の価値提供（Quick Win）

10秒以内に価値を見せるのがベストプラクティス。

### E. ソーシャルプルーフ

「○○万人が利用中」「レビュー★4.8」などをオンボーディング内に配置。

---

## 5. 長いオンボーディングが高収益に繋がる心理メカニズム

### 核心：「画面数が多い」のではなく「投資させている」

長いオンボーディング自体に価値があるのではなく、**ユーザーに時間と感情を投資させること**がコンバージョンを高めている。

### サンクコスト効果（Sunk Cost Effect）

人は「すでに時間や労力を使ったもの」を途中でやめにくい。

- **短いフロー**: 「買うべきか？」（ゼロベースの判断）
- **長いフロー**: 「ここまで入力したのに、やめるのか？」（損失回避の判断）

Cal AI の33ステップで体重目標やライフスタイルを丁寧に入力した後にペイウォールが出ると、後者の思考が働き、コンバージョンが大幅に高くなる。

### エンダウドプログレス効果（Endowed Progress Effect）

洗車スタンプカードの実験：「10個中0個」より「12個中2個（最初から2つ押してある）」の方が、**完了率が2倍**になった。プログレスバーを見せながらオンボーディングを進めるのはこの効果の活用。

### 高収益アプリのフロー構造

```
[パーソナライゼーション質問] ← 感情投資を積み上げる
        ↓
[バリデーション画面]        ← 「あなたの目標は達成可能です」と肯定
        ↓
[パーソナライズド結果表示]   ← 投資のリターンを見せる
        ↓
[ペイウォール]              ← 「ここでやめますか？」
```

### 失敗するパターン

- 質問が多いだけで結果に反映されない（投資のリターンがない）
- プログレスバーがない（終わりが見えない）
- 質問がアプリと無関係（意味のない投資）

---

## 6. オンボーディングに関する定量データ

### コンバージョン・リテンション

| データ | 出典 |
|--------|------|
| パーソナライズドオンボーディングで**完了率+35%** | UserGuiding 2026 |
| オンボーディングチェックリスト完了者は**有料転換3倍** | Appcues |
| ソーシャルプルーフを含むオンボーディングは**CVR+30%** | UserGuiding |
| 1つの「コミットメント確認画面」追加で**30日後リテンション2倍** | RevenueCat |
| Week1リテンション15%改善 → **年間収益+40%** | Appcues |
| 初期リテンション5%向上 → **ARR+25%** | Custify |
| フィットネスアプリがパーソナライズドオンボーディング導入 → **サブスク転換+75%、離脱-66%** | Zigpoll |
| 優れたオンボーディングで**ユーザーリテンション+50%** | VWO |
| ダウンロードされたアプリの**90%以上が最初の1ヶ月で放棄される** | 業界統計 |

### ペイウォール配置

| データ | 出典 |
|--------|------|
| トライアル開始の**89.4%がインストール当日** | RevenueCat 2025 |
| オンボーディング内ペイウォールがトライアル開始の**約50%** | Mojo事例 |
| 動的ペイウォールは静的より**CVR+35%** | Adapty 2026 |
| 週額プランが全アプリ収益の**55.5%** | RevenueCat 2025 |
| 週額+トライアルが最高LTV構成（**$49.27/12ヶ月**） | RevenueCat 2025 |
| A/Bテスト実施アプリは非実施の**40倍**の収益 | Adapty 2026 |
| ペイウォールを先頭に移動で**収益5倍** | AppAgent事例 |

---

## 7. BUZZ BASEへの提案

### 推奨オンボーディングフロー

```
1. ウェルカム画面
   - アプリの価値を端的に伝える
   - ソーシャルプルーフ（「○○人の野球選手が利用中」）

2. パーソナライゼーション質問（3-5問）
   - ポジション
   - カテゴリ（中学/高校/大学/社会人）
   - チーム名
   - 最も注目したい成績（打率/防御率/etc）

3. 即座の価値提供（Quick Win）
   - サンプルランキングを見せる or 自分の成績を1つ入力させる
   - 「あなたと同じポジションの選手ランキングはこちら！」

4. アカウント登録（遅延サインアップ）
   - SNS認証 or メール

5. プッシュ通知許可

6. メインアプリへ
```

### 設計のポイント

1. **遅延サインアップを採用**: 登録前にランキングのプレビューや価値を体感させる
2. **パーソナライゼーションは5問以内**: 野球特有の情報（ポジション・カテゴリ）を聞くことで「自分専用」感を演出
3. **プログレスバー表示**: 完了までの進捗を見せることで離脱を防止
4. **将来の収益化を見据え**: オンボーディング末尾にペイウォール配置の余地を設計に入れておく（トライアル開始の89%がDay 0）
5. **野球特有の感情投資**: ポジションや目標成績を聞くことで、サンクコスト効果を自然に活用できる
