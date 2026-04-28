import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  Phone,
  ShieldAlert,
  Users,
  ShieldCheck,
  AlertTriangle,
  RefreshCcw,
  Key,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../AuthContext';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export default function AuthScreen() {
  const { loginWithEmail, registerWithEmail } = useAuth();

  const [tab, setTab] = useState<'signin' | 'signup'>('signin');
  const [accountType, setAccountType] = useState<'shop' | 'admin'>('shop');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Sign In fields
  const [siEmail, setSiEmail] = useState('');
  const [siPassword, setSiPassword] = useState('');

  // Sign Up fields
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [contact, setContact] = useState('');
  const [suEmail, setSuEmail] = useState('');
  const [suPassword, setSuPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [adminKey, setAdminKey] = useState('');

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!siEmail || !siPassword) {
      setError('Please fill in all fields.');
      return;
    }
    setIsSubmitting(true);
    try {
      await loginWithEmail(siEmail, siPassword);
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else if (code === 'auth/too-many-requests') {
        setError('Too many attempts. Please wait a moment before trying again.');
      } else {
        setError(err.message || 'Sign in failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    if (!contact.trim()) {
      setError('Please enter a contact number.');
      return;
    }
    if (!suEmail || !suPassword || !confirmPassword) {
      setError('Please fill in all fields.');
      return;
    }
    if (suPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (suPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (accountType === 'admin' && !adminKey.trim()) {
      setError('Enterprise Authorization Key is required for admin accounts.');
      return;
    }

    setIsSubmitting(true);
    try {
      const displayName = `${firstName.trim()} ${lastName.trim()}`;
      await registerWithEmail(
        suEmail,
        suPassword,
        displayName,
        accountType,
        contact,
        accountType === 'admin' ? adminKey : undefined
      );
    } catch (err: any) {
      const code = err?.code || '';
      if (code === 'auth/email-already-in-use') {
        setError('An account with this email already exists. Please sign in.');
      } else if (code === 'auth/weak-password') {
        setError('Password must be at least 6 characters.');
      } else if (code === 'auth/invalid-email') {
        setError('Please enter a valid email address.');
      } else {
        setError(err.message || 'Registration failed. Please try again.');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

    return (
    <div className="min-h-screen bg-[#0f172a] flex items-center justify-center py-6 px-4 relative overflow-hidden">

      {/* Background glow */}
      <div className="fixed top-0 right-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[120px] rounded-full pointer-events-none" />
      <div className="fixed bottom-0 left-0 w-[400px] h-[400px] bg-pink-500/5 blur-[120px] rounded-full pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg glass-card relative z-10 overflow-hidden max-h-[92vh] flex flex-col"
      >

        {/* Header */}
        <div className="p-8 pb-0 text-center">
          <div className="w-14 h-14 bg-indigo-500 rounded-2xl flex items-center justify-center text-white text-2xl font-bold mx-auto mb-5 shadow-lg shadow-indigo-500/20">
            V
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">VaultStock</h1>
          <p className="text-white/40 text-sm mt-1">Collaborative Clothing Enterprise Management</p>
        </div>

        {/* Tab switcher: Sign In / Sign Up */}
        <div className="flex mx-8 mt-8 bg-white/[0.03] rounded-xl p-1 border border-white/5">
          <button
            onClick={() => { setTab('signin'); setError(''); }}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all",
              tab === 'signin' ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Sign In
          </button>
          <button
            onClick={() => { setTab('signup'); setError(''); }}
            className={cn(
              "flex-1 py-2.5 rounded-lg text-sm font-bold uppercase tracking-widest transition-all",
              tab === 'signup' ? "bg-indigo-500 text-white shadow-lg" : "text-white/40 hover:text-white"
            )}
          >
            Sign Up
          </button>
        </div>

        <div className="px-8 py-6 flex-1 overflow-y-auto custom-scrollbar">

          {/* Error display */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-6 p-4 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-3 text-rose-400 text-sm"
              >
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{error}</p>
              </motion.div>
            )}
          </AnimatePresence>

          <AnimatePresence mode="wait">

            {/* SIGN IN TAB */}
            {tab === 'signin' && (
              <motion.form
                key="signin"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                onSubmit={handleSignIn}
                className="space-y-4"
              >
                {/* Email */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Mail size={10} /> Email Address
                  </label>
                  <input
                    type="email"
                    value={siEmail}
                    onChange={e => setSiEmail(e.target.value)}
                    placeholder="enterprise@vaultstock.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                  />
                </div>

                {/* Password */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Lock size={10} /> Password
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={siPassword}
                      onChange={e => setSiPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Submit */}
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-4 mt-2 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  {isSubmitting
                    ? <RefreshCcw size={18} className="animate-spin" />
                    : <><ShieldCheck size={18} /> Access Enterprise</>
                  }
                </button>

                {/* Hint to sign up */}
                <p className="text-center text-xs text-white/30 pt-2">
                  New to VaultStock?{' '}
                  <button
                    type="button"
                    onClick={() => { setTab('signup'); setError(''); }}
                    className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                  >
                    Create an account
                  </button>
                </p>
              </motion.form>
            )}

            {/* SIGN UP TAB */}
            {tab === 'signup' && (
              <motion.div
                key="signup"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                {/* Account type selector */}
                <div className="grid grid-cols-2 gap-3 mb-6">
                  <button
                    type="button"
                    onClick={() => { setAccountType('shop'); setError(''); }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2.5",
                      accountType === 'shop'
                        ? "bg-emerald-500/10 border-emerald-500 shadow-lg shadow-emerald-500/10"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg transition-all",
                      accountType === 'shop' ? "bg-emerald-500 text-white" : "bg-white/10 text-white/30"
                    )}>
                      <Users size={16} />
                    </div>
                    <span className={cn("font-bold text-[10px] uppercase tracking-widest",
                      accountType === 'shop' ? "text-white" : "text-white/40"
                    )}>
                      Shop Account
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => { setAccountType('admin'); setError(''); }}
                    className={cn(
                      "p-4 rounded-xl border-2 transition-all flex flex-col items-center gap-2.5",
                      accountType === 'admin'
                        ? "bg-indigo-500/10 border-indigo-500 shadow-lg shadow-indigo-500/10"
                        : "bg-white/[0.02] border-white/5 hover:bg-white/[0.05]"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg transition-all",
                      accountType === 'admin' ? "bg-indigo-500 text-white" : "bg-white/10 text-white/30"
                    )}>
                      <ShieldAlert size={16} />
                    </div>
                    <span className={cn("font-bold text-[10px] uppercase tracking-widest",
                      accountType === 'admin' ? "text-white" : "text-white/40"
                    )}>
                      Admin Account
                    </span>
                  </button>
                </div>

                {/* Registration form */}
                <form onSubmit={handleSignUp} className="space-y-4">

                  {/* First name + Last name */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <User size={10} /> First Name
                      </label>
                      <input
                        type="text"
                        value={firstName}
                        onChange={e => setFirstName(e.target.value)}
                        placeholder="John"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-1.5">
                        <User size={10} /> Last Name
                      </label>
                      <input
                        type="text"
                        value={lastName}
                        onChange={e => setLastName(e.target.value)}
                        placeholder="Doe"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                      />
                    </div>
                  </div>

                  {/* Contact number */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Phone size={10} /> Contact Number
                    </label>
                    <input
                      type="tel"
                      value={contact}
                      onChange={e => setContact(e.target.value)}
                      placeholder="+232 76 000 000"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                    />
                  </div>

                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Mail size={10} /> Email Address
                    </label>
                    <input
                      type="email"
                      value={suEmail}
                      onChange={e => setSuEmail(e.target.value)}
                      placeholder="enterprise@vaultstock.com"
                      className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all text-sm"
                    />
                  </div>

                  {/* Password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Lock size={10} /> Password
                    </label>
                    <div className="relative">
                      <input
                        type={showPassword ? 'text' : 'password'}
                        value={suPassword}
                        onChange={e => setSuPassword(e.target.value)}
                        placeholder="Min. 6 characters"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm password */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-white/30 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Lock size={10} /> Confirm Password
                    </label>
                    <div className="relative">
                      <input
                        type={showConfirmPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        placeholder="Repeat password"
                        className="w-full bg-white/[0.03] border border-white/10 rounded-xl px-4 py-3.5 pr-12 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/50 transition-all font-mono text-sm"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        className="absolute right-4 top-1/2 -translate-y-1/2 text-white/20 hover:text-white/60 transition-colors"
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {confirmPassword && (
                      <p className={cn("text-[10px] font-bold uppercase tracking-widest pl-1",
                        suPassword === confirmPassword ? "text-emerald-400" : "text-rose-400"
                      )}>
                        {suPassword === confirmPassword ? "✓ Passwords match" : "✗ Passwords do not match"}
                      </p>
                    )}
                  </div>

                  {/* Admin key */}
                  <AnimatePresence>
                    {accountType === 'admin' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="space-y-1.5 overflow-hidden"
                      >
                        <label className="text-[10px] font-bold text-indigo-400/70 uppercase tracking-[0.2em] flex items-center gap-2">
                          <Key size={10} /> Enterprise Authorization Key
                        </label>
                        <input
                          type="password"
                          value={adminKey}
                          onChange={e => setAdminKey(e.target.value)}
                          placeholder="••••••••••••••••"
                          className="w-full bg-indigo-500/[0.05] border border-indigo-500/20 rounded-xl px-4 py-3.5 text-white placeholder:text-white/15 focus:outline-none focus:border-indigo-500/60 transition-all font-mono text-sm"
                        />
                        <p className="text-[9px] text-indigo-400/40 font-bold uppercase tracking-widest pl-1">
                          Required for Administrator access. Contact your enterprise owner.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Submit */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className={cn(
                      "w-full py-4 mt-2 disabled:opacity-50 text-white rounded-xl font-bold uppercase tracking-widest shadow-xl transition-all flex items-center justify-center gap-3 active:scale-95",
                      accountType === 'admin'
                        ? "bg-indigo-500 hover:bg-indigo-400 shadow-indigo-500/20"
                        : "bg-emerald-600 hover:bg-emerald-500 shadow-emerald-500/20"
                    )}
                  >
                    {isSubmitting
                      ? <RefreshCcw size={18} className="animate-spin" />
                      : <><ShieldCheck size={18} /> Create {accountType === 'admin' ? 'Admin' : 'Shop'} Account</>
                    }
                  </button>

                  {/* Hint to sign in */}
                  <p className="text-center text-xs text-white/30 pt-1">
                    Already have an account?{' '}
                    <button
                      type="button"
                      onClick={() => { setTab('signin'); setError(''); }}
                      className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
                    >
                      Sign in
                    </button>
                  </p>
                </form>
              </motion.div>
            )}

          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
}