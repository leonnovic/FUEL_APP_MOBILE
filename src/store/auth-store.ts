import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserPublic, ActionType, DataType, TeamScope } from '@/types/fuel';

interface AuthState {
  user: UserPublic | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  lastSyncAt: string | null;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, name: string, password: string, phone?: string) => Promise<void>;
  logout: () => Promise<void>;
  validateSession: () => Promise<void>;
  setUser: (user: UserPublic) => void;
  clearError: () => void;

  // RBAC
  can: (action: ActionType, dataType: DataType, stationId?: string) => boolean;
  hasStationAccess: (stationId: string) => boolean;
}

// API base URL helper
const apiCall = async (path: string, options?: RequestInit) => {
  const token = useAuthStore.getState().token;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers as Record<string, string> || {}),
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return fetch(path, { ...options, headers });
};

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastSyncAt: null,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiCall('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password }),
          });

          const data = await res.json();

          if (!data.success) {
            throw new Error(data.error || 'Login failed');
          }

          const user: UserPublic = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            tier: data.user.tier,
            phone: data.user.phone,
            avatarUrl: data.user.avatarUrl,
            permissions: data.user.permissions || [],
            assignedStations: data.user.assignedStations || [],
            token: data.token,
          };

          set({
            user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastSyncAt: new Date().toISOString(),
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Login failed',
          });
        }
      },

      register: async (email: string, name: string, password: string, phone?: string) => {
        set({ isLoading: true, error: null });
        try {
          const res = await apiCall('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify({ email, name, password, phone }),
          });

          const result = await res.json();

          if (!result.success) {
            throw new Error(result.error || 'Registration failed');
          }

          const user: UserPublic = {
            id: result.user.id,
            email: result.user.email,
            name: result.user.name,
            role: result.user.role,
            tier: result.user.tier,
            phone: result.user.phone,
            avatarUrl: result.user.avatarUrl,
            permissions: result.user.permissions || [],
            assignedStations: result.user.assignedStations || [],
            token: result.token,
          };

          set({
            user,
            token: result.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastSyncAt: new Date().toISOString(),
          });
        } catch (err) {
          set({
            isLoading: false,
            error: err instanceof Error ? err.message : 'Registration failed',
          });
        }
      },

      logout: async () => {
        try {
          // Attempt server-side logout
          await apiCall('/api/auth/logout', { method: 'POST' });
        } catch {
          // Ignore errors on logout
        }
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
          lastSyncAt: null,
        });
      },

      validateSession: async () => {
        const { token } = get();
        if (!token) {
          set({ isAuthenticated: false, user: null, token: null });
          return;
        }

        try {
          const res = await apiCall('/api/auth/session');
          const data = await res.json();

          if (!data.success || !data.user) {
            // Session expired or invalid
            set({
              user: null,
              token: null,
              isAuthenticated: false,
              lastSyncAt: null,
            });
            return;
          }

          const user: UserPublic = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.name,
            role: data.user.role,
            tier: data.user.tier,
            phone: data.user.phone,
            avatarUrl: data.user.avatarUrl,
            permissions: data.user.permissions || [],
            assignedStations: data.user.assignedStations || [],
            token: data.token || token,
          };

          set({
            user,
            token: data.token || token,
            isAuthenticated: true,
            lastSyncAt: new Date().toISOString(),
          });
        } catch {
          // On network error, keep current session (offline tolerance)
          // Only clear session on explicit 401 from server
        }
      },

      setUser: (user: UserPublic) => {
        set({
          user,
          token: user.token || get().token,
          isAuthenticated: true,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      // ─── RBAC ──────────────────────────────────────────────────────────────
      can: (action: ActionType, dataType: DataType, stationId?: string): boolean => {
        const { user } = get();
        if (!user) return false;

        // Founder has global access
        if (user.role === 'founder') return true;

        // Guest can only read station and inventory
        if (user.role === 'guest') {
          return action === 'read' && (dataType === 'station' || dataType === 'inventory');
        }

        // Check explicit permissions
        const permissions = user.permissions || [];

        // Check for a matching permission
        const hasPermission = permissions.some((p) => {
          if (p.action !== action || p.dataType !== dataType) return false;

          const scope: TeamScope = p.teamScope;

          // Global scope: allow if tier is pro or enterprise
          if (scope === 'global') {
            return user.tier === 'pro' || user.tier === 'enterprise';
          }

          // Station scope: check stationId matches and is in assignedStations
          if (scope === 'station') {
            const assignedStations = user.assignedStations || [];
            if (stationId && p.stationId === stationId && assignedStations.includes(stationId)) {
              return true;
            }
            // If no stationId provided, check if user has any matching station permission
            if (!stationId && p.stationId && assignedStations.includes(p.stationId)) {
              return true;
            }
            return false;
          }

          // Personal scope: always allow (owner check happens at API level)
          if (scope === 'personal') {
            return true;
          }

          // Team scope: check team membership
          // For now, allow team scope permissions since team resolution
          // would happen server-side
          if (scope === 'team') {
            return true;
          }

          return false;
        });

        if (hasPermission) return true;

        // Fallback role-based permissions for common actions
        // Owner: full access
        if (user.role === 'owner') return true;

        // Manager: can do most things except manage users and settings
        if (user.role === 'manager') {
          if (dataType === 'user' || dataType === 'settings') {
            return action === 'read';
          }
          return true;
        }

        // Staff: can CRUD sales, inventory, read-only on others
        if (user.role === 'staff') {
          if (dataType === 'sale' || dataType === 'inventory') {
            return ['create', 'read', 'update'].includes(action);
          }
          return action === 'read';
        }

        // Auditor: read-only + export
        if (user.role === 'auditor') {
          return action === 'read' || action === 'export';
        }

        return false;
      },

      hasStationAccess: (stationId: string): boolean => {
        const { user } = get();
        if (!user) return false;

        // Founder and owner have access to all stations
        if (user.role === 'founder' || user.role === 'owner') return true;

        // Check assignedStations
        const assignedStations = user.assignedStations || [];
        return assignedStations.includes(stationId);
      },
    }),
    {
      name: 'fuelpro-auth',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        lastSyncAt: state.lastSyncAt,
      }),
      onRehydrateStorage: () => (state) => {
        // On rehydration, validate the session with the server
        if (state?.isAuthenticated && state?.token) {
          // Defer to next tick to avoid calling during store initialization
          setTimeout(() => {
            useAuthStore.getState().validateSession();
          }, 100);
        }
      },
    }
  )
);
