/**
 * GemGym — Authentication Context
 *
 * Provides the authenticated user session to the entire React tree.
 * Auth state is persisted in memory; on app reload we re-validate with Rust.
 */

import React, { createContext, useContext, useReducer, useCallback } from "react";
import type { AuthSession, LoginCredentials } from "@/types";
import { tauriInvoke, Commands } from "@/lib/tauri";
import { queryClient } from "@/lib/query-client";

/* ── State Shape ── */

interface AuthState {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
}

type AuthAction =
  | { type: "SET_LOADING" }
  | { type: "SET_SESSION"; payload: AuthSession }
  | { type: "CLEAR_SESSION" }
  | { type: "SET_ERROR"; payload: string };

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case "SET_LOADING":  return { ...state, isLoading: true, error: null };
    case "SET_SESSION":  return { session: action.payload, isLoading: false, error: null };
    case "CLEAR_SESSION":return { session: null, isLoading: false, error: null };
    case "SET_ERROR":    return { ...state, isLoading: false, error: action.payload };
    default:             return state;
  }
}

/* ── Context ── */

interface AuthContextValue {
  session: AuthSession | null;
  isLoading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

/* ── Provider ── */

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, {
    session: null,
    isLoading: true,
    error: null,
  });

  // Restore session on mount
  const restoreSession = useCallback(async () => {
    dispatch({ type: "SET_LOADING" });
    try {
      const session = await tauriInvoke<AuthSession | null>(Commands.AUTH_GET_SESSION);
      if (session) {
        dispatch({ type: "SET_SESSION", payload: session });
      } else {
        dispatch({ type: "CLEAR_SESSION" });
      }
    } catch {
      dispatch({ type: "CLEAR_SESSION" });
    }
  }, []);

  React.useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  const login = useCallback(async (credentials: LoginCredentials) => {
    dispatch({ type: "SET_LOADING" });
    try {
      const session = await tauriInvoke<AuthSession>(Commands.AUTH_LOGIN, { credentials });
      dispatch({ type: "SET_SESSION", payload: session });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      dispatch({ type: "SET_ERROR", payload: msg });
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await tauriInvoke<void>(Commands.AUTH_LOGOUT);
    } finally {
      // Clear all cached queries on logout
      queryClient.clear();
      dispatch({ type: "CLEAR_SESSION" });
    }
  }, []);

  const clearError = useCallback(() => {
    dispatch({ type: "SET_ERROR", payload: "" });
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session: state.session,
        isLoading: state.isLoading,
        error: state.error,
        isAuthenticated: state.session !== null,
        login,
        logout,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

/* ── Hook ── */

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used inside <AuthProvider>");
  }
  return ctx;
}
