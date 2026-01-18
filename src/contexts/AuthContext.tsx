import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export interface Brand {
  id: string;
  name: string;
  client: string;
  notionDbId: string;
  metaAdAccountId: string;
  instagramAccountId: string;
}

export interface User {
  id: string;
  email: string;
  name: string;
  igUserId?: string;
  igUserNickName?: string;
  metaAccessToken?: string;
  brand?: Brand;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 로컬 스토리지에서 세션 복원
    const savedUser = localStorage.getItem('macha_user');
    if (savedUser) {
      try {
        setUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem('macha_user');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<boolean> => {
    try {
      const response = await fetch('https://matcha.pnutbutter.kr/api/v1/dash-members/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: email, password }),
      });

      const data = await response.json();

      if (data.responseCode === 200 && data.result?.length > 0) {
        const apiUser = data.result[0];
        const user: User = {
          id: apiUser.id,
          email: apiUser.userId,
          name: apiUser.userId,
          igUserId: apiUser.igUserId,
          igUserNickName: apiUser.igUserNickName,
          metaAccessToken: apiUser.metaAccessToken,
        };
        setUser(user);
        localStorage.setItem('macha_user', JSON.stringify(user));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login failed:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('macha_user');
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        login,
        logout,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
