import { createContext, useContext, useEffect, useState } from 'react';

interface DemoUser {
  uid: string;
  email: string;
  displayName: string;
  emailVerified: boolean;
  isAnonymous: boolean;
  contact?: string;
  role?: 'admin' | 'shop';
}

interface AuthContextType {
  user: DemoUser | null;
  isAdmin: boolean;
  userRole: 'admin' | 'shop' | null;
  loading: boolean;
  loginWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'shop',
    contact: string,
    authKey?: string
  ) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const ADMIN_AUTH_KEY = 'LEONE_ADMIN_2026';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<DemoUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [userRole, setUserRole] = useState<'admin' | 'shop' | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const savedUser = localStorage.getItem('vaultstock_user');
    if (savedUser) {
      const parsedUser = JSON.parse(savedUser);
      setUser(parsedUser);
      setUserRole(parsedUser.role || null);
      setIsAdmin(parsedUser.role === 'admin');
    }
    setLoading(false);
  }, []);

  const loginWithEmail = async (email: string, password: string) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 800));

    const users = JSON.parse(localStorage.getItem('vaultstock_users') || '{}');
    
    if (!users[email] || users[email].password !== password) {
      throw new Error('Invalid email or password. Please try again.');
    }

    const userData = users[email];
    const authenticatedUser = {
      uid: userData.uid,
      email: userData.email,
      displayName: userData.displayName,
      emailVerified: true,
      isAnonymous: false,
      contact: userData.contact,
      role: userData.role
    };

    setUser(authenticatedUser);
    setUserRole(userData.role);
    setIsAdmin(userData.role === 'admin');
    localStorage.setItem('vaultstock_user', JSON.stringify(authenticatedUser));
  };

  const registerWithEmail = async (
    email: string,
    password: string,
    displayName: string,
    role: 'admin' | 'shop',
    contact: string,
    authKey?: string
  ) => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1200));

    if (role === 'admin' && authKey !== ADMIN_AUTH_KEY) {
      throw new Error('Invalid Enterprise Authorization Key. Access Denied.');
    }

    const users = JSON.parse(localStorage.getItem('vaultstock_users') || '{}');
    
    if (users[email]) {
      throw new Error('An account with this email already exists. Please sign in.');
    }

    if (password.length < 6) {
      throw new Error('Password must be at least 6 characters.');
    }

    const uid = 'user_' + Math.random().toString(36).substring(2, 15);
    
    const newUser = {
      uid,
      email,
      password,
      displayName,
      contact,
      role,
      createdAt: Date.now()
    };

    users[email] = newUser;
    localStorage.setItem('vaultstock_users', JSON.stringify(users));

    const authenticatedUser = {
      uid,
      email,
      displayName,
      emailVerified: true,
      isAnonymous: false,
      contact,
      role
    };

    setUser(authenticatedUser);
    setUserRole(role);
    setIsAdmin(role === 'admin');
    localStorage.setItem('vaultstock_user', JSON.stringify(authenticatedUser));
  };

  const signOut = async () => {
    await new Promise(resolve => setTimeout(resolve, 300));
    setUser(null);
    setUserRole(null);
    setIsAdmin(false);
    localStorage.removeItem('vaultstock_user');
  };

  return (
    <AuthContext.Provider value={{ user, isAdmin, userRole, loading, loginWithEmail, registerWithEmail, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}