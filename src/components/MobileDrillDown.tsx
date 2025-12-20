// ===================================
// MobileDrillDown Component
// モバイル用のドリルダウンナビゲーション
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskItem } from './TaskItem';
import { TaskFilter } from '@/types/database';
import { ArrowLeft, Plus, Loader2, Home } from 'lucide-react';
import { supabase } from '@/lib/supabase';

interface MobileDrillDownProps {
  filter?: TaskFilter;
  onCreateTask?: (parentId: string | null) => void;
  onTaskSelect?: (taskId: string) => void;
}

interface BreadcrumbItem {
  id: string | null;
  title: string;
}

export function MobileDrillDown({
  filter,
  onCreateTask,
  onTaskSelect,
}: MobileDrillDownProps) {
  // 現在表示中の親タスクID
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // パンくずリスト（ナビゲーション履歴）
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, title: 'ホーム' },
  ]);

  // タスクデータ取得
  const { data: tasks = [], isLoading, error } = useTasks(currentParentId, filter);

  // 各タスクの子タスク数を管理
  const [childrenCount, setChildrenCount] = useState<Record<string, number>>({});

  useEffect(() => {
    // タスクリストが変更されたら、まず古いカウントをクリア
    setChildrenCount({});

    // 各タスクの子タスク数を取得
    const fetchChildrenCounts = async () => {
      const counts: Record<string, number> = {};
      for (const task of tasks) {
        const { count, error } = await supabase
          .from('tasks')
          .select('*', { count: 'exact', head: true })
          .eq('parent_id', task.id);

        if (!error) {
          counts[task.id] = count || 0;
        }
      }
      setChildrenCount(counts);
    };

    if (tasks.length > 0) {
      fetchChildrenCounts();
    }
  }, [tasks]);

  // タスククリック時の処理（子階層へ移動）
  const handleTaskClick = (taskId: string, taskTitle: string) => {
    setCurrentParentId(taskId);
    setBreadcrumbs([...breadcrumbs, { id: taskId, title: taskTitle }]);
  };

  // 戻るボタン
  const handleBack = () => {
    if (breadcrumbs.length <= 1) return;

    const newBreadcrumbs = breadcrumbs.slice(0, -1);
    const parent = newBreadcrumbs[newBreadcrumbs.length - 1];

    setBreadcrumbs(newBreadcrumbs);
    setCurrentParentId(parent.id);
  };

  // パンくずリストから直接移動
  const handleBreadcrumbClick = (index: number) => {
    const newBreadcrumbs = breadcrumbs.slice(0, index + 1);
    const target = breadcrumbs[index];

    setBreadcrumbs(newBreadcrumbs);
    setCurrentParentId(target.id);
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* ヘッダー */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* ナビゲーションバー */}
        <div className="flex items-center gap-2 p-3">
          <button
            onClick={handleBack}
            disabled={breadcrumbs.length <= 1}
            className="p-2 hover:bg-gray-100 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>

          <h1 className="flex-1 font-semibold text-lg truncate">
            {breadcrumbs[breadcrumbs.length - 1]?.title || 'ホーム'}
          </h1>

          <button
            onClick={() => onCreateTask?.(currentParentId)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        {/* パンくずリスト */}
        {breadcrumbs.length > 1 && (
          <div className="px-3 pb-3 flex items-center gap-1 overflow-x-auto">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center gap-1">
                {index === 0 && <Home className="w-3 h-3 text-gray-400" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-xs text-gray-600 hover:text-blue-600 whitespace-nowrap"
                >
                  {crumb.title}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <span className="text-gray-400">/</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 text-center py-12">
            エラーが発生しました
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-12">
            タスクがありません
          </div>
        )}

        {tasks.map((task) => (
          <div key={task.id}>
            <TaskItem
              task={task}
              onClick={() => {
                // 詳細表示とドリルダウンの両方を処理
                onTaskSelect?.(task.id);
                // 子タスクがある場合のみドリルダウン
                if ((childrenCount[task.id] || 0) > 0) {
                  handleTaskClick(task.id, task.title);
                }
              }}
              hasChildren={(childrenCount[task.id] || 0) > 0}
              showUserHighlight={!filter?.userId}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
