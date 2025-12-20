// ===================================
// Profile Management Hooks
// ===================================

import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { Profile } from '@/types/database';

// ===================================
// Query Keys
// ===================================
export const profileKeys = {
  all: ['profiles'] as const,
  lists: () => [...profileKeys.all, 'list'] as const,
  detail: (id: string) => [...profileKeys.all, 'detail', id] as const,
};

// ===================================
// Fetch All Profiles
// ===================================
export const useProfiles = () => {
  return useQuery({
    queryKey: profileKeys.lists(),
    queryFn: async (): Promise<Profile[]> => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('username', { ascending: true });

      if (error) throw error;
      return data || [];
    },
  });
};

// ===================================
// Fetch Current User Profile
// ===================================
export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) return null;

      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (error) throw error;
      return profile;
    },
  });
};
