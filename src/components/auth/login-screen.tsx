'use client';

import { useState, useCallback, useEffect, useSyncExternalStore } from 'react';
import {
  Fuel,
  Shield,
  Cloud,
  RefreshCw,
  Building,
  User,
  Eye,
  EyeOff,
  Lock,
  Mail,
  Zap,
  Check,
  Loader2,
  Phone,
  UserPlus,
  LogIn,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

interface LoginScreenProps {
  onLogin: () => void;
}

// NOTE: Hardcoded demo/seed data has been REMOVED.
// All data now comes from the real database via API endpoints.
// The /api/auth/demo endpoint creates sample data in the database when a demo user is created.
// The fuel store's syncFromServer() method fetches real data from the API.

// Animated background particles - client-only to avoid hydration mismatch
function BackgroundParticles() {
  // useSyncExternalStore avoids hydration mismatch: returns false on server, true on client
  const mounted = useSyncExternalStore(
    () => () => {}, // subscribe (noop)
    () => true,     // getSnapshot (client)
    () => false     // getServerSnapshot
  );

  if (!mounted) return null;

  // Deterministic pseudo-random generator
  const seededRandom = (seed: number) => {
    const x = Math.sin(seed * 9301 + 49297) * 49297;
    return x - Math.floor(x);
  };

  const particles = Array.from({ length: 20 }, (_, i) => ({
    id: i,
    x: seededRandom(i * 7 + 1) * 100,
    y: seededRandom(i * 13 + 3) * 100,
    size: seededRandom(i * 17 + 5) * 80 + 20,
    duration: seededRandom(i * 23 + 7) * 20 + 15,
    delay: seededRandom(i * 29 + 11) * 5,
  }));

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute rounded-full bg-white/5"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            width: `${p.size}px`,
            height: `${p.size}px`,
            animation: `fadeIn 2s ease-out ${p.delay}s both, pulse-subtle ${p.duration}s ease-in-out ${p.delay}s infinite`,
          }}
        />
      ))}
    </div>
  );
}

// Feature cards data
const features = [
  { icon: Cloud, title: 'Cloud Sync', desc: 'Data synced across all devices' },
  { icon: Shield, title: 'Secure Auth', desc: 'Enterprise-grade security' },
  { icon: RefreshCw, title: 'Real-Time', desc: 'Live updates instantly' },
  { icon: Building, title: 'Multi-Station', desc: 'Manage multiple locations' },
  { icon: User, title: 'Admin Control', desc: 'Full role-based access' },
];

// Module tags
const modules = ['Fuel Monitoring', 'Invoice System', 'M-PESA Analytics', 'Payroll System'];

// Stats counter data
const stats = [
  { value: 50, suffix: '+', label: 'Stations' },
  { value: 10, suffix: 'K+', label: 'Users' },
  { value: 1, suffix: 'M+', label: 'Transactions' },
  { value: 99.9, suffix: '%', label: 'Uptime' },
];

// Animated counter hook
function useCountUp(target: number, duration: number = 2000, startOnMount: boolean = true) {
  const [count, setCount] = useState(0);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    if (!startOnMount || started) return;
    const timer = setTimeout(() => setStarted(true), 1200);
    return () => clearTimeout(timer);
  }, [startOnMount, started]);

  useEffect(() => {
    if (!started) return;
    const startTime = Date.now();
    const isDecimal = target % 1 !== 0;
    const step = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
      const current = eased * target;
      setCount(isDecimal ? parseFloat(current.toFixed(1)) : Math.floor(current));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return count;
}

// Stats counter row component
function StatsCounter() {
  return (
    <div
      className="flex justify-center gap-6 md:gap-10 mb-8 animate-fade-in"
      style={{ animationDelay: '0.9s' }}
    >
      {stats.map((stat, i) => (
        <StatItem key={stat.label} stat={stat} delay={i * 200} />
      ))}
    </div>
  );
}

function StatItem({ stat, delay }: { stat: typeof stats[number]; delay: number }) {
  const count = useCountUp(stat.value, 2000);
  const displayValue = stat.value % 1 !== 0 ? count.toFixed(1) : count;
  return (
    <div
      className="text-center animate-number-slide"
      style={{ animationDelay: `${1.2 + delay / 1000}s` }}
    >
      <div className="text-xl md:text-2xl font-bold gradient-text-amber">
        {displayValue}{stat.suffix}
      </div>
      <div className="text-[10px] md:text-xs text-slate-400 mt-0.5">{stat.label}</div>
    </div>
  );
}

// Password strength calculator
function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  if (!password) return { score: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score++;
  if (password.length >= 10) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;

  if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
  if (score <= 2) return { score: 2, label: 'Fair', color: 'bg-orange-500' };
  if (score <= 3) return { score: 3, label: 'Medium', color: 'bg-amber-500' };
  if (score <= 4) return { score: 4, label: 'Strong', color: 'bg-emerald-500' };
  return { score: 5, label: 'Very Strong', color: 'bg-emerald-400' };
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [activeTab, setActiveTab] = useState<string>('signin');

  // Sign In state
  const [signInEmail, setSignInEmail] = useState('');
  const [signInPassword, setSignInPassword] = useState('');
  const [showSignInPassword, setShowSignInPassword] = useState(false);
  const [signInError, setSignInError] = useState<string | null>(null);
  const [signInLoading, setSignInLoading] = useState(false);

  // Register state
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [regError, setRegError] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  // Demo mode
  const [demoLoading, setDemoLoading] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);

  const authStore = useAuthStore();
  const { addStation } = useStationStore();

  const passwordStrength = getPasswordStrength(regPassword);

  // Sign In handler
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setSignInError(null);
    setSignInLoading(true);

    try {
      await authStore.login(signInEmail, signInPassword);
      if (authStore.isAuthenticated) {
        onLogin();
      } else {
        setSignInError(authStore.error || 'Invalid email or password');
      }
    } catch {
      setSignInError('An unexpected error occurred. Please try again.');
    } finally {
      setSignInLoading(false);
    }
  };

  // Register handler
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError(null);

    // Validate
    if (regPassword !== regConfirmPassword) {
      setRegError('Passwords do not match');
      return;
    }
    if (regPassword.length < 6) {
      setRegError('Password must be at least 6 characters');
      return;
    }

    setRegLoading(true);

    try {
      await authStore.register(regEmail, regName, regPassword, regPhone || undefined);
      if (authStore.isAuthenticated) {
        onLogin();
      } else {
        setRegError(authStore.error || 'Registration failed. Please try again.');
      }
    } catch {
      setRegError('An unexpected error occurred. Please try again.');
    } finally {
      setRegLoading(false);
    }
  };

  // Demo Mode handler - calls /api/auth/demo to create a demo user in the DB
  const handleDemoLogin = useCallback(async () => {
    setDemoLoading(true);
    try {
      const res = await fetch('/api/auth/demo', { method: 'POST' });
      const data = await res.json();

      if (!data.data) {
        setSignInError('Failed to start demo mode');
        setDemoLoading(false);
        return;
      }

      const { user: demoUser, token } = data.data;

      // Set the auth store with the demo user data
      authStore.setUser({
        id: demoUser.id,
        email: demoUser.email,
        name: demoUser.name,
        role: demoUser.role,
        tier: demoUser.tier,
        phone: demoUser.phone,
        permissions: demoUser.permissions || [],
        assignedStations: demoUser.assignedStations || [],
        token,
      });

      // Add station to local store if returned (with the real database ID)
      if (data.data.station) {
        addStation({
          id: data.data.station.id,
          name: data.data.station.name,
          location: data.data.station.location,
          country: 'Kenya',
          currency: 'KES',
          ownerId: demoUser.id,
        });
      } else if (demoUser.assignedStations && demoUser.assignedStations.length > 0) {
        // For existing users, fetch station details from API
        try {
          const stationsRes = await fetch('/api/stations', {
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          });
          const stationsData = await stationsRes.json();
          if (stationsData.data?.length > 0) {
            const apiStations = stationsData.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              location: s.location,
              country: s.country || 'Kenya',
              currency: s.currency || 'KES',
              ownerId: s.ownerId,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            }));
            useStationStore.getState().setStations(apiStations);
          }
        } catch {
          // If API fetch fails, the page.tsx will try again
        }
      }

      // Data will be synced from the server via syncFromServer() in page.tsx

      // Show success animation
      setShowSuccess(true);
      setTimeout(() => {
        onLogin();
      }, 900);
    } catch {
      // Fallback: if API fails, show error - no more local demo seeding
      setSignInError('Demo mode unavailable. Please try again or register an account.');
      setDemoLoading(false);
    }
  }, [authStore, addStation, onLogin]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 relative flex flex-col items-center justify-center p-4 overflow-hidden noise-overlay">
      <BackgroundParticles />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Branding - with gradient text and CSS animation */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-3">
            <Fuel className="size-10 md:size-12 text-amber-400 animate-float" />
            <span className="gradient-text">FuelPro</span>
          </h1>
          <div className="mt-2 text-lg" style={{ display: 'flex', justifyContent: 'center' }}>
            <span className="typewriter-text text-slate-300">
              Professional Fuel Management
            </span>
          </div>
        </div>

        {/* Feature cards - staggered entrance with CSS animations */}
        <div className="hidden md:grid grid-cols-5 gap-3 mb-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-slide-up"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm text-center py-3 px-2 gap-2 hover:bg-white/10 transition-all duration-200 hover:scale-105 hover:border-white/20 cursor-default hover:amber-glow">
                <CardContent className="p-0">
                  <f.icon className="size-6 text-amber-400 mx-auto mb-1" />
                  <p className="text-white text-xs font-semibold">{f.title}</p>
                  <p className="text-slate-400 text-[10px]">{f.desc}</p>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>

        {/* Module tags */}
        <div
          className="flex flex-wrap justify-center gap-2 mb-4 animate-fade-in"
          style={{ animationDelay: '0.7s' }}
        >
          {modules.map((mod) => (
            <span
              key={mod}
              className="px-3 py-1 rounded-full text-xs font-medium bg-white/10 text-slate-300 border border-white/10 hover:bg-white/15 hover:border-white/20 transition-all duration-200"
            >
              {mod}
            </span>
          ))}
        </div>

        {/* Stats Counter */}
        <StatsCounter />

        {/* Sign In / Register Card - Glassmorphism with backdrop-blur-xl */}
        <div
          className="animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <Card className="gradient-border bg-white/5 backdrop-blur-xl border-white/15 max-w-md mx-auto shadow-2xl shadow-black/20">
            <CardHeader className="text-center pb-0">
              <CardTitle className="text-white text-xl">Welcome to FuelPro</CardTitle>
              <CardDescription className="text-slate-300">
                Sign in or create an account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tabs: Sign In / Register */}
              <Tabs value={activeTab} onValueChange={(v) => { setActiveTab(v); setSignInError(null); setRegError(null); }} className="w-full">
                <TabsList className="w-full bg-white/10 border border-white/10">
                  <TabsTrigger
                    value="signin"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-400 flex-1"
                  >
                    <LogIn className="size-4 mr-1" />
                    Sign In
                  </TabsTrigger>
                  <TabsTrigger
                    value="register"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-400 flex-1"
                  >
                    <UserPlus className="size-4 mr-1" />
                    Register
                  </TabsTrigger>
                </TabsList>

                {/* Sign In Tab */}
                <TabsContent value="signin" className="mt-4">
                  <form onSubmit={handleSignIn} className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type="email"
                          value={signInEmail}
                          onChange={(e) => setSignInEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type={showSignInPassword ? 'text' : 'password'}
                          value={signInPassword}
                          onChange={(e) => setSignInPassword(e.target.value)}
                          placeholder="Enter your password"
                          required
                          className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowSignInPassword(!showSignInPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showSignInPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                    </div>

                    {signInError && (
                      <p className="text-sm text-red-400 text-center animate-fade-in">{signInError}</p>
                    )}

                    <div className="flex justify-end">
                      <button
                        type="button"
                        className="text-xs text-amber-400 hover:text-amber-300 transition-colors"
                      >
                        Forgot Password?
                      </button>
                    </div>

                    <Button
                      type="submit"
                      disabled={signInLoading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-10 transition-all duration-200 hover:scale-105 active:scale-100"
                    >
                      {signInLoading ? (
                        <Loader2 className="animate-spin mr-2 size-4" />
                      ) : (
                        <LogIn className="size-4 mr-2" />
                      )}
                      Sign In
                    </Button>
                  </form>
                </TabsContent>

                {/* Register Tab */}
                <TabsContent value="register" className="mt-4">
                  <form onSubmit={handleRegister} className="space-y-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Full Name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          value={regName}
                          onChange={(e) => setRegName(e.target.value)}
                          placeholder="John Doe"
                          required
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Email Address</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type="email"
                          value={regEmail}
                          onChange={(e) => setRegEmail(e.target.value)}
                          placeholder="you@example.com"
                          required
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Phone (optional)</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          value={regPhone}
                          onChange={(e) => setRegPhone(e.target.value)}
                          placeholder="+254 7XX XXX XXX"
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type={showRegPassword ? 'text' : 'password'}
                          value={regPassword}
                          onChange={(e) => setRegPassword(e.target.value)}
                          placeholder="Create a strong password"
                          required
                          minLength={6}
                          className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                        <button
                          type="button"
                          onClick={() => setShowRegPassword(!showRegPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                        >
                          {showRegPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                        </button>
                      </div>
                      {/* Password strength indicator */}
                      {regPassword && (
                        <div className="space-y-1.5 animate-fade-in">
                          <div className="flex gap-1">
                            {[1, 2, 3, 4, 5].map((level) => (
                              <div
                                key={level}
                                className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                                  level <= passwordStrength.score ? passwordStrength.color : 'bg-slate-700'
                                }`}
                              />
                            ))}
                          </div>
                          <p className={`text-[10px] font-medium ${
                            passwordStrength.score <= 1 ? 'text-red-400' :
                            passwordStrength.score <= 2 ? 'text-orange-400' :
                            passwordStrength.score <= 3 ? 'text-amber-400' :
                            'text-emerald-400'
                          }`}>
                            {passwordStrength.label}
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-slate-300 text-xs">Confirm Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type="password"
                          value={regConfirmPassword}
                          onChange={(e) => setRegConfirmPassword(e.target.value)}
                          placeholder="Confirm your password"
                          required
                          minLength={6}
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                        />
                      </div>
                      {regConfirmPassword && regPassword !== regConfirmPassword && (
                        <p className="text-[10px] text-red-400 animate-fade-in">Passwords do not match</p>
                      )}
                    </div>

                    {regError && (
                      <p className="text-sm text-red-400 text-center animate-fade-in">{regError}</p>
                    )}

                    <Button
                      type="submit"
                      disabled={regLoading}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-10 transition-all duration-200 hover:scale-105 active:scale-100"
                    >
                      {regLoading ? (
                        <Loader2 className="animate-spin mr-2 size-4" />
                      ) : (
                        <UserPlus className="size-4 mr-2" />
                      )}
                      Create Account
                    </Button>
                  </form>
                </TabsContent>
              </Tabs>

              {/* Divider */}
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-slate-400">or</span>
                </div>
              </div>

              {/* Demo Mode button / Success animation */}
              {showSuccess ? (
                <div className="w-full flex items-center justify-center py-3">
                  <div className="animate-success-icon flex items-center justify-center">
                    <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                      <circle
                        cx="24" cy="24" r="22"
                        stroke="oklch(0.72 0.2 145)" strokeWidth="2"
                        className="animate-success-circle"
                        fill="oklch(0.72 0.2 145 / 10%)"
                      />
                      <path
                        d="M15 24l6 6 12-12"
                        stroke="oklch(0.72 0.2 145)" strokeWidth="2.5"
                        strokeLinecap="round" strokeLinejoin="round"
                        className="animate-success-icon"
                        style={{ animationDelay: '0.3s' }}
                      />
                    </svg>
                  </div>
                  <span className="ml-3 text-emerald-400 font-semibold animate-fade-in" style={{ animationDelay: '0.4s' }}>
                    Welcome aboard!
                  </span>
                </div>
              ) : (
                <Button
                  onClick={handleDemoLogin}
                  disabled={demoLoading}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 text-base transition-all duration-200 hover:scale-105 active:scale-100"
                  size="lg"
                >
                  {demoLoading ? (
                    <Loader2 className="animate-spin mr-2 size-5" />
                  ) : (
                    <Zap className="size-5 mr-2" />
                  )}
                  Demo Mode — Try instantly
                </Button>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Footer trust badges */}
        <div
          className="text-center mt-8 flex items-center justify-center gap-4 text-slate-500 text-xs animate-fade-in"
          style={{ animationDelay: '1s' }}
        >
          <span className="flex items-center gap-1">
            <Check className="size-3 text-emerald-500" /> Secure
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-emerald-500" /> Encrypted
          </span>
          <span className="text-slate-700">·</span>
          <span className="flex items-center gap-1">
            <Check className="size-3 text-emerald-500" /> Any Device
          </span>
        </div>
      </div>
    </div>
  );
}
