import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, AlertCircle, ArrowRight, Lock, Mail } from 'lucide-react';
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
    <div className="min-h-screen bg-white relative flex items-center justify-center p-4 sm:p-6 lg:p-12 overflow-hidden selection:bg-blue-100 selection:text-blue-900">
      {/* Background subtle architectural grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-60"
        style={{
          backgroundImage: `
            linear-gradient(to right, #f1f5f9 1px, transparent 1px),
            linear-gradient(to bottom, #f1f5f9 1px, transparent 1px)
          `,
          backgroundSize: '48px 48px',
        }}
      />

      <div className="w-full max-w-6xl mx-auto relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
        {/* ======================================================== */}
        {/* LEFT COLUMN: HERO & BRANDING (FROM REFERENCE)            */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-between py-4 lg:py-8 lg:pr-8">
          <div>
            {/* Brand Logo */}
            <div className="flex items-center gap-2.5 mb-8 sm:mb-14">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 via-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-blue-500/25">
                <Layers className="w-5 h-5" />
              </div>
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                Team<span className="text-blue-600">Flow</span>
              </span>
            </div>

            {/* Headline */}
            <h1 className="text-4xl sm:text-5xl xl:text-6xl font-black text-slate-900 tracking-tight leading-[1.1] mb-6">
              Your team's <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                command center
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-8 max-w-lg">
              Sprints, boards, and real-time collaboration — everything your team needs to ship with confidence.
            </p>

            {/* Feature Bullets with colored dots */}
            <div className="space-y-3.5 mb-10">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                <span>Kanban & Scrum boards</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                <span>Real-time collaboration</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span>Enterprise role-based access control</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>S3 & MinIO attachment storage</span>
              </div>
            </div>
          </div>

          {/* Left Footer */}
          <div className="pt-4 border-t border-slate-100">
            <p className="text-xs text-slate-400">
              © {new Date().getFullYear()} TeamFlow. All rights reserved.
            </p>
          </div>
        </div>

        {/* ======================================================== */}
        {/* RIGHT COLUMN: ORIGINAL LOGIN CARD                        */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center lg:items-end justify-center">
          <div className="w-full max-w-md bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Sign in to TeamFlow
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Multi-tenant project workspace with enterprise RBAC
              </p>
            </div>

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
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-all shadow-sm disabled:opacity-50 cursor-pointer"
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

            {/* Quick Demo Logins Section with all 4 seed accounts */}
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
    </div>
  );
};
