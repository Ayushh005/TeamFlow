import React, { useState, useEffect } from 'react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import {
  FolderKanban,
  Plus,
  Search,
  LayoutGrid,
  List as ListIcon,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  AlertCircle,
  Trash2,
} from 'lucide-react';

interface ProjectItem {
  id: string;
  name: string;
  description?: string;
  createdAt: string;
  totalTasks: number;
  completedTasks: number;
  progressPercent: number;
}

export const ProjectsPage: React.FC = () => {
  const { activeWorkspace, activeRole } = useAuth();
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  const [projectKey, setProjectKey] = useState('');
  const [newProjectDesc, setNewProjectDesc] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canCreate = activeRole !== 'VIEWER';
  const [deletingProjectId, setDeletingProjectId] = useState<string | null>(null);
  const [confirmDeleteProjectId, setConfirmDeleteProjectId] = useState<string | null>(null);

  const handleDeleteProject = async (projectId: string) => {
    if (!activeWorkspace?.id) return;
    try {
      setDeletingProjectId(projectId);
      await api.delete(`/workspaces/${activeWorkspace.id}/projects/${projectId}`);
      setProjects((prev) => prev.filter((p) => p.id !== projectId));
      setConfirmDeleteProjectId(null);
    } catch (err: any) {
      console.error('Failed to delete project', err);
      alert(err.response?.data?.message || 'Failed to archive project');
    } finally {
      setDeletingProjectId(null);
    }
  };

  const fetchProjects = async () => {
    if (!activeWorkspace?.id) return;
    try {
      setLoading(true);
      const res = await api.get(`/workspaces/${activeWorkspace.id}/projects`);
      setProjects(res.data.data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, [activeWorkspace?.id]);

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProjectName || !activeWorkspace?.id) return;

    setCreating(true);
    setError(null);

    try {
      await api.post(`/workspaces/${activeWorkspace.id}/projects`, {
        name: newProjectName,
        description: newProjectDesc,
      });
      setNewProjectName('');
      setNewProjectDesc('');
      setCreateModalOpen(false);
      await fetchProjects();
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create project';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setCreating(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.description && p.description.toLowerCase().includes(search.toLowerCase())),
  );

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Projects
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Organize work and collaborate across product initiatives
          </p>
        </div>

        {canCreate && (
          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>New Project</span>
          </button>
        )}
      </div>

      {/* 3 Metric Cards matching reference screenshot */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <FolderKanban className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {projects.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total Projects</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {projects.length}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Active Projects</div>
          </div>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <div className="text-2xl font-bold text-slate-900 leading-none">
              {projects.reduce((sum, p) => sum + p.totalTasks, 0)}
            </div>
            <div className="text-xs font-medium text-slate-500 mt-1">Total Tasks</div>
          </div>
        </div>
      </div>

      {/* Toolbar: Search & Grid/List view toggle */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600 transition-all"
          />
        </div>

        <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg border border-slate-200 shrink-0 self-start sm:self-auto">
          <button
            onClick={() => setViewMode('grid')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'grid'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            <span>Grid</span>
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
              viewMode === 'list'
                ? 'bg-emerald-800 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <ListIcon className="w-3.5 h-3.5" />
            <span>List</span>
          </button>
        </div>
      </div>

      {/* Projects List / Grid Content */}
      {loading ? (
        <div className="py-16 text-center text-xs text-slate-400">Loading projects...</div>
      ) : filteredProjects.length === 0 ? (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center max-w-md mx-auto">
          <div className="w-12 h-12 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
            <FolderKanban className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-slate-900">No projects yet</h3>
          <p className="text-xs text-slate-500 mt-1 mb-4">
            Create your first project to start tracking work.
          </p>
          {canCreate && (
            <button
              onClick={() => setCreateModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Create Project</span>
            </button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-slate-300 p-5 shadow-xs transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-slate-900 truncate">{p.name}</h3>
                  <div className="flex items-center gap-1.5">
                    {canCreate && (
                      confirmDeleteProjectId === p.id ? (
                        <div className="flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          <span className="text-[10px] text-red-700 font-medium">Archive?</span>
                          <button
                            onClick={() => handleDeleteProject(p.id)}
                            disabled={deletingProjectId === p.id}
                            className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-semibold hover:bg-red-700"
                          >
                            {deletingProjectId === p.id ? '...' : 'Yes'}
                          </button>
                          <button
                            onClick={() => setConfirmDeleteProjectId(null)}
                            className="text-[10px] text-slate-600 hover:text-slate-900"
                          >
                            No
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => setConfirmDeleteProjectId(p.id)}
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                          title="Archive project"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )
                    )}
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-100 text-slate-700 font-medium">
                      Active
                    </span>
                  </div>
                </div>
                <p className="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">
                  {p.description || 'No description provided.'}
                </p>
              </div>

              <div className="pt-4 border-t border-slate-100">
                <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                  <span>Progress</span>
                  <span className="font-semibold text-slate-700">
                    {p.completedTasks}/{p.totalTasks} Tasks ({p.progressPercent}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${p.progressPercent}%` }}
                  />
                </div>

                <div className="mt-4 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </span>
                  <Link
                    to={`/tasks?projectId=${p.id}`}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:text-emerald-900"
                  >
                    <span>View Tasks</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 font-semibold text-slate-600">
              <tr>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Description</th>
                <th className="px-4 py-3">Progress</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {filteredProjects.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50/50">
                  <td className="px-4 py-3 font-semibold text-slate-900">{p.name}</td>
                  <td className="px-4 py-3 text-slate-500 truncate max-w-xs">{p.description}</td>
                  <td className="px-4 py-3">
                    {p.completedTasks}/{p.totalTasks} ({p.progressPercent}%)
                  </td>
                  <td className="px-4 py-3 text-slate-400">
                    {new Date(p.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="inline-flex items-center gap-2 justify-end">
                      {canCreate && (
                        confirmDeleteProjectId === p.id ? (
                          <div className="inline-flex items-center gap-1 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                            <span className="text-[10px] text-red-700 font-medium">Archive?</span>
                            <button
                              onClick={() => handleDeleteProject(p.id)}
                              disabled={deletingProjectId === p.id}
                              className="text-[10px] bg-red-600 text-white px-1.5 py-0.5 rounded font-semibold hover:bg-red-700"
                            >
                              {deletingProjectId === p.id ? '...' : 'Yes'}
                            </button>
                            <button
                              onClick={() => setConfirmDeleteProjectId(null)}
                              className="text-[10px] text-slate-600 hover:text-slate-900"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteProjectId(p.id)}
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                            title="Archive project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )
                      )}
                      <Link
                        to={`/tasks?projectId=${p.id}`}
                        className="text-emerald-800 hover:underline font-semibold"
                      >
                        Tasks →
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Project Modal */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-6 animate-in fade-in zoom-in-95 duration-100">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900">Create New Project</h3>
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

            <form onSubmit={handleCreateProject} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. My Awesome Project"
                  value={newProjectName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setNewProjectName(val);
                    const words = val.trim().split(/\s+/);
                    if (words.length > 1) {
                      setProjectKey(words.map((w) => w[0] || '').join('').slice(0, 4).toUpperCase());
                    } else if (val.length > 0) {
                      setProjectKey(val.slice(0, 3).toUpperCase());
                    } else {
                      setProjectKey('');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Project Key
                </label>
                <input
                  type="text"
                  maxLength={6}
                  placeholder="e.g. MAP"
                  value={projectKey}
                  onChange={(e) => setProjectKey(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-xs font-mono uppercase placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                />
                <span className="text-[10px] text-slate-400 mt-1 block">
                  Short unique identifier (auto-generated from name)
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Description
                </label>
                <textarea
                  rows={3}
                  placeholder="What is this project about?"
                  value={newProjectDesc}
                  onChange={(e) => setNewProjectDesc(e.target.value)}
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
                  {creating ? 'Creating...' : 'Create Project'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
