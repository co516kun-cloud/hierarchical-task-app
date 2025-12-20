-- ===================================
-- 階層型タスク管理アプリ - Database Schema
-- ===================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ===================================
-- 1. Profiles Table (Supabase Auth連動)
-- ===================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL
);

-- Profilesテーブルのインデックス
CREATE INDEX IF NOT EXISTS idx_profiles_username ON profiles(username);

-- ===================================
-- 2. Tasks Table (無限階層対応)
-- ===================================
CREATE TABLE IF NOT EXISTS tasks (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  parent_id UUID REFERENCES tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT DEFAULT '',
  is_completed BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  assigned_to UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()) NOT NULL,

  -- 制約: タスクが自分自身を親に持つことを防ぐ
  CONSTRAINT no_self_parent CHECK (id != parent_id)
);

-- Tasksテーブルのインデックス（パフォーマンス最適化）
CREATE INDEX IF NOT EXISTS idx_tasks_parent_id ON tasks(parent_id);
CREATE INDEX IF NOT EXISTS idx_tasks_created_by ON tasks(created_by);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_is_completed ON tasks(is_completed);

-- ===================================
-- 3. Updated_at自動更新トリガー
-- ===================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = TIMEZONE('utc', NOW());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Profilesテーブル用トリガー
DROP TRIGGER IF EXISTS update_profiles_updated_at ON profiles;
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Tasksテーブル用トリガー
DROP TRIGGER IF EXISTS update_tasks_updated_at ON tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ===================================
-- 4. 進捗率計算用Database Function（リーフノード版）
-- ===================================
-- 指定したタスクの全ての子孫のうち、リーフノード（末端タスク）のみの完了率を計算
CREATE OR REPLACE FUNCTION get_task_progress(task_id UUID)
RETURNS NUMERIC AS $$
DECLARE
  total_leaves INTEGER;
  completed_leaves INTEGER;
BEGIN
  -- 全ての子孫タスクを再帰的に取得し、リーフノード（子を持たないタスク）のみを集計
  WITH RECURSIVE descendants AS (
    -- 初期クエリ: 直下の子タスク
    SELECT id, is_completed
    FROM tasks
    WHERE parent_id = task_id

    UNION ALL

    -- 再帰クエリ: 孫以降のタスク
    SELECT t.id, t.is_completed
    FROM tasks t
    INNER JOIN descendants d ON t.parent_id = d.id
  ),
  -- リーフノード（子を持たないタスク）のみを抽出
  leaf_nodes AS (
    SELECT d.id, d.is_completed
    FROM descendants d
    WHERE NOT EXISTS (
      SELECT 1 FROM tasks t WHERE t.parent_id = d.id
    )
  )
  SELECT
    COUNT(*),
    COUNT(*) FILTER (WHERE is_completed = TRUE)
  INTO total_leaves, completed_leaves
  FROM leaf_nodes;

  -- リーフノードが0の場合（子タスクが存在しない）は、自身の完了状態を返す
  IF total_leaves = 0 THEN
    SELECT CASE WHEN is_completed THEN 100 ELSE 0 END INTO completed_leaves
    FROM tasks
    WHERE id = task_id;
    RETURN completed_leaves;
  END IF;

  -- 進捗率を計算 (小数点2桁まで)
  RETURN ROUND((completed_leaves::NUMERIC / total_leaves::NUMERIC) * 100, 2);
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 5. 子タスク数を取得する関数
-- ===================================
CREATE OR REPLACE FUNCTION get_children_count(task_id UUID)
RETURNS INTEGER AS $$
DECLARE
  count INTEGER;
BEGIN
  SELECT COUNT(*) INTO count
  FROM tasks
  WHERE parent_id = task_id;

  RETURN count;
END;
$$ LANGUAGE plpgsql;

-- ===================================
-- 6. 親タスクの自動完了機能
-- ===================================
-- 子孫タスクが全て完了したら、親タスクも自動的に完了にする
CREATE OR REPLACE FUNCTION auto_complete_parent_tasks()
RETURNS TRIGGER AS $$
DECLARE
  current_parent_id UUID;
  total_leaf_count INTEGER;
  completed_leaf_count INTEGER;
BEGIN
  -- 更新されたタスクの親IDを取得
  current_parent_id := NEW.parent_id;

  -- 親タスクが存在する限り、上位階層まで遡って処理
  WHILE current_parent_id IS NOT NULL LOOP
    -- 親タスクの全リーフノード（末端タスク）を集計
    WITH RECURSIVE descendants AS (
      -- 初期クエリ: 親タスクの直下の子タスク
      SELECT id, is_completed
      FROM tasks
      WHERE parent_id = current_parent_id

      UNION ALL

      -- 再帰クエリ: 孫以降のタスク
      SELECT t.id, t.is_completed
      FROM tasks t
      INNER JOIN descendants d ON t.parent_id = d.id
    ),
    -- リーフノード（子を持たないタスク）のみを抽出
    leaf_nodes AS (
      SELECT d.id, d.is_completed
      FROM descendants d
      WHERE NOT EXISTS (
        SELECT 1 FROM tasks t WHERE t.parent_id = d.id
      )
    )
    SELECT
      COUNT(*),
      COUNT(*) FILTER (WHERE is_completed = TRUE)
    INTO total_leaf_count, completed_leaf_count
    FROM leaf_nodes;

    -- 全てのリーフノードが完了している場合、親タスクを完了にする
    IF total_leaf_count > 0 AND total_leaf_count = completed_leaf_count THEN
      UPDATE tasks
      SET is_completed = TRUE
      WHERE id = current_parent_id AND is_completed = FALSE;
    -- 1つでも未完了のリーフノードがある場合、親タスクを未完了にする
    ELSIF total_leaf_count > 0 AND completed_leaf_count < total_leaf_count THEN
      UPDATE tasks
      SET is_completed = FALSE
      WHERE id = current_parent_id AND is_completed = TRUE;
    END IF;

    -- さらに上の親タスクを取得
    SELECT parent_id INTO current_parent_id
    FROM tasks
    WHERE id = current_parent_id;
  END LOOP;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- タスク更新時に親タスクの自動完了をトリガー
DROP TRIGGER IF EXISTS trigger_auto_complete_parent ON tasks;
CREATE TRIGGER trigger_auto_complete_parent
  AFTER INSERT OR UPDATE OF is_completed ON tasks
  FOR EACH ROW
  EXECUTE FUNCTION auto_complete_parent_tasks();

-- ===================================
-- 7. Row Level Security (RLS) 設定
-- ===================================

-- Profilesテーブル: RLS有効化
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- 全ログインユーザーがプロファイルを閲覧可能
CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  USING (auth.role() = 'authenticated');

-- ユーザーは自分のプロファイルのみ挿入可能
CREATE POLICY "Users can insert their own profile"
  ON profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- ユーザーは自分のプロファイルのみ更新可能
CREATE POLICY "Users can update their own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- Tasksテーブル: RLS有効化
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- 全ログインユーザーがタスクを閲覧可能
CREATE POLICY "Authenticated users can view all tasks"
  ON tasks FOR SELECT
  USING (auth.role() = 'authenticated');

-- 全ログインユーザーがタスクを作成可能
CREATE POLICY "Authenticated users can create tasks"
  ON tasks FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- 全ログインユーザーがタスクを更新可能
CREATE POLICY "Authenticated users can update all tasks"
  ON tasks FOR UPDATE
  USING (auth.role() = 'authenticated');

-- 全ログインユーザーがタスクを削除可能
CREATE POLICY "Authenticated users can delete all tasks"
  ON tasks FOR DELETE
  USING (auth.role() = 'authenticated');

-- ===================================
-- 7. サンプルデータ挿入用SQL (Optional)
-- ===================================
-- ※実際の運用前にSupabase Authでユーザーを作成後、
--   そのUIDを使ってprofilesとtasksを挿入してください

-- Example:
-- INSERT INTO profiles (id, username, avatar_url)
-- VALUES ('your-user-uuid', 'sample_user', 'https://example.com/avatar.png');

-- INSERT INTO tasks (title, description, created_by, assigned_to)
-- VALUES ('組織目標: 売上2倍', '今年度の最重要目標', 'your-user-uuid', 'your-user-uuid');
