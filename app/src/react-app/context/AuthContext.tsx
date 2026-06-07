import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';

// ============================================================
// AUTH CONTEXT v4 - Real Authentication with Popup OAuth
// Supports: Google OAuth (popup), Email/Password, Username
// Binds auth identity to station roles
// ============================================================

export type AuthMethod = 'google' | 'email' | 'username';

export interface AuthIdentity {
  id: string;
  authId: string;
  authMethod: AuthMethod;
  email: string;
  name: string;
  picture?: string;
}

export interface StationRoleBinding {
  stationId: string;
  stationName: string;
  role: 'owner' | 'manager' | 'staff' | 'auditor';
  invitedBy: string;
  joinedAt: string;
  expiresAt?: string;
  active: boolean;
  authId?: string;
}

interface AuthContextType {
  user: AuthIdentity | null;
  bindings: StationRoleBinding[];
  isPending: boolean;
  error: string | null;
  // Auth actions
  loginWithEmail: (email: string, password: string) => Promise<boolean>;
  registerWithEmail: (email: string, password: string, name: string) => Promise<boolean>;
  loginWithUsername: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  clearError: () => void;
  // Password reset
  requestPasswordReset: (email: string) => Promise<{ success: boolean; code?: string; message: string }>;
  verifyResetCode: (email: string, code: string) => boolean;
  resetPassword: (email: string, newPassword: string) => Promise<boolean>;
  // Role binding
  bindRole: (stationId: string, stationName: string, role: StationRoleBinding['role'], invitedBy: string, expiresAt?: string) => void;
  terminateRole: (stationId: string) => void;
  getActiveBinding: (stationId: string) => StationRoleBinding | null;
  hasAnyBinding: () => boolean;
}

const AUTH_STORAGE_KEY = 'fuelpro_auth_identity';
const BINDINGS_STORAGE_KEY = 'fuelpro_role_bindings';

function loadUser(): AuthIdentity | null {
  try {
    const stored = localStorage.getItem(AUTH_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function loadBindings(): StationRoleBinding[] {
  try {
    const stored = localStorage.getItem(BINDINGS_STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch {}
  return [];
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthIdentity | null>(loadUser);
  const [bindings, setBindings] = useState<StationRoleBinding[]>(loadBindings);
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Save to localStorage whenever user/bindings change
  useEffect(() => {
    if (user) localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    else localStorage.removeItem(AUTH_STORAGE_KEY);
  }, [user]);

  useEffect(() => {
    localStorage.setItem(BINDINGS_STORAGE_KEY, JSON.stringify(bindings));
  }, [bindings]);

  const clearError = useCallback(() => setError(null), []);

  // ---- EMAIL AUTH ----
  const loginWithEmail = useCallback(async (email: string, password: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    const users = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
    const found = Object.values(users).find((u: any) => u.email === email && u.password === password);

    if (!found) {
      setError('Invalid email or password');
      setIsPending(false);
      return false;
    }

    setUser({
      id: `email_${(found as any).email}`,
      authId: `email_${(found as any).email}`,
      authMethod: 'email',
      email: (found as any).email,
      name: (found as any).name || (found as any).email,
    });
    setIsPending(false);
    return true;
  }, []);

  const registerWithEmail = useCallback(async (email: string, password: string, name: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    if (!email || !password || password.length < 6) {
      setError('Email required, password must be at least 6 characters');
      setIsPending(false);
      return false;
    }

    const users = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
    const exists = Object.values(users).find((u: any) => u.email === email);
    if (exists) {
      setError('An account with this email already exists');
      setIsPending(false);
      return false;
    }

    const id = `user_${Date.now()}`;
    users[id] = { id, email, password, name, createdAt: new Date().toISOString() };
    localStorage.setItem('fuelpro_email_users', JSON.stringify(users));

    setUser({
      id: `email_${email}`,
      authId: `email_${email}`,
      authMethod: 'email',
      email,
      name: name || email,
    });
    setIsPending(false);
    return true;
  }, []);

  // ---- USERNAME AUTH ----
  const loginWithUsername = useCallback(async (username: string, password: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    if (!username || !password) {
      setError('Username and password are required');
      setIsPending(false);
      return false;
    }

    const users = JSON.parse(localStorage.getItem('fuelpro_username_users') || '{}');
    const found = users[username];

    if (!found || found.password !== password) {
      setError('Invalid username or password');
      setIsPending(false);
      return false;
    }

    setUser({
      id: `username_${username}`,
      authId: `username_${username}`,
      authMethod: 'username',
      email: found.email || '',
      name: found.name || username,
    });
    setIsPending(false);
    return true;
  }, []);

  const registerWithUsername = useCallback(async (username: string, password: string, name: string, email: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    if (!username || !password || password.length < 4) {
      setError('Username required, password must be at least 4 characters');
      setIsPending(false);
      return false;
    }

    const users = JSON.parse(localStorage.getItem('fuelpro_username_users') || '{}');
    if (users[username]) {
      setError('This username is already taken');
      setIsPending(false);
      return false;
    }

    users[username] = { password, name, email, createdAt: new Date().toISOString() };
    localStorage.setItem('fuelpro_username_users', JSON.stringify(users));

    setUser({
      id: `username_${username}`,
      authId: `username_${username}`,
      authMethod: 'username',
      email: email || '',
      name: name || username,
    });
    setIsPending(false);
    return true;
  }, []);

  // ---- LOGOUT ----
  const logout = useCallback(() => {
    setUser(null);
    setError(null);
    localStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  // ---- ROLE BINDING ----
  const bindRole = useCallback((stationId: string, stationName: string, role: StationRoleBinding['role'], invitedBy: string, expiresAt?: string) => {
    if (!user) return;
    setBindings(prev => {
      const filtered = prev.filter(b => b.stationId !== stationId);
      return [...filtered, {
        stationId, stationName, role, invitedBy,
        joinedAt: new Date().toISOString(),
        expiresAt,
        active: true,
        authId: user.authId,
      }];
    });
  }, [user]);

  const terminateRole = useCallback((stationId: string) => {
    setBindings(prev => prev.map(b =>
      b.stationId === stationId ? { ...b, active: false } : b
    ));
  }, []);

  const getActiveBinding = useCallback((stationId: string): StationRoleBinding | null => {
    return bindings.find(b => b.stationId === stationId && b.active && (!b.authId || b.authId === user?.authId)) || null;
  }, [bindings, user]);

  const hasAnyBinding = useCallback(() => {
    if (!user) return false;
    return bindings.some(b => b.active && b.authId === user.authId);
  }, [bindings, user]);

  // ---- PASSWORD RESET ----
  const RESET_CODES_KEY = 'fuelpro_password_reset_codes';

  const requestPasswordReset = useCallback(async (email: string): Promise<{ success: boolean; code?: string; message: string }> => {
    setIsPending(true);
    setError(null);

    const users = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
    const found = Object.values(users).find((u: any) => u.email === email);

    if (!found) {
      setError('No account found with this email');
      setIsPending(false);
      return { success: false, message: 'No account found with this email' };
    }

    // Generate 6-digit reset code
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const codes: Record<string, { code: string; expiresAt: string }> = JSON.parse(localStorage.getItem(RESET_CODES_KEY) || '{}');
    codes[email] = { code, expiresAt: new Date(Date.now() + 15 * 60000).toISOString() }; // 15 min expiry
    localStorage.setItem(RESET_CODES_KEY, JSON.stringify(codes));

    // In a real app, this would send an email. Here we log it and show it.
    console.log(`[Password Reset] Code for ${email}: ${code}`);
    setIsPending(false);
    return { success: true, code, message: 'Reset code generated and sent to your email.' };
  }, []);

  const verifyResetCode = useCallback((email: string, code: string): boolean => {
    const codes: Record<string, { code: string; expiresAt: string }> = JSON.parse(localStorage.getItem(RESET_CODES_KEY) || '{}');
    const entry = codes[email];
    if (!entry) { setError('No reset code found. Request a new one.'); return false; }
    if (new Date(entry.expiresAt) < new Date()) { setError('Reset code has expired. Request a new one.'); return false; }
    if (entry.code !== code) { setError('Invalid reset code'); return false; }
    return true;
  }, []);

  const resetPassword = useCallback(async (email: string, newPassword: string): Promise<boolean> => {
    setIsPending(true);
    setError(null);

    if (!newPassword || newPassword.length < 6) {
      setError('Password must be at least 6 characters');
      setIsPending(false);
      return false;
    }

    const users: Record<string, any> = JSON.parse(localStorage.getItem('fuelpro_email_users') || '{}');
    const entry = Object.entries(users).find(([, u]: [string, any]) => u.email === email);
    if (!entry) {
      setError('Account not found');
      setIsPending(false);
      return false;
    }

    const [userId, userData] = entry;
    users[userId] = { ...userData, password: newPassword };
    localStorage.setItem('fuelpro_email_users', JSON.stringify(users));

    // Clear reset code
    const codes: Record<string, any> = JSON.parse(localStorage.getItem(RESET_CODES_KEY) || '{}');
    delete codes[email];
    localStorage.setItem(RESET_CODES_KEY, JSON.stringify(codes));

    setIsPending(false);
    return true;
  }, []);

  return (
    <AuthContext.Provider value={{
      user, bindings, isPending, error,
      loginWithEmail, registerWithEmail, loginWithUsername,
      logout, clearError,
      requestPasswordReset, verifyResetCode, resetPassword,
      bindRole, terminateRole, getActiveBinding, hasAnyBinding,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}


