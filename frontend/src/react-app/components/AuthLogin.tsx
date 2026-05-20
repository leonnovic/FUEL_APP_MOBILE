import { useAuth } from '@/react-app/context/AuthContext';
import { useI18n } from '@/react-app/context/I18nContext';
import LanguagePicker from '@/react-app/components/LanguagePicker';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import {
  Fingerprint, ShieldCheck, Lock, Zap, Cloud,
  Wifi, Server, User, Mail, Eye, EyeOff,
  AlertCircle, CheckCircle2, UserPlus, LogIn, Fuel,
  ArrowLeft, KeyRound, Crown,
  Building
} from 'lucide-react';

type LoginMode = 'email' | 'username' | 'register';

export default function AuthLogin() {
  const navigate = useNavigate();
  const { loginWithEmail, registerWithEmail, loginWithUsername, user, isPending, error, clearError } = useAuth();
  const { t } = useI18n();

  const [mode, setMode] = useState<LoginMode>('email');

  // Form states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [username, setUsername] = useState('');
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirm, setRegConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Company profile fields
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');
  const [companyIndustry, setCompanyIndustry] = useState('fuel_retail');
  const [companyRegNo, setCompanyRegNo] = useState('');
  const [taxId, setTaxId] = useState('');
  const [showCompanyFields, setShowCompanyFields] = useState(false);

  const [localError, setLocalError] = useState('');
  const [success, setSuccess] = useState('');

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      window.location.href = '/';
    }
  }, [user]);

  // Clear errors when switching modes
  useEffect(() => {
    setLocalError('');
    setSuccess('');
    clearError();
  }, [mode, clearError]);

  // Sync auth context error to local
  useEffect(() => {
    if (error) setLocalError(error);
  }, [error]);

  // ---- EMAIL LOGIN ----
  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!email.trim()) { setLocalError('Please enter your email'); return; }
    if (!password) { setLocalError('Please enter your password'); return; }

    const ok = await loginWithEmail(email.trim(), password);
    if (!ok) setLocalError('Invalid email or password');
  };

  // ---- USERNAME LOGIN ----
  const handleUsernameLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    if (!username.trim()) { setLocalError('Please enter your username'); return; }
    if (!password) { setLocalError('Please enter your password'); return; }

    const ok = await loginWithUsername(username.trim(), password);
    if (!ok) setLocalError('Invalid username or password');
  };

  // ---- REGISTER ----
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError('');
    setSuccess('');

    if (!regName.trim()) { setLocalError('Please enter your name'); return; }
    if (!regEmail.trim()) { setLocalError('Please enter your email'); return; }
    if (!regPassword || regPassword.length < 6) { setLocalError('Password must be at least 6 characters'); return; }
    if (regPassword !== regConfirm) { setLocalError('Passwords do not match'); return; }

    const ok = await registerWithEmail(regEmail.trim(), regPassword, regName.trim());
    if (ok) {
      // Save company profile
      if (companyName || companyRegNo || taxId) {
        localStorage.setItem('fuelpro_company_profile', JSON.stringify({
          name: companyName || regName.trim(),
          phone: companyPhone,
          address: companyAddress,
          industry: companyIndustry,
          regNo: companyRegNo,
          taxId: taxId,
          createdAt: new Date().toISOString(),
        }));
      }
      setSuccess('Account created successfully! Logging you in...');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4 overflow-hidden relative">
      <LanguagePicker />
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-indigo-500/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-2 gap-8 relative z-10">
        {/* Left Side - Branding */}
        <div className="hidden lg:flex flex-col justify-center space-y-6">
          <div className="flex items-center gap-4 mb-2">
            <div className="w-14 h-14 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <span className="text-4xl">⛽</span>
            </div>
            <div>
              <h1 className="text-3xl font-bold text-white font-serif tracking-tight">FuelPro</h1>
              <p className="text-sm text-amber-400 font-medium">{t('auth.tagline')}</p>
            </div>
          </div>

          <h2 className="text-xl text-gray-200 leading-relaxed">
            {t('auth.welcome')}
          </h2>

          <div className="space-y-3">
            {[
              { icon: Cloud, title: t('feature.cloud_sync'), desc: t('feature.cloud_sync_desc'), color: 'text-blue-400' },
              { icon: Lock, title: t('feature.secure_auth'), desc: 'Password-based login with encrypted local storage', color: 'text-green-400' },
              { icon: Zap, title: t('feature.realtime_updates'), desc: 'Track sales, deliveries, and payments as they happen', color: 'text-amber-400' },
              { icon: Server, title: t('feature.multistation'), desc: 'Manage unlimited stations with independent data', color: 'text-purple-400' },
              { icon: ShieldCheck, title: t('feature.admin_control'), desc: 'Full system management and configuration panel', color: 'text-emerald-400' },
            ].map(f => (
              <div key={f.title} className="flex items-start gap-3 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all group">
                <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                  <f.icon size={18} className={f.color} />
                </div>
                <div>
                  <p className="text-white font-medium text-sm">{f.title}</p>
                  <p className="text-gray-400 text-xs mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap gap-2">
            {['Fuel Monitoring', 'Invoice System', 'M-PESA Analytics', 'Payroll System'].map(label => (
              <span key={label} className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 text-gray-300 border border-white/10">
                {label}
              </span>
            ))}
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="flex items-center">
          <div className="w-full bg-white/10 backdrop-blur-xl rounded-3xl p-6 md:p-8 shadow-2xl border border-white/20">
            {/* Header */}
            <div className="text-center mb-6">
              <div className="lg:hidden flex items-center justify-center gap-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-amber-600 rounded-xl flex items-center justify-center">
                  <span className="text-2xl">⛽</span>
                </div>
                <div className="text-left">
                  <h1 className="text-lg font-bold text-white font-serif">FuelPro</h1>
                  <p className="text-[10px] text-amber-400">{t('auth.tagline')}</p>
                </div>
              </div>
              <div className="w-14 h-14 mx-auto mb-3 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center shadow-lg">
                <KeyRound size={24} className="text-white" />
              </div>
              <h3 className="text-lg font-bold text-white font-serif">
                {mode === 'register' ? t('auth.create_account') : t('auth.sign_in')}
              </h3>
              <p className="text-gray-400 text-xs mt-1">
                {mode === 'register' ? 'Join FuelPro and manage your stations' : 'Enter your credentials to continue'}
              </p>
            </div>

            {/* Error / Success Messages */}
            {localError && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-red-500/10 border border-red-500/30 rounded-xl">
                <AlertCircle size={14} className="text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-red-300 flex-1">{localError}</p>
              </div>
            )}
            {success && (
              <div className="mb-4 flex items-start gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-xl">
                <CheckCircle2 size={14} className="text-green-400 flex-shrink-0 mt-0.5" />
                <p className="text-xs text-green-300 flex-1">{success}</p>
              </div>
            )}

            {/* Google Sign-In — Emergent-managed OAuth */}
            {/* REMINDER: DO NOT HARDCODE THE URL, OR ADD ANY FALLBACKS OR REDIRECT URLS, THIS BREAKS THE AUTH */}
            <button
              type="button"
              onClick={() => {
                const redirectUrl = window.location.origin + '/';
                window.location.href = `https://auth.emergentagent.com/?redirect=${encodeURIComponent(redirectUrl)}`;
              }}
              className="w-full mb-3 flex items-center justify-center gap-3 py-3 bg-white hover:bg-gray-100 text-gray-800 rounded-xl font-semibold text-sm transition-colors shadow-md"
              data-testid="auth-google-btn"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              {t('auth.continue_google')}
            </button>            <div className="relative mb-4">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-white/10" /></div>
              <div className="relative flex justify-center"><span className="px-3 bg-gray-900 text-[10px] text-gray-500 uppercase tracking-wider">{t('auth.or_with_email')}</span></div>
            </div>

            {/* Mode Tabs - only on login */}
            {mode !== 'register' && (
              <div className="flex bg-white/5 rounded-xl p-1 mb-5 border border-white/10">
                <button
                  onClick={() => setMode('email')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === 'email' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <Mail size={13} /> Email
                </button>
                <button
                  onClick={() => setMode('username')}
                  className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-medium transition-all ${
                    mode === 'username' ? 'bg-indigo-600 text-white shadow-md' : 'text-gray-400 hover:text-gray-300'
                  }`}
                >
                  <User size={13} /> Username
                </button>
              </div>
            )}

            {/* === EMAIL LOGIN FORM === */}
            {mode === 'email' && (
              <form onSubmit={handleEmailLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">{t('auth.email')}</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={email}
                      onChange={e => { setEmail(e.target.value); setLocalError(''); }}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-gray-300">{t('auth.password')}</label>
                    <button type="button" onClick={() => navigate('/reset-password')}
                      className="text-[11px] text-indigo-400 hover:text-indigo-300 transition-colors">
                      {t('auth.forgot_pw')}
                    </button>
                  </div>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setLocalError(''); }}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-3.5 min-h-[44px] px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn size={16} /> {t('auth.sign_in')}</>
                  )}
                </button>
              </form>
            )}

            {/* === USERNAME LOGIN FORM === */}
            {mode === 'username' && (
              <form onSubmit={handleUsernameLogin} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Username</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={username}
                      onChange={e => { setUsername(e.target.value); setLocalError(''); }}
                      placeholder="Enter your username"
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={e => { setPassword(e.target.value); setLocalError(''); }}
                      placeholder="Enter your password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-semibold py-3.5 min-h-[44px] px-6 rounded-xl transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><LogIn size={16} /> Sign In</>
                  )}
                </button>
              </form>
            )}

            {/* === REGISTER FORM === */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Full Name *</label>
                  <div className="relative">
                    <User size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="text"
                      value={regName}
                      onChange={e => { setRegName(e.target.value); setLocalError(''); }}
                      placeholder="John Doe"
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                      autoFocus
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Email Address *</label>
                  <div className="relative">
                    <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={e => { setRegEmail(e.target.value); setLocalError(''); }}
                      placeholder="you@company.com"
                      className="w-full pl-9 pr-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Password * (min 6 chars)</label>
                  <div className="relative">
                    <Lock size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={regPassword}
                      onChange={e => { setRegPassword(e.target.value); setLocalError(''); }}
                      placeholder="Create a password"
                      className="w-full pl-9 pr-10 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">Confirm Password *</label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={regConfirm}
                    onChange={e => { setRegConfirm(e.target.value); setLocalError(''); }}
                    placeholder="Confirm your password"
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-green-500 focus:border-transparent outline-none transition-all"
                  />
                </div>

                {/* Company Profile Section */}
                <div className="pt-2 border-t border-white/10">
                  <button type="button" onClick={() => setShowCompanyFields(!showCompanyFields)}
                    className="flex items-center gap-2 text-xs font-medium text-amber-400 hover:text-amber-300 transition-colors mb-2">
                    <Building size={13} /> {showCompanyFields ? 'Hide' : 'Add'} Company Profile (optional)
                  </button>
                  {showCompanyFields && (
                    <div className="space-y-3 animate-fadeIn">
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Company Name</label>
                        <input type="text" value={companyName} onChange={e => setCompanyName(e.target.value)}
                          placeholder="e.g. Acme Fuel Station Ltd"
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Business Registration Number</label>
                        <input type="text" value={companyRegNo} onChange={e => setCompanyRegNo(e.target.value)}
                          placeholder="e.g. CPR/2024/001234"
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Tax ID / VAT Number</label>
                        <input type="text" value={taxId} onChange={e => setTaxId(e.target.value)}
                          placeholder="e.g. P051234567A"
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Business Phone</label>
                        <input type="tel" value={companyPhone} onChange={e => setCompanyPhone(e.target.value)}
                          placeholder="+254 700 000 000"
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Business Address</label>
                        <input type="text" value={companyAddress} onChange={e => setCompanyAddress(e.target.value)}
                          placeholder="123 Mombasa Road, Nairobi"
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm placeholder-gray-500 focus:ring-2 focus:ring-amber-500 outline-none" />
                      </div>
                      <div>
                        <label className="block text-[11px] font-medium text-gray-400 mb-1">Industry Type</label>
                        <select value={companyIndustry} onChange={e => setCompanyIndustry(e.target.value)}
                          className="w-full px-4 py-2 bg-white/5 border border-white/20 rounded-xl text-white text-sm focus:ring-2 focus:ring-amber-500 outline-none">
                          <option value="fuel_retail" className="bg-gray-800">Fuel Retail Station</option>
                          <option value="fuel_wholesale" className="bg-gray-800">Fuel Wholesale</option>
                          <option value="fuel_transport" className="bg-gray-800">Fuel Transport</option>
                          <option value="fuel_storage" className="bg-gray-800">Fuel Storage Depot</option>
                          <option value="convenience_store" className="bg-gray-800">Convenience Store</option>
                          <option value="other" className="bg-gray-800">Other</option>
                        </select>
                      </div>
                    </div>
                  )}
                </div>
                <button
                  type="submit"
                  disabled={isPending}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white font-semibold py-3.5 min-h-[44px] px-6 rounded-xl transition-all shadow-lg shadow-green-500/20 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isPending ? (
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <><UserPlus size={16} /> Create Account</>
                  )}
                </button>
              </form>
            )}

            {/* Switch between login and register */}
            <div className="mt-5 pt-4 border-t border-white/10 text-center">
              {mode === 'register' ? (
                <button
                  onClick={() => setMode('email')}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
                >
                  <ArrowLeft size={12} /> Already have an account? Sign in
                </button>
              ) : (
                <button
                  onClick={() => setMode('register')}
                  className="text-xs text-gray-400 hover:text-white flex items-center gap-1 mx-auto transition-colors"
                >
                  <UserPlus size={12} /> {t('auth.new_to_fuelpro')}
                </button>
              )}
              <button
                onClick={() => navigate('/founder')}
                className="mt-2 text-xs text-amber-500/70 hover:text-amber-400 flex items-center gap-1 mx-auto transition-colors"
              >
                <Crown size={12} /> {t('auth.founder_access')}
              </button>
            </div>

            {/* Trust indicators */}
            <div className="mt-4 flex items-center justify-center gap-4 text-[10px] text-gray-500">
              <span className="flex items-center gap-1">
                <ShieldCheck size={10} className="text-green-500" /> Secure
              </span>
              <span className="flex items-center gap-1">
                <Lock size={10} className="text-green-500" /> Encrypted
              </span>
              <span className="flex items-center gap-1">
                <Wifi size={10} className="text-green-500" /> Any Device
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
