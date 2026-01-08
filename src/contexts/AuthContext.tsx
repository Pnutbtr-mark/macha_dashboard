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
  brand: Brand;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 더미 사용자 데이터 (나중에 AWS API로 교체)
const DUMMY_USERS: Record<string, { password: string; user: User }> = {
  'sweatlife@test.com': {
    password: '1234',
    user: {
      id: 'user_001',
      email: 'sweatlife@test.com',
      name: '스웻이프 관리자',
      brand: {
        id: 'brand_001',
        name: '스웻이프',
        client: '스웻이프',
        notionDbId: '94d490dd8b654351a6ebeb32a965134f',
        metaAdAccountId: 'act_123456789',
        instagramAccountId: '17841400000000000',
      },
    },
  },
  'brandB@test.com': {
    password: '1234',
    user: {
      id: 'user_002',
      email: 'brandB@test.com',
      name: '브랜드B 관리자',
      brand: {
        id: 'brand_002',
        name: '브랜드B',
        client: '브랜드B 주식회사',
        notionDbId: 'another_notion_db_id',
        metaAdAccountId: 'act_987654321',
        instagramAccountId: '17841400000000001',
      },
    },
  },
};

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
    // TODO: AWS API로 교체
    // const response = await fetch('https://your-aws-api.com/auth/login', {
    //   method: 'POST',
    //   headers: { 'Content-Type': 'application/json' },
    //   body: JSON.stringify({ email, password }),
    // });
    // const data = await response.json();

    // 더미 로그인 로직
    const userData = DUMMY_USERS[email];
    if (userData && userData.password === password) {
      setUser(userData.user);
      localStorage.setItem('macha_user', JSON.stringify(userData.user));
      return true;
    }
    return false;
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
