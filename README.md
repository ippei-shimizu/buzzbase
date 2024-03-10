# BUZZ BASE

![](/assets/buzz-ogp.png)

### 野球の個人成績をランキング形式で共有できるアプリ

サービスURL : https://buzzbase.jp/  

【ゲストユーザーアカウント情報】  
Email : buzzbase.app+1@gmail.com  
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

### 📝 試合結果・個人打撃・個人投手成績を記録録機能

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

![](/assets/group.png)

| グループ作成 | メンバー追加 |
| :---: | :---: |
| <img src="https://i.gyazo.com/b9f4dca471348eb44cfea1100345d9f7.gif" width="320"> | <img src="https://i.gyazo.com/4ec6a5612e76622dcc8985479156f391.gif" width="320"> | 
| <p align="left">グループアイコン画像 / グループ名 / グループメンバー招待</p> | <p align="left">グループ作成後に、新規にユーザーをグループに招待することができます。</p> |

| メンバー退会 | グループ編集 |
| :---: | :---: |
| <img src="https://i.gyazo.com/e96a1f01bf651b5b57d59bf69dfcb002.png" width="320"> | <img src="https://i.gyazo.com/f3e54f250d1a28d00d82a4affef0fa76.png" width="320"> | 
| <p align="left">メンバー一覧画面で、退会させたユーザーのチェックを解除することで、特定のユーザーを退会させることができます。</p> | <p align="left">グループ編集画面では、「アイコン画像」「グループ名」を変更することができます。また、グループ作成者のみ「グループを削除」することができます。</p> |

フォローしているユーザーのみに対して、グループメンバーに招待することができます。招待時には「通知」を送信し、ユーザー自身がグループに「参加」or「拒否」を選択することができます。  
また、グループ作成後に「新規メンバー招待」「メンバー退会」「グループ削除」が行えるようになっています。

### 👑 個人成績ランキング機能

![](/assets/ranking.png)  

| 打撃成績ランキング | 投手成績ランキング |
| :---: | :---: |
| <img src="https://i.gyazo.com/5936adaa3dbe88bc09046fcf7e739e1c.gif" width="320"> | <img src="https://i.gyazo.com/37d9b3c4640b786a5c8f0d00137ef910.gif" width="320"> | 
| <p align="left">打率 / 本塁打 / 打点 / 安打 / 盗塁 / 出塁率</p> | <p align="left">防御率 / 勝利 / セーブ / HP / 奪三振 / 勝率</p> |

グループに参加しているメンバー同士で、「打撃成績」「投手成績」をランキング形式で共有することができます。




[開発スタート時のREADMEはこちら](https://github.com/ippei-shimizu/buzzbase_front/blob/main/README.md)
