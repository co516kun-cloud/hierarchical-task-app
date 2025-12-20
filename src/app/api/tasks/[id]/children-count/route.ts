// ===================================
// API Route: Get Children Count
// 指定されたタスクの子タスク数を返す
// ===================================

import { supabase } from '@/lib/supabase';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 子タスク数を取得
    const { count, error } = await supabase
      .from('tasks')
      .select('*', { count: 'exact', head: true })
      .eq('parent_id', id);

    if (error) throw error;

    return NextResponse.json({ count: count || 0 });
  } catch (error) {
    console.error('Error fetching children count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch children count' },
      { status: 500 }
    );
  }
}
