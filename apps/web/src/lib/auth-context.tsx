'use client';

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { SafeUser } from '@ecommerce/types';
import { apiFetch, fetchCsrfToken, clearCsrfToken } from '@/lib/csrf';

interface AuthContextType {
  user: SafeUser | null;
  isLoading: boolean;
  isAdmin: boolean;
  mfaEnabled: boolean;
  login: (userData: SafeUser) => void;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

/**
 * SECURITY FIX: accessToken ya no se almacena en localStorage.
 * Ahora es una cookie httpOnly (no accesible por JavaScript), lo que previene XSS.
 * El navegador envía automáticamente la cookie con cada request a /api/* (mismo dominio).
 */
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<SafeUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      // Cookie httpOnly se envía automáticamente; no necesitamos Authorization header
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const json = await res.json();
      if (json.success && json.data) {
        setUser(json.data);
        try {
          await fetchCsrfToken();
        } catch {
          // CSRF se obtendrá en la primera mutación
        }
      } else {
        setUser(null);
        clearCsrfToken();
      }
    } catch {
      setUser(null);
      clearCsrfToken();
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = useCallback((userData: SafeUser) => {
    // No almacenar token en localStorage; la cookie httpOnly lo maneja el navegador
    setUser(userData);
  }, []);

  const logout = useCallback(async () => {
    try {
      await apiFetch('/api/auth/logout', { method: 'POST' });
    } catch {
      // Ignorar errores de red
    } finally {
      clearCsrfToken();
      setUser(null);
    }
  }, []);

  const isAdmin = user?.role === 'ADMIN';
  const mfaEnabled = user?.mfaEnabled ?? false;

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAdmin,
        mfaEnabled,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth debe usarse dentro de un AuthProvider');
  }
  return context;
}
