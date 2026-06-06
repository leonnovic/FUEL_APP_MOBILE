'use client';

import { useRef, useEffect, useState } from 'react';
import {
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
  Fuel,
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
  ChevronLeft,
  ChevronRight,
  Calculator,
  ClipboardList,
  Settings,
  MapPin,
  Crown,
  Building2,
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  accessibleTabs?: string[];
}

// Tab badges — counts/indicators for specific tabs
const tabBadges: Record<string, { count?: number; alert?: boolean }> = {
  mpesa: { count: 3 },
  maintenance: { alert: true },
  live: { alert: true },
  credit: { count: 2 },
};

// Separator positions — indices AFTER which a dot separator appears
// Group 1: Core (0-7), Group 2: Financial (8-11), Group 3: Operations (12-20), Group 4: Management (21-31), Group 5: Extended (32+)
const separatorAfter = new Set([7, 11, 20, 31]);

const tabs = [
  // Core tabs — match reference site order exactly
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'pos', label: 'Point of Sale', icon: ShoppingCart },
  { id: 'sales', label: 'Sales Tracking', icon: DollarSign },
  { id: 'live', label: 'Live Transaction', icon: Radio },
  { id: 'inventory', label: 'Inventory', icon: Package },
  { id: 'offloading', label: 'Fuel Offloading', icon: Droplets },
  { id: 'delivery', label: 'Delivery Tracker', icon: Truck },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'credit', label: 'Credit', icon: Wallet },
  { id: 'debt', label: 'Debt Reminder', icon: CreditCard },
  { id: 'mpesa', label: 'M-PESA Analyzer', icon: Smartphone },
  { id: 'payroll', label: 'Payroll System', icon: Users },
  { id: 'shifts', label: 'Shifts', icon: Clock },
  { id: 'customers', label: 'Customers', icon: UserCircle },
  { id: 'quality', label: 'Fuel Quality', icon: Star },
  { id: 'fuel-sales', label: 'Fuel Sales Report', icon: Fuel },
  { id: 'reports', label: 'Reports Center', icon: BarChart3 },
  { id: 'analytics', label: 'Analytics', icon: TrendingUp },
  { id: 'audit', label: 'Audit Trail', icon: ClipboardCheck },
  { id: 'communication', label: 'Communication', icon: MessageSquare },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'data', label: 'Data Manager', icon: Database },
  { id: 'integration', label: 'Integrations', icon: Plug },
  { id: 'compliance', label: 'Compliance', icon: Globe },
  { id: 'fuel-types', label: 'Fuel Types', icon: Layers },
  { id: 'team', label: 'Team', icon: UsersRound },
  { id: 'documents', label: 'Documents', icon: FileStack },
  { id: 'suppliers', label: 'Suppliers', icon: Warehouse },
  { id: 'maintenance', label: 'Maintenance', icon: Wrench },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'price-board', label: 'Price Board', icon: Monitor },
  { id: 'doc-converter', label: 'Doc Converter', icon: FileText },
  // Extended tabs (our additions beyond reference)
  { id: 'station-perf', label: 'Station Perf', icon: BarChart3 },
  { id: 'price-predict', label: 'Price Predict', icon: TrendingUp },
  { id: 'station-locator', label: 'Stations', icon: MapPin },
  { id: 'fleet', label: 'Fleet', icon: Truck },
  { id: 'fuel-orders', label: 'Orders', icon: ClipboardList },
  { id: 'profit-calc', label: 'Profit Calc', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
  { id: 'founder', label: 'Founder', icon: Crown },
  { id: 'company', label: 'Company', icon: Building2 },
];

export function TabNavigation({ activeTab, onTabChange, accessibleTabs }: TabNavigationProps) {
  // Filter tabs based on role permissions
  const visibleTabs = accessibleTabs
    ? tabs.filter(t => accessibleTabs.includes(t.id))
    : tabs;
  const scrollRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  // Check scroll position for fade indicators
  const checkScroll = () => {
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 8);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 8);
  };

  useEffect(() => {
    const handle = requestAnimationFrame(checkScroll);
    const el = scrollRef.current?.querySelector('[data-radix-scroll-area-viewport]') as HTMLElement | null;
    if (el) {
      el.addEventListener('scroll', checkScroll);
      window.addEventListener('resize', checkScroll);
      return () => {
        cancelAnimationFrame(handle);
        el.removeEventListener('scroll', checkScroll);
        window.removeEventListener('resize', checkScroll);
      };
    }
    return () => cancelAnimationFrame(handle);
  }, []);

  // Auto-scroll to active tab
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
    // Recheck scroll indicators after tab change
    setTimeout(checkScroll, 350);
  }, [activeTab]);

  return (
    <div className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50 relative">
      {/* Left fade indicator */}
      <div
        className={`absolute left-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-300 ${
          canScrollLeft ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(to right, oklch(0.13 0.02 260), transparent)' }}
      />

      {/* Right fade indicator */}
      <div
        className={`absolute right-0 top-0 bottom-0 w-8 z-10 pointer-events-none transition-opacity duration-300 ${
          canScrollRight ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ background: 'linear-gradient(to left, oklch(0.13 0.02 260), transparent)' }}
      />

      <ScrollArea className="w-full" ref={scrollRef}>
        <nav className="flex items-center gap-0 px-2 min-w-max tab-scroll-container" role="tablist" ref={navRef}>
          {visibleTabs.map((tab, index) => {
            const isActive = activeTab === tab.id;
            const badge = tabBadges[tab.id];
            const showSeparator = separatorAfter.has(index);

            return (
              <div key={tab.id} className="flex items-center">
                <button
                  data-tab={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  onClick={() => onTabChange(tab.id)}
                  className={`
                    flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap
                    transition-all duration-200 relative shrink-0 rounded-lg
                    ${
                      isActive
                        ? 'text-amber-400 bg-amber-500/10'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                    }
                  `}
                >
                  <tab.icon className={`size-3.5 transition-transform duration-200 ${isActive ? 'scale-110' : ''}`} />
                  {tab.label}
                  {/* Count badge */}
                  {badge?.count && (
                    <span className="ml-0.5 inline-flex items-center justify-center min-w-[16px] h-4 px-1 text-[9px] font-bold rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      {badge.count}
                    </span>
                  )}
                  {/* Alert badge */}
                  {badge?.alert && !badge?.count && (
                    <span className="ml-0.5 inline-flex items-center justify-center w-3.5 h-3.5 text-[8px] font-bold rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                      !
                    </span>
                  )}
                  {/* Active bottom indicator */}
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-amber-400 rounded-full" />
                  )}
                </button>
                {/* Separator dot between tab groups */}
                {showSeparator && (
                  <span className="mx-1 size-1 rounded-full bg-slate-600/50 shrink-0" aria-hidden="true" />
                )}
              </div>
            );
          })}
        </nav>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
