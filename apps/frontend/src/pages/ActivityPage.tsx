import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Activity, Clock, Search } from 'lucide-react';

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

  const formatStatus = (status?: string) => {
    if (!status) return '';
    switch (status) {
      case 'TODO':
        return 'To Do';
      case 'IN_PROGRESS':
        return 'In Progress';
      case 'IN_REVIEW':
        return 'In Review';
      case 'DONE':
        return 'Completed';
      default:
        return status;
    }
  };

  const formatBytes = (bytes?: number) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
  };

  const formatActionName = (action: string, metadata?: any) => {
    switch (action) {
      case 'TASK_STATUS_CHANGED':
        if (metadata?.to === 'DONE') return 'Completed Task';
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
      case 'FILE_UPLOADED':
        return 'Uploaded File';
      default:
        return action.replace(/_/g, ' ');
    }
  };

  const renderSimpleMetadata = (item: ActivityItem) => {
    const meta = item.metadata || {};

    // 1. Task Status Changed
    if (item.action === 'TASK_STATUS_CHANGED' || (meta.from && meta.to)) {
      if (meta.to === 'DONE') {
        return (
          <span>
            Completed task: <strong>{meta.taskTitle || 'Task'}</strong>
          </span>
        );
      }
      return (
        <span>
          Status: <strong>{formatStatus(meta.from)}</strong> → <strong>{formatStatus(meta.to)}</strong> ({meta.taskTitle || 'Task'})
        </span>
      );
    }

    // 2. Task Created
    if (item.action === 'TASK_CREATED') {
      return (
        <span>
          Task: <strong>{meta.title || 'Untitled'}</strong>
          {meta.priority ? ` • Priority: ${meta.priority}` : ''}
          {meta.status ? ` • Initial Status: ${formatStatus(meta.status)}` : ''}
        </span>
      );
    }

    // 3. Comment Added (NO taskId)
    if (item.action === 'COMMENT_ADDED') {
      return (
        <span>
          Comment on task: <strong>{meta.taskTitle || 'Task'}</strong>
        </span>
      );
    }

    // 4. Task Assigned
    if (item.action === 'TASK_ASSIGNED') {
      return (
        <span>
          Task assigned: <strong>{meta.taskTitle || 'Task'}</strong>
        </span>
      );
    }

    // 5. Member Invited
    if (item.action === 'MEMBER_INVITED') {
      return (
        <span>
          Invited <strong>{meta.email}</strong> as <strong>{meta.role}</strong>
        </span>
      );
    }

    // 6. Member Role Updated
    if (item.action === 'MEMBER_ROLE_UPDATED') {
      return (
        <span>
          Role changed: <strong>{meta.previousRole}</strong> → <strong>{meta.newRole}</strong>
        </span>
      );
    }

    // 7. File Uploaded
    if (item.action === 'FILE_UPLOADED') {
      return (
        <span>
          File: <strong>{meta.fileName}</strong> {meta.sizeBytes ? `(${formatBytes(meta.sizeBytes)})` : ''}
        </span>
      );
    }

    // 8. Project Created / Updated
    if (meta.name) {
      return <span>Project: <strong>{meta.name}</strong></span>;
    }

    if (meta.title) {
      return <span>Title: <strong>{meta.title}</strong></span>;
    }

    if (meta.email) {
      return <span>Email: <strong>{meta.email}</strong></span>;
    }

    return null;
  };

  const filtered = activities.filter((a) => {
    const term = search.toLowerCase();
    const actorName = a.actor?.displayName?.toLowerCase() || '';
    const actionName = a.action.toLowerCase();
    const taskTitle = (a.metadata?.taskTitle || a.metadata?.title || '').toLowerCase();
    const projectName = (a.metadata?.name || '').toLowerCase();
    const email = (a.metadata?.email || '').toLowerCase();

    return (
      actorName.includes(term) ||
      actionName.includes(term) ||
      taskTitle.includes(term) ||
      projectName.includes(term) ||
      email.includes(term)
    );
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
          {filtered.map((item) => {
            const detailText = renderSimpleMetadata(item);

            return (
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
                      {formatActionName(item.action, item.metadata)}
                    </span>
                    <span>on {item.targetType}</span>
                  </div>

                  {detailText && (
                    <div className="mt-2 p-2 bg-slate-50 border border-slate-200 rounded-md text-[11px] text-slate-600">
                      {detailText}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
