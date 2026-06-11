/**
 * useFounderAuth — React hook for Founder Access authentication.
 * Connects to backend tRPC founderAuth router for secure login/session management.
 * Token is automatically included in all tRPC requests via TRPCProvider headers.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { trpc } from "@/providers/trpc";

const SESSION_KEY = "fuelpro_founder_session";

interface FounderSession {
  username: string;
  loginTime: number;
  active: boolean;
  token: string;
}

export function useFounderAuth() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [error, setError] = useState("");

  const loginMutation = trpc.founderAuth.login.useMutation();
  const logoutMutation = trpc.founderAuth.logout.useMutation();
  const utils = trpc.useUtils();

  // Check session on mount
  useEffect(() => {
    checkSession();
  }, []);

  const checkSession = useCallback(() => {
    try {
      const raw = localStorage.getItem(SESSION_KEY);
      if (!raw) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      const session: FounderSession = JSON.parse(raw);
      const isValid =
        session.active &&
        session.token &&
        session.loginTime &&
        Date.now() - session.loginTime < 8 * 60 * 60 * 1000;

      if (isValid) {
        setIsAuthenticated(true);
        setUsername(session.username);
      } else {
        // Clear expired session
        localStorage.removeItem(SESSION_KEY);
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
    setIsLoading(false);
  }, []);

  /** Login via tRPC — token is stored and sent with all subsequent requests */
  const login = useCallback(
    async (user: string, pw: string): Promise<boolean> => {
      setError("");
      try {
        const result = await loginMutation.mutateAsync({
          username: user,
          password: pw,
        });
        if (result.success && result.token) {
          const session: FounderSession = {
            username: result.username || user,
            loginTime: Date.now(),
            active: true,
            token: result.token,
          };
          localStorage.setItem(SESSION_KEY, JSON.stringify(session));
          setIsAuthenticated(true);
          setUsername(session.username);
          // Invalidate all queries so they run with the new auth token
          utils.invalidate();
          return true;
        } else {
          setError(result.error || "Login failed");
          return false;
        }
      } catch (e: any) {
        setError(e?.message || "Network error. Please try again.");
        return false;
      }
    },
    [loginMutation, utils]
  );

  /** Logout — clears local session and notifies backend */
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch {
      /* backend logout can fail silently */
    }
    localStorage.removeItem(SESSION_KEY);
    setIsAuthenticated(false);
    setUsername("");
    setError("");
    // Refresh page to clear all cached queries
    window.location.reload();
  }, [logoutMutation]);

  /** Change founder password */
  const changePassword = useCallback(
    async (
      currentPw: string,
      newPw: string
    ): Promise<{ success: boolean; error?: string }> => {
      // Use the tRPC mutation for password change
      try {
        const result = await trpc.founderAuth.changePassword
          .useMutation()
          .mutateAsync({
            currentPassword: currentPw,
            newPassword: newPw,
          });
        return result;
      } catch (e: any) {
        return {
          success: false,
          error: e?.message || "Failed to change password",
        };
      }
    },
    []
  );

  return {
    isAuthenticated,
    isLoading,
    username,
    error,
    login,
    logout,
    changePassword,
    checkSession,
  };
}
