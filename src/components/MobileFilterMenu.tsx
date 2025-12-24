// ===================================
// MobileFilterMenu Component
// モバイル用フィルターメニュー（スライドアウト形式）
// ===================================

'use client';

import { useProfiles, useCurrentUser } from '@/hooks/useProfiles';
import { TaskFilter } from '@/types/database';
import { Users, User, LogOut, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { useEffect } from 'react';

interface MobileFilterMenuProps {
  isOpen: boolean;
  onClose: () => void;
  filter?: TaskFilter;
  onFilterChange: (filter: TaskFilter) => void;
}

export function MobileFilterMenu({
  isOpen,
  onClose,
  filter,
  onFilterChange,
}: MobileFilterMenuProps) {
  const { data: profiles = [] } = useProfiles();
  const { data: currentUser } = useCurrentUser();

  // メニューが開いている時はスクロールを無効化
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  const handleUserClick = (userId: string) => {
    // 同じユーザーをクリックした場合はフィルタ解除
    if (filter?.userId === userId) {
      onFilterChange({ ...filter, userId: null });
    } else {
      onFilterChange({ ...filter, userId });
    }
    onClose();
  };

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
      localStorage.clear();
      sessionStorage.clear();
      window.location.href = '/login';
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/login';
    }
  };

  if (!isOpen) return null;

  return (
    <>
      {/* オーバーレイ */}
      <div
        className="fixed inset-0 bg-black/50 z-40 md:hidden"
        onClick={onClose}
      />

      {/* メニューパネル */}
      <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 flex flex-col shadow-2xl md:hidden">
        {/* ヘッダー */}
        <div className="p-4 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-blue-700">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-bold text-white">タスク管理</h1>
              {currentUser && (
                <p className="text-xs text-blue-100 mt-1">
                  {currentUser.username}
                </p>
              )}
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-blue-800 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-white" />
            </button>
          </div>
        </div>

        {/* ユーザーリスト */}
        <div className="flex-1 overflow-y-auto p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users className="w-4 h-4" />
            <span>フィルター</span>
          </div>

          <div className="space-y-2">
            {/* 全員表示オプション */}
            <button
              onClick={() => {
                onFilterChange({ ...filter, userId: null });
                onClose();
              }}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                !filter?.userId
                  ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              )}
            >
              <Users className="w-5 h-5" />
              <span className="font-medium">全員のタスク</span>
            </button>

            {/* ユーザーリスト */}
            {profiles.map((profile) => (
              <button
                key={profile.id}
                onClick={() => handleUserClick(profile.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm transition-all',
                  filter?.userId === profile.id
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-md'
                    : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
                )}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">{profile.username}</span>
                {currentUser?.id === profile.id && (
                  <span className="ml-auto text-xs opacity-80">(あなた)</span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* フッター */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl hover:from-red-600 hover:to-red-700 transition-all shadow-md"
          >
            <LogOut className="w-4 h-4" />
            <span className="font-medium">ログアウト</span>
          </button>
        </div>
      </div>
    </>
  );
}
