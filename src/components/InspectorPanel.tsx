// ===================================
// InspectorPanel Component
// タスクの詳細表示・編集パネル
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { useTask, useUpdateTask, useDeleteTask } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { Loader2, Save, Trash2, User, Calendar, CheckCircle2 } from 'lucide-react';

interface InspectorPanelProps {
  taskId: string;
}

export function InspectorPanel({ taskId }: InspectorPanelProps) {
  const { data: task, isLoading } = useTask(taskId);
  const { data: profiles = [] } = useProfiles();
  const updateTask = useUpdateTask();
  const deleteTask = useDeleteTask();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [isCompleted, setIsCompleted] = useState(false);

  // タスクデータが読み込まれたらフォームを初期化
  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setDescription(task.description || '');
      setAssignedTo(task.assigned_to || '');
      setIsCompleted(task.is_completed);
    }
  }, [task]);

  const handleSave = async () => {
    if (!task) return;

    await updateTask.mutateAsync({
      id: task.id,
      updates: {
        title,
        description,
        assigned_to: assignedTo || null,
        is_completed: isCompleted,
      },
    });
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('このタスクを削除しますか？（子タスクも全て削除されます）')) return;

    await deleteTask.mutateAsync(task.id);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (!task) {
    return (
      <div className="flex items-center justify-center h-full text-gray-400">
        タスクが見つかりません
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200">
        <h2 className="font-semibold text-sm text-gray-700">タスク詳細</h2>
      </div>

      {/* フォーム */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* タイトル */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            タイトル
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            placeholder="タスクのタイトル"
          />
        </div>

        {/* 説明 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            説明
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            placeholder="タスクの詳細説明"
          />
        </div>

        {/* 担当者 */}
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">
            <User className="w-3 h-3 inline mr-1" />
            担当者
          </label>
          <select
            value={assignedTo}
            onChange={(e) => setAssignedTo(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">未割り当て</option>
            {profiles.map((profile) => (
              <option key={profile.id} value={profile.id}>
                {profile.username}
              </option>
            ))}
          </select>
        </div>

        {/* 完了状態 */}
        <div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isCompleted}
              onChange={(e) => setIsCompleted(e.target.checked)}
              className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
            />
            <span className="text-sm text-gray-700">
              <CheckCircle2 className="w-4 h-4 inline mr-1" />
              完了済み
            </span>
          </label>
        </div>

        {/* メタ情報 */}
        <div className="pt-4 border-t border-gray-200 space-y-2">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Calendar className="w-3 h-3" />
            <span>作成日: {new Date(task.created_at).toLocaleDateString()}</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <User className="w-3 h-3" />
            <span>作成者: {task.creator?.username || '不明'}</span>
          </div>
        </div>
      </div>

      {/* フッター（アクションボタン） */}
      <div className="p-4 border-t border-gray-200 space-y-2">
        <button
          onClick={handleSave}
          disabled={updateTask.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {updateTask.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          保存
        </button>

        <button
          onClick={handleDelete}
          disabled={deleteTask.isPending}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {deleteTask.isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Trash2 className="w-4 h-4" />
          )}
          削除
        </button>
      </div>
    </div>
  );
}
