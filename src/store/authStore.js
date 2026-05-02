import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useAuthStore = create(
  persist(
    (set) => ({
      user: null,       // row from users table
      unit: null,       // row from units table
      session: null,    // supabase session

      setAuth: (user, unit, session) => set({ user, unit, session }),
      clearAuth: () => set({ user: null, unit: null, session: null }),
    }),
    { name: 'jobtrack-auth' }
  )
)
