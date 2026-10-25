import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Shield, Sparkles, CheckCircle2, AlertCircle, ArrowRight, Lock, Mail, Users } from 'lucide-react';
import { Link } from 'react-router-dom';

export const LoginPage: React.FC = () => {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await login(email, password);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to login. Please verify your credentials.';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (demoEmail: string, roleName: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
    setError(null);
    setLoading(true);

    try {
      await login(demoEmail, 'Password123!');
    } catch (err: any) {
      const msg = err.response?.data?.message || `Failed to login as ${roleName}`;
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* App Logo */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-md shadow-blue-500/20 mb-3">
          <Shield className="w-6 h-6" />
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-slate-900">
          Sign in to TeamFlow
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Multi-tenant project workspace with enterprise RBAC
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8">
          {error && (
            <div className="mb-5 p-3 rounded-xl bg-red-50 border border-red-200 flex items-start gap-2.5 text-sm text-red-700">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Email address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm disabled:opacity-50"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign in</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Logins Section */}
          <div className="mt-6 pt-5 border-t border-slate-100">
            <p className="text-xs font-medium text-slate-500 mb-2.5">
              Quick Test Accounts:
            </p>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickLogin('owner@teamflow.dev', 'Owner')}
                disabled={loading}
                className="p-2 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
              >
                <div className="text-xs font-medium text-slate-900">Owner</div>
                <div className="text-[11px] text-slate-500 truncate">owner@teamflow.dev</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('admin@teamflow.dev', 'Admin')}
                disabled={loading}
                className="p-2 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
              >
                <div className="text-xs font-medium text-slate-900">Admin</div>
                <div className="text-[11px] text-slate-500 truncate">admin@teamflow.dev</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('member@teamflow.dev', 'Member')}
                disabled={loading}
                className="p-2 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
              >
                <div className="text-xs font-medium text-slate-900">Member</div>
                <div className="text-[11px] text-slate-500 truncate">member@teamflow.dev</div>
              </button>

              <button
                type="button"
                onClick={() => handleQuickLogin('viewer@teamflow.dev', 'Viewer')}
                disabled={loading}
                className="p-2 text-left border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all"
              >
                <div className="text-xs font-medium text-slate-900">Viewer</div>
                <div className="text-[11px] text-slate-500 truncate">viewer@teamflow.dev</div>
              </button>
            </div>
          </div>

          <div className="mt-5 text-center">
            <p className="text-xs text-slate-500">
              Don't have an account?{' '}
              <Link to="/register" className="font-semibold text-blue-600 hover:text-blue-500">
                Create new workspace
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
