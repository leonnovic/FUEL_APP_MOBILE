import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublic, LoginCredentials, RegisterData } from '@/types/fuel';

interface AuthState {
  user: UserPublic | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;

  // Actions
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  register: (data: RegisterData) => Promise<void>;
  setUser: (user: UserPublic) => void;
  clearError: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      login: async (credentials: LoginCredentials) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/login?XTransformPort=3000', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(credentials),
          });

          const data = await res.json();

          if (!data.success) {
            throw new Error(data.error || 'Login failed');
          }

          set({
            user: data.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
        }
      },

      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
          error: null,
        });
      },

      register: async (data: RegisterData) => {
        set({ isLoading: true, error: null });
        try {
          const res = await fetch('/api/auth/register?XTransformPort=3000', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data),
          });

          const result = await res.json();

          if (!result.success) {
            throw new Error(result.error || 'Registration failed');
          }

          set({
            user: result.user,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          });
        }
      },

      setUser: (user: UserPublic) => {
        set({ user, isAuthenticated: true });
      },

      clearError: () => {
        set({ error: null });
      },
    }),
    {
      name: 'fuelpro-auth',
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
