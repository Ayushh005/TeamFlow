import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Shield,
  LogOut,
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  ChevronDown,
  Building2,
  Lock,
  UserCheck,
} from 'lucide-react';
import { TeamMembersModal } from '../components/TeamMembersModal';

export const DashboardPage: React.FC = () => {
  const { user, activeWorkspace, activeRole, logout, switchWorkspace } = useAuth();
  const [workspaceMenuOpen, setWorkspaceMenuOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'OWNER':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
            Owner
          </span>
        );
      case 'ADMIN':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
            Admin
          </span>
        );
      case 'MEMBER':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
            Member
          </span>
        );
      case 'VIEWER':
        return (
          <span className="px-2.5 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
            Viewer
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      {/* Top Navigation Bar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            {/* Logo and Workspace Selector */}
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-sm">
                  <Shield className="w-5 h-5" />
                </div>
                <span className="text-lg font-bold tracking-tight text-slate-900">
                  TeamFlow
                </span>
              </div>

              {/* Workspace Switcher */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setWorkspaceMenuOpen(!workspaceMenuOpen)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-sm font-medium text-slate-700 transition-colors"
                >
                  <Building2 className="w-4 h-4 text-slate-400" />
                  <span className="max-w-[140px] sm:max-w-[200px] truncate">
                    {activeWorkspace?.name || 'Select Workspace'}
                  </span>
                  <ChevronDown className="w-4 h-4 text-slate-400" />
                </button>

                {workspaceMenuOpen && (
                  <div className="absolute left-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Your Workspaces
                    </div>
                    {user?.memberships.map((m) => (
                      <button
                        key={m.workspace.id}
                        onClick={() => {
                          switchWorkspace(m.workspace.id);
                          setWorkspaceMenuOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 text-sm flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          activeWorkspace?.id === m.workspace.id ? 'bg-blue-50 text-blue-700 font-medium' : 'text-slate-700'
                        }`}
                      >
                        <span className="truncate">{m.workspace.name}</span>
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {m.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* User Profile & Actions */}
            <div className="flex items-center gap-3">
              {getRoleBadge(activeRole)}

              <div className="hidden sm:flex items-center gap-2 pl-2 border-l border-slate-200">
                <img
                  src={
                    user?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=2563eb&color=fff`
                  }
                  alt={user?.displayName}
                  className="w-8 h-8 rounded-full border border-slate-200 object-cover"
                />
                <div className="text-left">
                  <div className="text-xs font-semibold text-slate-800 leading-tight">
                    {user?.displayName}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate max-w-[120px]">
                    {user?.email}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={logout}
                title="Logout"
                className="p-2 rounded-xl text-slate-500 hover:text-red-600 hover:bg-red-50 border border-transparent hover:border-red-100 transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Workspace Dashboard
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Welcome back, {user?.displayName}! You are currently authenticated as{' '}
                <strong className="text-slate-700">{activeRole}</strong> in{' '}
                <strong className="text-slate-700">{activeWorkspace?.name}</strong>.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setTeamModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 transition-colors shadow-sm bg-white"
              >
                <Users className="w-3.5 h-3.5 text-slate-500" />
                <span>Manage Team</span>
              </button>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200 text-xs font-semibold text-green-700">
                <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                Live Session Active
              </span>
            </div>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Projects
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">2 Active</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
              <FolderKanban className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Tasks Assigned
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">3 Tasks</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <CheckSquare className="w-5 h-5" />
            </div>
          </div>

          <div
            onClick={() => setTeamModalOpen(true)}
            className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between cursor-pointer hover:border-slate-300 transition-all group"
          >
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider group-hover:text-blue-600 transition-colors">
                Team Members
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">4 Members</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center group-hover:scale-105 transition-transform">
              <Users className="w-5 h-5" />
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Audit Trail
              </p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1">100% Isolated</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <Activity className="w-5 h-5" />
            </div>
          </div>
        </div>

        {/* Security & RBAC Status Banner */}
        <div className="bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 border border-blue-100 rounded-2xl p-6 mb-8">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0 shadow-sm shadow-blue-500/20">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Tenant Isolation & RBAC Active</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-600 text-white">
                  Zero IDOR
                </span>
              </h4>
              <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                All requests from this session are securely signed with JWT and HttpOnly rotating refresh cookies.
                Resource queries are strictly scoped to workspace ID:{' '}
                <code className="px-1.5 py-0.5 rounded bg-white/80 border border-blue-200 text-blue-800 font-mono text-[11px]">
                  {activeWorkspace?.id}
                </code>
              </p>
            </div>
          </div>
        </div>

        {/* Projects Section */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
            <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
              <FolderKanban className="w-4 h-4 text-slate-500" />
              <span>Workspace Projects</span>
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-semibold text-slate-900">
                  Mobile App Redesign
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Revamping navigation, offline caching, and real-time sync for iOS & Android.
              </p>
            </div>

            <div className="p-4 rounded-lg border border-slate-200 bg-white hover:border-slate-300 transition-colors">
              <div className="flex items-center justify-between mb-1.5">
                <h4 className="text-sm font-semibold text-slate-900">
                  Platform Core & Auth
                </h4>
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                  Active
                </span>
              </div>
              <p className="text-xs text-slate-500">
                RBAC authorization guards, tenant isolation, and session rotation.
              </p>
            </div>
          </div>
        </div>

        {/* Team Members Management Modal */}
        <TeamMembersModal
          isOpen={teamModalOpen}
          onClose={() => setTeamModalOpen(false)}
          workspaceId={activeWorkspace?.id || ''}
          workspaceName={activeWorkspace?.name || ''}
          currentUserRole={activeRole}
        />
      </main>
    </div>
  );
};
