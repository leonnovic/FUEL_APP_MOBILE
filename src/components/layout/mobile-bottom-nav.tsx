'use client';

import { useState } from 'react';
import {
  LayoutDashboard,
  DollarSign,
  ShoppingCart,
  BarChart3,
  MoreHorizontal,
  Truck,
  Droplets,
  FileText,
  CreditCard,
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
  Calculator,
  ClipboardList,
  Settings,
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

// Badges for bottom nav items
const navBadges: Record<string, { count?: number; alert?: boolean }> = {
  mpesa: { count: 3 },
  maintenance: { alert: true },
  live: { alert: true },
  credit: { count: 2 },
};

const mainTabs = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'sales', label: 'Sales', icon: DollarSign },
  { id: 'pos', label: 'POS', icon: ShoppingCart },
  { id: 'reports', label: 'Reports', icon: BarChart3 },
];

const moreTabs = [
  { id: 'delivery', label: 'Delivery', icon: Truck },
  { id: 'offloading', label: 'Offloading', icon: Droplets },
  { id: 'invoice', label: 'Invoice', icon: FileText },
  { id: 'debt', label: 'Debt', icon: CreditCard },
  { id: 'mpesa', label: 'M-PESA', icon: Smartphone },
  { id: 'payroll', label: 'Payroll', icon: Users },
  { id: 'data', label: 'Data', icon: Database },
  { id: 'news', label: 'News', icon: Newspaper },
  { id: 'live', label: 'Live', icon: Radio },
  { id: 'fuel-sales', label: 'Fuel Sales', icon: Fuel },
  { id: 'communication', label: 'Chat', icon: MessageSquare },
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
  { id: 'documents', label: 'Docs', icon: FileStack },
  { id: 'suppliers', label: 'Suppliers', icon: Warehouse },
  { id: 'maintenance', label: 'Maintain', icon: Wrench },
  { id: 'expenses', label: 'Expenses', icon: Receipt },
  { id: 'price-board', label: 'Prices', icon: Monitor },
  { id: 'fuel-orders', label: 'Orders', icon: ClipboardList },
  { id: 'profit-calc', label: 'Profit', icon: Calculator },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if the active tab is in the "more" list
  const isActiveInMore = moreTabs.some((t) => t.id === activeTab);

  // Count tabs with notifications/updates for the "More" badge
  const moreBadgeCount = Object.entries(navBadges).filter(([key]) =>
    moreTabs.some((t) => t.id === key)
  ).length;

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900/95 backdrop-blur-md border-t border-slate-700/50 md:hidden"
        role="tablist"
        aria-label="Main navigation"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
      >
        <div className="flex items-center justify-around h-14 relative">
          {/* Active indicator pill that slides */}
          <div
            className="absolute top-0 h-0.5 bg-amber-400 rounded-full transition-all duration-300 ease-out"
            style={{
              width: '32px',
              left: activeTab === 'dashboard' ? 'calc(10% - 16px)' :
                     activeTab === 'sales' ? 'calc(30% - 16px)' :
                     activeTab === 'pos' ? 'calc(50% - 16px)' :
                     activeTab === 'reports' ? 'calc(70% - 16px)' :
                     'calc(90% - 16px)',
              opacity: mainTabs.some(t => t.id === activeTab) || isActiveInMore ? 1 : 0,
            }}
          />

          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            const badge = navBadges[tab.id];
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[56px]
                  transition-all duration-200 relative haptic-tap
                  ${isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {/* Active amber dot indicator */}
                {isActive && (
                  <span className="absolute -top-1 size-1.5 rounded-full bg-amber-400 animate-active-dot" />
                )}
                <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                  <tab.icon className="size-5" />
                </div>
                <span className="text-[10px] font-medium">{tab.label}</span>
                {/* Glow effect on active */}
                {isActive && (
                  <span className="absolute inset-0 rounded-xl bg-amber-400/5 pointer-events-none" />
                )}
                {/* Badge */}
                {badge?.count && (
                  <span className="absolute top-0.5 right-2 inline-flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold rounded-full bg-amber-500 text-black">
                    {badge.count}
                  </span>
                )}
                {badge?.alert && !badge?.count && (
                  <span className="absolute top-0.5 right-2 size-2 rounded-full bg-red-500 animate-pulse-subtle" />
                )}
              </button>
            );
          })}

          {/* More button */}
          <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
            <SheetTrigger asChild>
              <button
                role="tab"
                aria-selected={isActiveInMore}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[56px]
                  transition-all duration-200 relative haptic-tap
                  ${isActiveInMore ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                {/* Active amber dot indicator */}
                {isActiveInMore && (
                  <span className="absolute -top-1 size-1.5 rounded-full bg-amber-400 animate-active-dot" />
                )}
                <div className={`transition-transform duration-200 ${isActiveInMore ? 'scale-110' : 'scale-100'}`}>
                  <MoreHorizontal className="size-5" />
                </div>
                <span className="text-[10px] font-medium">More</span>
                {isActiveInMore && (
                  <span className="absolute inset-0 rounded-xl bg-amber-400/5 pointer-events-none" />
                )}
                {/* Badge showing count of tabs with notifications */}
                {moreBadgeCount > 0 && !isActiveInMore && (
                  <span className="absolute top-0.5 right-2 inline-flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold rounded-full bg-amber-500 text-black">
                    {moreBadgeCount}
                  </span>
                )}
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-slate-900 border-slate-700 text-white rounded-t-2xl h-[75vh]">
              <SheetHeader>
                <SheetTitle className="text-white text-center text-lg">All Modules</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(75vh-80px)] mt-4">
                <div className="grid grid-cols-3 gap-2.5 px-4 pb-10">
                  {moreTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const badge = navBadges[tab.id];
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`
                          flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl
                          transition-all duration-200 min-h-[76px] relative
                          ${isActive
                            ? 'bg-amber-500/15 text-amber-400 border border-amber-500/30 shadow-lg shadow-amber-500/5'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent hover:border-white/10'
                          }
                        `}
                      >
                        <div className={`transition-transform duration-200 ${isActive ? 'scale-110' : 'scale-100'}`}>
                          <tab.icon className="size-5" />
                        </div>
                        <span className="text-[10px] font-medium leading-tight text-center line-clamp-2">
                          {tab.label}
                        </span>
                        {/* Badge in grid */}
                        {badge?.count && (
                          <span className="absolute top-1.5 right-1.5 inline-flex items-center justify-center min-w-[14px] h-3.5 px-0.5 text-[8px] font-bold rounded-full bg-amber-500 text-black">
                            {badge.count}
                          </span>
                        )}
                        {badge?.alert && !badge?.count && (
                          <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 animate-pulse-subtle" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for bottom nav with safe area */}
      <div className="md:hidden" style={{ height: 'calc(56px + env(safe-area-inset-bottom, 0px))' }} />
    </>
  );
}
