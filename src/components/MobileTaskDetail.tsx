// ===================================
// MobileTaskDetail Component
// モバイル用タスク詳細モーダル（スライドアップ形式）
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { useTask, useUpdateTask, useDeleteTask, useTaskProgress } from '@/hooks/useTasks';
import { useProfiles } from '@/hooks/useProfiles';
import { Loader2, Save, Trash2, User, Calendar, CheckCircle2, X, ChevronDown, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileTaskDetailProps {
  taskId: string | null;
  onClose: () => void;
  onDeleted?: () => void;
}

export function MobileTaskDetail({ taskId, onClose, onDeleted }: MobileTaskDetailProps) {
  const { data: task, isLoading } = useTask(taskId || '');
  const { data: profiles = [] } = useProfiles();
  const { data: progress = 0 } = useTaskProgress(taskId || '');
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

  // モーダルが開いている時はスクロールを無効化
  useEffect(() => {
    if (taskId) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [taskId]);

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

    onClose();
  };

  const handleDelete = async () => {
    if (!task) return;
    if (!confirm('このタスクを削除しますか？（子タスクも全て削除されます）')) return;

    await deleteTask.mutateAsync(task.id);
    onDeleted?.();
    onClose();
  };

  if (!taskId) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* モーダルパネル */}
      <div className="fixed inset-x-0 bottom-0 bg-white z-50 rounded-t-3xl shadow-2xl max-h-[90vh] flex flex-col md:hidden">
        {/* ドラッグハンドル */}
        <div className="flex justify-center pt-3 pb-2">
          <div className="w-12 h-1.5 bg-gray-300 rounded-full" />
        </div>

        {/* ヘッダー */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-bold text-gray-900">タスク詳細</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ChevronDown className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        {/* コンテンツ */}
        <div className="flex-1 overflow-y-auto">
          {isLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
            </div>
          )}

          {!isLoading && !task && (
            <div className="flex items-center justify-center py-12 text-gray-400">
              タスクが見つかりません
            </div>
          )}

          {!isLoading && task && (
            <div className="p-6 space-y-6">
              {/* 進捗表示 */}
              {progress > 0 && (
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-4 border border-blue-100">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="w-4 h-4 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-700">進捗状況</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{Math.round(progress)}%</span>
                  </div>
                  <div className="w-full bg-white rounded-full h-2.5 shadow-inner">
                    <div
                      className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2.5 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              )}

              {/* タイトル */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  タイトル
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  placeholder="タスクのタイトル"
                />
              </div>

              {/* 説明 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  説明
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none transition-all"
                  placeholder="タスクの詳細説明"
                />
              </div>

              {/* 担当者 */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  <User className="w-4 h-4 inline mr-1" />
                  担当者
                </label>
                <select
                  value={assignedTo}
                  onChange={(e) => setAssignedTo(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
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
              <div className="bg-gray-50 rounded-2xl p-4 border border-gray-200">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isCompleted}
                    onChange={(e) => setIsCompleted(e.target.checked)}
                    className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <span className="text-sm font-medium text-gray-700">
                    <CheckCircle2 className="w-4 h-4 inline mr-1" />
                    完了済みとしてマーク
                  </span>
                </label>
              </div>

              {/* メタ情報 */}
              <div className="pt-4 border-t border-gray-200 space-y-3">
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                    <Calendar className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">作成日</div>
                    <div className="font-medium">{new Date(task.created_at).toLocaleDateString('ja-JP')}</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-600">
                  <div className="flex items-center justify-center w-8 h-8 bg-gray-100 rounded-lg">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs text-gray-500">作成者</div>
                    <div className="font-medium">{task.creator?.username || '不明'}</div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* フッター（アクションボタン） */}
        {!isLoading && task && (
          <div className="p-6 border-t border-gray-200 bg-gray-50 space-y-3">
            <button
              onClick={handleSave}
              disabled={updateTask.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-semibold"
            >
              {updateTask.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Save className="w-5 h-5" />
              )}
              変更を保存
            </button>

            <button
              onClick={handleDelete}
              disabled={deleteTask.isPending}
              className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg font-semibold"
            >
              {deleteTask.isPending ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Trash2 className="w-5 h-5" />
              )}
              タスクを削除
            </button>
          </div>
        )}
      </div>
    </>
  );
}
