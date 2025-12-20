// ===================================
// Main Page - Task Management App
// レスポンシブ対応: Desktop (Miller Columns) / Mobile (Drill-down)
// ===================================

'use client';

import { useState } from 'react';
import { ColumnView } from '@/components/ColumnView';
import { MobileDrillDown } from '@/components/MobileDrillDown';
import { Sidebar } from '@/components/Sidebar';
import { CreateTaskModal } from '@/components/CreateTaskModal';
import { AuthGuard } from '@/components/AuthGuard';
import { TaskFilter } from '@/types/database';

export default function HomePage() {
  const [filter, setFilter] = useState<TaskFilter>({});
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createParentId, setCreateParentId] = useState<string | null>(null);

  const handleCreateTask = (parentId: string | null) => {
    setCreateParentId(parentId);
    setCreateModalOpen(true);
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden bg-white">
      {/* サイドバー（デスクトップのみ） */}
      <div className="hidden md:block">
        <Sidebar filter={filter} onFilterChange={setFilter} />
      </div>

      {/* メインコンテンツエリア */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* デスクトップ: Miller Columns */}
        <div className="hidden md:flex flex-1 overflow-hidden">
          <ColumnView filter={filter} onCreateTask={handleCreateTask} />
        </div>

        {/* モバイル: Drill-down Navigation */}
        <div className="md:hidden flex-1 overflow-hidden">
          <MobileDrillDown
            filter={filter}
            onCreateTask={handleCreateTask}
          />
        </div>
      </div>

      {/* タスク作成モーダル */}
      <CreateTaskModal
        parentId={createParentId}
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
      />
    </div>
    </AuthGuard>
  );
}
