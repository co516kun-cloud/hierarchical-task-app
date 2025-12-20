// ===================================
// Task Management Hooks (TanStack Query)
// ===================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import {
  Task,
  TaskWithProfile,
  CreateTaskInput,
  UpdateTaskInput,
  TaskFilter,
} from '@/types/database';

// ===================================
// Query Keys
// ===================================
export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (parentId: string | null, filter?: TaskFilter) =>
    [...taskKeys.lists(), { parentId, filter }] as const,
  detail: (id: string) => [...taskKeys.all, 'detail', id] as const,
  progress: (id: string) => [...taskKeys.all, 'progress', id] as const,
};

// ===================================
// Fetch Tasks by Parent ID
// ===================================
export const useTasks = (parentId: string | null, filter?: TaskFilter) => {
  return useQuery({
    queryKey: taskKeys.list(parentId, filter),
    queryFn: async (): Promise<TaskWithProfile[]> => {
      let query = supabase
        .from('tasks')
        .select(
          `
          *,
          creator:profiles!tasks_created_by_fkey(id, username, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(id, username, avatar_url)
        `
        )
        .order('created_at', { ascending: false });

      // 親IDでフィルタ
      if (parentId === null) {
        query = query.is('parent_id', null);
      } else {
        query = query.eq('parent_id', parentId);
      }

      // ユーザーフィルタ
      if (filter?.userId) {
        query = query.or(
          `created_by.eq.${filter.userId},assigned_to.eq.${filter.userId}`
        );
      }

      // 完了タスクフィルタ
      if (filter?.showCompleted === false) {
        query = query.eq('is_completed', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data || [];
    },
  });
};

// ===================================
// Fetch Single Task
// ===================================
export const useTask = (id: string) => {
  return useQuery({
    queryKey: taskKeys.detail(id),
    queryFn: async (): Promise<TaskWithProfile | null> => {
      const { data, error } = await supabase
        .from('tasks')
        .select(
          `
          *,
          creator:profiles!tasks_created_by_fkey(id, username, avatar_url),
          assignee:profiles!tasks_assigned_to_fkey(id, username, avatar_url)
        `
        )
        .eq('id', id)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!id,
  });
};

// ===================================
// Fetch Task Progress
// ===================================
export const useTaskProgress = (id: string) => {
  return useQuery({
    queryKey: taskKeys.progress(id),
    queryFn: async (): Promise<number> => {
      const { data, error } = await supabase.rpc('get_task_progress', {
        task_id: id,
      });

      if (error) throw error;
      return data || 0;
    },
    enabled: !!id,
  });
};

// ===================================
// Create Task Mutation
// ===================================
export const useCreateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateTaskInput): Promise<Task> => {
      const { data: userData } = await supabase.auth.getUser();
      const userId = userData.user?.id;

      const { data, error } = await supabase
        .from('tasks')
        .insert({
          ...input,
          created_by: userId,
          assigned_to: input.assigned_to || userId,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 全タスクリストを無効化して再取得（部分一致で全てのフィルター条件を無効化）
      queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
        exact: false
      });
      // 全てのタスク詳細クエリを無効化（親タスクの自動完了が反映される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'detail'
      });
      // 全ての進捗クエリを無効化（全先祖タスクの進捗が更新される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'progress'
      });
    },
  });
};

// ===================================
// Update Task Mutation
// ===================================
export const useUpdateTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      updates,
    }: {
      id: string;
      updates: UpdateTaskInput;
    }): Promise<Task> => {
      const { data, error } = await supabase
        .from('tasks')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      // 全タスクリストを無効化（部分一致）
      queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
        exact: false
      });
      // 全てのタスク詳細クエリを無効化（親タスクの自動完了が反映される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'detail'
      });
      // 全ての進捗クエリを無効化（全先祖タスクの進捗が更新される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'progress'
      });
    },
  });
};

// ===================================
// Delete Task Mutation
// ===================================
export const useDeleteTask = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string): Promise<void> => {
      // タスク削除前に親IDを取得
      const { data: task } = await supabase
        .from('tasks')
        .select('parent_id')
        .eq('id', id)
        .single();

      const { error } = await supabase.from('tasks').delete().eq('id', id);

      if (error) throw error;

      // 親IDを返す
      return task?.parent_id;
    },
    onSuccess: (parentId) => {
      // 全タスクリストを無効化（部分一致）
      queryClient.invalidateQueries({
        queryKey: taskKeys.lists(),
        exact: false
      });
      // 全てのタスク詳細クエリを無効化（親タスクの自動完了が反映される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'detail'
      });
      // 全ての進捗クエリを無効化（全先祖タスクの進捗が更新される）
      queryClient.invalidateQueries({
        queryKey: taskKeys.all,
        predicate: (query) => query.queryKey[0] === 'tasks' && query.queryKey[1] === 'progress'
      });
    },
  });
};
