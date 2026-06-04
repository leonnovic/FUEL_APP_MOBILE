'use client';

import { useState, useCallback } from 'react';
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
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

interface LoginScreenProps {
  onLogin: () => void;
}

// Seed demo data into the fuel store
function seedDemoData() {
  const store = useFuelStore.getState();
  const today = new Date().toISOString().slice(0, 10);

  // Set prices
  store.setPmsPrice(212.36);
  store.setAgoPrice(199.47);

  // Set company data
  store.setCompanyData({
    name: 'FuelPro Demo Station',
    phone: '+254 700 000 000',
    email: 'info@fuelpro.app',
    address: 'Nairobi, Kenya',
  });

  // Add fuel types
  store.addFuelType({ name: 'PMS (Super Petrol)', category: 'fuel', price: 212.36, tankCapacity: 20000, currentLevel: 14200 });
  store.addFuelType({ name: 'AGO (Diesel)', category: 'fuel', price: 199.47, tankCapacity: 25000, currentLevel: 18700 });
  store.addFuelType({ name: 'DPK (Kerosene)', category: 'fuel', price: 178.20, tankCapacity: 10000, currentLevel: 6500 });

  // Add demo sales for last 7 days
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const pmsVol = Math.floor(Math.random() * 800 + 400);
    const agoVol = Math.floor(Math.random() * 600 + 300);
    store.addSale({
      date: ds,
      pmsOpeningReading: 10000 + i * 2000,
      pmsClosingReading: 10000 + i * 2000 + pmsVol,
      agoOpeningReading: 8000 + i * 1500,
      agoClosingReading: 8000 + i * 1500 + agoVol,
      pmsPrice: 212.36,
      agoPrice: 199.47,
      expenses: Math.floor(Math.random() * 5000 + 2000),
    });
  }

  // Add demo expenses
  const expCategories = ['salary', 'maintenance', 'utilities', 'rent', 'transport', 'misc'] as const;
  const expDescs: Record<string, string> = {
    salary: 'Staff salary advance',
    maintenance: 'Pump maintenance',
    utilities: 'Electricity bill',
    rent: 'Station rent',
    transport: 'Fuel transport',
    misc: 'Office supplies',
  };
  expCategories.forEach((cat) => {
    store.addExpense({
      date: today,
      category: cat,
      description: expDescs[cat],
      amount: Math.floor(Math.random() * 15000 + 5000),
    });
  });

  // Add demo clients
  store.addClient({ name: 'Kenya Logistics Ltd', phone: '+254 712 345 678', email: 'info@kenyalogistics.ke', creditLimit: 500000, balanceDue: 125000 });
  store.addClient({ name: 'TransEast Hauliers', phone: '+254 723 456 789', email: 'accounts@transeast.ke', creditLimit: 300000, balanceDue: 67500 });
  store.addClient({ name: 'Metro Bus Services', phone: '+254 734 567 890', email: 'fleet@metrobus.ke', creditLimit: 800000, balanceDue: 342000 });

  // Add demo employees
  store.addEmployee({ name: 'John Mwangi', phone: '+254 711 111 111', role: 'manager', salary: 45000, status: 'active' });
  store.addEmployee({ name: 'Grace Wanjiku', phone: '+254 722 222 222', role: 'attendant', salary: 22000, status: 'active' });
  store.addEmployee({ name: 'Peter Ochieng', phone: '+254 733 333 333', role: 'attendant', salary: 22000, status: 'active' });
  store.addEmployee({ name: 'Alice Akinyi', phone: '+254 744 444 444', role: 'accountant', salary: 38000, status: 'active' });

  // Add demo suppliers
  store.addSupplier({ name: 'KenolKobil', phone: '+254 700 100 200', email: 'supply@kenolkobil.ke', product: 'PMS & AGO', address: 'Nairobi' });
  store.addSupplier({ name: 'Total Energies', phone: '+254 700 200 300', email: 'supply@totalenergies.ke', product: 'PMS, AGO & DPK', address: 'Mombasa' });

  // Add demo delivery
  store.addDelivery({
    date: today,
    supplier: 'KenolKobil',
    product: 'PMS',
    quantity: 12000,
    unitPrice: 185.5,
    driverName: 'David Kamau',
    vehicleNumber: 'KBA 234J',
    invoiceNumber: `INV-${Date.now()}`,
    status: 'delivered',
  });

  // Add demo invoice
  store.addInvoice({
    clientName: 'Kenya Logistics Ltd',
    clientPhone: '+254 712 345 678',
    items: [
      { name: 'PMS (Super Petrol)', quantity: 500, unitPrice: 212.36, total: 106180 },
      { name: 'AGO (Diesel)', quantity: 800, unitPrice: 199.47, total: 159576 },
    ],
    status: 'pending',
    dueDate: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
  });
}

// Animated background particles - uses deterministic seed to avoid hydration mismatch
function BackgroundParticles() {
  // Deterministic pseudo-random generator - same output on server and client
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
            width: p.size,
            height: p.size,
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

// Registration dialog
function RegisterDialog({
  open,
  onOpenChange,
  onRegister,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRegister: () => void;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const register = useAuthStore((s) => s.register);
  const isLoading = useAuthStore((s) => s.isLoading);
  const error = useAuthStore((s) => s.error);

  const strength = getPasswordStrength(password);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await register({ email, name, password, phone: phone || undefined });
    onRegister();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white">Create Account</DialogTitle>
          <DialogDescription className="text-slate-400">
            Join FuelPro and start managing your fuel stations
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="space-y-2">
            <Label className="text-slate-300">Full Name</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
              required
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Email</Label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="john@example.com"
              required
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Phone (optional)</Label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+254 7XX XXX XXX"
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-slate-300">Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a strong password"
              required
              minLength={6}
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
            {/* Password strength indicator */}
            {password && (
              <div className="space-y-1.5 animate-fade-in">
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                        level <= strength.score ? strength.color : 'bg-slate-700'
                      }`}
                    />
                  ))}
                </div>
                <p className={`text-[10px] font-medium ${
                  strength.score <= 1 ? 'text-red-400' :
                  strength.score <= 2 ? 'text-orange-400' :
                  strength.score <= 3 ? 'text-amber-400' :
                  'text-emerald-400'
                }`}>
                  {strength.label}
                </p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-all duration-200 hover:scale-105"
            >
              {isLoading ? <Loader2 className="animate-spin mr-2 size-4" /> : null}
              Create Account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Founder access dialog
function FounderDialog({
  open,
  onOpenChange,
  onAccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAccess: () => void;
}) {
  const [code, setCode] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Demo: accept any code of 6+ chars
    if (code.length >= 6) {
      setError('');
      onAccess();
      onOpenChange(false);
    } else {
      setError('Access code must be at least 6 characters');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-slate-900 border-slate-700 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center gap-2">
            <Zap className="size-5 text-amber-400" /> Founder Access
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            Enter your founder access code to unlock admin privileges
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <p className="text-sm text-red-400">{error}</p>}
          <div className="space-y-2">
            <Label className="text-slate-300">Access Code</Label>
            <Input
              type="password"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Enter founder access code"
              required
              className="bg-slate-800 border-slate-600 text-white placeholder:text-slate-500 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
            />
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              className="text-slate-400 hover:text-white transition-all duration-200 hover:scale-105"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-amber-500 hover:bg-amber-600 text-black font-semibold transition-all duration-200 hover:scale-105"
            >
              Unlock Access
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function LoginScreen({ onLogin }: LoginScreenProps) {
  const [authMode, setAuthMode] = useState<'email' | 'username'>('email');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [registerOpen, setRegisterOpen] = useState(false);
  const [founderOpen, setFounderOpen] = useState(false);

  const authStore = useAuthStore();
  const { addStation } = useStationStore();

  // Continue instantly - demo login
  const handleDemoLogin = useCallback(() => {
    const demoUser = {
      id: 'demo-user-1',
      email: 'demo@fuelpro.app',
      name: 'Demo User',
      role: 'owner' as const,
      phone: '+254 700 000 000',
    };

    // Create a demo station if none exists
    addStation({
      name: 'FuelPro Demo Station',
      location: 'Nairobi, Kenya',
      country: 'Kenya',
      currency: 'KES',
      ownerId: demoUser.id,
    });

    // Seed demo data
    seedDemoData();

    authStore.setUser(demoUser);
    onLogin();
  }, [authStore, addStation, onLogin]);

  // Sign in with credentials
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    await authStore.login({
      email: authMode === 'email' ? email : `${username}@fuelpro.app`,
      password,
    });
    if (authStore.isAuthenticated) {
      onLogin();
    }
  };

  // After registration
  const handleRegistered = () => {
    if (authStore.isAuthenticated) {
      setRegisterOpen(false);
      onLogin();
    }
  };

  // Founder access
  const handleFounderAccess = () => {
    const founderUser = {
      id: 'founder-1',
      email: 'founder@fuelpro.app',
      name: 'Founder',
      role: 'owner' as const,
    };
    authStore.setUser(founderUser);
    onLogin();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 relative flex flex-col items-center justify-center p-4 overflow-hidden noise-overlay">
      <BackgroundParticles />

      <div className="relative z-10 w-full max-w-5xl">
        {/* Branding - with gradient text and CSS animation */}
        <div className="text-center mb-8 animate-slide-up">
          <h1 className="text-4xl md:text-5xl font-bold flex items-center justify-center gap-3">
            <Fuel className="size-10 md:size-12 text-amber-400" />
            <span className="gradient-text">FuelPro</span>
          </h1>
          <p className="text-slate-300 mt-2 text-lg animate-fade-in" style={{ animationDelay: '0.15s' }}>
            Professional Fuel Management
          </p>
        </div>

        {/* Feature cards - staggered entrance with CSS animations */}
        <div className="hidden md:grid grid-cols-5 gap-3 mb-6">
          {features.map((f, i) => (
            <div
              key={f.title}
              className="animate-slide-up"
              style={{ animationDelay: `${0.2 + i * 0.1}s` }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm text-center py-3 px-2 gap-2 hover:bg-white/10 transition-all duration-200 hover:scale-105 hover:border-white/20 cursor-default">
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
          className="flex flex-wrap justify-center gap-2 mb-8 animate-fade-in"
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

        {/* Sign In Card - Glassmorphism with backdrop-blur-xl */}
        <div
          className="animate-slide-up"
          style={{ animationDelay: '0.5s' }}
        >
          <Card className="bg-white/5 backdrop-blur-xl border-white/15 max-w-md mx-auto shadow-2xl shadow-black/20">
            <CardHeader className="text-center pb-0">
              <CardTitle className="text-white text-xl">Welcome to FuelPro</CardTitle>
              <CardDescription className="text-slate-300">
                Sign in to your account
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Continue instantly button */}
              <Button
                onClick={handleDemoLogin}
                className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold h-11 text-base transition-all duration-200 hover:scale-105 active:scale-100"
                size="lg"
              >
                <Zap className="size-5 mr-2" />
                Continue instantly — start in 1 second
              </Button>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-white/20" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-slate-400">or sign in</span>
                </div>
              </div>

              {/* Email / Username toggle */}
              <Tabs
                value={authMode}
                onValueChange={(v) => setAuthMode(v as 'email' | 'username')}
                className="w-full"
              >
                <TabsList className="w-full bg-white/10 border border-white/10">
                  <TabsTrigger
                    value="email"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-400 flex-1"
                  >
                    <Mail className="size-4 mr-1" />
                    Email
                  </TabsTrigger>
                  <TabsTrigger
                    value="username"
                    className="data-[state=active]:bg-white/20 data-[state=active]:text-white text-slate-400 flex-1"
                  >
                    <User className="size-4 mr-1" />
                    Username
                  </TabsTrigger>
                </TabsList>
              </Tabs>

              {/* Sign in form */}
              <form onSubmit={handleSignIn} className="space-y-3">
                {authMode === 'email' ? (
                  <div className="space-y-2 animate-fade-in">
                    <Label className="text-slate-300 text-xs">Email Address</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 animate-fade-in">
                    <Label className="text-slate-300 text-xs">Username</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        placeholder="your_username"
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                      />
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label className="text-slate-300 text-xs">Password</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="pl-10 pr-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500 h-10 transition-all duration-200 focus:border-amber-500/50 focus:ring-2 focus:ring-amber-500/20"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {authStore.error && (
                  <p className="text-sm text-red-400 text-center animate-fade-in">{authStore.error}</p>
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
                  disabled={authStore.isLoading}
                  className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold h-10 transition-all duration-200 hover:scale-105 active:scale-100"
                >
                  {authStore.isLoading ? (
                    <Loader2 className="animate-spin mr-2 size-4" />
                  ) : null}
                  Sign In
                </Button>
              </form>

              {/* Create account link */}
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setRegisterOpen(true)}
                  className="text-sm text-slate-400 hover:text-white transition-colors"
                >
                  New to FuelPro?{' '}
                  <span className="text-amber-400 hover:text-amber-300 font-medium">
                    Create an account
                  </span>
                </button>
              </div>

              {/* Founder access */}
              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setFounderOpen(true)}
                  className="text-xs text-slate-500 hover:text-slate-300 transition-colors inline-flex items-center gap-1"
                >
                  <Shield className="size-3" />
                  Founder Access
                </button>
              </div>
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

      {/* Dialogs */}
      <RegisterDialog
        open={registerOpen}
        onOpenChange={setRegisterOpen}
        onRegister={handleRegistered}
      />
      <FounderDialog open={founderOpen} onOpenChange={setFounderOpen} onAccess={handleFounderAccess} />
    </div>
  );
}
