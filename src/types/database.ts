// ===================================
// Database Types
// ===================================

export interface Profile {
  id: string;
  username: string;
  avatar_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface Task {
  id: string;
  parent_id: string | null;
  title: string;
  description: string;
  is_completed: boolean;
  created_by: string | null;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

// ===================================
// Extended Types (with Relations)
// ===================================

export interface TaskWithProfile extends Task {
  creator?: Profile | null;
  assignee?: Profile | null;
}

// 再帰構造を持つタスク（子タスクを含む）
export interface TaskWithChildren extends TaskWithProfile {
  children?: TaskWithChildren[];
  progress?: number; // 進捗率（0-100）
  children_count?: number; // 子タスクの数
}

// ===================================
// UI State Types
// ===================================

// Miller Columns用のカラム情報
export interface Column {
  id: string; // カラムを一意に識別するID（parent_idまたは'root'）
  parentTaskId: string | null; // このカラムが表示する親タスクのID
  tasks: TaskWithProfile[];
  selectedTaskId: string | null; // このカラムで選択されているタスクID
}

// モバイルDrill-down用のナビゲーションスタック
export interface NavigationStackItem {
  parentId: string | null;
  title: string;
}

// ===================================
// Form Types
// ===================================

export interface CreateTaskInput {
  parent_id: string | null;
  title: string;
  description?: string;
  assigned_to?: string | null;
}

export interface UpdateTaskInput {
  title?: string;
  description?: string;
  is_completed?: boolean;
  assigned_to?: string | null;
}

// ===================================
// Filter Types
// ===================================

export interface TaskFilter {
  userId?: string | null; // 特定ユーザーでフィルタ
  showCompleted?: boolean; // 完了タスクを表示するか
}
