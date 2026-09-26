# プロモーション動画（Remotion）

TikTok / Instagram リール / X 向けの縦型（1080x1920）プロモーション動画を Remotion で書き出す。
画面収録ではなくコードから MP4 を生成するため、文言や尺を変えたら同じコマンドで作り直せる。

## 出力

| 項目 | 値 |
| ---- | ---- |
| 解像度 | 1080 x 1920（9:16） |
| フレームレート | 30fps |
| 尺 | 49秒（1470 フレーム） |
| 音声 | なし（各 SNS 側で BGM を付ける想定） |

## コマンド

```bash
npm install
npm run studio   # ブラウザでプレビュー・スクラブ
npm run build    # out/buzzbase-reel-vertical.mp4 を書き出す
```

特定フレームだけ静止画で確認する場合:

```bash
npx remotion still BuzzBaseReel out/frame.png --frame=700
```

## 構成

| ファイル | 役割 |
| ---- | ---- |
| `src/Reel.tsx` | シーンの並びと尺。文言・紹介する機能はここで変える |
| `src/scenes/FeatureScene.tsx` | 機能紹介シーンの共通レイアウト（見出し＋端末モック） |
| `src/scenes/Teaser.tsx` | 冒頭。硬式球がカメラに向かって飛んでくる |
| `src/scenes/LogoScene.tsx` | ロゴの着地とタグライン |
| `src/scenes/DuoScene.tsx` | 練習記録と野球ノートを2台並べる |
| `src/scenes/Cta.tsx` | 締めのロゴとダウンロード導線 |
| `src/components/Backdrop.tsx` | 全編に敷くナイターの球場。視差付きの 3D レイヤー |
| `src/components/Phone.tsx` | 実画面をはめ込む端末モック |
| `src/components/Streaks.tsx` | シーン転換の斜めトレイル（ロゴのモチーフ） |
| `src/theme.ts` | 配色とフォント |

## 素材

`public/screens/*.png` は `extract_screens.py` が生成する。
App Store 用の合成画像（`../app-store/v3`）から端末フレームを除いた実画面を切り出し、
生キャプチャ（`../app-store/captures`）と同じ 920x2002 に揃えている。

```bash
python3 extract_screens.py
```

App Store のスクリーンショットを差し替えたら、このスクリプトを流し直す。

## 見出しの改行について

和文の見出しは自動折り返しに任せず、`Reel.tsx` の `lines` に1行ずつ配列で書く。
`Headline` は `white-space: nowrap` で描画するため、1行が長すぎると画面外にはみ出す。
全角 12 文字程度を上限の目安にする。
