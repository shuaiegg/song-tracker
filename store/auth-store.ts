// src/store/auth-store.ts
import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  isAdminLoading: boolean
  isInitialized: boolean // ✨ 新增：标记是否已完成初始化
  setUser: (user: User | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setIsAdminLoading: (isAdminLoading: boolean) => void
  setIsInitialized: (isInitialized: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAdmin: false,
      isLoading: true,
      isAdminLoading: true,
      isInitialized: false,
      setUser: (user) => set({ user }),
      setIsAdmin: (isAdmin) => set({ isAdmin }),
      setIsLoading: (isLoading) => set({ isLoading }),
      setIsAdminLoading: (isAdminLoading) => set({ isAdminLoading }),
      setIsInitialized: (isInitialized) => set({ isInitialized }),
      reset: () => set({ user: null, isAdmin: false, isLoading: false, isAdminLoading: false }),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      // ✨ 只持久化必要的状态，不持久化 loading 状态
      partialize: (state) => ({
        user: state.user,
        isAdmin: state.isAdmin,
        isInitialized: state.isInitialized,
      }),
    }
  )
)