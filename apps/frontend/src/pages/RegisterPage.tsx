import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Layers, AlertCircle, ArrowRight, Lock, Mail, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RegisterPage: React.FC = () => {
  const { register } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await register(email, password, displayName);
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to create account.';
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
              Launch your team <br />
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                in minutes
              </span>
            </h1>

            {/* Description */}
            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed mb-8 max-w-lg">
              One workspace for your sprints, boards, and entire team — self-hosted and always in your control.
            </p>

            {/* Feature Bullets with colored dots */}
            <div className="space-y-3.5 mb-10">
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 shrink-0" />
                <span>Free forever for small teams</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-600 shrink-0" />
                <span>Unlimited projects & boards</span>
              </div>
              <div className="flex items-center gap-3 text-sm font-medium text-slate-700">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
                <span>Set up in under 2 minutes</span>
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
        {/* RIGHT COLUMN: ORIGINAL REGISTER CARD                     */}
        {/* ======================================================== */}
        <div className="lg:col-span-6 xl:col-span-5 flex flex-col items-center lg:items-end justify-center">
          <div className="w-full max-w-md bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-2xl sm:px-8">
            <div className="mb-5">
              <h2 className="text-xl font-bold tracking-tight text-slate-900">
                Create your TeamFlow account
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Get started with your collaborative team workspace
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
                  Your full name
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <UserIcon className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Alex Morgan"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Work Email address
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
                    placeholder="alex@acme.com"
                    className="block w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Password (min 6 characters)
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type="password"
                    required
                    minLength={6}
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
                    <span>Create Workspace</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-5 text-center">
              <p className="text-xs text-slate-500">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-blue-600 hover:text-blue-500">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
