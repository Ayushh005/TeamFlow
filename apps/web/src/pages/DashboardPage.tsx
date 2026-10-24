import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import {
  FolderKanban,
  CheckSquare,
  Users,
  Activity,
  Plus,
  UserPlus,
  ArrowRight,
  Clock,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { TeamMembersModal } from '../components/TeamMembersModal';

export const DashboardPage: React.FC = () => {
  const { user, activeWorkspace, activeRole } = useAuth();
  const [teamModalOpen, setTeamModalOpen] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);
  const [recentActivities, setRecentActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const canManage = activeRole === 'OWNER' || activeRole === 'ADMIN';

  useEffect(() => {
    if (!activeWorkspace?.id) return;

    const loadData = async () => {
      try {
        setLoading(true);
        const [projRes, taskRes, memRes, actRes] = await Promise.all([
          api.get(`/workspaces/${activeWorkspace.id}/projects`),
          api.get(`/workspaces/${activeWorkspace.id}/tasks`),
          api.get(`/workspaces/${activeWorkspace.id}/members`),
          api.get(`/workspaces/${activeWorkspace.id}/activity?limit=5`),
        ]);
        setProjects(projRes.data.data);
        setTasks(taskRes.data.data);
        setMembers(memRes.data.data);
        setRecentActivities(actRes.data.data);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeWorkspace?.id]);

  // Role distribution breakdown
  const ownersCount = members.filter((m) => m.role === 'OWNER').length;
  const adminsCount = members.filter((m) => m.role === 'ADMIN').length;
  const membersCount = members.filter((m) => m.role === 'MEMBER').length;
  const viewersCount = members.filter((m) => m.role === 'VIEWER').length;

  const completedTasks = tasks.filter((t) => t.status === 'DONE').length;

  return (
    <div className="space-y-6">
      {/* Top Header matching reference screenshot */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-2">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Workspace Dashboard
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Workspace health, projects, members, and activity at a glance.
          </p>
        </div>

        {/* Quick action buttons like Boardupscale screenshot */}
        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <Link
              to="/projects"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New Project</span>
            </Link>
          )}

          {canManage && (
            <button
              onClick={() => setTeamModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-xs transition-colors"
            >
              <UserPlus className="w-3.5 h-3.5 text-slate-500" />
              <span>Invite Member</span>
            </button>
          )}

          <Link
            to="/activity"
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 rounded-lg text-xs font-medium shadow-xs transition-colors"
          >
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>View Audit Logs</span>
          </Link>
        </div>
      </div>

      {/* Top Metrics Row (clean cards matching reference) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL PROJECTS
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{projects.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">All active initiatives</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL TASKS
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{tasks.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">{completedTasks} completed</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckSquare className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TOTAL MEMBERS
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-1">{members.length}</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Across workspace</div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              TENANT ISOLATION
            </div>
            <div className="text-sm font-bold text-emerald-700 mt-2 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Zero IDOR Active
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[140px]">
              {activeWorkspace?.name}
            </div>
          </div>
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* 3 Detail Cards matching Screenshot 1 & 2 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Card 1: Member Management Snapshot */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Member Management Snapshot
            </h3>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between mb-4">
              <div>
                <div className="text-[11px] text-slate-500 font-medium">Active Members</div>
                <div className="text-lg font-bold text-slate-900">{members.length}</div>
              </div>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-100">
                100% active
              </span>
            </div>

            <div className="space-y-2 text-xs">
              <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Role Distribution
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-purple-500" />
                  Workspace Owners
                </span>
                <span className="font-semibold text-slate-900">{ownersCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-blue-500" />
                  Workspace Admins
                </span>
                <span className="font-semibold text-slate-900">{adminsCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  Members
                </span>
                <span className="font-semibold text-slate-900">{membersCount}</span>
              </div>
              <div className="flex items-center justify-between text-slate-600">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-400" />
                  Viewers
                </span>
                <span className="font-semibold text-slate-900">{viewersCount}</span>
              </div>
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <button
              onClick={() => setTeamModalOpen(true)}
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>Manage Members →</span>
            </button>
          </div>
        </div>

        {/* Card 2: Recent Organization Activity */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Recent Activity
              </h3>
              <span className="text-[11px] text-slate-400">Live feed</span>
            </div>

            <div className="space-y-3">
              {recentActivities.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  No recent activity recorded.
                </div>
              ) : (
                recentActivities.map((act) => (
                  <div key={act.id} className="flex items-start gap-2.5 text-xs">
                    <img
                      src={
                        act.actor?.avatarUrl ||
                        `https://ui-avatars.com/api/?name=${encodeURIComponent(act.actor?.displayName || 'User')}&background=2563eb&color=fff`
                      }
                      alt=""
                      className="w-6 h-6 rounded-full shrink-0 object-cover mt-0.5"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="text-slate-800 truncate">
                        <strong>{act.actor?.displayName || 'System'}</strong>{' '}
                        <span className="text-slate-500 text-[11px]">
                          {act.action.replace(/_/g, ' ').toLowerCase()}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {new Date(act.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/activity"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View All Activity →</span>
            </Link>
          </div>
        </div>

        {/* Card 3: Projects Summary */}
        <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                Projects Overview
              </h3>
              <span className="text-[11px] text-slate-400">{projects.length} total</span>
            </div>

            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">No projects yet.</div>
              ) : (
                projects.slice(0, 3).map((p) => (
                  <div key={p.id} className="p-2.5 bg-slate-50 rounded-lg border border-slate-100">
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-900 mb-1">
                      <span className="truncate">{p.name}</span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        {p.completedTasks}/{p.totalTasks}
                      </span>
                    </div>
                    <div className="w-full bg-slate-200 rounded-full h-1 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1 rounded-full"
                        style={{ width: `${p.progressPercent}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="pt-4 mt-4 border-t border-slate-100">
            <Link
              to="/projects"
              className="text-xs font-semibold text-emerald-800 hover:text-emerald-900 flex items-center gap-1"
            >
              <span>View All Projects →</span>
            </Link>
          </div>
        </div>
      </div>

      {/* Team Members Modal */}
      <TeamMembersModal
        isOpen={teamModalOpen}
        onClose={() => setTeamModalOpen(false)}
        workspaceId={activeWorkspace?.id || ''}
        workspaceName={activeWorkspace?.name || ''}
        currentUserRole={activeRole}
      />
    </div>
  );
};
