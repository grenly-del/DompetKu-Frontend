import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { authService, AuthUser } from '../services/auth.service';
import storage from '../services/storage';

type User = AuthUser;

type ProfileUpdateInput = {
  name: string;
  email: string;
  whatsapp?: string | null;
};

type AuthContextType = {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string, whatsapp?: string) => Promise<void>;
  updateProfile: (data: ProfileUpdateInput) => Promise<User>;
  changePassword: (currentPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: () => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => {},
  register: async () => {},
  updateProfile: async () => {
    throw new Error('AuthProvider belum siap');
  },
  changePassword: async () => {},
  deleteAccount: async () => {},
  logout: async () => {},
});

export const useAuth = () => useContext(AuthContext);

function mapApiUser(user: AuthUser): User {
  const whatsapp = user.whatsapp ?? user.phoneNumber ?? user.phone ?? null;

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    whatsapp,
    provider: user.provider,
    createdAt: user.createdAt,
  };
}

function isUnauthorizedError(error: unknown) {
  const status = typeof (error as { status?: unknown })?.status === 'number'
    ? (error as { status: number }).status
    : null;

  return status === 401 || status === 403;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback(async (nextToken: string, nextUser: User) => {
    await storage.setItem('token', nextToken);
    await storage.setItem('user', JSON.stringify(nextUser));
    setToken(nextToken);
    setUser(nextUser);
  }, []);

  const clearSession = useCallback(async () => {
    await storage.multiRemove(['token', 'user']);
    setToken(null);
    setUser(null);
  }, []);

  // Load stored token on app start
  useEffect(() => {
    const loadToken = async () => {
      try {
        const storedToken = await storage.getItem('token');
        if (!storedToken) {
          return;
        }

        try {
          const res = await authService.getCurrentUser();
          const nextUser = mapApiUser(res.user);
          await persistSession(storedToken, nextUser);
        } catch (err) {
          if (isUnauthorizedError(err)) {
            await clearSession();
          } else {
            const storedUser = await storage.getItem('user');
            if (storedUser) {
              console.warn('Auth validation unavailable, using cached session:', err);
              setToken(storedToken);
              setUser(JSON.parse(storedUser));
              return;
            }

            try {
              const profileRes = await authService.getProfile();
              const nextUser = mapApiUser(profileRes.user);
              await persistSession(storedToken, nextUser);
            } catch (profileErr) {
              console.warn('Auth profile fallback unavailable, clearing session:', profileErr);
              await clearSession();
            }
          }
        }
      } catch (err) {
        console.error('Failed to load auth state:', err);
      } finally {
        setIsLoading(false);
      }
    };
    loadToken();
  }, [clearSession, persistSession]);

  const login = useCallback(async (email: string, password: string) => {
    const res = await authService.login(email, password);
    await persistSession(res.token, mapApiUser(res.user));
  }, [persistSession]);

  const register = useCallback(async (username: string, email: string, password: string, whatsapp?: string) => {
    const res = await authService.register(username, email, password, whatsapp);
    await persistSession(res.token, mapApiUser(res.user));
  }, [persistSession]);

  const updateProfile = useCallback(async ({ name, email, whatsapp }: ProfileUpdateInput) => {
    const res = await authService.updateProfile({ name, email, whatsapp });
    const nextUser = {
      ...mapApiUser(res.user),
      username: res.user.username || name,
      email: res.user.email || email,
      whatsapp: res.user.whatsapp ?? res.user.phoneNumber ?? res.user.phone ?? whatsapp ?? null,
    };
    await storage.setItem('user', JSON.stringify(nextUser));
    setUser(nextUser);
    return nextUser;
  }, []);

  const changePassword = useCallback(async (currentPassword: string, newPassword: string) => {
    await authService.changePassword({ currentPassword, newPassword });
  }, []);

  const deleteAccount = useCallback(async () => {
    await authService.deleteAccount();
    await clearSession();
  }, [clearSession]);

  const logout = useCallback(async () => {
    await clearSession();
  }, [clearSession]);

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token,
        isLoading,
        login,
        register,
        updateProfile,
        changePassword,
        deleteAccount,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
