// ===================================
// Sidebar Component
// ユーザーリスト・フィルター
// ===================================

'use client';

import { useProfiles, useCurrentUser } from '@/hooks/useProfiles';
import { TaskFilter } from '@/types/database';
import { Users, User, LogOut } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

interface SidebarProps {
  filter?: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
}

export function Sidebar({ filter, onFilterChange }: SidebarProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: currentUser } = useCurrentUser();

  const handleUserClick = (userId: string) => {
    // 同じユーザーをクリックした場合はフィルタ解除
    if (filter?.userId === userId) {
      onFilterChange({ ...filter, userId: null });
    } else {
      onFilterChange({ ...filter, userId });
    }
  };

  const handleSignOut = async () => {
    try {
      // Supabaseのセッションをクリア
      await supabase.auth.signOut();

      // ローカルストレージもクリア
      localStorage.clear();
      sessionStorage.clear();

      // ログインページにリダイレクト
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      // エラーが発生してもログインページにリダイレクト
      window.location.href = '/login';
    }
  };

  return (
    <div className="w-64 h-full bg-gray-50 border-r border-gray-200 flex flex-col">
      {/* ヘッダー */}
      <div className="p-4 border-b border-gray-200 bg-white">
        <h1 className="text-lg font-bold text-gray-900">タスク管理</h1>
        {currentUser && (
          <p className="text-xs text-gray-500 mt-1">
            ログイン中: {currentUser.username}
          </p>
        )}
      </div>

      {/* ユーザーリスト */}
      <div className="flex-1 overflow-y-auto p-4">
        <div className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700">
          <Users className="w-4 h-4" />
          <span>ユーザー</span>
        </div>

        <div className="space-y-1">
          {/* 全員表示オプション */}
          <button
            onClick={() => onFilterChange({ ...filter, userId: null })}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
              !filter?.userId
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-gray-700 hover:bg-gray-100'
            )}
          >
            <Users className="w-4 h-4" />
            <span>全員</span>
          </button>

          {/* ユーザーリスト */}
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => handleUserClick(profile.id)}
              className={cn(
                'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors',
                filter?.userId === profile.id
                  ? 'bg-blue-100 text-blue-700 font-medium'
                  : 'text-gray-700 hover:bg-gray-100'
              )}
            >
              <User className="w-4 h-4" />
              <span>{profile.username}</span>
              {currentUser?.id === profile.id && (
                <span className="ml-auto text-xs text-blue-600">(あなた)</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* フッター */}
      <div className="p-4 border-t border-gray-200">
        <button
          onClick={handleSignOut}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          <span>ログアウト</span>
        </button>
      </div>
    </div>
  );
}
