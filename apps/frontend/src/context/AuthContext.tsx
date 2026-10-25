import React, { createContext, useContext, useState, useEffect } from 'react';
import { api, setAccessToken, getAccessToken } from '../api/client';

export interface WorkspaceMembership {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  workspace: {
    id: string;
    name: string;
    slug: string;
    createdAt: string;
  };
}

export interface User {
  id: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  memberships: WorkspaceMembership[];
}

interface AuthContextType {
  user: User | null;
  activeWorkspace: WorkspaceMembership['workspace'] | null;
  activeRole: WorkspaceMembership['role'] | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [activeWorkspace, setActiveWorkspace] = useState<WorkspaceMembership['workspace'] | null>(null);
  const [activeRole, setActiveRole] = useState<WorkspaceMembership['role'] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get('/auth/me');
      const userData: User = response.data.data;
      setUser(userData);

      if (userData.memberships && userData.memberships.length > 0) {
        // Keep current selected if valid, else pick first
        const savedWsId = localStorage.getItem('teamflow_active_workspace_id');
        const found = userData.memberships.find((m) => m.workspace.id === savedWsId);
        const selected = found || userData.memberships[0];

        setActiveWorkspace(selected.workspace);
        setActiveRole(selected.role);
        localStorage.setItem('teamflow_active_workspace_id', selected.workspace.id);
      }
    } catch {
      setUser(null);
      setActiveWorkspace(null);
      setActiveRole(null);
      setAccessToken(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = getAccessToken();
    if (token) {
      fetchCurrentUser();
    } else {
      // Try refresh cookie once on app startup
      api
        .post('/auth/refresh', {})
        .then((res) => {
          setAccessToken(res.data.data.accessToken);
          return fetchCurrentUser();
        })
        .catch(() => {
          setLoading(false);
        });
    }

    const handleUnauthorized = () => {
      setUser(null);
      setActiveWorkspace(null);
      setActiveRole(null);
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await api.post('/auth/login', { email, password });
    const { accessToken, user: authUser } = res.data.data;
    setAccessToken(accessToken);
    await fetchCurrentUser();
  };

  const register = async (email: string, password: string, displayName: string) => {
    const res = await api.post('/auth/register', { email, password, displayName });
    const { accessToken } = res.data.data;
    setAccessToken(accessToken);
    await fetchCurrentUser();
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      setAccessToken(null);
      setUser(null);
      setActiveWorkspace(null);
      setActiveRole(null);
      localStorage.removeItem('teamflow_active_workspace_id');
    }
  };

  const switchWorkspace = (workspaceId: string) => {
    if (!user) return;
    const target = user.memberships.find((m) => m.workspace.id === workspaceId);
    if (target) {
      setActiveWorkspace(target.workspace);
      setActiveRole(target.role);
      localStorage.setItem('teamflow_active_workspace_id', target.workspace.id);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        activeWorkspace,
        activeRole,
        loading,
        login,
        register,
        logout,
        switchWorkspace,
        refreshUser: fetchCurrentUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
