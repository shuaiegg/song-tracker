// src/store/auth-store.ts
import { create } from 'zustand'
import { User } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  isAdmin: boolean
  isLoading: boolean
  isAdminLoading: boolean
  setUser: (user: User | null) => void
  setIsAdmin: (isAdmin: boolean) => void
  setIsLoading: (isLoading: boolean) => void
  setIsAdminLoading: (isAdminLoading: boolean) => void
  reset: () => void
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  isAdmin: false,
  isLoading: true,
  isAdminLoading: true,
  setUser: (user) => set({ user }),
  setIsAdmin: (isAdmin) => set({ isAdmin }),
  setIsLoading: (isLoading) => set({ isLoading }),
  setIsAdminLoading: (isAdminLoading) => set({ isAdminLoading }),
  reset: () => set({ user: null, isAdmin: false, isLoading: false, isAdminLoading: false }),
}))