# 階層型タスク管理アプリ

組織の目標から個人のタスクまでを因数分解できる、無限階層のタスク管理アプリケーション。

## 🎯 主な機能

- **無限階層構造**: タスクを親子関係で無限にネスト可能
- **Miller Columns UI** (デスクトップ): Finderスタイルのカラムビュー
- **Drill-down Navigation** (モバイル): タップで階層を掘り下げるUI
- **自動進捗計算**: 親タスクの進捗率を子タスクから自動算出
- **ユーザーハイライト**: 自分が作成したタスクを視覚的に区別
- **フィルタリング**: ユーザー別にタスクを絞り込み

## 🛠️ 技術スタック

- **Frontend**: Next.js 14 (App Router), TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Realtime)
- **State Management**: TanStack Query (React Query)
- **UI**: Lucide React (Icons)

## 📋 セットアップ手順

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. Supabaseプロジェクトの作成

1. [Supabase](https://supabase.com) でアカウントを作成
2. 新しいプロジェクトを作成
3. プロジェクトのURL と Anon Key を取得

### 3. 環境変数の設定

`.env.local.example` をコピーして `.env.local` を作成：

```bash
cp .env.local.example .env.local
```

以下の値を入力：

```env
NEXT_PUBLIC_SUPABASE_URL=your-project-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 4. データベースのセットアップ

Supabaseダッシュボードの「SQL Editor」で `supabase-schema.sql` の内容を実行：

1. Supabaseダッシュボードを開く
2. 左メニューから「SQL Editor」を選択
3. `supabase-schema.sql` の内容を全てコピー&ペースト
4. 「RUN」をクリックして実行

これにより以下が作成されます：
- `profiles` テーブル（ユーザー情報）
- `tasks` テーブル（タスクデータ）
- 進捗率計算用のDatabase Function
- Row Level Security (RLS) ポリシー

### 5. ユーザーの作成

1. Supabaseダッシュボードの「Authentication」→「Users」へ移動
2. 「Add User」→「Create new user」をクリック
3. メールアドレスとパスワードを入力してユーザーを作成

4. **重要**: 作成したユーザーのプロファイルを `profiles` テーブルに追加：

```sql
-- SQL EditorでユーザーのUIDを確認
SELECT id, email FROM auth.users;

-- profilesテーブルにユーザーを追加（UIDは上記で確認したものを使用）
INSERT INTO profiles (id, username, avatar_url)
VALUES ('user-uuid-here', 'sample_user', null);
```

### 6. 開発サーバーの起動

```bash
npm run dev
```

ブラウザで [http://localhost:3000](http://localhost:3000) を開く

## 🎨 UI/UX 設計

### デスクトップ（Miller Columns）

```
┌─────────┬──────────┬──────────┬──────────┬─────────────┐
│ Sidebar │ Column 1 │ Column 2 │ Column 3 │  Inspector  │
│ (Users) │  (Root)  │  (Sub)   │  (Sub)   │   (Detail)  │
│         │          │          │          │             │
│  👤     │  Task A  │  Task A1 │  Task A1a│  ┌────────┐ │
│  Alice  │  Task B  │  Task A2 │  Task A1b│  │ Title  │ │
│  👤     │  Task C  │          │          │  │ Desc   │ │
│  Bob    │          │          │          │  │ User   │ │
│         │          │          │          │  │ [Save] │ │
└─────────┴──────────┴──────────┴──────────┴─────────────┘
```

### モバイル（Drill-down）

```
┌────────────────────┐
│  ← Home / Task A   │  ← Breadcrumb
├────────────────────┤
│                    │
│  □ Task A1         │
│  □ Task A2         │
│  □ Task A3         │
│                    │
└────────────────────┘
```

## 📊 データベース構造

### tasks テーブル

| カラム名      | 型        | 説明                     |
|---------------|-----------|--------------------------|
| id            | UUID      | タスクID (PK)            |
| parent_id     | UUID      | 親タスクID (nullable)    |
| title         | TEXT      | タスク名                 |
| description   | TEXT      | 詳細説明                 |
| is_completed  | BOOLEAN   | 完了フラグ               |
| created_by    | UUID      | 作成者 (FK to profiles)  |
| assigned_to   | UUID      | 担当者 (FK to profiles)  |
| created_at    | TIMESTAMP | 作成日時                 |
| updated_at    | TIMESTAMP | 更新日時                 |

### 進捗率計算ロジック

```sql
-- Database Function
get_task_progress(task_id UUID) RETURNS NUMERIC

-- 計算式
進捗率 = (完了した子タスク数 / 全子タスク数) × 100
```

## 🚀 使い方

### 1. タスクの作成

- 各カラムの「+」ボタンをクリック
- タイトル、説明、担当者を入力
- 「作成」をクリック

### 2. 階層の掘り下げ

- **デスクトップ**: タスクをクリックすると右側に子タスクのカラムが展開
- **モバイル**: タスクをタップすると次の画面に遷移

### 3. タスクの編集

- タスクを選択すると右端（またはモーダル）に詳細パネルが表示
- タイトル、説明、担当者、完了状態を編集可能
- 「保存」で変更を確定

### 4. ユーザーフィルタリング

- 左サイドバーでユーザーをクリック
- そのユーザーが作成/担当するタスクのみ表示

## 📝 今後の拡張案

- [ ] タスクの並び替え（ドラッグ&ドロップ）
- [ ] タスクの優先度設定
- [ ] 期限日の設定とリマインダー
- [ ] リアルタイム同期（Supabase Realtime）
- [ ] タスクのコメント機能
- [ ] ファイル添付機能
- [ ] タスクのアーカイブ機能
- [ ] エクスポート機能（CSV, JSON）

## 🤝 開発

```bash
# 開発サーバー起動
npm run dev

# ビルド
npm run build

# 本番起動
npm run start

# リント
npm run lint
```

## 📄 ライセンス

MIT
