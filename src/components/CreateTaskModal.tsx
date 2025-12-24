// ===================================
// CreateTaskModal Component
// タスク作成モーダル
// ===================================

'use client';

import { useState } from 'react';
import { useCreateTask, useTasks, useUpdateTask } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { X, Loader2, Plus, MoveDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface CreateTaskModalProps {
  parentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export function CreateTaskModal({
  parentId,
  isOpen,
  onClose,
}: CreateTaskModalProps) {
  const { data: profiles = [] } = useProfiles();
  const createTask = useCreateTask();
  const updateTask = useUpdateTask();
  const { data: existingChildren = [] } = useTasks(parentId);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assignedTo, setAssignedTo] = useState('');
  const [inheritChildren, setInheritChildren] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return;

    // 新しいタスクを作成
    const newTask = await createTask.mutateAsync({
      parent_id: parentId,
      title: title.trim(),
      description: description.trim(),
      assigned_to: assignedTo || null,
    });

    // 子タスクを引き継ぐ場合、既存の子タスクの親を新しいタスクに変更
    if (inheritChildren && existingChildren.length > 0) {
      for (const child of existingChildren) {
        await supabase
          .from('tasks')
          .update({ parent_id: newTask.id })
          .eq('id', child.id);
      }
    }

    // フォームをリセット
    setTitle('');
    setDescription('');
    setAssignedTo('');
    setInheritChildren(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
        {/* ヘッダー */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">新規タスク作成</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* フォーム */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* タイトル */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              タイトル *
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              autoFocus
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="タスクのタイトルを入力"
            />
          </div>

          {/* 説明 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              説明
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
              placeholder="タスクの詳細説明（任意）"
            />
          </div>

          {/* 担当者 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              担当者
            </label>
            <select
              value={assignedTo}
              onChange={(e) => setAssignedTo(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">自分に割り当て</option>
              {profiles.map((profile) => (
                <option key={profile.id} value={profile.id}>
                  {profile.username}
                </option>
              ))}
            </select>
          </div>

          {/* 子タスクを引き継ぐ */}
          {parentId && existingChildren.length > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={inheritChildren}
                  onChange={(e) => setInheritChildren(e.target.checked)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500 mt-0.5"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-1 text-sm font-medium text-gray-700">
                    <MoveDown className="w-4 h-4 text-blue-600" />
                    <span>子タスクを引き継ぐ</span>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    親タスクの既存の子タスク（{existingChildren.length}件）を、この新しいタスクの子タスクに移動します
                  </p>
                </div>
              </label>
            </div>
          )}

          {/* アクションボタン */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            >
              キャンセル
            </button>
            <button
              type="submit"
              disabled={!title.trim() || createTask.isPending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {createTask.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Plus className="w-4 h-4" />
              )}
              作成
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
