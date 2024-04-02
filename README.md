# BUZZ BASE  
サービスURL : https://buzzbase.jp/  

![](/assets/buzz-ogp.png)

### 野球の個人成績をランキング形式で共有できるアプリ

**Qiita記事**  
[【個人開発】野球歴16年男が「野球の成績を記録して友達とランキング形式で共有できる」サービスを開発しました](https://qiita.com/ippei_jp/items/c3a10d7e3142723fae30)

**【ゲストユーザーアカウント情報】**  
・ゲストユーザー1  
Email : buzzbase.app+1@gmail.com  
Password : password  

・ゲストユーザー2  
Email : buzzbase.app+2@gmail.com  
Password : password     

・ゲストユーザー3  
Email : buzzbase.app+3@gmail.com  
Password : password    

ユーザーは野球の試合結果と個人成績を記録して管理することができます。  
そして、フォローしているユーザー同士でグループを作成することができ、グループ内で個人成績をランキング形式で比較・共有することができます。  
個人成績を可視化して、他人と比較できることで、競争心や楽しさを感じながらユーザーの野球に対するモチベーション向上をサポートするサービスになります。

## 開発背景

私は、16年間野球に取り組んでおり、キャプテンを小学校〜大学まで務めました。その経験からチームメイトのモチベーション管理に課題を感じることが多くありました。特に、大学時代に100名規模のチームのキャプテンを務めた時に、チーム全体が同じ目標に向かって取り組むために、チームメイトの野球に対するモチベーションの維持・向上に課題を感じることが多くありました。  
　キャプテン就任当初は、チームメイトに対して正論をぶつけていくアプローチ方法をとってしまい、チームメイトへ間違ったコミュニケーションをとってしまいました。  
　しかし、試行錯誤していくうちに、普段の練習ではあまりモチベーションが高くない選手でも野球に対するモチベーションが向上するタイミングを見つけました。それは、全国大会につながるリーグ戦です。このリーグ戦の直前〜リーグ戦の最中は、普段居残り練習をしない選手でも、グランドに残って練習する姿を見ました。私なりにその要因を考えたところ、リーグ戦は家族・友人が試合を観にくるので、活躍すると周りからの反応が多く、モチベーションが向上したのではないかということと、チームメイトや後輩が活躍することによる「悔しさ・焦り」からくるモチベーションがあるのではないかと思いました。  
　なので、個人成績を記録して、他のユーザーに発信ができることとランキング機能で、モチベーションが向上した時の感情に近いものをユーザーに体感してもらいたいと思い、このWebサービスを開発しました。

## 主要な機能

- 試合結果・個人打撃・個人投手成績を記録機能
- グループ作成機能
- 個人成績ランキング機能

### 📝 試合結果・個人打撃・個人投手成績を記録機能

![](/assets/record.png)

| 試合結果を記録                                                                                                                                   | 打撃成績を記録 |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------: | :---: |
| <img src="https://i.gyazo.com/4b3992d3b6493fc02389d9169bcc2eeb.gif" width="320">                                                                              | <img src="https://i.gyazo.com/e0d4423d89b82717e18b94de9621570f.gif" width="320">    |
| <p align="left">試合日付 / 試合種類（公式戦/オープン戦） / 大会名 / 自分チーム名 / 相手チーム名 / 点数 / 打順 / 守備位置 / メモ</p> | <p align="left">打席結果 / 打点 / 得点 / 失策 / 盗塁 / 盗塁死</p> |

| 投手成績を記録                                                                                                                                   | 成績まとめ |
| :----------------------------------------------------------------------------------------------------------------------------------------------------------: | :---: |
| <img src="https://i.gyazo.com/3d8031261e0e2e9d1fafd3b2c13134ae.gif" width="320">                                                                              | <img src="https://i.gyazo.com/d9eb11c5bbb7504d06387cb63942e253.gif" width="320">    |
| <p align="left">勝敗 / 投球回数 / 投球数 / 完投 / ホールド / セーブ / 失点 / 自責点 / 被安打 / 被本塁打 / 奪三振 / 四球 / 死球</p> | <p align="left">記録した成績のまとめ画面。</p> |

1試合ごとに「試合結果」と「個人成績」を記録することができます。

### 👬 グループ作成機能

![](/assets/group-v2.png)

| グループ作成 | メンバー追加 |
| :---: | :---: |
| <img src="https://i.gyazo.com/b9f4dca471348eb44cfea1100345d9f7.gif" width="320"> | <img src="https://i.gyazo.com/4ec6a5612e76622dcc8985479156f391.gif" width="320"> | 
| <p align="left">グループアイコン画像 / グループ名 / グループメンバー招待</p> | <p align="left">グループ作成後に、新規にユーザーをグループに招待することもできます。</p> |

| メンバー退会 | グループ編集 |
| :---: | :---: |
| <img src="https://i.gyazo.com/e96a1f01bf651b5b57d59bf69dfcb002.png" width="320"> | <img src="https://i.gyazo.com/f3e54f250d1a28d00d82a4affef0fa76.png" width="320"> | 
| <p align="left">メンバー一覧画面で、退会させたいユーザーのチェックを解除することで、特定のユーザーまたは自分自身を退会させることができます。</p> | <p align="left">グループ編集画面では、「アイコン画像」「グループ名」を変更することができます。また、グループ作成者のみ「グループを削除」することができます。</p> |

フォローしているユーザーのみに対して、グループメンバーに招待することができます。招待時には「通知」を送信し、ユーザー自身がグループに「参加」or「拒否」を選択することができます。  
また、グループ作成後に「新規メンバー招待」「メンバー退会」「グループ削除」が行えるようになっています。

### 👑 個人成績ランキング機能

![](/assets/ranking-v2.png)  

| 打撃成績ランキング | 投手成績ランキング |
| :---: | :---: |
| <img src="https://i.gyazo.com/5936adaa3dbe88bc09046fcf7e739e1c.gif" width="320"> | <img src="https://i.gyazo.com/37d9b3c4640b786a5c8f0d00137ef910.gif" width="320"> | 
| <p align="left">打率 / 本塁打 / 打点 / 安打 / 盗塁 / 出塁率</p> | <p align="left">防御率 / 勝利 / セーブ / HP / 奪三振 / 勝率</p> |

グループに参加しているメンバー同士で、「打撃成績」「投手成績」をランキング形式で共有することができます。

## その他機能

### 📒 野球ノート機能

| 一覧 | 作成 | 詳細・編集・削除 |
| :--- | :--- | :--- |
| <img src="https://i.gyazo.com/12ba7d5ee263889b5daa3eef56e7d053.png"> | <img src="https://i.gyazo.com/444de0a42dcc7246f69b513ac3b0d4b3.png"> | <img src="https://i.gyazo.com/c32d3ff5646dc305eed503153e975e5b.png"> | 
| 作成したノートを一覧で閲覧することができます。 | 日付・タイトル・内容を<br>直感的に入力できるようにしました。 | 内容の閲覧・編集・削除を行うことができます。 |

練習メモや試合の振り返りなどで使用することができます。

### 🙍‍♂️ ユーザー機能

| メールアドレス認証 | リアルタイムバリデーション | マイページ |
| :---: | :---: | :---: |
| <img src="https://i.gyazo.com/fbdbdc65350675f713460b88718cc7f4.gif" width="220"> | <img src="https://i.gyazo.com/9c7e6c199fd75b5b39869da825e001ff.gif" width="220"> | <img src="https://i.gyazo.com/076dd7646bb4ad712302ef0c7a2f9258.gif" width="220"> | 
| <p align="left">新規会員登録には「メールアドレス認証」を採用しました。<br> これにより不正なアカウントを作成することなどを防ぎ、セキュリティ面の向上を図りました</p> | <p align="left">リアルタイムバリデーションを導入することで、フォームを送信する前に入力ミスをユーザーに伝えることができ、UXの向上を図りました。</p> | <p align="left">マイページで「ポジション」「所属チーム」「受賞タイトル」「統計成績」「試合結果」などの情報を確認することができます。</p>

### 🔍 ユーザー検索機能

| オートコンプリート | 
| :---: |
| <img src="https://i.gyazo.com/cd124a2e3739f0d2ed61812215f06bda.gif" width="220"> | 
| <p align="left">ユーザー検索には、オートコンプリート機能を実装して、１文字ずつ候補を表示させることで、ユーザーの入力する手間を減らし、UXの向上を図りました。</p> | 

### 🔔 通知機能

| フォロー・グループ招待通知 | 
| :---: |
| <img src="https://i.gyazo.com/99c16d2c933c658cc02d3b05d2b8f1a5.gif" width="220"> | 
| <p align="left">フォロー時とグループ招待時に、通知が届きます。グループへの参加・不参加は、通知画面上で行うようにしました。</p> | 

## 使用技術

| カテゴリ | 技術 | 
| --- | --- |
| フロントエンド | Next.js 14.0.3 / React 18.2.0  / TypeScript 5.3.2 | 
| バックエンド | Ruby 3.2.2 / Ruby on Rails 7.0.8（APIモード） |
| データベース | PostgreSQL 15.5 |
| 認証 | devise token auth 1.2.2 |
| 環境構築 | Docker |
| CI/CD | Github Actions |
| インフラ | Vercel / Heroku / Amazon S3 |
| その他 | SWR / Tailwind CSS / NextUI / Mantine / js-cookie / <br> ESLint / rubocop / CarrierWave / mini magick / letter opener web |

### 🧑‍💻 技術選定理由 

野球成績記録系サービスの競合は、ネイティブアプリが多かったため、シングルページアプリケーション（SPA）を採用して、ユーザーが操作するときにストレスを与えないようにしたいと考えました。また、UIについては出来るだけ開発コストを抑えながら、使いやすさを表現したかったので、TailwindCSSとNextUIを採用しました。

**【フロントエンド】**  
野球成績記録系アプリケーションは、ネイティブアプリで開発されているものが多いため、Webアプリケーションでありながらもユーザーに高速で快適な操作感を提供することを最優先に考えました。そのため、シングルページアプリケーション（SPA）の開発に最適だと判断した、ReactとNext.jsを採用しました。  
Reactは再利用可能なUIコンポーネントを簡単に作成でき、開発効率と保守性を向上させることが期待できます。Next.jsはサーバーサイドレンダリング（SSR）や静的サイト生成（SSG）などの機能を実装することにより、SPAのデメリットである初回ロード時間を短縮することが可能です。  
また、野球成績データは多数のデータを扱うことが想定されるため、TypeScriptを導入しました。これにより型安全性と開発時の自動補完を利用し、データを扱う際に予期せぬバグが発生するリスクを減少させたいと考えました。

**【バックエンド】**  
Railsの「設定より規約」という原則により、アプリケーションの詳細な設定を大幅に減らせて、開発時間を短縮できると思ったため採用しました。例えば、Railsではモデル名が単数形であれば、自動的に対応するデータベーステーブル名が複数形で生成されるといった規約が適用されます。また、RailsはWebアプリケーションに必要な標準機能を提供しており、迅速にアプケーションを構築できると思いました。

**【データベース】**  
野球の成績記録アプリケーションでは、ユーザーデータを中心として、試合結果・打撃結果・投手結果などを扱うため、多様なデータを扱いやすいPostgreSQLを採用しました。

**【認証】**  
`devise token auth` はトークンベースの認証システムであり、サーバー側にセッション情報を持つ必要がないため、RailsをAPIとして使用する場合に適切だと思いました。

**【環境構築】**  
プログラミングスクールRUNTEQ内で「Webアプリケーションのプルリクを相互にレビューする会」に参加したため、レビューワーの方がローカル開発環境を構築しやすいようにDockerを導入しました。

**【CI/CD】**    
デプロイの自動化を行い、開発効率の向上のため、Herokuへのデプロイを GitHub Actions により自動化しました。

**【インフラ】**   
Vercelは、Next.jsとの相性の良さと、CI/CD環境の構築やデプロイの手軽さを重視してVercelを選択しました。  
Herokuは、低コストでPostgreSQLを使用できること、Ruby on Rails の環境構築などのドキュメントが豊富という観点で採用しました。  
Amazon S3は、画像のストレージとしてAmazon S3を採用しました。特に、このアプリケーションが画像を大量に扱わないため、S3の無料利用枠内でコスト効率良く運用できると判断しました。  

**【その他】**    
NextUIは、コア機能である成績を記録する画面での利用を想定して選択をしました。NextUIのフォーム系コンポーネントはシンプルで使いやすく、データ入力をスムーズすることができると思いました。また、UIデザインがモダンで、ターゲットとなりえるZ世代のユーザー層にも直感的でストレスの少ない操作体験を提供できると思いました。  
TailwindCSSは、開発時のスタイリング作業の効率化を目的に採用しました。  
SWRは、成績データなど頻繁に更新が必要な情報を効率的に扱うため採用しました。キャッシング機能とデータ再検証戦略により、アプリケーションのパフォーマンスを向上させ、ユーザーに最新の情報を迅速に提供することができます。SWRは自動的なデータ更新と最適化されたデータフェッチを実現し、ユーザー体験を向上させることができると思いました。

## インフラ構成図

![](/assets/infrastructure-configuration-chart.png)

## ER図

[![Image from Gyazo](https://i.gyazo.com/675a5d6a117b37be94c45cece4db3970.png)](https://gyazo.com/675a5d6a117b37be94c45cece4db3970)

テーブル構成は大きく分けて、**「ユーザー情報」** **「成績記録」** **「グループ機能」** の3つに分類されます。

### ユーザー情報に関するテーブル

こちらでは、ユーザー名やユーザーID、アイコン画像などの基本的な情報を `usersテーブル` で管理しています。また、野球選手としての情報も設定できるように、`positionsテーブル`（ユーザー自身の守備位置）`teamsテーブル`（所属チーム）`awardsテーブル`（過去、大会などで受賞したタイトル）と連携をしています。

`teamsテーブル` には、チームカテゴリーを設定する`baseball_categoriesテーブル` （連盟・リーグ・大学野球・高校野球・硬式・軟式など）と、チームの所在地を設定する `prefecturesテーブル`（都道府県データ） と連携しており、所属チームの詳細情報も設定できます。

### 成績記録に関するテーブル

こちらでは、1試合ごとの試合データを管理する `game_resultsテーブル` と `usersテーブル` を関連付けることで、ユーザー個別に1試合ごとの成績を記録できるようにしました。

そして、試合の詳細な成績データを記録するために、試合のスコアなどを記録する `match_resultsテーブル`、試合の打撃結果を記録する `batting_averagesテーブル`、投手結果を記録する `pitching_resultsテーブル` 作成し、`game_resultsテーブル` と関連付けています。

このような設計にすることで、`game_resultsテーブル` から試合ごとの成績データを取得することができるようにしました。

### グループ機能に関するテーブル

こちらでは、グループの詳細データを管理する `groupテーブル` 、グループ作成者を管理する `group_userテーブル`、グループへの招待状態と参加ユーザーを管理する `group_invitationsテーブル` を作成しています。

ユーザーの招待状態を「招待中」「参加」「拒否」で管理できるように、 `group_invitationsテーブル` では `statusカラム` を用いて招待状態を管理しています。

## 画面遷移図

[画面遷移図-figma](https://www.figma.com/file/zwyB9tqtr1JrFWsStPnk91/BuzzBase?type=design&node-id=0-1&mode=design)  

画面設計では、UIライブラリの **NextUI** を使用することを前提として作成しました。そして、**未ログイン時に閲覧できる画面** と **ログイン状態時に閲覧できる画面** に分けて作成しました。

ターゲットユーザーの年代を10代〜20代後半を想定していたため、その世代が普段の生活で1番触れているであろうSNSのUIを参考にしました。これにより、ユーザーが操作する際に無意識のうちに感じるストレスを軽減し、ユーザービリティの向上を図りました。

また、グループ作成時のフローは、多くのユーザーが使い慣れているであろうLINEを参考にして設計しました。これにより、ユーザーが新しいシステムを利用する際の認知負荷を最小限に抑えました。

## こだわった実装

こだわった実装は以下の機能になります。

- **UI / UX**
- **ユーザー認証機能**
- **成績記録の機能**
- **成績の自動計算機能**
- **試合成績一覧のフィルタリング機能**

### UI / UX
**UI / UX**については、**開発コストを抑えて**、ユーザーに**ストレスのない操作感**を提供することを考えて、実装を行いました。

開発コストを抑えるという点では、UIコンポーネントライブラリの**NextUI**と CSSフレームワークの**TailwindCSS**を使用することで、UI構築にかける**時間を大幅に削減**することができました。
NextUI のコンポーネントは、activeやfocusやモーダルなどのアニメーションなどがとても滑らかで、こういったアニメーションを1からCSSとJavaScriptで実装すると、意外と時間がかかってしまうので、そういった点でも開発コストを抑えてUIを構築することができました。

https://nextui.org/

データの取得には**SWR**を使用することで、**データのキャッシュ**と**再検証**により2回目以降のアクセス時にまずキャッシュからデータを返すので、レスポンス速度を向上させて**ユーザーにストレスのない操作感**を提供しようと考えました。

さらに、`stale-while-revalidate` によりバックグラウンドでデータを最新の状態に更新するため、ほぼ**リアルタイムのデータを表示**させることができます。

また、データ取得時の**エラー処理**と**ローディング状態**を簡単に扱えるので、データを取得中にローディング中のUIなどを表示することで、**ユーザビリティを向上**させました。

```ts:swrFetcher.ts
import axiosInstance from "@app/utils/axiosInstance";
export const fetcher = (url: string) =>
  axiosInstance.get(url).then((res) => res.data);
```

```ts:getBaseballNotes.ts
import { fetcher } from "@app/hooks/swrFetcher";
import useSWR from "swr";

export default function getBaseballNotes() {
  const { data, error } = useSWR("/api/v1/baseball_notes", fetcher);
  return {
    notes: data,
    isLoading: !error && !data,
    isError: error,
  };
}
```
`fetcher` 関数を使用して、**「取得データ」** **「ローディング状態」** **「エラー状態」** を管理しています。これらの状態は、コンポーネントで直接使用することができます。

```ts:NoteListComponent.tsx
export default function NoteListComponent() {
  const { notes, isLoading, isError } = getBaseballNotes();
  if (isLoading) {
    return (
      <div className="flex justify-center pb-6 pt-14">
        <Spinner color="primary" />
      </div>
    );
  }
  if (isError) {
    return (
      <p className="text-sm text-zinc-400 text-center">
        野球ノートの読み込みに失敗しました。
      </p>
    );
  }
}
```
先ほどの `getBaseballNotes` 関数を使用して、データ取得時のローディング状態とエラー状態に合わせたUIを表示することができます。

https://swr.vercel.app/ja

### ユーザー認証機能

**ユーザー認証機能**には、**メール認証により不正なアカウント作成を抑制**してセキュリティ面の強化をしたことと、**入力フォームにリアルタイムバリデーション**を設定することで、ユーザービリティ向上を図りました。

**メール認証機能**は、Railsの `devise token auth` を使用し実装しました。以下の図がメール認証の流れになります。

![devise_toke_auth.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1033689/87be19d2-ee99-ecea-8dda-c4e9e36f801a.png)

図の流れを簡単に説明すると、、、
1. **ユーザーの新規登録** → 新規登録フォームに「メールアドレス」「パスワード」を入力し、サーバー側に送信します。
2. **アカウント情報の保存とメール送信** → フロント側から送信されたデータをDBに保存し、ユーザーに対してSMTPを介して、トークンを含めたリンクが記載された確認メールを送信します。
3. **メール内リンクをクリック** → メール内に記載されているリンクをクリックすると、メールアドレス確認処理が実装されている `EmailConfirmationコンポーネント` へアクセスし、サーバー側にアカウント確認が完了したことを通知します。
4. **メールアドレス確認情報をDBに記録** 
5. **ログインページに遷移** → アカウント確認が完了しているため、ログインができるようになります。

のような流れになります。

メール内リンクをクリック後にフロントエンド側でアクセスを受ける必要があることに気づかずに、本番環境での実装に苦労しました。

次に、**フォーム入力時のリアルタイムバリデーション**についてです。

[![Image from Gyazo](https://i.gyazo.com/dca1f31524092821efd8fa325e601c80.gif)](https://gyazo.com/dca1f31524092821efd8fa325e601c80)

このように、ユーザーの入力に合わせてバリデーションを満たしているかの判定を行います。
「メールアドレス入力フォーム」で実装内容を簡単に解説します。
```tsx
"use client";
export default function SignUp() {
  const [email, setEmail] = useState("");

  const validateEmail = (
    (email: string) => email.match(/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i)
    );

  const isInvalid = useMemo(() => {
    if (email === "") return false;
    return validateEmail(email) ? false : true;
  }, [email, validateEmail]);

  return (
    <>
        <EmailInput
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="caret-zinc-400 bg-main rounded-2xl"
          type="email"
          label="メールアドレス"
          placeholder="buzzbase@example.com"
          labelPlacement="outside"
          isInvalid={isInvalid}
          color={isInvalid ? "danger" : "default"}
          errorMessage={
            isInvalid ? "有効なメールアドレスを入力してください" : ""
          }
          variant={"bordered"}
        />
    </>
  );
}
```

- `useState`を使用して `email` を定義して、`EmailInputコンポーネント` への入力値を`setEmail` 関数を介して、`email` ステートを更新します。
- `validateEmail` 関数は、入力されたメールアドレスの形式が正しいかを、正規表現を用いて確認します。
- `useMemo` を使用して、`email` の値が更新されるたびに、メールアドレスが空ではないかと `validateEmail` 関数に定義されている正規表現を満たしているかを確認します。そして、`isInvalid` は、`email` が空でないかつ、`validateEmail` 関数によるバリデーションに通過しない場合に `true` を返します。
- `isInvalid` が `true` の場合のみ、「有効なメールアドレスを入力してください」というエラーメッセージを表示します。

### 成績記録の機能
**成績を記録する機能**は、1試合ごとに「試合結果」「打撃結果」「投手結果」を記録することができる機能になります。こちらは、入力する項目数が多くなってしまうため、それぞれの記録画面を**1画面ごとに分けて**、ステップ入力のような形式で入力できるように実装し、**ユーザービリティを向上**を図りました。

1画面ごとに記録画面を分けるためには、それぞれの入力画面で同じ試合データに対してデータの保存・編集が行えるようにする必要があります。そのため、新規試合データ作成時にローカルストレージに `game_id` を保存して、各画面ではローカルストレージの `game_id` をもとにデータの操作を行うように実装しました。

また、全ての項目入力が終了したら、「入力情報まとめ画面」で入力した成績を確認できるように実装しました。

![game_results.png](https://qiita-image-store.s3.ap-northeast-1.amazonaws.com/0/1033689/0cb4a603-717c-ec10-62e7-e3b78e37b006.png)

### 成績の自動計算機能
こちらは、**打率や防御率などの個人成績を自動で計算する機能**になります。自動で計算することで、ユーザー自ら個人成績を計算する手間を省くことができます。
計算して出力する成績は以下の画像の通りになります。

| 打撃成績 | 投手成績 | 
| :---: | :---: |
| [![Image from Gyazo](https://i.gyazo.com/af0b6ae8990712c7dce340c4b096cb7a.png)](https://gyazo.com/af0b6ae8990712c7dce340c4b096cb7a) | [![Image from Gyazo](https://i.gyazo.com/e9dd7fe64c6a590ee99f66328b3ca6ee.png)](https://gyazo.com/e9dd7fe64c6a590ee99f66328b3ca6ee) |

※成績の算出方法については[こちらのページ](https://buzzbase.jp/calculation-of-grades)をご覧ください。

成績の計算ロジックは、Rails のモデルに実装し、ファットコントローラーにならないようにしました。

**打撃成績の計算ロジック**
```rb:/app/models/batting_average.rb
class BattingAverage < ApplicationRecord

  ZERO = 0

  def self.aggregate_for_user(user_id)
    aggregate_query.where(user_id:).group(:user_id)
  end
  
    def self.aggregate_query
    select('user_id',
           'COUNT(game_result_id) AS number_of_matches',  # 試合数
           'SUM(times_at_bat) AS times_at_bat',           # 打席数
           'SUM(at_bats) AS at_bats',                     # 打数
           'SUM(hit) AS hit',                             # 安打数
           'SUM(two_base_hit) AS two_base_hit',           # 2塁打数
           # 以下その他成績の合計数を計算
           .
           .
           .
           .
      .group('user_id')
  end

  def self.stats_for_user(user_id)
    result = unscoped.where(user_id:).select(
      'SUM(hit + two_base_hit + three_base_hit + home_run) AS total_hits',
      'SUM(hit) AS hit',
      'SUM(two_base_hit) AS two_base_hit',
      'SUM(three_base_hit) AS three_base_hit',
      'SUM(home_run) AS home_run',
      'SUM(at_bats) AS at_bats',
      'SUM(hit_by_pitch + base_on_balls) AS on_base',
      'SUM(sacrifice_hit) AS sacrifice_hits',
      'SUM(sacrifice_fly) AS sacrifice_fly',
      'SUM(strike_out) AS strike_outs',
      'SUM(base_on_balls) AS base_on_balls',
      'SUM(hit_by_pitch) AS hit_by_pitch'
    ).reorder(nil).take

    return nil unless result

    stats = result.attributes
    {
      user_id:,
      total_hits: stats['total_hits'].to_i,
      batting_average: stats['at_bats'].to_i.zero? ? ZERO : (stats['total_hits'].to_f / stats['at_bats'].to_i).round(3),
      on_base_percentage: (stats['at_bats'].to_i + stats['base_on_balls'].to_i + stats['hit_by_pitch'].to_i + stats['sacrifice_fly'].to_i).zero? ? ZERO : ((stats['total_hits'].to_f + stats['base_on_balls'].to_i + stats['hit_by_pitch'].to_i).to_f / (stats['at_bats'].to_i + stats['base_on_balls'].to_i + stats['hit_by_pitch'].to_i + stats['sacrifice_fly'].to_i)).round(3),
      slugging_percentage: calculate_slugging_percentage(stats).round(3)
      # その他集計成績も同様に計算
      .
      .
      .
      .
    }
  end

  def self.calculate_slugging_percentage(stats)
    at_bats = stats['at_bats'].to_i
    total_bases = stats['hit'].to_i + (stats['two_base_hit'].to_i * 2) + (stats['three_base_hit'].to_i * 3) + (stats['home_run'].to_i * 4)
    at_bats.zero? ? ZERO : total_bases.to_f / at_bats
  end

end
```

`aggregate_for_user` メソッドは、`aggregate_query` メソッドを使用してDBからのデータを集計し、引数で指定された `user_id` に一致するレコードのみをフィルタリングします。そして、指定された `user_id` に対応するユーザーの集計された統計成績を返します。

`stats_for_user` メソッドは、「打率（batting_average）」「出塁率（on_base_percentage）」「長打率（slugging_percentage）」などの統計成績を計算しています。`unscoped.where(user_id:).select().reorder(nil).take` というクエリチェーンを使用することで、`unscoped` によりデフォルトスコープを無効化し、モデル全体のデータに対してクエリが実行され、`reorder(nil)` で既存の並び替えをクリアにし、`take` で単一のレコードを取得することで、データベースから効率的かつ正確にユーザーの統計データを取得し、計算することができます。

### 試合成績一覧のフィルタリング機能
今まで記録した試合の一覧を表示する際に、**「シーズン」と「公式戦 or オープン戦」でフィルタリング**を行える機能になります。

[![Image from Gyazo](https://i.gyazo.com/c8c4f6f1a3acfe947ac89396af22817f.gif)](https://gyazo.com/c8c4f6f1a3acfe947ac89396af22817f)

実装方法を簡単に説明すると、フロント側のセレクトボックスでユーザーが選択した **「シーズン（year）」** と **「試合タイプ（matchType）」の値**を、`getFilterGameResultsUserId` 非同期関数でクエリパラメーターとしてバックエンドへ送信します。

そして、バックエンド側で `filtered_game_associated_data_user_id` アクションでこれらのパラメーターを受け取り、`filtered_game_associated_data_user` メソッドを呼び出してデータのフィルタリングを行っています。

```ts:/services/gameResultsService.ts
export const getFilterGameResultsUserId = async (
  userId: number,
  year: any,
  matchType: any
) => {
  try {
    const response = await axiosInstance.get(
      `/api/v1/game_results/filtered_game_associated_data_user_id?user_id=${userId}&year=${year}&match_type=${matchType}`
    );
    return response.data;
  } catch (error) {
    console.log(error);
    throw error;
  }
};
```

<details>
<summary>axiosInstance.ts</summary>

```ts:/utils/axiosInstance.ts
import axios from "axios";
import Cookies from "js-cookie";

const axiosInstance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
});

axiosInstance.interceptors.request.use((config) => {
  const accessToken = Cookies.get("access-token");
  const client = Cookies.get("client");
  const uid = Cookies.get("uid");

  if (accessToken && client && uid) {
    config.headers["access-token"] = accessToken;
    config.headers["client"] = client;
    config.headers["uid"] = uid;
  }

  return config;
});

export default axiosInstance;
```
</details>

↑ 非同期関数の `getFilterGameResultsUserId` を使用して、 `user_id` `year` `matchType` をパラメーターに含み、GETリクエストを行います。

```rb:/app/controllers/api/v1/game_results_controller.rb
module Api
  module V1
    class GameResultsController < ApplicationController

      def filtered_game_associated_data_user_id
        year = params[:year]
        match_type = convert_match_type(params[:match_type])
        user_id = params[:user_id]
        game_results = GameResult.filtered_game_associated_data_user(user_id, year, match_type)
        render json: game_results
      end

      private

      def convert_match_type(match_type)
        case match_type
        when '公式戦'
          'regular'
        when 'オープン戦'
          'open'
        else
          match_type
        end
      end

    end
  end
end
```

↑ 次に、`GameResultsController` の `filtered_game_associated_data_user_id` アクションでクライアントから送信されたリクエストから、`user_id` `year` `matchType` を取得して、`filtered_game_associated_data_user` メソッドに渡し、試合データのフィルタリングを行います。

```rb:/app/models/game_result.rb
class GameResult < ApplicationRecord

  def self.filtered_game_associated_data_user(user, year, match_type)
    game_results = base_query(user)
    game_results = filter_by_year(game_results, year) if year_filter_applicable?(year)
    game_results = filter_by_match_type(game_results, match_type) if match_type_filter_applicable?(match_type)

    map_game_results(game_results)
  end

  def self.base_query(user)
    includes(:match_result, :batting_average, :pitching_result).where(user:)
                                                               .where.not(match_result_id: nil)
  end

  def self.filter_by_year(game_results, year)
    start_date = Date.new(year.to_i, 1, 1)
    end_date = Date.new(year.to_i, 12, 31)
    game_results.where(match_results: { date_and_time: start_date..end_date })
  end

  def self.match_type_filter_applicable?(match_type)
    match_type.present? && match_type != '全て'
  end

  def self.filter_by_match_type(game_results, match_type)
    game_results.where(match_results: { match_type: })
  end

  def self.map_game_results(game_results)
    game_results.map do |game_result|
      {
        game_result_id: game_result.id,
        match_result: game_result.match_result,
        batting_average: game_result.batting_average,
        pitching_result: game_result.pitching_result
      }
    end
  end

end
```

↑ 試合データ一覧のフィルタリング処理は `filtered_game_associated_data_user` で実装しています。このメソッドは、以下のステップで処理が行われます。
1. まず、`base_query` メソッドを使用して、 `match_result` `batting_average` `pitching_result` をあらかじめ結合しておきます。
2. 次は、`filter_by_year` メソッドを使用して、ユーザーが選択したシーズン（year）が「通算」以外だった場合に、年でのフィルタリングが行われます。
3. 次に、`filter_by_match_type` メソッドを使用して、ユーザーが選択した試合タイプ（match_type）が「全て」以外だった場合に、試合タイプでのフィルタリングが行われます。
4. 最後に、フィルタリングされたデータがセットされた `game_results` を、ハッシュの配列にマッピングします。
この処理を行うことで、試合データ一覧を **「シーズン（year）」** と **「試合タイプ（matchType）」** でフィルタリングして、表示させることができます。

## 今後の開発について（本リリース）

今後、以下の機能を実装予定です。

- 野球ノート機能
- 鍵アカウント機能（成績を他者に公開したくないユーザー向け）
- チーム・所属カテゴリー・所属地域で絞り込まれたユーザーの成績ランキング機能
- ランキング（マルチ検索・オートコンプリート）
- ランキングお気に入り機能
- LINE Messaging API（通知機能の拡張）
- Google認証機能
- 表彰機能（大会で1番打率が良かった選手などに、バッチをプレゼントして、プロフィールに表示されるようにする）
- ファン登録機能（ユーザー登録時に、「選手」と「ファン」のどちらか選択できるようにする）
  - ファンユーザーは、選手に対して応援メッセージが送れる。
- 選手のプロフィールページへのアクセス数ランキング機能

[開発スタート時のREADMEはこちら](https://github.com/ippei-shimizu/buzzbase_front/blob/main/README.md)
