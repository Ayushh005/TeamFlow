import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import {
  CheckSquare,
  Plus,
  Search,
  MessageSquare,
  Calendar,
  X,
  AlertCircle,
  Clock,
  Send,
  Filter,
  Paperclip,
  Download,
  Trash2,
  FileText,
  Upload,
} from 'lucide-react';

interface TaskFileItem {
  id: string;
  objectKey: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
  uploadedBy: { id: string; displayName: string; avatarUrl?: string };
}

interface TaskItem {
  id: string;
  projectId: string;
  title: string;
  description?: string;
  status: 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE';
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
  dueAt?: string;
  version: number;
  project: { id: string; name: string };
  assignee?: { id: string; displayName: string; email: string; avatarUrl?: string };
  createdBy: { id: string; displayName: string };
  _count: { comments: number };
}

interface CommentItem {
  id: string;
  body: string;
  createdAt: string;
  author: { id: string; displayName: string; email: string; avatarUrl?: string };
}

export const TasksPage: React.FC = () => {
  const { activeWorkspace, activeRole } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const initialProjectId = searchParams.get('projectId') || '';
  const initialSearch = searchParams.get('search') || '';

  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  const [members, setMembers] = useState<Array<{ user: { id: string; displayName: string } }>>([]);
  const [selectedProjectId, setSelectedProjectId] = useState<string>(initialProjectId);
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<string>('');
  const [search, setSearch] = useState(initialSearch);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const urlSearch = searchParams.get('search');
    if (urlSearch !== null) {
      setSearch(urlSearch);
    }
  }, [searchParams]);

  // Drawer & Modals state
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);
  const [taskComments, setTaskComments] = useState<CommentItem[]>([]);
  const [taskFiles, setTaskFiles] = useState<TaskFileItem[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [deletingFileId, setDeletingFileId] = useState<string | null>(null);
  const [newCommentText, setNewCommentText] = useState('');
  const [commenting, setCommenting] = useState(false);
  const [createModalOpen, setCreateModalOpen] = useState(false);

  // New task form
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDesc, setNewTaskDesc] = useState('');
  const [newTaskProjectId, setNewTaskProjectId] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'>('MEDIUM');
  const [newTaskAssigneeId, setNewTaskAssigneeId] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canEdit = activeRole !== 'VIEWER';

  const fetchTasks = async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      const params: any = {};
      if (selectedProjectId) params.projectId = selectedProjectId;
      if (selectedStatus) params.status = selectedStatus;
      if (selectedPriority) params.priority = selectedPriority;
      if (search) params.search = search;

      const res = await api.get(`/workspaces/${activeWorkspace.id}/tasks`, { params });
      setTasks(res.data.data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const fetchMetadata = async () => {
    if (!activeWorkspace?.id) return;
    try {
      const [projRes, memRes] = await Promise.all([
        api.get(`/workspaces/${activeWorkspace.id}/projects`),
        api.get(`/workspaces/${activeWorkspace.id}/members`),
      ]);
      setProjects(projRes.data.data);
      setMembers(memRes.data.data);
      if (projRes.data.data.length > 0 && !newTaskProjectId) {
        setNewTaskProjectId(projRes.data.data[0].id);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchMetadata();
  }, [activeWorkspace?.id]);

  useEffect(() => {
    fetchTasks();
  }, [activeWorkspace?.id, selectedProjectId, selectedStatus, selectedPriority, search]);

  // Real-time Socket.IO collaboration updates
  useEffect(() => {
    if (!socket) return;

    const handleTaskCreated = (newTask: any) => {
      setTasks((prev) => {
        if (prev.some((t) => t.id === newTask.id)) return prev;
        return [newTask, ...prev];
      });
    };

    const handleTaskUpdated = (updatedTask: any) => {
      setTasks((prev) =>
        prev.map((t) => (t.id === updatedTask.id ? { ...t, ...updatedTask } : t)),
      );
      setSelectedTask((prev) =>
        prev?.id === updatedTask.id ? { ...prev, ...updatedTask } : prev,
      );
    };

    const handleTaskDeleted = ({ taskId }: { taskId: string }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask((prev) => (prev?.id === taskId ? null : prev));
    };

    const handleCommentCreated = (newComment: any) => {
      setSelectedTask((currentSelected) => {
        if (currentSelected?.id === newComment.taskId) {
          setTaskComments((prev) => {
            if (prev.some((c) => c.id === newComment.id)) return prev;
            return [...prev, newComment];
          });
        }
        return currentSelected;
      });

      setTasks((prev) =>
        prev.map((t) =>
          t.id === newComment.taskId
            ? { ...t, _count: { ...t._count, comments: (t._count?.comments || 0) + 1 } }
            : t,
        ),
      );
    };

    socket.on('task.created', handleTaskCreated);
    socket.on('task.updated', handleTaskUpdated);
    socket.on('task.deleted', handleTaskDeleted);
    socket.on('comment.created', handleCommentCreated);

    return () => {
      socket.off('task.created', handleTaskCreated);
      socket.off('task.updated', handleTaskUpdated);
      socket.off('task.deleted', handleTaskDeleted);
      socket.off('comment.created', handleCommentCreated);
    };
  }, [socket]);

  const fetchTaskFiles = async (taskId: string) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/tasks/${taskId}/files`);
      setTaskFiles(res.data.data);
    } catch {
      // ignore
    }
  };

  const fetchTaskDetails = async (taskId: string) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/tasks/${taskId}`);
      setSelectedTask(res.data.data);
      setTaskComments(res.data.data.comments || []);
      fetchTaskFiles(taskId);
    } catch {
      // ignore
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedTask || !activeWorkspace?.id) return;

    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File exceeds maximum size limit of 10MB');
      return;
    }

    setUploadingFile(true);
    setUploadError(null);

    try {
      // 1. Request presigned PUT URL
      const presignRes = await api.post(`/workspaces/${activeWorkspace.id}/files/presign-upload`, {
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        taskId: selectedTask.id,
        projectId: selectedTask.projectId,
      });

      const { uploadUrl, objectKey } = presignRes.data.data;

      // 2. Upload file directly to S3/MinIO or local endpoint
      const uploadResp = await fetch(uploadUrl, {
        method: 'PUT',
        body: file,
        headers: {
          'Content-Type': file.type || 'application/octet-stream',
        },
      });

      if (!uploadResp.ok) {
        console.warn('Direct upload status returned:', uploadResp.status);
      }

      // 3. Confirm upload with API
      await api.post(`/workspaces/${activeWorkspace.id}/files/confirm`, {
        objectKey,
        originalName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
        taskId: selectedTask.id,
        projectId: selectedTask.projectId,
      });

      await fetchTaskFiles(selectedTask.id);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to upload attachment';
      setUploadError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setUploadingFile(false);
      if (e.target) e.target.value = '';
    }
  };

  const handleDownloadFile = async (fileId: string) => {
    if (!activeWorkspace?.id) return;
    try {
      const res = await api.get(`/workspaces/${activeWorkspace.id}/files/${fileId}/presign-download`);
      const { downloadUrl, fileName } = res.data.data;

      if (downloadUrl.includes('/download')) {
        // Authenticated blob download to avoid any browser tab popup or header issues
        const fileResponse = await api.get(downloadUrl, { responseType: 'blob' });
        const blobUrl = window.URL.createObjectURL(new Blob([fileResponse.data]));
        const a = document.createElement('a');
        a.href = blobUrl;
        a.setAttribute('download', fileName || 'attachment');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(blobUrl);
      } else {
        // Direct S3 presigned download URL
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.setAttribute('download', fileName || 'attachment');
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to download file');
    }
  };

  const handleDeleteFile = async (fileId: string) => {
    if (!activeWorkspace?.id || !selectedTask) return;
    try {
      await api.delete(`/workspaces/${activeWorkspace.id}/files/${fileId}`);
      setDeletingFileId(null);
      await fetchTaskFiles(selectedTask.id);
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to delete file');
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: string) => {
    if (!canEdit || !activeWorkspace?.id) return;
    try {
      await api.patch(`/workspaces/${activeWorkspace.id}/tasks/${taskId}`, {
        status: newStatus,
      });
      await fetchTasks();
      if (selectedTask?.id === taskId) {
        fetchTaskDetails(taskId);
      }
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to update task status');
    }
  };

  const handlePostComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCommentText.trim() || !selectedTask || !activeWorkspace?.id) return;
    setCommenting(true);
    try {
      await api.post(
        `/workspaces/${activeWorkspace.id}/tasks/${selectedTask.id}/comments`,
        { body: newCommentText },
      );
      setNewCommentText('');
      await fetchTaskDetails(selectedTask.id);
      await fetchTasks();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to post comment');
    } finally {
      setCommenting(false);
    }
  };

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle || !newTaskProjectId || !activeWorkspace?.id) return;
    setCreating(true);
    setError(null);

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/tasks`, {
        title: newTaskTitle,
        description: newTaskDesc,
        projectId: newTaskProjectId,
        priority: newTaskPriority,
        assigneeId: newTaskAssigneeId || undefined,
        dueAt: newTaskDueDate ? new Date(newTaskDueDate).toISOString() : undefined,
      });

      setNewTaskTitle('');
      setNewTaskDesc('');
      setNewTaskDueDate('');
      setCreateModalOpen(false);
      await fetchTasks();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create task';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setCreating(false);
    }
  };

  const getStatusBadge = (status: TaskItem['status'], taskId?: string) => {
    const config = {
      TODO: { label: 'To Do', bg: 'bg-slate-100 text-slate-700 border-slate-200' },
      IN_PROGRESS: { label: 'In Progress', bg: 'bg-blue-50 text-blue-700 border-blue-200' },
      IN_REVIEW: { label: 'In Review', bg: 'bg-purple-50 text-purple-700 border-purple-200' },
      DONE: { label: 'Completed', bg: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    }[status];

    if (!canEdit || !taskId) {
      return (
        <span className={`inline-flex px-2 py-0.5 text-[11px] font-medium rounded border ${config.bg}`}>
          {config.label}
        </span>
      );
    }

    return (
      <select
        value={status}
        onClick={(e) => e.stopPropagation()}
        onChange={(e) => handleStatusChange(taskId, e.target.value)}
        className={`px-2 py-0.5 text-[11px] font-medium rounded border ${config.bg} focus:outline-none cursor-pointer`}
      >
        <option value="TODO">To Do</option>
        <option value="IN_PROGRESS">In Progress</option>
        <option value="IN_REVIEW">In Review</option>
        <option value="DONE">Completed</option>
      </select>
    );
  };

  const getPriorityBadge = (priority: TaskItem['priority']) => {
    switch (priority) {
      case 'URGENT':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-50 text-red-700 border border-red-200 font-semibold">Urgent</span>;
      case 'HIGH':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 font-medium">High</span>;
      case 'MEDIUM':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 font-medium">Medium</span>;
      case 'LOW':
        return <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-medium">Low</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Tasks
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Manage, track and collaborate on deliverables across your projects
          </p>
        </div>

        {canEdit && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Task</span>
          </button>
        )}
      </div>

      {/* Toolbar: Filters & Search */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Project Filter */}
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="DONE">Completed</option>
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-600"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 w-44 sm:w-56"
            />
          </div>
        </div>

        <div className="text-xs text-slate-500 font-medium px-2">
          {tasks.length} task{tasks.length === 1 ? '' : 's'}
        </div>
      </div>

      {/* Clean & Simple Task Table */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading tasks...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <CheckSquare className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No tasks found</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create tasks to assign deliverables and track progress.
          </p>
          {canEdit && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Task</span>
            </button>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="px-5 py-3.5">Task</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5">Priority</th>
                <th className="px-4 py-3.5">Assignee</th>
                <th className="px-4 py-3.5">Due Date</th>
                <th className="px-4 py-3.5 text-center">Comments</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {tasks.map((task) => (
                <tr
                  key={task.id}
                  onClick={() => {
                    setSelectedTask(task);
                    fetchTaskDetails(task.id);
                  }}
                  className="hover:bg-slate-50/80 cursor-pointer transition-colors group"
                >
                  <td className="px-5 py-3.5">
                    <div className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                      {task.title}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-0.5">
                      {task.project.name}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    {getStatusBadge(task.status, task.id)}
                  </td>
                  <td className="px-4 py-3.5">
                    {getPriorityBadge(task.priority)}
                  </td>
                  <td className="px-4 py-3.5">
                    {task.assignee ? (
                      <div className="flex items-center gap-2">
                        <img
                          src={
                            task.assignee.avatarUrl ||
                            `https://ui-avatars.com/api/?name=${encodeURIComponent(task.assignee.displayName)}&background=2563eb&color=fff`
                          }
                          alt=""
                          className="w-5 h-5 rounded-full object-cover border border-slate-200"
                        />
                        <span className="text-slate-800 font-medium">
                          {task.assignee.displayName}
                        </span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Unassigned</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-slate-500">
                    {task.dueAt ? (
                      <span className="flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <span>{new Date(task.dueAt).toLocaleDateString()}</span>
                      </span>
                    ) : (
                      <span className="text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center text-slate-400">
                    <span className="inline-flex items-center gap-1 text-[11px]">
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>{task._count?.comments || 0}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Slide-over Task Detail Drawer */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/30 backdrop-blur-xs flex justify-end">
          <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-200 flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                {selectedTask.project.name}
              </span>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Body */}
            <div className="flex-1 overflow-y-auto p-5 space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 leading-snug">
                  {selectedTask.title}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Created by {selectedTask.createdBy.displayName}
                </p>
              </div>

              {/* Status and Priority Controls */}
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <select
                    disabled={!canEdit}
                    value={selectedTask.status}
                    onChange={(e) => handleStatusChange(selectedTask.id, e.target.value)}
                    className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded-md bg-white text-slate-800 font-medium focus:outline-none"
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="IN_REVIEW">In Review</option>
                    <option value="DONE">Completed</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <div className="pt-1">{getPriorityBadge(selectedTask.priority)}</div>
                </div>
              </div>

              {/* Description */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </h4>
                <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {selectedTask.description || 'No description provided.'}
                </div>
              </div>

              {/* Assignee */}
              <div>
                <h4 className="text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assignee
                </h4>
                <div className="flex items-center gap-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                  {selectedTask.assignee ? (
                    <>
                      <img
                        src={
                          selectedTask.assignee.avatarUrl ||
                          `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedTask.assignee.displayName)}&background=2563eb&color=fff`
                        }
                        alt=""
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-xs font-medium text-slate-800">
                        {selectedTask.assignee.displayName}
                      </span>
                    </>
                  ) : (
                    <span className="text-xs text-slate-400">Unassigned</span>
                  )}
                </div>
              </div>

              {/* File Attachments (MinIO S3 Presigned URLs) */}
              <div className="pt-4 border-t border-slate-200">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                    <Paperclip className="w-3.5 h-3.5 text-slate-500" />
                    <span>Attachments ({taskFiles.length})</span>
                  </h4>

                  {canEdit && (
                    <label className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium rounded-lg cursor-pointer transition-colors">
                      <Upload className="w-3 h-3 text-slate-500" />
                      <span>{uploadingFile ? 'Uploading...' : 'Attach File'}</span>
                      <input
                        type="file"
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={uploadingFile}
                      />
                    </label>
                  )}
                </div>

                {uploadError && (
                  <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                )}

                <div className="space-y-2">
                  {taskFiles.length === 0 ? (
                    <div className="text-xs text-slate-400 py-2.5 text-center bg-slate-50 border border-slate-100 rounded-lg">
                      No files attached. Attach documents, specs, or images (max 10MB).
                    </div>
                  ) : (
                    taskFiles.map((f) => (
                      <div
                        key={f.id}
                        className="p-2.5 bg-slate-50 hover:bg-slate-100/80 border border-slate-200 rounded-lg flex items-center justify-between gap-3 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-7 h-7 rounded bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="min-w-0">
                            <div className="text-xs font-medium text-slate-800 truncate" title={f.originalName}>
                              {f.originalName}
                            </div>
                            <div className="text-[10px] text-slate-400 flex items-center gap-2">
                              <span>{formatBytes(f.sizeBytes)}</span>
                              <span>•</span>
                              <span>{f.uploadedBy?.displayName || 'User'}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => handleDownloadFile(f.id)}
                            title="Download via presigned URL"
                            className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-white"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          {canEdit && (
                            deletingFileId === f.id ? (
                              <button
                                onClick={() => handleDeleteFile(f.id)}
                                className="px-2 py-0.5 rounded text-[11px] font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
                              >
                                Delete?
                              </button>
                            ) : (
                              <button
                                onClick={() => setDeletingFileId(f.id)}
                                title="Delete attachment"
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-white"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Discussion & Comments */}
              <div className="pt-4 border-t border-slate-200">
                <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
                  Comments & Discussion ({taskComments.length})
                </h4>

                <div className="space-y-3 mb-4 max-h-60 overflow-y-auto pr-1">
                  {taskComments.length === 0 ? (
                    <div className="text-xs text-slate-400 py-3 text-center">
                      No comments yet. Start the conversation!
                    </div>
                  ) : (
                    taskComments.map((c) => (
                      <div key={c.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-slate-800">
                            {c.author.displayName}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(c.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed">{c.body}</p>
                      </div>
                    ))
                  )}
                </div>

                {/* Comment Input */}
                {canEdit ? (
                  <form onSubmit={handlePostComment} className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Write a comment..."
                      value={newCommentText}
                      onChange={(e) => setNewCommentText(e.target.value)}
                      className="flex-1 px-3 py-1.5 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                      type="submit"
                      disabled={commenting || !newCommentText.trim()}
                      className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{commenting ? '...' : 'Send'}</span>
                    </button>
                  </form>
                ) : (
                  <p className="text-[11px] text-slate-400 italic">
                    Viewers cannot post comments.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Task Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Task</h3>
              <button
                onClick={() => setCreateModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {error && (
              <div className="mt-3 p-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleCreateTask} className="mt-4 space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Implement WebSocket Scoped Rooms"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Project
                  </label>
                  <select
                    required
                    value={newTaskProjectId}
                    onChange={(e) => setNewTaskProjectId(e.target.value)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                  >
                    {projects.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                    Priority
                  </label>
                  <select
                    value={newTaskPriority}
                    onChange={(e) => setNewTaskPriority(e.target.value as any)}
                    className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assignee
                </label>
                <select
                  value={newTaskAssigneeId}
                  onChange={(e) => setNewTaskAssigneeId(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                >
                  <option value="">Unassigned</option>
                  {members.map((m) => (
                    <option key={m.user.id} value={m.user.id}>{m.user.displayName}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Due Date
                </label>
                <input
                  type="date"
                  value={newTaskDueDate}
                  onChange={(e) => setNewTaskDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-xs bg-white text-slate-700 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  placeholder="Task details and deliverables..."
                  value={newTaskDesc}
                  onChange={(e) => setNewTaskDesc(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-3.5 py-1.5 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="px-4 py-1.5 bg-emerald-800 hover:bg-emerald-900 text-white rounded-lg text-xs font-semibold disabled:opacity-50"
                >
                  {creating ? 'Creating...' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
