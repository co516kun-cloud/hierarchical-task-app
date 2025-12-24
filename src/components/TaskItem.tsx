// ===================================
// TaskItem Component
// タスクアイテムの表示（進捗バー、ハイライト対応）
// ===================================

'use client';

import { TaskWithProfile } from '@/types/database';
import { useTaskProgress } from '@/hooks/useTasks';
import { useCurrentUser } from '@/hooks/useProfiles';
import { CheckCircle2, Circle, ChevronRight, User } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TaskItemProps {
  task: TaskWithProfile;
  isSelected?: boolean;
  onClick?: () => void;
  hasChildren?: boolean;
  showUserHighlight?: boolean;
}

export function TaskItem({
  task,
  isSelected = false,
  onClick,
  hasChildren = false,
  showUserHighlight = true,
}: TaskItemProps) {
  const { data: currentUser } = useCurrentUser();
  const { data: progress = 0 } = useTaskProgress(task.id);

  // ログインユーザーが作成したタスクかどうか（全員表示時のみハイライト）
  const isCreatedByCurrentUser = showUserHighlight && currentUser?.id === task.created_by;

  const isDisabled = !onClick;

  return (
    <div
      className={cn(
        'group relative rounded-xl border p-4 transition-all',
        !isDisabled && 'cursor-pointer hover:shadow-lg active:scale-[0.98]',
        isDisabled && 'cursor-default opacity-60',
        isSelected && 'ring-2 ring-blue-500',
        isCreatedByCurrentUser && 'bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200',
        !isCreatedByCurrentUser && 'bg-white border-gray-200 hover:border-gray-300'
      )}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        {/* 完了チェックアイコン */}
        <div className="flex-shrink-0 mt-0.5">
          {task.is_completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Circle className="w-5 h-5 text-gray-400" />
          )}
        </div>

        {/* タスク情報 */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3
              className={cn(
                'font-medium text-sm truncate',
                task.is_completed && 'line-through text-gray-500'
              )}
            >
              {task.title}
            </h3>
          </div>

          {/* 説明文 */}
          {task.description && (
            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
              {task.description}
            </p>
          )}

          {/* 担当者情報 */}
          {task.assignee && (
            <div className="flex items-center gap-1 mt-2 text-xs text-gray-600">
              <User className="w-3 h-3" />
              <span>{task.assignee.username}</span>
            </div>
          )}

          {/* 進捗バー（子タスクがある場合のみ） */}
          {hasChildren && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs font-medium text-gray-600 mb-1.5">
                <span>進捗状況</span>
                <span className="text-blue-600">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2 shadow-inner">
                <div
                  className="bg-gradient-to-r from-blue-500 to-indigo-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}
        </div>

        {/* 子タスクがある場合は矢印アイコン */}
        {hasChildren && (
          <ChevronRight className="w-5 h-5 text-gray-400 flex-shrink-0 md:block hidden" />
        )}
      </div>

      {/* 作成者ハイライトインジケーター */}
      {isCreatedByCurrentUser && (
        <div className="absolute top-3 right-3">
          <div className="w-2.5 h-2.5 bg-blue-600 rounded-full shadow-md" />
        </div>
      )}
    </div>
  );
}
