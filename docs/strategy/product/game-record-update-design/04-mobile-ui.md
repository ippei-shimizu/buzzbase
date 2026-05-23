# 04. mobile UI ワイヤーフレーム

**親ドキュメント**: `../game-record-update-design-doc.md`
**前提**: `01-data-model.md`, `02-api-spec.md`, `03-ground-zones.md`
**関連 Issue**: #332, #333, #334, #335, #336

---

## 1. 画面遷移マップ

```
[試合記録一覧]
   │
   │ [+] 新規記録
   ▼
[試合基本情報入力]   ← 球場追加 (任意)
   │
   │ 次へ
   ▼
[3パターン分岐選択]
   ├─ 打撃のみ ───┐
   ├─ 投手のみ ───┼──→ [投手結果入力] (既存)
   └─ 両方 ───────┘            │
         │                      │
         ▼                      ▼
[打席リスト] ─── タップ ──→ [打席ステップ式入力]
         │                      │
         │ +打席追加            │ 完了
         │                      ▼
         │              [打席リスト] (戻る)
         │
         │ 完了
         ▼
[投手結果入力] (両方の場合のみ) → [試合結果まとめ]
                                       │
                                       ▼
                                  [試合記録一覧]
```

## 2. 画面1: 試合基本情報入力

```
┌───────────────────────────────────────┐
│  ← 試合記録                            │
├───────────────────────────────────────┤
│                                       │
│  日時 *                               │
│  ┌─────────────────────────────────┐  │
│  │ 2026/05/17 13:00              │  │
│  └─────────────────────────────────┘  │
│                                       │
│  自チーム *                           │
│  ┌─────────────────────────────────┐  │
│  │ ○○高校                        │  │
│  └─────────────────────────────────┘  │
│                                       │
│  対戦相手 *                           │
│  ┌─────────────────────────────────┐  │
│  │ △△高校                        │  │
│  └─────────────────────────────────┘  │
│                                       │
│  試合種別 *                           │
│  ( ) 公式戦  ( ) 練習試合             │
│                                       │
│  ┌─ 球場 (任意) ──────── 新規 ─────┐  │
│  │ 球場名で検索...                 │  │
│  └─────────────────────────────────┘  │
│   ↓ 検索候補                          │
│   ・東京ドーム                        │
│   ・神宮球場                          │
│   ・○○野球場                        │
│   [+ 新しい球場を追加]               │
│                                       │
│  スコア                               │
│  自チーム: [ 5 ]                      │
│  相手チーム: [ 3 ]                    │
│                                       │
│         ┌──────────────────┐          │
│         │  次へ            │          │
│         └──────────────────┘          │
└───────────────────────────────────────┘
```

**主要コンポーネント**:
- `TeamSelectInput`（既存流用）
- `StadiumSelectInput`（新規、TeamSelectInput と同パターン）
- `MatchTypeRadio`（既存流用）

---

## 3. 画面2: 3パターン分岐選択

```
┌───────────────────────────────────────┐
│  ← 試合記録                            │
├───────────────────────────────────────┤
│                                       │
│  どの記録を入力しますか?              │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  🏏  打撃結果のみ入力           │  │
│  │   バッターとして打席を記録      │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ⚾  投手結果のみ入力           │  │
│  │   ピッチャーとして登板を記録    │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  🏃  打撃・投手記録を入力       │  │
│  │   両方を記録                    │  │
│  └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

選択結果は **クライアント状態のみ**（DB に保存しない）。各ボタンタップで対応画面へ遷移。

---

## 4. 画面3: 打席リスト

```
┌───────────────────────────────────────┐
│  ← 打撃記録                  [完了]   │
├───────────────────────────────────────┤
│                                       │
│  打席一覧                             │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ 第1打席   中安                  │  │
│  │ 打点 1 / 詳細あり               │  │
│  │                       [編集] →  │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ 第2打席   遊ゴロ                │  │
│  │              [詳細未入力]       │  │
│  │                       [編集] →  │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │ 第3打席   三振                  │  │
│  │              [詳細未入力]       │  │
│  │                       [編集] →  │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  + 打席を追加                   │  │
│  └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

**動作**:
- 各カードをタップで打席ステップ式入力（編集モード）
- カード長押しで削除確認モーダル
- 「+ 打席を追加」で打席ステップ式入力（新規モード、`batter_box_number` 自動採番）
- 「詳細未入力」バッジは `has_detail_data = false` の場合に表示

---

## 5. 画面4: 打席ステップ式入力（メイン画面）

### 5.1 全体レイアウト

```
┌───────────────────────────────────────┐
│  ← 第1打席                  [保存]   │
├───────────────────────────────────────┤
│                                       │
│   ┌─ グラウンド ────────────────┐    │
│   │                              │    │
│   │       中                     │    │
│   │   左中   右中                │    │
│   │ 左         右                │    │
│   │左線        右線              │    │
│   │  ┌──二──┐                   │    │
│   │  ┃      ┃                   │    │
│   │  三─遊─二─一                │    │
│   │      投                     │    │
│   │      捕                     │    │
│   │                              │    │
│   │  [タップで打球方向を選択]   │    │
│   └──────────────────────────────┘    │
│                                       │
│   選択中: 中・外野 (深さ: 外野)      │
│                                       │
├───────────────────────────────────────┤
│  打席結果                             │
│                                       │
│  [ アウト ] [ ヒット ] [ 失策 ]      │
│  [ FC ] [ 犠打 ] [ 犠飛 ]            │
│                                       │
│  ─────── 打球方向なし ───────       │
│                                       │
│  [ 空振り三振 ] [ 見逃し三振 ]       │
│  [ 振り逃げ ]  [ 四球 ]              │
│  [ 死球 ]      [ 打撃妨害 ]          │
│                                       │
└───────────────────────────────────────┘
```

### 5.2 動作: 打球方向タップ前

- グラウンド未タップ状態
- 「打球方向なし」セクションのボタンのみアクティブ
- 「打球方向あり」セクション（アウト/ヒット/失策/FC/犠打/犠飛）はグレーアウト

### 5.3 動作: 打球方向タップ後

- グラウンドにマーカー表示
- 選択中ゾーンを薄いハイライト
- 「選択中: ○○・○○」ラベル表示
- 「打球方向あり」セクションがアクティブ化
- 「打球方向なし」セクションがグレーアウト
- 再タップで打球方向を変更可能

### 5.4 サブ選択モーダル（アウト時）

```
┌───────────────────────────────────────┐
│           アウト種別                  │
├───────────────────────────────────────┤
│                                       │
│  ┌─────────────────────────────────┐  │
│  │  ゴロ                           │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  フライ                         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  ライナー                       │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  併殺打                         │  │
│  └─────────────────────────────────┘  │
│  ┌─────────────────────────────────┐  │
│  │  ファールフライ                 │  │
│  └─────────────────────────────────┘  │
│                                       │
│              [キャンセル]             │
└───────────────────────────────────────┘
```

### 5.5 サブ選択モーダル（ヒット時）

```
┌───────────────────────────────────────┐
│           ヒット種別                  │
├───────────────────────────────────────┤
│  [ 単打 ] [ 二塁打 ] [ 三塁打 ] [ 本塁打 ] │
│                                       │
│              [キャンセル]             │
└───────────────────────────────────────┘
```

### 5.6 ステップ2: +/- 入力画面（結果確定後）

```
┌───────────────────────────────────────┐
│  ← 第1打席                  [次へ]   │
├───────────────────────────────────────┤
│                                       │
│  結果: 中安                           │
│                                       │
│  打点                                 │
│  [ - ]    1    [ + ]                  │
│                                       │
│  得点                                 │
│  [ - ]    0    [ + ]                  │
│                                       │
│  盗塁                                 │
│  [ - ]    0    [ + ]                  │
│                                       │
│  盗塁死                               │
│  [ - ]    0    [ + ]                  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │      この打席を完了             │  │
│  └─────────────────────────────────┘  │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │   詳細データを記録 (任意)  →    │  │
│  └─────────────────────────────────┘  │
│                                       │
└───────────────────────────────────────┘
```

### 5.7 ステップ3: 詳細データ入力（任意）

```
┌───────────────────────────────────────┐
│  ← 詳細データ                         │
├───────────────────────────────────────┤
│  すべて任意項目です。スキップ可能。   │
│                                       │
│  最終カウント                         │
│  ボール [ - ] 2 [ + ]                 │
│  ストライク [ - ] 1 [ + ]             │
│  アウト [ - ] 1 [ + ]                 │
│                                       │
│  初球打ちフラグ                       │
│  [   ◯ Off  /  ON   ]                │
│                                       │
│  ランナー状況                         │
│  ┌──────────────────────────────────┐ │
│  │ 二塁                            ▾│ │
│  └──────────────────────────────────┘ │
│                                       │
│  打球の質                             │
│  [真芯] [先っぽ] [詰まり] [擦り] [ドライブ] │
│                                       │
│  タイミング                           │
│  [ドンピシャ] [泳ぎ気味] [遅れ気味]   │
│                                       │
│  最後に打った球種                     │
│  ┌──────────────────────────────────┐ │
│  │ スライダー系                  ▾  │ │
│  └──────────────────────────────────┘ │
│                                       │
│  イニング                             │
│  [ - ]    3    [ + ]                  │
│                                       │
│  自己分析メモ                         │
│  ┌──────────────────────────────────┐ │
│  │ 外角低めをうまく逆方向へ        │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                       │
│  対戦相手・配球メモ                   │
│  ┌──────────────────────────────────┐ │
│  │ 右投手、スライダー多め          │ │
│  │                                  │ │
│  └──────────────────────────────────┘ │
│                                       │
│  ┌─────────────────────────────────┐  │
│  │      この打席を完了             │  │
│  └─────────────────────────────────┘  │
│                                       │
│  [ あとで入力する  →  完了 ]         │
│                                       │
└───────────────────────────────────────┘
```

**UI上の任意性の明示**:
- 最上部に「すべて任意項目です。スキップ可能」を表示
- 各セクションには初期状態の placeholder
- 「あとで入力する」ボタンも併設

### 5.8 完了動作

- 「この打席を完了」タップ:
  - `POST /api/v2/plate_appearances` 送信（新規）or `PATCH /api/v2/plate_appearances/:id`（編集）
  - 成功で打席リストへ戻る
- 「あとで入力する」タップ:
  - 詳細データを空のまま保存
  - 打席リストへ戻る（カードに「詳細未入力」バッジが表示される）

### 5.9 キャンセル動作

- 画面左上「←」タップ:
  - 入力中の打席は **ローカル破棄**（API送信なし）
  - 既存打席を編集中の場合は「変更を破棄しますか?」確認
- 確認モーダル経由でキャンセル → 打席リストへ戻る

---

## 6. 状態管理

### 6.1 Zustand ストア: `useBattingRecordStore`

```typescript
interface BattingRecordState {
  // 試合基本情報
  gameResultId: number | null;
  matchType: 'batting' | 'pitching' | 'both' | null;

  // 打席ウィザード一時状態
  currentPlateAppearance: {
    batterBoxNumber: number | null;
    plateResultId: number | null;
    outType: OutType | null;
    hitType: HitType | null;
    hitDirectionId: number | null;
    hitDepthId: number | null;
    hitLocationX: number | null;
    hitLocationY: number | null;
    rbi: number;
    runScored: number;
    stolenBases: number;
    caughtStealing: number;
    // 詳細データ
    finalBalls: number | null;
    finalStrikes: number | null;
    finalOuts: number | null;
    firstPitchSwing: boolean | null;
    runnersState: number | null;
    inning: number | null;
    contactQualityId: number | null;
    timingId: number | null;
    pitchTypeId: number | null;
    selfAnalysisMemo: string;
    opponentMemo: string;
  };

  // アクション
  setHitLocation: (x: number, y: number) => void;
  setPlateResult: (resultId: number) => void;
  setOutType: (outType: OutType) => void;
  // ...
  resetCurrentPlateAppearance: () => void;
}
```

### 6.2 TanStack Query

- マスタ取得: `useStadiums()`, `usePitchTypes()`, `useContactQualities()`, `useTimings()`, `useHitDepths()`, `useHitDirections()`
- 打席リスト: `usePlateAppearancesByGame(gameResultId)`
- ミューテーション: `useCreatePlateAppearance()`, `useUpdatePlateAppearance()`, `useDeletePlateAppearance()`

### 6.3 onSuccess 後の invalidate

```typescript
const useCreatePlateAppearance = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createPlateAppearance,
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: ['plateAppearances', variables.gameResultId],
      });
      queryClient.invalidateQueries({ queryKey: ['battingStats'] });
    },
  });
};
```

---

## 7. コンポーネント設計

### 7.1 新規コンポーネント

```
mobile/components/game-record/
├── plate-appearance/
│   ├── PlateAppearanceWizard.tsx         # ウィザード全体（ステップ管理）
│   ├── GroundTapField.tsx                # グラウンドSVG + タップ検出
│   ├── PlateResultButtons.tsx            # 結果選択ボタン群
│   ├── OutTypeModal.tsx                  # アウト種別サブ選択モーダル
│   ├── HitTypeModal.tsx                  # ヒット種別サブ選択モーダル
│   ├── ScoreCounterInput.tsx             # +/- 入力 (打点・得点・盗塁・盗塁死)
│   ├── DetailDataForm.tsx                # 任意の詳細データ入力フォーム
│   └── PlateAppearanceCard.tsx           # 打席リストのカード
├── stadium/
│   └── StadiumSelectInput.tsx            # 球場検索・追加
└── pattern-selector/
    └── RecordPatternSelector.tsx         # 3パターン分岐選択
```

### 7.2 GroundTapField の構造

```typescript
interface GroundTapFieldProps {
  hitDirections: HitDirectionWithZones[];
  selectedX: number | null;
  selectedY: number | null;
  onTap: (x: number, y: number, directionId: number | null, depthId: number | null) => void;
}

export function GroundTapField({ hitDirections, selectedX, selectedY, onTap }: GroundTapFieldProps) {
  const handlePress = (event: GestureResponderEvent) => {
    const { locationX, locationY } = event.nativeEvent;
    const xNorm = locationX / CANVAS_WIDTH;
    const yNorm = locationY / CANVAS_HEIGHT;
    const zone = detectZone({ x: xNorm, y: yNorm }, hitDirections);
    onTap(xNorm, yNorm, zone?.direction_id ?? null, zone?.depth_id ?? null);
  };
  return (
    <Pressable onPress={handlePress}>
      <Svg width={CANVAS_WIDTH} height={CANVAS_HEIGHT}>
        {/* グラウンド描画（既存 SprayChart 流用） */}
        {/* タップマーカー: selectedX/Y がある場合のみ */}
        {selectedX !== null && selectedY !== null && (
          <Circle
            cx={selectedX * CANVAS_WIDTH}
            cy={selectedY * CANVAS_HEIGHT}
            r={8}
            fill="#d08000"
          />
        )}
      </Svg>
    </Pressable>
  );
}
```

### 7.3 ステップ管理

```typescript
type WizardStep = 'tap_and_select' | 'sub_select' | 'counter' | 'detail';

export function PlateAppearanceWizard() {
  const [step, setStep] = useState<WizardStep>('tap_and_select');
  // ...
  switch (step) {
    case 'tap_and_select': return <Step1 onNext={() => setStep('counter')} />;
    case 'sub_select':     return <Step2 onNext={() => setStep('counter')} />;
    case 'counter':        return <Step3 onNext={() => setStep('detail')} onSkip={completeWithoutDetail} />;
    case 'detail':         return <Step4 onComplete={completeWithDetail} onSkip={completeWithoutDetail} />;
  }
}
```

---

## 8. アニメーション・インタラクション

### 8.1 タップフィードバック

- グラウンドタップで `react-native-reanimated` の `withSpring` でマーカーがふわっと表示
- 結果ボタンタップで `withTiming` で軽くスケール

### 8.2 ステップ遷移

- 横スライドアニメーション（左→右で次へ、右→左で戻る）

### 8.3 削除確認

- カード長押し → `Alert.alert` で確認モーダル

---

## 9. アクセシビリティ

- すべてのインタラクティブ要素に `accessibilityLabel` を付与
- グラウンドタップ部分は `accessibilityHint`: "タップして打球方向を選択"
- カラーコントラスト: 既存テーマと同等を維持

---

## 10. テスト戦略

### 10.1 ユニットテスト（utils）

- `detectZone()` の Point in Polygon 判定（27ゾーンの各境界ケース）
- `BattingResultTextGenerator` の文字列生成パターン

### 10.2 結合テスト（MSW モック）

- 打席作成フロー: タップ → 結果選択 → +/- → 完了 → API リクエスト → 打席リスト更新
- 編集フロー: カード タップ → ステップ式入力 → 編集保存
- キャンセル動作: 入力中に戻る → API送信されないこと

### 10.3 スクリーンショットテスト

- 採用しない（既存 mobile 規約に従う）

---

## 11. 既存画面との並存

### 11.1 フィーチャーフラグ判断

新画面と旧画面の切替は以下のいずれか:

- 案A: 全ユーザーで新画面に完全切替（旧 v1 エンドポイントは残すがUIからは消す）
- 案B: フィーチャーフラグ（環境変数 or DB のユーザーフラグ）で段階的切替
- 案C: 一定期間並存（「新試合記録（β）」と「旧試合記録」を切り替え可能にする）

→ 個人開発規模なので **案A 推奨**（フィーチャーフラグ管理コスト削減）。リリース直前に確定。

### 11.2 既存 v1 エンドポイントの維持

- web版（front/）が依然 v1 を使うため、エンドポイントは残す
- mobile が新仕様に切り替わっても v1 経由のデータは引き続き読み書き可能
