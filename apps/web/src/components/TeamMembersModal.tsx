import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth, WorkspaceMembership } from '../context/AuthContext';
import { X, UserPlus, Trash2, Shield, AlertCircle, CheckCircle2 } from 'lucide-react';

interface MemberItem {
  id: string;
  role: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER';
  joinedAt: string;
  user: {
    id: string;
    email: string;
    displayName: string;
    avatarUrl?: string;
  };
}

interface TeamMembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string;
  workspaceName: string;
  currentUserRole: 'OWNER' | 'ADMIN' | 'MEMBER' | 'VIEWER' | null;
}

export const TeamMembersModal: React.FC<TeamMembersModalProps> = ({
  isOpen,
  onClose,
  workspaceId,
  workspaceName,
  currentUserRole,
}) => {
  const [members, setMembers] = useState<MemberItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ADMIN' | 'MEMBER' | 'VIEWER'>('MEMBER');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const canManageMembers = currentUserRole === 'OWNER' || currentUserRole === 'ADMIN';

  const fetchMembers = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${workspaceId}/members`);
      setMembers(res.data.data);
    } catch (err: any) {
      setError('Failed to load workspace members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && workspaceId) {
      setError(null);
      setSuccess(null);
      fetchMembers();
    }
  }, [isOpen, workspaceId]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteEmail) return;

    setError(null);
    setSuccess(null);
    setInviting(true);

    try {
      await api.post(`/workspaces/${workspaceId}/members`, {
        email: inviteEmail,
        role: inviteRole,
      });
      setSuccess(`Invited ${inviteEmail} as ${inviteRole}`);
      setInviteEmail('');
      await fetchMembers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to invite member';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setInviting(false);
    }
  };

  const handleRoleChange = async (targetUserId: string, newRole: string) => {
    setError(null);
    setSuccess(null);
    try {
      await api.patch(`/workspaces/${workspaceId}/members/${targetUserId}/role`, {
        role: newRole,
      });
      setSuccess('Member role updated successfully');
      await fetchMembers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update member role';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  const handleRemove = async (targetUserId: string, targetName: string) => {
    if (!confirm(`Are you sure you want to remove ${targetName} from ${workspaceName}?`)) {
      return;
    }

    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/workspaces/${workspaceId}/members/${targetUserId}`);
      setSuccess(`${targetName} removed from workspace`);
      await fetchMembers();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to remove member';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-2xl w-full p-6 animate-in fade-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Team Members
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage permissions and roles for {workspaceName}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Alerts */}
        {error && (
          <div className="mt-4 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-xs text-red-700">
            <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="mt-4 p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5 text-xs text-emerald-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-500 mt-0.5 shrink-0" />
            <span>{success}</span>
          </div>
        )}

        {/* Invite Form (Owner / Admin only) */}
        {canManageMembers && (
          <form onSubmit={handleInvite} className="mt-4 p-3.5 bg-slate-50 border border-slate-200 rounded-xl">
            <div className="text-xs font-semibold text-slate-800 uppercase tracking-wider mb-2">
              Invite New Member
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="email"
                required
                placeholder="colleague@company.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="flex-1 px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              />
              <select
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as any)}
                className="px-3 py-2 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-slate-700"
              >
                {currentUserRole === 'OWNER' && <option value="ADMIN">Admin</option>}
                <option value="MEMBER">Member</option>
                <option value="VIEWER">Viewer</option>
              </select>
              <button
                type="submit"
                disabled={inviting}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50 shrink-0"
              >
                <UserPlus className="w-3.5 h-3.5" />
                <span>{inviting ? 'Inviting...' : 'Send Invite'}</span>
              </button>
            </div>
          </form>
        )}

        {/* Members List */}
        <div className="mt-5">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Active Members ({members.length})
          </div>

          {loading ? (
            <div className="py-8 text-center text-xs text-slate-400">Loading team members...</div>
          ) : (
            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto pr-1">
              {members.map((m) => {
                const isTargetOwner = m.role === 'OWNER';
                const canModifyThisUser =
                  currentUserRole === 'OWNER' ||
                  (currentUserRole === 'ADMIN' && !isTargetOwner);

                return (
                  <div key={m.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <img
                        src={
                          m.user.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(m.user.displayName)}&background=2563eb&color=fff`
                        }
                        alt={m.user.displayName}
                        className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0"
                      />
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {m.user.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">{m.user.email}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {canModifyThisUser ? (
                        <select
                          value={m.role}
                          onChange={(e) => handleRoleChange(m.user.id, e.target.value)}
                          className="text-xs px-2 py-1 rounded-md border border-slate-200 bg-slate-50 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-blue-500"
                        >
                          {currentUserRole === 'OWNER' && <option value="OWNER">Owner</option>}
                          {(currentUserRole === 'OWNER' || currentUserRole === 'ADMIN') && (
                            <option value="ADMIN">Admin</option>
                          )}
                          <option value="MEMBER">Member</option>
                          <option value="VIEWER">Viewer</option>
                        </select>
                      ) : (
                        <span className="text-xs px-2.5 py-1 rounded-md bg-slate-100 text-slate-800 font-medium border border-slate-200">
                          {m.role}
                        </span>
                      )}

                      {canModifyThisUser && !isTargetOwner && (
                        <button
                          onClick={() => handleRemove(m.user.id, m.user.displayName)}
                          title="Remove member"
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
