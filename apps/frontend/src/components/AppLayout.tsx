import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import {
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  LogOut,
  Menu,
  X,
  Search,
  ChevronDown,
  ChevronUp,
  Check,
  Plus,
  Layers,
  Lock,
  User,
  Settings,
  Bell,
} from 'lucide-react';
import { TeamMembersModal } from './TeamMembersModal';

interface AppLayoutProps {
  children: React.ReactNode;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ children }) => {
  const { user, activeWorkspace, activeRole, logout, switchWorkspace, refreshUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [orgDropdownOpen, setOrgDropdownOpen] = useState(false);
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [globalSearch, setGlobalSearch] = useState('');
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [changePasswordModalOpen, setChangePasswordModalOpen] = useState(false);
  const [createWorkspaceModalOpen, setCreateWorkspaceModalOpen] = useState(false);

  // Projects state
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [createProjectModalOpen, setCreateProjectModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creatingProject, setCreatingProject] = useState(false);
  const [createProjectError, setCreateProjectError] = useState('');

  // Change password form state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Create workspace form state
  const [newWorkspaceName, setNewWorkspaceName] = useState('');
  const [creatingWorkspace, setCreatingWorkspace] = useState(false);
  const [createWorkspaceError, setCreateWorkspaceError] = useState('');

  const profileDropdownRef = useRef<HTMLDivElement>(null);
  const orgDropdownRef = useRef<HTMLDivElement>(null);

  const navItems = [
    { label: 'All Tasks', path: '/tasks', icon: CheckSquare },
    { label: 'Projects', path: '/projects', icon: FolderKanban },
    { label: 'Team Members', path: '#team', icon: Users, isButton: true },
    { label: 'Activity Log', path: '/activity', icon: Activity },
  ];

  const getWorkspaceInitial = (name?: string) => {
    return name ? name.charAt(0).toUpperCase() : 'W';
  };

  const getProjectKey = (name: string) => {
    const words = name.trim().split(/\s+/);
    if (words.length >= 2) {
      const letters = words.map((w) => w[0]).join('').toUpperCase();
      if (letters.length >= 2 && letters.length <= 5) return letters;
    }
    return name.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase() || 'PROJ';
  };

  const fetchProjects = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/projects`);
      setProjects(res.data.data || []);
    } catch (err) {
      console.error('Failed to load projects', err);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    const handleProjectCreated = () => {
      fetchProjects();
    };
    window.addEventListener('project-created', handleProjectCreated);
    return () => window.removeEventListener('project-created', handleProjectCreated);
  }, [activeWorkspace?.id]);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileDropdownOpen(false);
      }
      if (orgDropdownRef.current && !orgDropdownRef.current.contains(e.target as Node)) {
        setOrgDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleChangePassword = async () => {
    setPasswordError('');
    setPasswordSuccess('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All fields are required');
      return;
    }
    if (newPassword.length < 8) {
      setPasswordError('New password must be at least 8 characters');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('New passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await api.post('/auth/change-password', { currentPassword, newPassword });
      setPasswordSuccess('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        setChangePasswordModalOpen(false);
        setPasswordSuccess('');
      }, 1500);
    } catch (err: any) {
      setPasswordError(err.response?.data?.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleCreateWorkspace = async () => {
    setCreateWorkspaceError('');
    if (!newWorkspaceName.trim()) {
      setCreateWorkspaceError('Workspace name is required');
      return;
    }
    try {
      setCreatingWorkspace(true);
      const res = await api.post('/workspaces', { name: newWorkspaceName.trim() });
      const newWs = res.data.data;
      await refreshUser();
      switchWorkspace(newWs.id);
      setNewWorkspaceName('');
      setCreateWorkspaceModalOpen(false);
      navigate('/tasks');
    } catch (err: any) {
      setCreateWorkspaceError(err.response?.data?.message || 'Failed to create workspace');
    } finally {
      setCreatingWorkspace(false);
    }
  };

  const handleCreateProject = async () => {
    setCreateProjectError('');
    if (!newProjectName.trim()) {
      setCreateProjectError('Project name is required');
      return;
    }
    if (!activeWorkspace?.id) {
      setCreateProjectError('No active workspace selected');
      return;
    }
    try {
      setCreatingProject(true);
      const res = await api.post(`/workspaces/${activeWorkspace.id}/projects`, {
        name: newProjectName.trim(),
        description: newProjectDesc.trim() || undefined,
      });
      const created = res.data.data;
      await fetchProjects();
      window.dispatchEvent(new CustomEvent('project-created', { detail: created }));
      setNewProjectName('');
      setNewProjectDesc('');
      setCreateProjectModalOpen(false);
      navigate(`/tasks?project=${encodeURIComponent(created.name)}`);
    } catch (err: any) {
      setCreateProjectError(err.response?.data?.message || 'Failed to create project');
    } finally {
      setCreatingProject(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          onClick={() => setSidebarOpen(false)}
          className="fixed inset-0 bg-slate-900/40 z-40 lg:hidden backdrop-blur-xs"
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-white border-r border-slate-200 flex flex-col justify-between transition-transform duration-200 ease-in-out lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
      >
        <div className="flex flex-col flex-1 min-h-0">
          {/* Workspace Switcher / Organization Section */}
          <div className="p-3 border-b border-slate-100 relative" ref={orgDropdownRef}>
            <button
              onClick={() => setOrgDropdownOpen(!orgDropdownOpen)}
              className="w-full p-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 flex items-center justify-between transition-all text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-indigo-600 text-white font-bold text-sm flex items-center justify-center shrink-0 shadow-sm">
                  {getWorkspaceInitial(activeWorkspace?.name)}
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                    ORGANIZATION
                  </div>
                  <div className="text-xs font-semibold text-slate-900 truncate max-w-[130px]">
                    {activeWorkspace?.name || 'Workspace'}
                  </div>
                </div>
              </div>
              {orgDropdownOpen ? (
                <ChevronUp className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
              ) : (
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-600 shrink-0 ml-1" />
              )}
            </button>

            {/* Organization Dropdown */}
            {orgDropdownOpen && (
              <div className="absolute left-3 right-3 top-full mt-1 bg-white rounded-xl shadow-lg border border-slate-200 py-2 z-50"
                style={{ animation: 'fadeIn 0.15s ease-out' }}
              >
                <div className="px-3 py-1.5 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                  Organizations
                </div>
                {user?.memberships.map((m) => (
                  <button
                    key={m.workspace.id}
                    onClick={() => {
                      switchWorkspace(m.workspace.id);
                      setOrgDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 transition-colors ${activeWorkspace?.id === m.workspace.id
                        ? 'bg-slate-50'
                        : ''
                      }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      {getWorkspaceInitial(m.workspace.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800 truncate">{m.workspace.name}</div>
                      <div className="text-[10px] text-slate-400">{m.role}</div>
                    </div>
                    {activeWorkspace?.id === m.workspace.id && (
                      <Check className="w-4 h-4 text-green-500 shrink-0" />
                    )}
                  </button>
                ))}
                <div className="border-t border-slate-100 mt-1 pt-1">
                  <button
                    onClick={() => {
                      setOrgDropdownOpen(false);
                      setCreateWorkspaceModalOpen(true);
                    }}
                    className="w-full text-left px-3 py-2 text-xs flex items-center gap-2.5 hover:bg-slate-50 transition-colors text-slate-600"
                  >
                    <div className="w-8 h-8 rounded-lg border-2 border-dashed border-slate-300 flex items-center justify-center">
                      <Plus className="w-4 h-4 text-slate-400" />
                    </div>
                    <span className="font-medium">Create organization</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Current Workspace Info */}
          <div className="px-4 pt-4 pb-2">
            <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider mb-0.5">
              CURRENT WORKSPACE
            </div>
            <div className="text-sm font-bold text-slate-900">{activeWorkspace?.name || 'Workspace'}</div>
            <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
              <Settings className="w-3 h-3" />
              Role: {activeRole}
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="px-3 pt-2 space-y-0.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              if (item.isButton) {
                return (
                  <button
                    key={item.label}
                    onClick={() => {
                      setSidebarOpen(false);
                      setTeamModalOpen(true);
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left"
                  >
                    <Icon className="w-[18px] h-[18px] text-slate-400" />
                    <span>{item.label}</span>
                  </button>
                );
              }
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  onClick={() => setSidebarOpen(false)}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${isActive
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                >
                  <Icon className={`w-[18px] h-[18px] ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}

            {/* Projects Section */}
            <div className="pt-4 pb-2 border-t border-slate-100 mt-3">
              <div className="flex items-center justify-between px-2 mb-1.5">
                <Link
                  to="/projects"
                  onClick={() => setSidebarOpen(false)}
                  className="text-[11px] font-bold text-slate-400 hover:text-slate-700 tracking-wider uppercase transition-colors"
                >
                  PROJECTS
                </Link>
                {activeRole !== 'VIEWER' && (
                  <button
                    onClick={() => setCreateProjectModalOpen(true)}
                    title="Create project"
                    className="w-5 h-5 rounded hover:bg-slate-100 flex items-center justify-center text-slate-400 hover:text-slate-700 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="space-y-0.5">
                {projects.map((proj) => {
                  const searchParams = new URLSearchParams(location.search);
                  const currentProjectParam = searchParams.get('project');
                  const currentProjectIdParam = searchParams.get('projectId');
                  const isProjActive =
                    location.pathname === '/tasks' &&
                    ((currentProjectParam && currentProjectParam.toLowerCase() === proj.name.toLowerCase()) ||
                     (currentProjectIdParam && currentProjectIdParam === proj.id));
                  return (
                    <button
                      key={proj.id}
                      onClick={() => {
                        setSidebarOpen(false);
                        navigate(`/tasks?project=${encodeURIComponent(proj.name)}`);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-medium transition-colors text-left group ${
                        isProjActive
                          ? 'bg-slate-100 text-slate-900 font-semibold'
                          : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${
                            isProjActive ? 'bg-indigo-600' : 'bg-slate-300 group-hover:bg-indigo-500'
                          }`}
                        />
                        <span className="truncate">{proj.name}</span>
                      </div>
                    </button>
                  );
                })}

                {projects.length === 0 && (
                  <div className="px-2 py-1.5 text-xs text-slate-400">
                    No projects yet.{' '}
                    {activeRole !== 'VIEWER' && (
                      <button
                        onClick={() => setCreateProjectModalOpen(true)}
                        className="text-indigo-600 hover:underline font-medium"
                      >
                        Create one
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </nav>
        </div>

        {/* User Profile Footer - Bottom Left */}
        <div className="p-3 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <img
              src={
                user?.avatarUrl ||
                `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=6366f1&color=fff`
              }
              alt={user?.displayName}
              className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0"
            />
            <div className="min-w-0">
              <div className="text-xs font-semibold text-slate-900 truncate">
                {user?.displayName}
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[110px]">
                {user?.email}
              </div>
            </div>
          </div>
          <button
            onClick={logout}
            title="Log out"
            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 lg:pl-64">
        {/* Top Header */}
        <header className="h-14 bg-white border-b border-slate-200 sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 lg:hidden"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Logo in Top Bar */}
            <Link to="/" className="flex items-center gap-2 mr-4">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
                <Layers className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold tracking-tight text-slate-900 hidden sm:inline">
                TeamFlow
              </span>
            </Link>

            {/* Workspace Badge in Top Bar */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-xs font-semibold text-slate-700 truncate max-w-[180px]">
                {activeWorkspace?.name}
              </span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-700 font-semibold uppercase">
                {activeRole}
              </span>
            </div>

            {/* Global Search Bar */}
            <div className="relative w-48 sm:w-64 lg:w-80 hidden sm:block">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && globalSearch.trim()) {
                    navigate(`/tasks?search=${encodeURIComponent(globalSearch.trim())}`);
                  }
                }}
                placeholder="Search tasks, projects..."
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white transition-all"
              />
            </div>
          </div>

          {/* Right side: Notification Icon & Profile Avatar */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => navigate('/activity')}
              title="Activity Feed & Notifications"
              className="relative p-2 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-indigo-600 ring-2 ring-white" />
            </button>

            {/* Profile Dropdown */}
            <div className="relative" ref={profileDropdownRef}>
              <button
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="w-9 h-9 rounded-full overflow-hidden border-2 border-slate-200 hover:border-indigo-400 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1"
              >
                <img
                  src={
                    user?.avatarUrl ||
                    `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.displayName || 'User')}&background=6366f1&color=fff&bold=true`
                  }
                  alt={user?.displayName}
                  className="w-full h-full object-cover"
                />
              </button>

              {profileDropdownOpen && (
                <div
                  className="absolute right-0 top-full mt-2 w-56 bg-white rounded-xl shadow-lg border border-slate-200 py-1.5 z-50"
                  style={{ animation: 'fadeIn 0.15s ease-out' }}
                >
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-slate-100">
                    <div className="text-sm font-semibold text-slate-900">{user?.displayName}</div>
                    <div className="text-xs text-slate-400 truncate">{user?.email}</div>
                  </div>

                  {/* Change Password */}
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      setChangePasswordModalOpen(true);
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 hover:bg-slate-50 transition-colors text-slate-700"
                  >
                    <Lock className="w-4 h-4 text-slate-400" />
                    <span>Change Password</span>
                  </button>

                  {/* Logout */}
                  <button
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-4 py-2.5 text-xs flex items-center gap-3 hover:bg-red-50 transition-colors text-red-600"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Log Out</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page Content Body */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
          {children}
        </main>
      </div>

      {/* Global Team Members Modal */}
      <TeamMembersModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        workspaceId={activeWorkspace?.id || ''}
        workspaceName={activeWorkspace?.name || ''}
        currentUserRole={activeRole}
      />

      {/* Change Password Modal */}
      {changePasswordModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setChangePasswordModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Change Password</h3>
              <button
                onClick={() => setChangePasswordModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Current Password</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Enter current password"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">New Password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Min 8 characters"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Confirm New Password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Re-enter new password"
                />
              </div>

              {passwordError && (
                <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{passwordError}</div>
              )}
              {passwordSuccess && (
                <div className="text-xs text-green-600 bg-green-50 px-3 py-2 rounded-lg">{passwordSuccess}</div>
              )}

              <button
                onClick={handleChangePassword}
                disabled={changingPassword}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {changingPassword ? 'Changing...' : 'Change Password'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Workspace Modal */}
      {createWorkspaceModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setCreateWorkspaceModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-slate-900">Create Organization</h3>
              <button
                onClick={() => setCreateWorkspaceModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Organization Name</label>
                <input
                  type="text"
                  value={newWorkspaceName}
                  onChange={(e) => setNewWorkspaceName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateWorkspace();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Acme Engineering"
                  autoFocus
                />
              </div>

              {createWorkspaceError && (
                <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">{createWorkspaceError}</div>
              )}

              <button
                onClick={handleCreateWorkspace}
                disabled={creatingWorkspace}
                className="w-full py-2.5 rounded-lg bg-indigo-600 text-white text-sm font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {creatingWorkspace ? 'Creating...' : 'Create Organization'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Project Modal */}
      {createProjectModalOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[60] flex items-center justify-center p-4"
          onClick={() => setCreateProjectModalOpen(false)}
        >
          <div
            className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Create New Project</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Add a project to organize tasks in {activeWorkspace?.name || 'this workspace'}
                </p>
              </div>
              <button
                onClick={() => setCreateProjectModalOpen(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Project Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreateProject();
                  }}
                  className="w-full px-3 py-2.5 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="e.g. Core Platform & API"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Description (Optional)
                </label>
                <textarea
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Brief overview of project goals..."
                />
              </div>

              {createProjectError && (
                <div className="text-xs text-red-600 bg-red-50 px-3 py-2 rounded-lg">
                  {createProjectError}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setCreateProjectModalOpen(false)}
                  className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateProject}
                  disabled={creatingProject || !newProjectName.trim()}
                  className="px-4 py-2 rounded-lg bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                >
                  {creatingProject ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
};
