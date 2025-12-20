# プロジェクト構造

```
task-app/
├── src/
│   ├── app/                          # Next.js App Router
│   │   ├── api/                      # API Routes
│   │   │   └── tasks/
│   │   │       └── [id]/
│   │   │           └── children-count/
│   │   │               └── route.ts  # 子タスク数取得API
│   │   ├── layout.tsx                # ルートレイアウト
│   │   ├── page.tsx                  # メインページ
│   │   ├── providers.tsx             # React Query Provider
│   │   └── globals.css               # グローバルスタイル
│   │
│   ├── components/                   # React コンポーネント
│   │   ├── ColumnView.tsx            # デスクトップ用Miller Columns
│   │   ├── MobileDrillDown.tsx       # モバイル用Drill-down
│   │   ├── TaskItem.tsx              # タスクアイテム（進捗バー付き）
│   │   ├── InspectorPanel.tsx        # タスク詳細パネル
│   │   ├── Sidebar.tsx               # ユーザーリスト・フィルター
│   │   └── CreateTaskModal.tsx       # タスク作成モーダル
│   │
│   ├── hooks/                        # カスタムフック (React Query)
│   │   ├── useTasks.ts               # タスクCRUD操作
│   │   └── useProfiles.ts            # プロファイル取得
│   │
│   ├── lib/                          # ライブラリ・ユーティリティ
│   │   ├── supabase.ts               # Supabaseクライアント
│   │   └── utils.ts                  # ユーティリティ関数
│   │
│   └── types/                        # TypeScript型定義
│       └── database.ts               # DB型・拡張型
│
├── supabase-schema.sql               # データベーススキーマ
├── package.json                      # 依存パッケージ
├── tsconfig.json                     # TypeScript設定
├── tailwind.config.ts                # Tailwind CSS設定
├── next.config.js                    # Next.js設定
├── postcss.config.js                 # PostCSS設定
├── .env.local.example                # 環境変数サンプル
├── .gitignore                        # Git除外設定
└── README.md                         # プロジェクト説明

```

## コンポーネント設計

### 階層構造

```
App (providers.tsx)
└── HomePage (page.tsx)
    ├── Sidebar
    │   └── ユーザーリスト・フィルター
    │
    ├── ColumnView (Desktop)
    │   ├── Column × N (再帰的に生成)
    │   │   └── TaskItem × N
    │   └── InspectorPanel
    │       └── タスク詳細フォーム
    │
    ├── MobileDrillDown (Mobile)
    │   └── TaskItem × N
    │
    └── CreateTaskModal
        └── タスク作成フォーム
```

## データフロー

### 1. タスク取得（fetch on demand）

```
User Click Task
    ↓
useTasks(parent_id) Hook
    ↓
Supabase Query (WHERE parent_id = ?)
    ↓
React Query Cache
    ↓
Component Re-render
```

### 2. 進捗率計算

```
TaskItem Component
    ↓
useTaskProgress(task_id) Hook
    ↓
Supabase RPC: get_task_progress()
    ↓
Database Function
    ├── 子タスク総数をカウント
    └── 完了した子タスクをカウント
    ↓
進捗率 = (完了数 / 総数) × 100
    ↓
Progress Bar Display
```

### 3. タスク作成・更新

```
User Input
    ↓
useCreateTask / useUpdateTask Hook
    ↓
Supabase Insert/Update Query
    ↓
Success
    ↓
React Query Invalidation
    ├── invalidateQueries(parent_id)
    └── invalidateQueries(progress)
    ↓
Automatic Re-fetch
    ↓
UI Update
```

## 主要な設計パターン

### 1. Fetch on Demand（遅延ロード）

カラムをクリックした時点で子タスクを取得することで、初期ロードを高速化。

```typescript
// ColumnView.tsx
const handleTaskClick = (columnIndex: number, taskId: string) => {
  // 新しいカラムを追加（自動的にuseTasks(taskId)が実行される）
  setColumns([...columns, { parentId: taskId }]);
};
```

### 2. Optimistic UI（楽観的更新）

React Queryの`onSuccess`コールバックで関連クエリを無効化し、自動再取得。

```typescript
// useTasks.ts
onSuccess: (data) => {
  queryClient.invalidateQueries({ queryKey: taskKeys.list(data.parent_id) });
}
```

### 3. レスポンシブデザイン

Tailwindの`md:`ブレークポイントで切り替え。

```tsx
{/* デスクトップ */}
<div className="hidden md:flex">
  <ColumnView />
</div>

{/* モバイル */}
<div className="md:hidden">
  <MobileDrillDown />
</div>
```

## セキュリティ

### Row Level Security (RLS)

全ての認証済みユーザーが全タスクを閲覧・編集可能（Simple Policy）。

```sql
CREATE POLICY "Authenticated users can view all tasks"
  ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');
```

将来的には以下のような細かい権限設定も可能：
- 自分が作成したタスクのみ削除可能
- 担当者のみ完了状態を変更可能
- プロジェクトメンバーのみ閲覧可能

## パフォーマンス最適化

1. **React Query キャッシュ**: 同じデータを再取得しない
2. **インデックス**: parent_id, created_by などにインデックスを作成
3. **遅延ロード**: 必要な階層のみ取得
4. **Pagination**: 将来的にタスク数が増えた場合に対応

## 開発のベストプラクティス

1. **型安全性**: 全てTypeScriptで型定義
2. **関心の分離**: Hooks, Components, Types を分離
3. **再利用性**: TaskItemなどの小さなコンポーネントに分割
4. **エラーハンドリング**: React QueryのerrorステートでUI表示
