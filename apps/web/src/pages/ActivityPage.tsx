import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Activity, Clock, Shield, Search } from 'lucide-react';

interface ActivityItem {
  id: string;
  action: string;
  targetType: string;
  targetId: string;
  metadata?: any;
  createdAt: string;
  actor?: {
    id: string;
    displayName: string;
    email: string;
    avatarUrl?: string;
  };
}

export const ActivityPage: React.FC = () => {
  const { activeWorkspace } = useAuth();
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  const fetchActivity = async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${activeWorkspace.id}/activity?limit=50`);
      setActivities(res.data.data);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActivity();
  }, [activeWorkspace?.id]);

  const formatActionName = (action: string) => {
    switch (action) {
      case 'TASK_STATUS_CHANGED':
        return 'Updated Task Status';
      case 'TASK_CREATED':
        return 'Created Task';
      case 'TASK_ASSIGNED':
        return 'Reassigned Task';
      case 'PROJECT_CREATED':
        return 'Created Project';
      case 'PROJECT_UPDATED':
        return 'Updated Project';
      case 'MEMBER_INVITED':
        return 'Invited Member';
      case 'MEMBER_ROLE_UPDATED':
        return 'Updated Role';
      case 'MEMBER_REMOVED':
        return 'Removed Member';
      case 'COMMENT_ADDED':
        return 'Posted Comment';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const filtered = activities.filter((a) => {
    const term = search.toLowerCase();
    const actorName = a.actor?.displayName?.toLowerCase() || '';
    const actionName = a.action.toLowerCase();
    const metaStr = JSON.stringify(a.metadata || {}).toLowerCase();
    return actorName.includes(term) || actionName.includes(term) || metaStr.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Workspace Activity Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Immutable audit trail of security and task state changes
          </p>
        </div>

        <div className="relative w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Filter audit logs..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          />
        </div>
      </div>

      {/* Audit Log Timeline */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading audit trail...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
          <h3 className="text-xs font-bold text-slate-800">No activity recorded yet</h3>
          <p className="text-[11px] text-slate-400 mt-1">
            Actions like creating tasks and changing roles will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs divide-y divide-slate-100">
          {filtered.map((item) => (
            <div key={item.id} className="p-4 flex items-start gap-3.5 hover:bg-slate-50/50 transition-colors">
              <img
                src={
                  item.actor?.avatarUrl ||
                  `https://ui-avatars.com/api/?name=${encodeURIComponent(item.actor?.displayName || 'User')}&background=2563eb&color=fff`
                }
                alt=""
                className="w-8 h-8 rounded-full border border-slate-200 object-cover shrink-0 mt-0.5"
              />

              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <div className="text-xs font-semibold text-slate-900">
                    {item.actor?.displayName || 'System'}
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400">
                    <Clock className="w-3 h-3" />
                    <span>{new Date(item.createdAt).toLocaleString()}</span>
                  </div>
                </div>

                <div className="text-xs text-slate-600 mt-0.5">
                  <span className="font-medium text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100 mr-1.5 text-[11px]">
                    {formatActionName(item.action)}
                  </span>
                  <span>on {item.targetType}</span>
                </div>

                {item.metadata && (
                  <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600 font-mono">
                    {item.metadata.from && item.metadata.to ? (
                      <span>
                        Status: <strong>{item.metadata.from}</strong> → <strong>{item.metadata.to}</strong> ({item.metadata.taskTitle})
                      </span>
                    ) : item.metadata.name ? (
                      <span>Name: <strong>{item.metadata.name}</strong></span>
                    ) : item.metadata.title ? (
                      <span>Title: <strong>{item.metadata.title}</strong></span>
                    ) : item.metadata.email ? (
                      <span>Email: <strong>{item.metadata.email}</strong> (Role: {item.metadata.role})</span>
                    ) : (
                      JSON.stringify(item.metadata)
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
