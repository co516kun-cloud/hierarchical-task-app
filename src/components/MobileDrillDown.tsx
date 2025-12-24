// ===================================
// MobileDrillDown Component
// モバイル用のドリルダウンナビゲーション（改善版）
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskItem } from './TaskItem';
import { MobileFilterMenu } from './MobileFilterMenu';
import { MobileTaskDetail } from './MobileTaskDetail';
import { TaskFilter } from '@/types/database';
import { ArrowLeft, Plus, Loader2, Home, Menu, Filter } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { useProfiles } from '@/hooks/useProfiles';

interface MobileDrillDownProps {
  filter?: TaskFilter;
  onCreateTask?: (parentId: string | null) => void;
  onTaskSelect?: (taskId: string) => void;
  onFilterChange?: (filter: TaskFilter) => void;
}

interface BreadcrumbItem {
  id: string | null;
  title: string;
}

export function MobileDrillDown({
  filter,
  onCreateTask,
  onTaskSelect,
  onFilterChange,
}: MobileDrillDownProps) {
  // 現在表示中の親タスクID
  const [currentParentId, setCurrentParentId] = useState<string | null>(null);

  // パンくずリスト（ナビゲーション履歴）
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItem[]>([
    { id: null, title: 'ホーム' },
  ]);

  // UI状態管理
  const [isFilterMenuOpen, setIsFilterMenuOpen] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // タスクデータ取得
  const { data: tasks = [], isLoading, error } = useTasks(currentParentId, filter);
  const { data: profiles = [] } = useProfiles();

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

  // フィルター中のユーザー名を取得
  const getFilteredUserName = () => {
    if (!filter?.userId) return null;
    const user = profiles.find(p => p.id === filter.userId);
    return user?.username || null;
  };

  return (
    <>
      <div className="flex flex-col h-full bg-gradient-to-b from-gray-50 to-white">
        {/* ヘッダー */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
          {/* ナビゲーションバー */}
          <div className="flex items-center gap-3 p-4">
            {/* 左側: 戻るボタンまたはメニューボタン */}
            {breadcrumbs.length > 1 ? (
              <button
                onClick={handleBack}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <ArrowLeft className="w-6 h-6 text-gray-700" />
              </button>
            ) : (
              <button
                onClick={() => setIsFilterMenuOpen(true)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <Menu className="w-6 h-6 text-gray-700" />
              </button>
            )}

            {/* 中央: タイトルとフィルター情報 */}
            <div className="flex-1 min-w-0">
              <h1 className="font-bold text-lg text-gray-900 truncate">
                {breadcrumbs[breadcrumbs.length - 1]?.title || 'ホーム'}
              </h1>
              {getFilteredUserName() && (
                <p className="text-xs text-blue-600 font-medium">
                  <Filter className="w-3 h-3 inline mr-1" />
                  {getFilteredUserName()}のタスク
                </p>
              )}
            </div>

            {/* 右側: 新規作成ボタン */}
            <button
              onClick={() => onCreateTask?.(currentParentId)}
              className="p-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all shadow-md"
            >
              <Plus className="w-6 h-6" />
            </button>
          </div>

        {/* パンくずリスト */}
        {breadcrumbs.length > 1 && (
          <div className="px-4 pb-3 flex items-center gap-2 overflow-x-auto scrollbar-hide">
            {breadcrumbs.map((crumb, index) => (
              <div key={crumb.id || 'root'} className="flex items-center gap-2">
                {index === 0 && <Home className="w-3.5 h-3.5 text-gray-400" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className="text-xs font-medium text-gray-600 hover:text-blue-600 whitespace-nowrap px-2 py-1 hover:bg-blue-50 rounded-lg transition-colors"
                >
                  {crumb.title}
                </button>
                {index < breadcrumbs.length - 1 && (
                  <span className="text-gray-300">/</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-3">
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

        {tasks.map((task) => {
          const hasChildren = (childrenCount[task.id] || 0) > 0;
          return (
            <div
              key={task.id}
              onClick={() => {
                // タスク詳細を開く
                setSelectedTaskId(task.id);
                onTaskSelect?.(task.id);
              }}
            >
              <TaskItem
                task={task}
                onClick={() => {}}
                hasChildren={hasChildren}
                showUserHighlight={!filter?.userId}
              />
              {/* 子タスクがある場合はドリルダウンボタンを追加 */}
              {hasChildren && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTaskClick(task.id, task.title);
                  }}
                  className="mt-2 w-full py-2.5 bg-gradient-to-r from-blue-50 to-indigo-50 hover:from-blue-100 hover:to-indigo-100 text-blue-700 rounded-xl font-medium text-sm transition-all border border-blue-200"
                >
                  子タスクを表示 ({childrenCount[task.id]})
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>

    {/* フィルターメニュー */}
    <MobileFilterMenu
      isOpen={isFilterMenuOpen}
      onClose={() => setIsFilterMenuOpen(false)}
      filter={filter}
      onFilterChange={(newFilter) => {
        onFilterChange?.(newFilter);
      }}
    />

    {/* タスク詳細モーダル */}
    <MobileTaskDetail
      taskId={selectedTaskId}
      onClose={() => setSelectedTaskId(null)}
      onDeleted={() => {
        setSelectedTaskId(null);
        // タスクが削除されたら、現在の階層が存在しなくなった可能性があるので、
        // 一つ上の階層に戻る
        if (breadcrumbs.length > 1) {
          handleBack();
        }
      }}
    />
  </>
  );
}
