// ===================================
// ColumnView Component (Desktop)
// Miller Columns スタイルのタスク表示
// ===================================

'use client';

import { useState, useEffect } from 'react';
import { useTasks } from '@/hooks/useTasks';
import { TaskItem } from './TaskItem';
import { InspectorPanel } from './InspectorPanel';
import { TaskFilter } from '@/types/database';
import { Plus, Loader2, ArrowLeft, Home, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface ColumnViewProps {
  filter?: TaskFilter;
  onCreateTask?: (parentId: string | null) => void;
}

interface NavigationItem {
  id: string | null;
  title: string;
}

export function ColumnView({ filter, onCreateTask }: ColumnViewProps) {
  // ナビゲーション履歴（階層のスタック）
  // 例: [null] → [null, taskA_id] → [null, taskA_id, taskA1_id]
  const [navigationHistory, setNavigationHistory] = useState<NavigationItem[]>([
    { id: null, title: 'ルート' }
  ]);

  // 最後に選択されたタスクID（Inspector表示用）
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // 現在表示中の階層（履歴の最後の要素）
  const currentLevel = navigationHistory[navigationHistory.length - 1];
  // 1つ前の階層（履歴の最後から2番目の要素）
  const previousLevel = navigationHistory.length > 1
    ? navigationHistory[navigationHistory.length - 2]
    : null;

  // 左カラム（兄弟タスク）をクリックした時の処理
  const handleSiblingTaskClick = (taskId: string, taskTitle: string) => {
    // 選択されたタスクIDを更新
    setSelectedTaskId(taskId);

    // ナビゲーション履歴の最後を置き換え（同じ階層で移動）
    const newHistory = [...navigationHistory];
    newHistory[newHistory.length - 1] = { id: taskId, title: taskTitle };
    setNavigationHistory(newHistory);
  };

  // 右カラム（子タスク）をクリックした時の処理
  const handleChildTaskClick = (taskId: string, taskTitle: string) => {
    // 選択されたタスクIDを更新
    setSelectedTaskId(taskId);

    // ナビゲーション履歴に追加（階層を1つ下に進む）
    setNavigationHistory([...navigationHistory, { id: taskId, title: taskTitle }]);
  };

  // 戻るボタンの処理（階層を戻る）
  const handleBack = () => {
    if (navigationHistory.length <= 1) return;

    const newHistory = navigationHistory.slice(0, -1);
    const previousItem = newHistory[newHistory.length - 1];

    setNavigationHistory(newHistory);
    setSelectedTaskId(previousItem.id);
  };

  // パンくずリストから直接移動
  const handleBreadcrumbClick = (index: number) => {
    const newHistory = navigationHistory.slice(0, index + 1);
    const targetItem = navigationHistory[index];

    setNavigationHistory(newHistory);
    setSelectedTaskId(targetItem.id);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ナビゲーションヘッダー（パンくずリストと戻るボタン） */}
      {navigationHistory.length > 1 && (
        <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-gray-200">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            戻る
          </button>

          {/* パンくずリスト */}
          <div className="flex items-center gap-1 overflow-x-auto">
            {navigationHistory.map((item, index) => (
              <div key={item.id || 'root'} className="flex items-center gap-1">
                {index === 0 && <Home className="w-3.5 h-3.5 text-gray-400" />}
                <button
                  onClick={() => handleBreadcrumbClick(index)}
                  className={cn(
                    'text-sm whitespace-nowrap transition-colors',
                    index === navigationHistory.length - 1
                      ? 'text-blue-600 font-medium'
                      : 'text-gray-600 hover:text-blue-600'
                  )}
                >
                  {item.title}
                </button>
                {index < navigationHistory.length - 1 && (
                  <ChevronRight className="w-3.5 h-3.5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* カラム領域 */}
      <div className="flex-1 flex overflow-hidden">
        {/* 左カラム: 1つ前の階層の子タスク（現在の階層の兄弟） */}
        {previousLevel && (
          <Column
            parentId={previousLevel.id}
            selectedTaskId={currentLevel.id}
            disabledTaskId={currentLevel.id}
            filter={filter}
            onTaskClick={(taskId, taskTitle) => handleSiblingTaskClick(taskId, taskTitle)}
            onCreateTask={() => onCreateTask?.(previousLevel.id)}
            title={previousLevel.title}
          />
        )}

        {/* 右カラム: 現在の階層の子タスク */}
        <Column
          parentId={currentLevel.id}
          selectedTaskId={selectedTaskId}
          disabledTaskId={null}
          filter={filter}
          onTaskClick={(taskId, taskTitle) => handleChildTaskClick(taskId, taskTitle)}
          onCreateTask={() => onCreateTask?.(currentLevel.id)}
          title={currentLevel.id ? '子タスク' : 'ルートタスク'}
        />

        {/* Inspector Panel（最右端に固定） */}
        {selectedTaskId && (
          <div className="w-80 border-l border-gray-200 bg-white flex-shrink-0">
            <InspectorPanel taskId={selectedTaskId} />
          </div>
        )}
      </div>
    </div>
  );
}

// ===================================
// Individual Column Component
// ===================================

interface ColumnProps {
  parentId: string | null;
  selectedTaskId: string | null;
  disabledTaskId: string | null;
  filter?: TaskFilter;
  onTaskClick: (taskId: string, taskTitle: string) => void;
  onCreateTask?: () => void;
  title: string;
}

function Column({
  parentId,
  selectedTaskId,
  disabledTaskId,
  filter,
  onTaskClick,
  onCreateTask,
  title,
}: ColumnProps) {
  const { data: tasks = [], isLoading, error } = useTasks(parentId, filter);

  // 各タスクが子を持つかチェック（子タスク取得は遅延ロード）
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

  return (
    <div className="flex-shrink-0 w-80 border-r border-gray-200 bg-gray-50 flex flex-col">
      {/* カラムヘッダー */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-sm text-gray-700">
            {title}
          </h2>
          <button
            onClick={onCreateTask}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            title="新規タスク作成"
          >
            <Plus className="w-4 h-4 text-gray-600" />
          </button>
        </div>
      </div>

      {/* タスクリスト */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {isLoading && (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 text-center py-8">
            エラーが発生しました
          </div>
        )}

        {!isLoading && !error && tasks.length === 0 && (
          <div className="text-sm text-gray-400 text-center py-8">
            タスクがありません
          </div>
        )}

        {tasks.map((task) => {
          const isDisabled = disabledTaskId === task.id;
          return (
            <TaskItem
              key={task.id}
              task={task}
              isSelected={selectedTaskId === task.id}
              onClick={isDisabled ? undefined : () => onTaskClick(task.id, task.title)}
              hasChildren={(childrenCount[task.id] || 0) > 0}
              showUserHighlight={!filter?.userId}
            />
          );
        })}
      </div>
    </div>
  );
}
