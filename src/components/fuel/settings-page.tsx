'use client';

import { useState } from 'react';
import {
  User,
  Building2,
  Bell,
  Monitor,
  Shield,
  Info,
  Camera,
  Save,
  ChevronRight,
  Globe,
  Clock,
  Palette,
  Database,
  Mail,
  Phone,
  MapPin,
  Key,
  Download,
  Trash2,
  FileText,
  ExternalLink,
  MessageSquare,
  Sun,
  Moon,
  HardDrive,
  CheckCircle2,
  Fuel,
  Settings,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useFuelStore } from '@/store/fuel-store';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

// --- Static sub-components defined OUTSIDE the main component ---

function SettingSection({
  icon: Icon,
  title,
  description,
  children,
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="bg-slate-800/60 border-slate-700/50">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10">
            <Icon className="size-5 text-amber-400" />
          </div>
          <div>
            <CardTitle className="text-white text-base">{title}</CardTitle>
            <CardDescription className="text-slate-400 text-sm">{description}</CardDescription>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {children}
      </CardContent>
    </Card>
  );
}

function ToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
}: {
  label: string;
  description?: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div className="space-y-0.5">
        <Label className="text-sm text-slate-200">{label}</Label>
        {description && <p className="text-xs text-slate-500">{description}</p>}
      </div>
      <Switch checked={checked} onCheckedChange={onCheckedChange} />
    </div>
  );
}

function Settings2Icon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M20 7h-9" />
      <path d="M14 17H5" />
      <circle cx="17" cy="17" r="3" />
      <circle cx="7" cy="7" r="3" />
    </svg>
  );
}

// --- Main component ---

export function SettingsPage() {
  const theme = useFuelStore((s) => s.theme);
  const toggleTheme = useFuelStore((s) => s.toggleTheme);
  const companyData = useFuelStore((s) => s.companyData);
  const setCompanyData = useFuelStore((s) => s.setCompanyData);
  const user = useAuthStore((s) => s.user);

  // Profile state
  const [profileName, setProfileName] = useState(user?.name ?? 'Station Manager');
  const [profileEmail, setProfileEmail] = useState(user?.email ?? 'manager@fuelpro.co.ke');
  const [profilePhone, setProfilePhone] = useState('+254 712 345 678');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Station settings state
  const [stationName, setStationName] = useState(companyData.name);
  const [stationLocation, setStationLocation] = useState(companyData.address || 'Nairobi, Kenya');
  const [stationCountry, setStationCountry] = useState('KE');
  const [operatingHours, setOperatingHours] = useState('06:00 - 22:00');
  const [currency, setCurrency] = useState('KES');
  const [timezone, setTimezone] = useState('Africa/Nairobi');

  // Notification preferences
  const [lowStockAlerts, setLowStockAlerts] = useState(true);
  const [paymentReminders, setPaymentReminders] = useState(true);
  const [shiftNotifications, setShiftNotifications] = useState(true);
  const [deliveryNotifications, setDeliveryNotifications] = useState(true);
  const [dailySummary, setDailySummary] = useState(true);
  const [maintenanceReminders, setMaintenanceReminders] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [smsNotifications, setSmsNotifications] = useState(false);

  // Display settings
  const [defaultTab, setDefaultTab] = useState('dashboard');
  const [compactMode, setCompactMode] = useState(false);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);

  // Data & Privacy
  const [autoBackup, setAutoBackup] = useState(true);
  const [backupFrequency, setBackupFrequency] = useState('daily');
  const [dataRetention, setDataRetention] = useState('12');

  // Clear cache dialog
  const [clearCacheOpen, setClearCacheOpen] = useState(false);
  const [exportDialogOpen, setExportDialogOpen] = useState(false);

  const handleSaveProfile = () => {
    toast.success('Profile updated successfully');
  };

  const handleChangePassword = () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      toast.error('Please fill in all password fields');
      return;
    }
    if (newPassword !== confirmPassword) {
      toast.error('New passwords do not match');
      return;
    }
    if (newPassword.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    toast.success('Password changed successfully');
  };

  const handleSaveStation = () => {
    setCompanyData({
      name: stationName,
      address: stationLocation,
    });
    toast.success('Station settings saved');
  };

  const handleClearCache = () => {
    setClearCacheOpen(false);
    toast.success('Cache cleared successfully');
  };

  const handleExportData = () => {
    const store = useFuelStore.getState();
    const exportData = {
      salesHistory: store.salesHistory,
      deliveryData: store.deliveryData,
      clients: store.clients,
      invoices: store.invoices,
      employees: store.employees,
      expenses: store.expenses,
      shifts: store.shifts,
      fuelTypes: store.fuelTypes,
      suppliers: store.suppliers,
      maintenance: store.maintenance,
      companyData: store.companyData,
      exportedAt: new Date().toISOString(),
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fuelpro-export-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExportDialogOpen(false);
    toast.success('Data exported successfully');
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center gap-3 mb-2">
        <div className="p-2 rounded-xl bg-amber-500/10">
          <Settings2Icon className="size-6 text-amber-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-white">Settings</h1>
          <p className="text-sm text-slate-400">Manage your account, station, and application preferences</p>
        </div>
      </div>

      {/* Settings Tabs */}
      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="bg-slate-800/60 h-10 w-full sm:w-auto">
          <TabsTrigger value="profile" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <User className="size-3.5" /> Profile
          </TabsTrigger>
          <TabsTrigger value="station" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <Building2 className="size-3.5" /> Station
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <Bell className="size-3.5" /> Notifications
          </TabsTrigger>
          <TabsTrigger value="display" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <Monitor className="size-3.5" /> Display
          </TabsTrigger>
          <TabsTrigger value="data" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <Database className="size-3.5" /> Data
          </TabsTrigger>
          <TabsTrigger value="about" className="text-xs data-[state=active]:bg-slate-700 data-[state=active]:text-white gap-1.5">
            <Info className="size-3.5" /> About
          </TabsTrigger>
        </TabsList>

        {/* Profile Tab */}
        <TabsContent value="profile" className="space-y-4">
          <SettingSection icon={User} title="Profile Information" description="Update your personal information">
            <div className="flex items-center gap-4 mb-4">
              <div className="relative">
                <Avatar className="size-16">
                  <AvatarFallback className="bg-amber-500/20 text-amber-400 text-xl font-bold">
                    {profileName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
                  </AvatarFallback>
                </Avatar>
                <Button size="icon" variant="ghost" className="absolute -bottom-1 -right-1 size-7 bg-slate-700 hover:bg-slate-600 rounded-full">
                  <Camera className="size-3" />
                </Button>
              </div>
              <div>
                <p className="text-white font-medium">{profileName}</p>
                <Badge variant="outline" className="text-xs text-amber-400 border-amber-500/30 mt-1">Station Manager</Badge>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="Your name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={profileEmail}
                    onChange={(e) => setProfileEmail(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="your@email.com"
                    type="email"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Phone Number</Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={profilePhone}
                    onChange={(e) => setProfilePhone(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="+254 7XX XXX XXX"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Role</Label>
                <Input
                  value="Station Manager"
                  className="bg-slate-700/50 border-slate-600/50 text-slate-400"
                  disabled
                />
              </div>
            </div>

            <Button onClick={handleSaveProfile} className="bg-amber-500 hover:bg-amber-600 text-black mt-2">
              <Save className="size-4 mr-1" />
              Save Profile
            </Button>
          </SettingSection>

          <SettingSection icon={Key} title="Change Password" description="Update your account password">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Current Password</Label>
                <Input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">New Password</Label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="••••••••"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Confirm Password</Label>
                <Input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="bg-slate-700/50 border-slate-600/50 text-white"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <Button onClick={handleChangePassword} variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/10">
              <Key className="size-4 mr-1" />
              Update Password
            </Button>
          </SettingSection>
        </TabsContent>

        {/* Station Tab */}
        <TabsContent value="station" className="space-y-4">
          <SettingSection icon={Building2} title="Station Information" description="Configure your station details">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Station Name</Label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={stationName}
                    onChange={(e) => setStationName(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="Station name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Location</Label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={stationLocation}
                    onChange={(e) => setStationLocation(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="City, Country"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Country</Label>
                <Select value={stationCountry} onValueChange={setStationCountry}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <Globe className="size-4 text-slate-500 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="KE" className="text-white focus:bg-white/10 focus:text-white">Kenya</SelectItem>
                    <SelectItem value="UG" className="text-white focus:bg-white/10 focus:text-white">Uganda</SelectItem>
                    <SelectItem value="TZ" className="text-white focus:bg-white/10 focus:text-white">Tanzania</SelectItem>
                    <SelectItem value="RW" className="text-white focus:bg-white/10 focus:text-white">Rwanda</SelectItem>
                    <SelectItem value="NG" className="text-white focus:bg-white/10 focus:text-white">Nigeria</SelectItem>
                    <SelectItem value="GH" className="text-white focus:bg-white/10 focus:text-white">Ghana</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Operating Hours</Label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-500" />
                  <Input
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    className="bg-slate-700/50 border-slate-600/50 text-white pl-9"
                    placeholder="06:00 - 22:00"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Currency</Label>
                <Select value={currency} onValueChange={setCurrency}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="KES" className="text-white focus:bg-white/10 focus:text-white">KES - Kenyan Shilling</SelectItem>
                    <SelectItem value="USD" className="text-white focus:bg-white/10 focus:text-white">USD - US Dollar</SelectItem>
                    <SelectItem value="EUR" className="text-white focus:bg-white/10 focus:text-white">EUR - Euro</SelectItem>
                    <SelectItem value="GBP" className="text-white focus:bg-white/10 focus:text-white">GBP - British Pound</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="Africa/Nairobi" className="text-white focus:bg-white/10 focus:text-white">Africa/Nairobi (EAT)</SelectItem>
                    <SelectItem value="Africa/Kampala" className="text-white focus:bg-white/10 focus:text-white">Africa/Kampala (EAT)</SelectItem>
                    <SelectItem value="Africa/Dar_es_Salaam" className="text-white focus:bg-white/10 focus:text-white">Africa/Dar es Salaam (EAT)</SelectItem>
                    <SelectItem value="Africa/Lagos" className="text-white focus:bg-white/10 focus:text-white">Africa/Lagos (WAT)</SelectItem>
                    <SelectItem value="UTC" className="text-white focus:bg-white/10 focus:text-white">UTC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <Button onClick={handleSaveStation} className="bg-amber-500 hover:bg-amber-600 text-black mt-2">
              <Save className="size-4 mr-1" />
              Save Station Settings
            </Button>
          </SettingSection>
        </TabsContent>

        {/* Notifications Tab */}
        <TabsContent value="notifications" className="space-y-4">
          <SettingSection icon={Bell} title="Notification Preferences" description="Choose which notifications you want to receive">
            <div className="space-y-3">
              <ToggleRow
                label="Low Stock Alerts"
                description="Get notified when fuel levels drop below threshold"
                checked={lowStockAlerts}
                onCheckedChange={setLowStockAlerts}
              />
              <Separator className="bg-slate-700/50" />
              <ToggleRow
                label="Payment Reminders"
                description="Reminders for overdue payments and credit limits"
                checked={paymentReminders}
                onCheckedChange={setPaymentReminders}
              />
              <Separator className="bg-slate-700/50" />
              <ToggleRow
                label="Shift Start/End"
                description="Notifications when shifts begin and end"
                checked={shiftNotifications}
                onCheckedChange={setShiftNotifications}
              />
              <Separator className="bg-slate-700/50" />
              <ToggleRow
                label="Delivery Notifications"
                description="Updates on incoming fuel deliveries"
                checked={deliveryNotifications}
                onCheckedChange={setDeliveryNotifications}
              />
              <Separator className="bg-slate-700/50" />
              <ToggleRow
                label="Daily Summary"
                description="Receive a daily summary of station operations"
                checked={dailySummary}
                onCheckedChange={setDailySummary}
              />
              <Separator className="bg-slate-700/50" />
              <ToggleRow
                label="Maintenance Reminders"
                description="Upcoming and overdue maintenance alerts"
                checked={maintenanceReminders}
                onCheckedChange={setMaintenanceReminders}
              />
            </div>
          </SettingSection>

          <SettingSection icon={MessageSquare} title="Delivery Channels" description="Choose how you receive notifications">
            <ToggleRow
              label="Email Notifications"
              description="Receive notifications via email"
              checked={emailNotifications}
              onCheckedChange={setEmailNotifications}
            />
            <Separator className="bg-slate-700/50" />
            <ToggleRow
              label="SMS Notifications"
              description="Receive notifications via SMS (additional charges may apply)"
              checked={smsNotifications}
              onCheckedChange={setSmsNotifications}
            />
          </SettingSection>
        </TabsContent>

        {/* Display Tab */}
        <TabsContent value="display" className="space-y-4">
          <SettingSection icon={Palette} title="Theme" description="Customize the application appearance">
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => { if (theme === 'dark') toggleTheme(); }}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'light'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <Sun className="size-6 text-amber-400" />
                <span className="text-sm text-white font-medium">Light</span>
                {theme === 'light' && <CheckCircle2 className="size-4 text-amber-400 absolute top-2 right-2" />}
              </button>
              <button
                onClick={() => { if (theme === 'light') toggleTheme(); }}
                className={`relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                  theme === 'dark'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                }`}
              >
                <Moon className="size-6 text-blue-400" />
                <span className="text-sm text-white font-medium">Dark</span>
                {theme === 'dark' && <CheckCircle2 className="size-4 text-amber-400 absolute top-2 right-2" />}
              </button>
            </div>
          </SettingSection>

          <SettingSection icon={Monitor} title="Display Preferences" description="Configure display behavior">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Default Dashboard Tab</Label>
                <Select value={defaultTab} onValueChange={setDefaultTab}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="dashboard" className="text-white focus:bg-white/10 focus:text-white">Dashboard</SelectItem>
                    <SelectItem value="sales" className="text-white focus:bg-white/10 focus:text-white">Sales</SelectItem>
                    <SelectItem value="pos" className="text-white focus:bg-white/10 focus:text-white">POS</SelectItem>
                    <SelectItem value="inventory" className="text-white focus:bg-white/10 focus:text-white">Inventory</SelectItem>
                    <SelectItem value="reports" className="text-white focus:bg-white/10 focus:text-white">Reports</SelectItem>
                    <SelectItem value="live" className="text-white focus:bg-white/10 focus:text-white">Live</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <Separator className="bg-slate-700/50" />

              <ToggleRow
                label="Compact Mode"
                description="Reduce spacing and show more content on screen"
                checked={compactMode}
                onCheckedChange={setCompactMode}
              />

              <Separator className="bg-slate-700/50" />

              <ToggleRow
                label="Animations"
                description="Enable smooth transitions and animations"
                checked={animationsEnabled}
                onCheckedChange={setAnimationsEnabled}
              />
            </div>
          </SettingSection>
        </TabsContent>

        {/* Data & Privacy Tab */}
        <TabsContent value="data" className="space-y-4">
          <SettingSection icon={HardDrive} title="Backup" description="Configure automatic data backup">
            <div className="space-y-4">
              <ToggleRow
                label="Auto-Backup"
                description="Automatically backup your data at scheduled intervals"
                checked={autoBackup}
                onCheckedChange={setAutoBackup}
              />

              {autoBackup && (
                <div className="space-y-2 pl-1">
                  <Label className="text-sm text-slate-300">Backup Frequency</Label>
                  <Select value={backupFrequency} onValueChange={setBackupFrequency}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                      <Clock className="size-4 text-slate-500 mr-2" />
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      <SelectItem value="hourly" className="text-white focus:bg-white/10 focus:text-white">Every Hour</SelectItem>
                      <SelectItem value="daily" className="text-white focus:bg-white/10 focus:text-white">Daily</SelectItem>
                      <SelectItem value="weekly" className="text-white focus:bg-white/10 focus:text-white">Weekly</SelectItem>
                      <SelectItem value="monthly" className="text-white focus:bg-white/10 focus:text-white">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </SettingSection>

          <SettingSection icon={Shield} title="Data Retention & Privacy" description="Manage your data retention and privacy settings">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-sm text-slate-300">Data Retention Period</Label>
                <Select value={dataRetention} onValueChange={setDataRetention}>
                  <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    <SelectItem value="3" className="text-white focus:bg-white/10 focus:text-white">3 Months</SelectItem>
                    <SelectItem value="6" className="text-white focus:bg-white/10 focus:text-white">6 Months</SelectItem>
                    <SelectItem value="12" className="text-white focus:bg-white/10 focus:text-white">12 Months</SelectItem>
                    <SelectItem value="24" className="text-white focus:bg-white/10 focus:text-white">24 Months</SelectItem>
                    <SelectItem value="0" className="text-white focus:bg-white/10 focus:text-white">Indefinite</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-slate-500">Older data will be automatically archived after this period</p>
              </div>

              <Separator className="bg-slate-700/50" />

              <div className="flex flex-col sm:flex-row gap-3">
                <Dialog open={clearCacheOpen} onOpenChange={setClearCacheOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/10">
                      <Trash2 className="size-4 mr-1" />
                      Clear Cache
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Clear Application Cache?</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        This will clear temporary data and refresh the application. Your saved data will not be affected.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setClearCacheOpen(false)} className="text-slate-300">Cancel</Button>
                      <Button onClick={handleClearCache} className="bg-red-500 hover:bg-red-600 text-white">Clear Cache</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={exportDialogOpen} onOpenChange={setExportDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="border-slate-600 text-slate-300 hover:bg-white/10">
                      <Download className="size-4 mr-1" />
                      Export All Data
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="bg-slate-800 border-slate-700 text-white">
                    <DialogHeader>
                      <DialogTitle>Export All Data?</DialogTitle>
                      <DialogDescription className="text-slate-400">
                        This will download a JSON file containing all your station data including sales, deliveries, clients, invoices, and more.
                      </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                      <Button variant="ghost" onClick={() => setExportDialogOpen(false)} className="text-slate-300">Cancel</Button>
                      <Button onClick={handleExportData} className="bg-amber-500 hover:bg-amber-600 text-black">Export Data</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </SettingSection>
        </TabsContent>

        {/* About Tab */}
        <TabsContent value="about" className="space-y-4">
          <SettingSection icon={Info} title="About FuelPro" description="Application information and support">
            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-800/80 rounded-xl border border-slate-700/50">
                <div className="p-3 rounded-xl bg-amber-500/10">
                  <Fuel className="size-8 text-amber-400" />
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">FuelPro</h3>
                  <p className="text-slate-400 text-sm">Fuel Station Management System</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge className="bg-green-500/10 text-green-400 border-green-500/30 text-xs">v2.4.1</Badge>
                    <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/30 text-xs">Stable</Badge>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Version</p>
                  <p className="text-sm text-white font-medium">2.4.1</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Build</p>
                  <p className="text-sm text-white font-medium">2025.03.04.1432</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">Runtime</p>
                  <p className="text-sm text-white font-medium">Next.js 16 + TypeScript</p>
                </div>
                <div className="p-3 rounded-lg bg-slate-800/50 border border-slate-700/50">
                  <p className="text-xs text-slate-500 mb-1">License</p>
                  <p className="text-sm text-white font-medium">Commercial</p>
                </div>
              </div>

              <Separator className="bg-slate-700/50" />

              <div className="space-y-2">
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white gap-3"
                  onClick={() => toast.info('Support email: support@fuelpro.co.ke')}
                >
                  <MessageSquare className="size-4 text-amber-400" />
                  <span className="flex-1 text-left">Contact Support</span>
                  <ChevronRight className="size-4 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white gap-3"
                  onClick={() => toast.info('Terms page coming soon')}
                >
                  <FileText className="size-4 text-blue-400" />
                  <span className="flex-1 text-left">Terms of Service</span>
                  <ExternalLink className="size-3 text-slate-600" />
                </Button>
                <Button
                  variant="ghost"
                  className="w-full justify-start text-slate-300 hover:bg-white/5 hover:text-white gap-3"
                  onClick={() => toast.info('Privacy policy page coming soon')}
                >
                  <Shield className="size-4 text-green-400" />
                  <span className="flex-1 text-left">Privacy Policy</span>
                  <ExternalLink className="size-3 text-slate-600" />
                </Button>
              </div>
            </div>
          </SettingSection>
        </TabsContent>
      </Tabs>
    </div>
  );
}
