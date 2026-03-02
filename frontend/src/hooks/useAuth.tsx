import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth';
import type { User } from '../types';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const tokens = localStorage.getItem('tokens');
    if (tokens) {
      authApi.me()
        .then(setUser)
        .catch(() => localStorage.removeItem('tokens'))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const tokens = await authApi.login(username, password);
    localStorage.setItem('tokens', JSON.stringify(tokens));
    const me = await authApi.me();
    setUser(me);
    navigate('/');
  };

  const register = async (username: string, email: string, password: string) => {
    await authApi.register(username, email, password);
    await login(username, password);
  };

  const logout = () => {
    localStorage.removeItem('tokens');
    setUser(null);
    navigate('/login');
  };

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
