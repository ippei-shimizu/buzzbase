---
name: rspec-behavior-test
description: 古典派テスト（振る舞いテスト）の方針に基づいてRSpecテストを作成する。「テストを書いて」「振る舞いテストを書いて」「specを追加して」などのリクエストで起動する。
---

# RSpec 振る舞いテスト作成スキル

古典派テスト（Classical Testing）の方針に基づき、「振る舞い」を検証するRSpecテストを作成する。

## テスト哲学

### 古典派テスト（Classical Testing）

**「何をするか（What）」をテストし、「どう実装しているか（How）」はテストしない。**

- テスト対象の **入力 → 出力/状態変化** を検証する
- 実際のDBレコードを作成し、本物の依存関係を通じてテストする
- モック・スタブは **外部サービス呼び出し（API, メール送信等）** にのみ使用する
- 内部のプライベートメソッドやメソッド呼び出し回数はテストしない

### やってはいけないこと

- `allow(Model).to receive(:method)` で内部メソッドをモックする
- `expect(obj).to have_received(:method)` で呼び出し検証する
- プライベートメソッドを `send` で直接テストする
- 集約テスト（API spec）と依存テスト（Model spec）で同じことを二重検証する

## 対象プロジェクト

`back/` サブモジュール（Rails API）

## テスト環境

- テストフレームワーク: RSpec
- ファクトリ: FactoryBot（`spec/factories/` に定義）
- マッチャ: Shoulda Matchers
- 認証ヘルパー: `auth_headers_for(user)`（`spec/support/auth_helpers.rb`）
- トランザクション: `use_transactional_fixtures = true`
- 実行コマンド: `docker compose exec -T back bundle exec rspec <spec_path>`

## ワークフロー

### 1. テスト対象の分析

`$ARGUMENTS` で指定されたPR番号、ファイルパス、または機能を分析する。

1. **変更ファイルの特定**: PR番号の場合は `gh pr diff` で差分を取得、ファイルパスの場合は直接読む
2. **振る舞いの特定**: コントローラのアクション、モデルのクラスメソッド、サービスのpublicメソッドを列挙
3. **入力と出力の特定**: 各振る舞いの入力パラメータと期待される出力/状態変化を整理

### 2. テスト設計

テスト対象の種別に応じて、以下の粒度で設計する。

#### Request Spec（API エンドポイント）

**配置**: `spec/requests/api/v2/<controller_name>_spec.rb`

テストする振る舞い:
- 認証: 未認証時に401を返すか
- 正常系: 正しいデータ構造・値が返るか
- フィルタリング: パラメータに応じて結果が変わるか
- エッジケース: データなし、権限なし

```ruby
RSpec.describe 'Api::V2::Resources', type: :request do
  let(:user) { create(:user) }

  describe 'GET /api/v2/resources' do
    context 'when not authenticated' do
      it 'returns 401' do
        get '/api/v2/resources'
        expect(response).to have_http_status(:unauthorized)
      end
    end

    context 'when authenticated with data' do
      let!(:resource) { create(:resource, user:) }

      it 'returns the resources' do
        get '/api/v2/resources', headers: auth_headers_for(user)
        expect(response).to have_http_status(:ok)
        json = response.parsed_body
        # 出力の構造と値を検証
      end
    end
  end
end
```

#### Model Spec（ビジネスロジック）

**配置**: `spec/models/<model_name>_spec.rb`

テストする振る舞い:
- クラスメソッド: 集計、フィルタリング、検索
- スコープ: 条件に応じたレコード絞り込み
- 計算ロジック: 数値計算の正確性
- 境界値: ゼロ、nil、フィルタ一致なし

```ruby
RSpec.describe ModelName, type: :model do
  let(:user) { create(:user) }

  describe '.class_method_name' do
    # テストデータを let! で準備
    let!(:record_a) { create(:record, user:, value: 10) }
    let!(:record_b) { create(:record, user:, value: 20) }

    it 'returns aggregated result' do
      result = described_class.class_method_name(user.id)
      expect(result.total).to eq(30)
    end

    it 'filters by parameter' do
      result = described_class.class_method_name(user.id, filter: 'value')
      expect(result.total).to eq(10)
    end

    it 'returns nil when no records match' do
      result = described_class.class_method_name(user.id, filter: 'nonexistent')
      expect(result).to be_nil
    end
  end
end
```

#### Service Spec

**配置**: `spec/services/<service_name>_spec.rb`

テストする振る舞い:
- publicメソッドの実行結果（DBへの状態変化）
- 副作用の検証（レコード作成/更新の数と内容）
- エッジケース（空データ、重複実行）

```ruby
RSpec.describe ServiceName do
  describe '#execute' do
    it 'creates expected records' do
      expect { service.execute }
        .to change(Record, :count).by(expected_count)
    end

    it 'sets correct values on created records' do
      service.execute
      record = Record.find_by(key: value)
      expect(record.attribute).to eq(expected)
    end
  end
end
```

### 3. テストデータ設計のルール

#### FactoryBotの使い方

- 既存のファクトリ（`spec/factories/`）を確認して利用する
- 必要なファクトリが存在しない場合は新規作成する
- テストに必要な属性のみオーバーライドし、デフォルト値はファクトリに任せる

#### テストデータの関連

```ruby
# ゲーム結果 + 試合結果 + 成績の典型的なセットアップ
let!(:game_with_batting) do
  gr = create(:game_result, user:)
  gr.match_result.update!(
    date_and_time: Time.zone.local(2024, 6, 15),
    match_type: 'regular'
  )
  create(:batting_average, game_result: gr, user:,
                           hit: 3, at_bats: 10, times_at_bat: 12)
  gr
end
```

#### 計算値のコメント

集計や計算のテストでは、期待値の根拠をコメントで明示する:

```ruby
expect(result.hit.to_i).to eq(6) # 3+1+2
expect(result[:batting_average]).to eq(0.5) # total_hits(5) / at_bats(10)
```

### 4. テスト実行と確認

テスト作成後は必ず実行して全パスを確認する:

```bash
# 新規テストのみ
docker compose exec -T back bundle exec rspec <new_spec_paths> --format documentation

# 全テスト（既存テストが壊れていないことの確認）
docker compose exec -T back bundle exec rspec
```

失敗した場合は:
1. 実際の振る舞いを確認（テストの期待値が間違っているか、実装にバグがあるか）
2. テストの期待値を実際の振る舞いに合わせる（実装バグでない場合）
3. 再実行して全パスを確認

## テストカバレッジの判断基準

### テストすべき振る舞い

- **APIエンドポイント**: 認証、正常系レスポンス構造、フィルタリング、権限
- **集計/計算ロジック**: 正しい数値が返るか、フィルタが正しく動作するか
- **状態変化**: レコードの作成/更新/削除
- **境界値**: ゼロ除算、データなし、特殊パラメータ（"通算", "全て"）

### テストすべきでないもの

- ActiveRecordのバリデーション/関連の存在確認だけ（Shoulda Matchersで1行なら可）
- コントローラのprivateメソッド
- 内部の実装詳細（どのメソッドを経由しているか）
- APIテストでカバー済みのモデル計算の再テスト

### 重複テストの回避

- **APIテスト（集約）**: レスポンスの構造と主要な値を検証
- **モデルテスト（依存）**: フィルタリング・計算ロジックの詳細なパターンを検証
- 同じ計算を両方で検証しない。APIテストでは「値が返ること」、モデルテストでは「値が正しいこと」

## 注意事項

- テスト作成前に必ず既存のspec・factory・テストヘルパーを確認する
- 既存のテストスタイルとファイル配置に合わせる
- `describe` の文字列はクラスメソッドなら `.method_name`、インスタンスメソッドなら `#method_name`
- `context` は `when ...` / `with ...` で条件を記述
- テスト名は「〜すること」ではなく、英語で振る舞いを端的に記述する
