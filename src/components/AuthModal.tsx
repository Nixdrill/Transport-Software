import React, { useState } from 'react';
import { registerUser, loginUser, AppUser } from '../lib/authService';
import { signInWithGoogle } from '../lib/firebase';
import { 
  LogIn, 
  UserPlus, 
  X, 
  ShieldCheck, 
  Lock, 
  User, 
  Mail, 
  Eye, 
  EyeOff, 
  Sparkles, 
  AlertCircle,
  Truck
} from 'lucide-react';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (user: AppUser) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'dispatcher' | 'admin' | 'operator'>('dispatcher');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === 'register') {
        const newUser = await registerUser({
          username,
          displayName,
          email,
          password,
          role,
        });
        onSuccess(newUser);
        onClose();
      } else {
        const loggedUser = await loginUser({
          usernameOrEmail: username,
          password,
        });
        onSuccess(loggedUser);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const demo = await loginUser({
        usernameOrEmail: 'demo_user',
        password: 'Demo@12345',
      });
      onSuccess(demo);
      onClose();
    } catch {
      try {
        const createdDemo = await registerUser({
          username: 'demo_user',
          displayName: 'Logistics Operations Lead',
          email: 'demo@logitrack.app',
          password: 'Demo@12345',
          role: 'admin',
        });
        onSuccess(createdDemo);
        onClose();
      } catch (e: any) {
        setError(e?.message || 'Could not log in with demo account.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setLoading(true);
    try {
      const user = await signInWithGoogle();
      if (user) {
        const googleUser: AppUser = {
          uid: user.uid,
          username: user.email?.split('@')[0] || 'google_user',
          email: user.email || '',
          displayName: user.displayName || user.email?.split('@')[0] || 'User',
          role: 'dispatcher',
          createdAt: new Date().toISOString(),
        };
        onSuccess(googleUser);
        onClose();
      }
    } catch (err: any) {
      setError(err?.message || 'Google sign in failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="bg-white border border-slate-300 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 text-slate-400 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors z-10"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Header Strip */}
        <div className="p-6 bg-slate-50 border-b border-slate-200">
          <div className="flex items-center space-x-3 mb-2">
            <div className="h-10 w-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-xs">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-black text-slate-950 tracking-tight">
                {mode === 'login' ? 'Sign In to LogiTrack' : 'Create User Account'}
              </h3>
              <p className="text-xs text-slate-600 font-medium">
                Secure credentials storage & cloud database access
              </p>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="grid grid-cols-2 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 mt-4 text-xs font-bold">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'login'
                  ? 'bg-[#00E676] text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <LogIn className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Login</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('register');
                setError(null);
              }}
              className={`py-2 rounded-lg transition-all flex items-center justify-center space-x-1.5 ${
                mode === 'register'
                  ? 'bg-[#00E676] text-slate-950 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-950'
              }`}
            >
              <UserPlus className="h-3.5 w-3.5 stroke-[2.5]" />
              <span>Register</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center space-x-2 font-semibold">
              <AlertCircle className="h-4 w-4 text-rose-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Username */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Username <span className="text-rose-600">*</span>
            </label>
            <div className="relative">
              <User className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder={mode === 'login' ? 'Username or email' : 'e.g. rahul_dispatch'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
              />
            </div>
          </div>

          {/* Registration only fields */}
          {mode === 'register' && (
            <>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name / Display Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Rahul Sharma"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Address (Optional)
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    placeholder="e.g. rahul@company.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Role
                </label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] cursor-pointer"
                >
                  <option value="dispatcher">Dispatcher (Daily Trips & LRs)</option>
                  <option value="admin">Logistics Administrator (Full Access)</option>
                  <option value="operator">Data Entry Operator</option>
                </select>
              </div>
            </>
          )}

          {/* Password */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700">
                Password <span className="text-rose-600">*</span>
              </label>
              {mode === 'register' && (
                <span className="text-[10px] text-slate-500 font-semibold">Min 6 characters</span>
              )}
            </div>
            <div className="relative">
              <Lock className="absolute left-3.5 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                placeholder="Enter secure password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full pl-10 pr-10 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#00E676] font-mono"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 top-2.5 text-slate-400 hover:text-slate-800"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 px-4 bg-[#00E676] hover:bg-[#00c864] text-slate-950 font-black text-xs sm:text-sm rounded-xl shadow-xs border border-emerald-400 transition-all flex items-center justify-center space-x-2 disabled:opacity-50"
          >
            {loading ? (
              <span>Authenticating...</span>
            ) : mode === 'login' ? (
              <>
                <LogIn className="h-4 w-4 stroke-[2.5]" />
                <span>Sign In to App</span>
              </>
            ) : (
              <>
                <UserPlus className="h-4 w-4 stroke-[2.5]" />
                <span>Create Registered Account</span>
              </>
            )}
          </button>

          {/* Divider */}
          <div className="relative my-3">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-[10px] uppercase">
              <span className="bg-white px-2 text-slate-500 font-bold">Or continue with</span>
            </div>
          </div>

          {/* Fast Demo Login & Google Buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={handleDemoLogin}
              disabled={loading}
              className="py-2 px-3 bg-[#FFB700] hover:bg-[#e6a500] border border-amber-400 text-stone-950 rounded-xl text-xs font-black flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Demo Login</span>
            </button>

            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="py-2 px-3 bg-white hover:bg-slate-50 border border-slate-300 text-slate-800 rounded-xl text-xs font-bold flex items-center justify-center space-x-1.5 transition-all shadow-xs"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.98 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>Google</span>
            </button>
          </div>

          {/* Security Guarantee Footer */}
          <div className="pt-2 text-[10px] text-slate-500 text-center flex items-center justify-center space-x-1 font-medium">
            <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
            <span>Credentials encrypted & hashed securely with SHA-256</span>
          </div>
        </form>
      </div>
    </div>
  );
};
