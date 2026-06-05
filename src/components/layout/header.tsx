'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Fuel,
  Building,
  Bell,
  Sun,
  Moon,
  Search,
  Menu,
  LogOut,
  Settings,
  User,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  Truck,
  Droplets,
  FileText,
  CreditCard,
  BarChart3,
  Smartphone,
  Users,
  Database,
  Newspaper,
  Radio,
  MessageSquare,
  Package,
  UserCircle,
  ClipboardCheck,
  Clock,
  Star,
  Wallet,
  TrendingUp,
  Plug,
  Globe,
  Layers,
  UsersRound,
  FileStack,
  Warehouse,
  Wrench,
  Receipt,
  Monitor,
  CheckCheck,
  Calculator,
  ClipboardList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Sheet,
  SheetTrigger,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

// Tab definitions for search
const allTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'offloading', label: 'Offloading', icon: Droplets },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'debt', label: 'Debt', icon: CreditCard },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
  { id: 'mpesa', label: 'M-PESA', icon: Smartphone },
  { id: 'payroll', label: 'Payroll', icon: Users },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'fuel-sales', label: 'Fuel Sales', icon: Fuel },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'audit', label: 'Audit', icon: ClipboardCheck },
  { id: 'shifts', label: 'Shifts', icon: Clock },
  { id: 'quality', label: 'Quality', icon: Star },
  { id: 'credit', label: 'Credit', icon: Wallet },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'integration', label: 'Integration', icon: Plug },
  { id: 'regional', label: 'Regional', icon: Globe },
  { id: 'fuel-types', label: 'Fuel Types', icon: Layers },
  { id: 'team', label: 'Team', icon: UsersRound },
  { id: 'documents', label: 'Documents', icon: FileStack },
  { id: 'suppliers', label: 'Suppliers', icon: Warehouse },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'price-board', label: 'Price Board', icon: Monitor },
  { id: 'fuel-orders', label: 'Fuel Orders', icon: ClipboardList },
  { id: 'profit-calc', label: 'Profit Calculator', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
];

// Notification types
type NotificationType = 'alert' | 'warning' | 'success' | 'info' | 'reminder';

interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  timestamp: string;
  unread: boolean;
  tabId?: string;
}

// Mock notifications
const mockNotifications: Notification[] = [
  {
    id: '1',
    type: 'alert',
    title: 'Low Tank Alert: PMS',
    description: 'PMS tank level below 15%. Immediate restocking recommended.',
    timestamp: '2m ago',
    unread: true,
    tabId: 'inventory',
  },
  {
    id: '2',
    type: 'warning',
    title: 'Overdue Invoice #INV-0042',
    description: 'Client Peter Mwangi has an overdue balance of Ksh 45,000.',
    timestamp: '15m ago',
    unread: true,
    tabId: 'invoice',
  },
  {
    id: '3',
    type: 'success',
    title: 'Delivery Completed',
    description: 'AGO delivery of 5,000L from KenolKobil has been received.',
    timestamp: '1h ago',
    unread: true,
    tabId: 'delivery',
  },
  {
    id: '4',
    type: 'info',
    title: 'Shift Change Reminder',
    description: 'Evening shift starts at 6:00 PM. Confirm handover details.',
    timestamp: '2h ago',
    unread: true,
    tabId: 'shifts',
  },
  {
    id: '5',
    type: 'reminder',
    title: 'EPRA Price Update',
    description: 'New fuel prices effective from tomorrow. Update your price board.',
    timestamp: '3h ago',
    unread: true,
    tabId: 'price-board',
  },
  {
    id: '6',
    type: 'warning',
    title: 'Maintenance Overdue',
    description: 'Pump #3 calibration check is 5 days overdue. Schedule immediately.',
    timestamp: '5h ago',
    unread: false,
    tabId: 'maintenance',
  },
  {
    id: '7',
    type: 'success',
    title: 'M-PESA Reconciliation',
    description: 'Daily M-PESA reconciliation complete. Ksh 287,400 processed.',
    timestamp: '6h ago',
    unread: false,
    tabId: 'mpesa',
  },
  {
    id: '8',
    type: 'alert',
    title: 'Quality Test Failed',
    description: 'AGO density test failed KEBS standards. Re-test required.',
    timestamp: '8h ago',
    unread: false,
    tabId: 'quality',
  },
  {
    id: '9',
    type: 'info',
    title: 'New Employee Onboarded',
    description: 'Grace Wanjiku has been added as a shift attendant.',
    timestamp: 'Yesterday',
    unread: false,
    tabId: 'team',
  },
  {
    id: '10',
    type: 'reminder',
    title: 'Backup Scheduled',
    description: 'Weekly data backup will run tonight at 11 PM.',
    timestamp: 'Yesterday',
    unread: false,
    tabId: 'data',
  },
];

// Notification icon & color mapping
const notificationConfig: Record<NotificationType, { icon: typeof AlertTriangle; color: string; bg: string }> = {
  alert: { icon: AlertCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  success: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  info: { icon: Info, color: 'text-blue-400', bg: 'bg-blue-500/10' },
  reminder: { icon: Clock, color: 'text-purple-400', bg: 'bg-purple-500/10' },
};

interface HeaderProps {
  onShowStations: () => void;
  onShowCombined?: () => void;
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Header({ onShowStations, onShowCombined, activeTab = 'dashboard', onTabChange }: HeaderProps) {
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const stations = useStationStore((s) => s.stations);
  const currentStation = useStationStore((s) => s.currentStation);
  const switchStation = useStationStore((s) => s.switchStation);
  const theme = useFuelStore((s) => s.theme);
  const toggleTheme = useFuelStore((s) => s.toggleTheme);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(mockNotifications);
  const [notifFilter, setNotifFilter] = useState<string>('all');
  const [currentTime, setCurrentTime] = useState('');

  const unreadCount = notifications.filter((n) => n.unread).length;

  const filteredNotifications =
    notifFilter === 'all'
      ? notifications
      : notifFilter === 'alerts'
        ? notifications.filter((n) => n.type === 'alert' || n.type === 'warning')
        : notifFilter === 'system'
          ? notifications.filter((n) => n.type === 'info' || n.type === 'success')
          : notifications.filter((n) => n.type === 'reminder');

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })));
  }, []);

  const handleNotificationClick = useCallback(
    (notif: Notification) => {
      // Mark as read
      setNotifications((prev) =>
        prev.map((n) => (n.id === notif.id ? { ...n, unread: false } : n))
      );
      // Navigate to tab if specified
      if (notif.tabId && onTabChange) {
        onTabChange(notif.tabId);
      }
      setNotificationsOpen(false);
    },
    [onTabChange]
  );

  const handleSearchSelect = useCallback(
    (tabId: string) => {
      setSearchOpen(false);
      if (onTabChange) {
        onTabChange(tabId);
      }
    },
    [onTabChange]
  );

  // Update current time every minute
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // Keyboard shortcut for search (Ctrl+K)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'FP';

  // Get current tab label for breadcrumb
  const currentTabLabel = allTabs.find((t) => t.id === activeTab)?.label ?? 'Dashboard';

  return (
    <header className="sticky top-0 z-40 bg-slate-900 border-b border-slate-700/50 shadow-lg">
      <div className="flex items-center justify-between h-14 px-3 md:px-4">
        {/* Left: Logo + Station selector + Breadcrumb */}
        <div className="flex items-center gap-2 md:gap-3">
          {/* Mobile hamburger */}
          <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden text-slate-300 hover:text-white hover:bg-white/10">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="bg-slate-900 border-slate-700 text-white w-72">
              <SheetHeader>
                <SheetTitle className="text-white flex items-center gap-2">
                  <Fuel className="size-5 text-amber-400" />
                  FuelPro
                </SheetTitle>
                <SheetDescription className="sr-only">Mobile navigation menu</SheetDescription>
              </SheetHeader>
              <div className="mt-6 space-y-2">
                {user && (
                  <div className="px-3 py-3 bg-white/5 rounded-lg flex items-center gap-3">
                    <Avatar className="size-10">
                      <AvatarFallback className="bg-amber-500/20 text-amber-400 text-sm font-semibold">
                        {initials}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-white">{user.name}</p>
                      <p className="text-xs text-slate-400">{user.email}</p>
                    </div>
                  </div>
                )}
                <button
                  onClick={() => {
                    onShowStations();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Building className="size-4" />
                  Manage Stations
                </button>
                <button
                  onClick={() => {
                    onTabChange?.('settings');
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-slate-300 hover:bg-white/10 transition-colors"
                >
                  <Settings className="size-4" />
                  Settings
                </button>
                <button
                  onClick={() => {
                    logout();
                    setMobileMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  <LogOut className="size-4" />
                  Sign Out
                </button>
              </div>
            </SheetContent>
          </Sheet>

          {/* Logo */}
          <div className="flex items-center gap-2">
            <Fuel className="size-6 text-amber-400" />
            <span className="text-lg font-bold text-white hidden sm:inline">FuelPro</span>
          </div>

          {/* Station selector with live status */}
          {stations.length > 0 && (
            <div className="hidden md:flex items-center gap-2">
              <Select
                value={currentStation?.id ?? ''}
                onValueChange={switchStation}
              >
                <SelectTrigger className="bg-white/5 border-white/10 text-white text-sm h-8 w-auto max-w-[220px] hover:bg-white/10">
                  <Building className="size-3.5 text-amber-400 mr-1 shrink-0" />
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {stations.map((st) => (
                    <SelectItem key={st.id} value={st.id} className="text-white focus:bg-white/10 focus:text-white">
                      {st.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Live status indicator */}
              <div className="flex items-center gap-1.5" title="Station Live">
                <span className="relative flex size-2 animate-live-pulse rounded-full bg-green-500" />
                <span className="text-[10px] text-green-400 font-bold tracking-wider hidden lg:inline">LIVE</span>
              </div>

              {/* Current time display */}
              {currentTime && (
                <div className="hidden lg:flex items-center gap-1 text-xs text-slate-400">
                  <Clock className="size-3" />
                  <span className="font-mono tabular-nums">{currentTime}</span>
                </div>
              )}
            </div>
          )}

          {/* Breadcrumb trail */}
          <div className="hidden md:flex items-center gap-1.5 text-sm">
            <span className="text-slate-500">FuelPro</span>
            <ChevronRight className="size-3.5 text-slate-600" />
            <span className="text-white font-medium bg-white/5 px-2 py-0.5 rounded text-xs">{currentTabLabel}</span>
          </div>

          {/* Mobile station indicator with live dot */}
          {currentStation && (
            <button
              onClick={onShowStations}
              className="md:hidden flex items-center gap-1 text-xs text-slate-300 hover:text-white transition-colors"
            >
              <span className="relative flex size-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full size-1.5 bg-green-500" />
              </span>
              <Building className="size-3.5 text-amber-400" />
              <span className="max-w-[80px] truncate">{currentStation.name}</span>
              <ChevronDown className="size-3" />
            </button>
          )}

          {/* Mobile breadcrumb */}
          <div className="md:hidden flex items-center gap-1 text-xs text-slate-400">
            <ChevronRight className="size-3" />
            <span className="text-white font-medium">{currentTabLabel}</span>
          </div>
        </div>

        {/* Right: Search, Notifications, Theme, User */}
        <div className="flex items-center gap-1 md:gap-2">
          {/* Search Command Palette trigger */}
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-400 hover:text-white hover:bg-white/10 gap-1.5 h-8 px-2 md:px-3"
            onClick={() => setSearchOpen(true)}
            title="Search tabs (Ctrl+K)"
          >
            <Search className="size-4" />
            <span className="hidden lg:inline text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded border border-slate-700">⌘K</span>
          </Button>

          {/* Notifications Bell */}
          <Button
            variant="ghost"
            size="icon"
            className="relative text-slate-400 hover:text-white hover:bg-white/10"
            onClick={() => setNotificationsOpen(true)}
          >
            <Bell className="size-4" />
            {unreadCount > 0 && (
              <span key={unreadCount} className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center bg-amber-500 text-[10px] font-bold text-black rounded-full px-1 animate-badge-bounce">
                {unreadCount}
              </span>
            )}
          </Button>

          {/* Theme toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-slate-400 hover:text-white hover:bg-white/10"
          >
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </Button>

          {/* User dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 h-8 px-2 hover:bg-white/10">
                <div className="size-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center text-black text-xs font-bold shadow-sm shadow-amber-500/20">
                  {initials}
                </div>
                <span className="hidden md:inline text-sm text-slate-300 max-w-[120px] truncate">
                  {user?.name ?? 'User'}
                </span>
                <ChevronDown className="size-3 text-slate-400 hidden md:inline" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="bg-slate-800 border-slate-700 text-white" align="end">
              <DropdownMenuLabel className="text-slate-400">
                <div className="flex flex-col">
                  <span className="text-white text-sm">{user?.name}</span>
                  <span className="text-xs text-slate-400">{user?.email}</span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer">
                <User className="size-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer"
                onClick={onShowStations}
              >
                <Building className="size-4 mr-2" />
                Stations
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-slate-300 focus:bg-white/10 focus:text-white cursor-pointer"
                onClick={() => onTabChange?.('settings')}
              >
                <Settings className="size-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator className="bg-slate-700" />
              <DropdownMenuItem
                className="text-red-400 focus:bg-red-500/10 focus:text-red-400 cursor-pointer"
                onClick={logout}
              >
                <LogOut className="size-4 mr-2" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Notification Drawer */}
      <Sheet open={notificationsOpen} onOpenChange={setNotificationsOpen}>
        <SheetContent side="right" className="bg-slate-900 border-slate-700 text-white w-full sm:max-w-md p-0">
          <SheetHeader className="p-4 pb-0">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-white flex items-center gap-2">
                <Bell className="size-5 text-amber-400" />
                Notifications
                {unreadCount > 0 && (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">
                    {unreadCount} new
                  </Badge>
                )}
              </SheetTitle>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-xs text-slate-400 hover:text-white h-7"
                  onClick={markAllAsRead}
                >
                  <CheckCheck className="size-3.5 mr-1" />
                  Mark all read
                </Button>
              )}
            </div>
            <SheetDescription className="sr-only">View your notifications</SheetDescription>
          </SheetHeader>

          {/* Filter tabs */}
          <div className="px-4 pt-3 pb-2">
            <Tabs value={notifFilter} onValueChange={setNotifFilter}>
              <TabsList className="bg-slate-800/60 h-8 w-full">
                <TabsTrigger value="all" className="text-xs h-6 flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  All
                </TabsTrigger>
                <TabsTrigger value="alerts" className="text-xs h-6 flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  Alerts
                </TabsTrigger>
                <TabsTrigger value="system" className="text-xs h-6 flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  System
                </TabsTrigger>
                <TabsTrigger value="reminders" className="text-xs h-6 flex-1 data-[state=active]:bg-slate-700 data-[state=active]:text-white">
                  Reminders
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Separator className="bg-slate-700/50" />

          {/* Notification list */}
          <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
            <div className="p-2 space-y-1">
              {filteredNotifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500">
                  <Bell className="size-8 mb-2 opacity-30" />
                  <p className="text-sm">No notifications in this category</p>
                </div>
              ) : (
                filteredNotifications.map((notif) => {
                  const config = notificationConfig[notif.type];
                  const Icon = config.icon;
                  return (
                    <button
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`w-full text-left flex items-start gap-3 p-3 rounded-lg transition-colors hover:bg-white/5 ${
                        notif.unread ? 'bg-white/[0.02]' : ''
                      }`}
                    >
                      <div className={`shrink-0 mt-0.5 p-1.5 rounded-md ${config.bg}`}>
                        <Icon className={`size-4 ${config.color}`} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2">
                          <p className={`text-sm font-medium leading-tight ${notif.unread ? 'text-white' : 'text-slate-300'}`}>
                            {notif.title}
                          </p>
                          {notif.unread && (
                            <span className="shrink-0 mt-1.5 size-2 rounded-full bg-blue-500" />
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                          {notif.description}
                        </p>
                        <p className="text-[10px] text-slate-500 mt-1">{notif.timestamp}</p>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </ScrollArea>

          {/* Footer */}
          <div className="border-t border-slate-700/50 p-3">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs text-slate-400 hover:text-white hover:bg-white/5"
              onClick={() => {
                onTabChange?.('settings');
                setNotificationsOpen(false);
              }}
            >
              <Settings className="size-3.5 mr-1" />
              Notification Settings
            </Button>
          </div>
        </SheetContent>
      </Sheet>

      {/* Search Command Palette */}
      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        title="Search Navigation"
        description="Search and navigate to any tab"
        className="bg-slate-900 border-slate-700"
      >
        <CommandInput placeholder="Search tabs..." className="text-white" />
        <CommandList>
          <CommandEmpty className="text-slate-400">No tabs found.</CommandEmpty>
          <CommandGroup heading="Navigation" className="text-slate-400">
            {allTabs.map((tab) => (
              <CommandItem
                key={tab.id}
                value={tab.label}
                onSelect={() => handleSearchSelect(tab.id)}
                className="text-slate-300 data-[selected=true]:bg-white/10 data-[selected=true]:text-white cursor-pointer"
              >
                <tab.icon className="size-4 text-slate-400" />
                <span>{tab.label}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </header>
  );
}
