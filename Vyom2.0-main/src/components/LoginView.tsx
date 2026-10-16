import React, { useState } from 'react';
import { supabaseService } from '../services/supabaseClient';
import { UserSession } from '../types/risk';
import { Eye, EyeOff, Lock, Mail, User, Shield, ArrowRight, Database } from 'lucide-react';

interface LoginViewProps {
  onLoginSuccess: (user: UserSession) => void;
  isSupabaseConfigured: boolean;
  onOpenSettings: () => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  onLoginSuccess,
  isSupabaseConfigured,
  onOpenSettings,
}) => {
  const [isRegister, setIsRegister] = useState(false);
  const [isReset, setIsReset] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);
    setLoading(true);

    try {
      if (isReset) {
        if (!email) {
          setErrorMessage('Please enter your email address to receive reset instructions.');
          setLoading(false);
          return;
        }
        const res = await supabaseService.resetPassword(email);
        setLoading(false);
        if (res.success) {
          setSuccessMessage(res.message);
        } else {
          setErrorMessage(res.message);
        }
        return;
      }

      if (isRegister) {
        if (!email || !password) {
          setErrorMessage('Email and password are required.');
          setLoading(false);
          return;
        }
        const res = await supabaseService.signUp(email, password, fullName);
        setLoading(false);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
        }
      } else {
        // Sign in
        if (!email || !password) {
          setErrorMessage('Email and password are required.');
          setLoading(false);
          return;
        }
        const res = await supabaseService.signIn(email, password);
        setLoading(false);
        if (res.error) {
          setErrorMessage(res.error);
        } else if (res.user) {
          onLoginSuccess(res.user);
        }
      }
    } catch (err: any) {
      setLoading(false);
      setErrorMessage(err.message || 'An unexpected authentication error occurred.');
    }
  };

  const handleDemoLogin = async () => {
    setLoading(true);
    const demoUser: UserSession = {
      id: 'demo-analyst',
      email: 'analyst@vyom-risk.tn.gov.in',
      fullName: 'S. Ramanathan',
      role: 'Catastrophe Risk Underwriter',
      organization: 'Tamil Nadu Catastrophe Risk Authority',
    };
    setTimeout(() => {
      onLoginSuccess(demoUser);
    }, 400);
  };

  return (
    <div className="min-h-screen w-full flex bg-[#07090c] text-[#f8fafc]">
      {/* Left Column: Brand & Geometric Artwork (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#090b0e] border-r border-[#1a2230] p-12 flex-col justify-between overflow-hidden">
        {/* Subtle geometric lines backdrop */}
        <div className="absolute inset-0 opacity-20 pointer-events-none">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
                <path d="M 60 0 L 0 0 0 60" fill="none" stroke="#24334a" strokeWidth="0.5" />
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
            {/* Fine central diamond outline */}
            <circle cx="50%" cy="50%" r="220" stroke="#d4af37" strokeWidth="0.75" fill="none" />
            <circle cx="50%" cy="50%" r="320" stroke="#23344a" strokeWidth="0.5" fill="none" />
            <line x1="10%" y1="50%" x2="90%" y2="50%" stroke="#d4af37" strokeWidth="0.75" />
            <line x1="50%" y1="10%" x2="50%" y2="90%" stroke="#d4af37" strokeWidth="0.75" />
          </svg>
        </div>

        {/* Brand Lockup */}
        <div className="relative z-10 flex items-center gap-3">
          <div className="w-9 h-9 rounded border border-[#d4af37]/60 flex items-center justify-center bg-[#131923]">
            <span className="text-[#d4af37] font-mono font-bold">V</span>
          </div>
          <div>
            <div className="text-xl font-bold tracking-[0.25em] text-[#f8fafc]">
              VYOM<span className="text-[#d4af37]">.</span>
            </div>
            <div className="text-[10px] tracking-widest text-[#64748b] uppercase font-mono">
              Catastrophe Risk Intelligence
            </div>
          </div>
        </div>

        {/* Center Philosophy Statement */}
        <div className="relative z-10 max-w-lg space-y-4">
          <div className="text-xs font-mono uppercase tracking-widest text-[#d4af37]">
            Tamil Nadu Peril Baseline
          </div>
          <h2 className="text-2xl font-light tracking-wide text-[#f8fafc] leading-snug">
            Restraint, precision, and zero black-box opacity in catastrophe modeling.
          </h2>
          <p className="text-xs text-[#94a3b8] leading-relaxed">
            From Bay of Bengal cyclonic surges across Nagapattinam and Cuddalore to urban drainage
            bottlenecks in Chennai, VYOM delivers auditable loss anatomy grounded in local IS code
            fragility curves.
          </p>

          <div className="pt-4 grid grid-cols-3 gap-3 border-t border-[#1a2332] font-mono text-[11px]">
            <div>
              <div className="text-[#64748b] text-[10px]">Stochastic Runs</div>
              <div className="text-[#dfba4f] font-semibold mt-0.5">10,000 Events</div>
            </div>
            <div>
              <div className="text-[#64748b] text-[10px]">Micro-Zones</div>
              <div className="text-[#dfba4f] font-semibold mt-0.5">9 Districts</div>
            </div>
            <div>
              <div className="text-[#64748b] text-[10px]">Coordinate System</div>
              <div className="text-[#dfba4f] font-semibold mt-0.5">EPSG:4326</div>
            </div>
          </div>
        </div>

        {/* Footer Disclaimer */}
        <div className="relative z-10 text-[10px] text-[#556377] font-mono">
          “This report supports expert review and is not an automatic underwriting decision.”
        </div>
      </div>

      {/* Right Column: Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 relative">
        <div className="w-full max-w-md space-y-6">
          {/* Mobile Brand Header */}
          <div className="lg:hidden flex items-center gap-2 mb-6">
            <div className="w-8 h-8 rounded border border-[#d4af37]/60 flex items-center justify-center bg-[#131923]">
              <span className="text-[#d4af37] font-mono font-bold">V</span>
            </div>
            <span className="text-lg font-bold tracking-[0.2em] text-[#f8fafc]">VYOM</span>
          </div>

          <div>
            <h2 className="text-xl font-bold tracking-tight text-[#f8fafc]">
              {isReset
                ? 'Reset Access Password'
                : isRegister
                ? 'Register Underwriter Account'
                : 'Terminal Access Login'}
            </h2>
            <p className="text-xs text-[#94a3b8] mt-1">
              {isReset
                ? 'Enter your registered email to receive authentication reset instructions.'
                : isRegister
                ? 'Create a verified credential profile linked to your Supabase instance.'
                : 'Enter your credentials to enter the catastrophe intelligence workspace.'}
            </p>
          </div>

          {/* Database Connection Notice */}
          <div className="p-3 rounded-md bg-[#0e131b] border border-[#1e2736] flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2 text-[#94a3b8]">
              <Database className="w-3.5 h-3.5 text-[#d4af37]" />
              <span style={{ fontFamily: 'Arial' }}>Database Backend:</span>
            </div>
            <span
              className={`text-[10px] px-1.5 py-0.5 rounded ${
                isSupabaseConfigured
                  ? 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/40'
                  : 'text-amber-300 bg-amber-950/40 border border-amber-800/40'
              }`}
            >
              {isSupabaseConfigured ? 'Supabase Connected' : 'Local Demo Active'}
            </span>
          </div>

          {/* Error & Success Messages */}
          {errorMessage && (
            <div className="p-3 rounded bg-rose-950/40 border border-rose-800/50 text-xs text-rose-300 font-mono">
              {errorMessage}
            </div>
          )}
          {successMessage && (
            <div className="p-3 rounded bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-300 font-mono">
              {successMessage}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {isRegister && (
              <div>
                <label className="block text-xs font-mono text-[#cbd5e1] mb-1">Full Name</label>
                <div className="relative">
                  <User className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dr. A. Selvaraj"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-mono text-[#cbd5e1] mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="underwriter@vyom.tn.gov.in"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none"
                />
              </div>
            </div>

            {!isReset && (
              <div>
                <div className="flex justify-between text-xs font-mono mb-1">
                  <span className="text-[#cbd5e1]">Password</span>
                  <button
                    type="button"
                    onClick={() => {
                      setIsReset(true);
                      setErrorMessage(null);
                    }}
                    className="text-[#64748b] hover:text-[#d4af37] transition-colors cursor-pointer text-[11px]"
                  >
                    Forgot password?
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-[#64748b] absolute left-3 top-2.5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 rounded bg-[#090b0e] border border-[#1f293a] text-xs font-mono text-[#f8fafc] focus:border-[#d4af37] outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-[#64748b] hover:text-[#cbd5e1] cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded bg-[#d4af37] hover:bg-[#dfba4f] text-[#0a0d13] font-semibold text-xs font-mono transition-colors shadow-lg shadow-[#d4af37]/10 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
            >
              <span>
                {loading
                  ? 'Authenticating...'
                  : isReset
                  ? 'Send Reset Link'
                  : isRegister
                  ? 'Create Underwriter Account'
                  : 'Enter Terminal'}
              </span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          {/* Alternate Mode Links */}
          <div className="pt-2 text-center text-xs font-mono text-[#64748b] space-y-2">
            {isReset ? (
              <button
                type="button"
                onClick={() => {
                  setIsReset(false);
                  setErrorMessage(null);
                }}
                className="text-[#dfba4f] hover:underline cursor-pointer"
              >
                ← Return to Login
              </button>
            ) : isRegister ? (
              <div>
                <span>Already registered? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(false);
                    setErrorMessage(null);
                  }}
                  className="text-[#dfba4f] hover:underline cursor-pointer font-medium"
                >
                  Sign in here
                </button>
              </div>
            ) : (
              <div>
                <span>New underwriter? </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsRegister(true);
                    setErrorMessage(null);
                  }}
                  className="text-[#dfba4f] hover:underline cursor-pointer font-medium"
                >
                  Register credential
                </button>
              </div>
            )}

            {/* Quick Demo Mode Action */}
            <div className="pt-4 border-t border-[#1a2230]">
              <button
                type="button"
                onClick={handleDemoLogin}
                className="w-full py-2 px-3 rounded bg-[#121822] hover:bg-[#18212e] border border-[#242f42] text-xs font-mono text-[#cbd5e1] hover:text-[#f8fafc] transition-colors cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>Instant Demo Access (Local Portfolio Mode)</span>
                <span className="text-[#d4af37]">→</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
