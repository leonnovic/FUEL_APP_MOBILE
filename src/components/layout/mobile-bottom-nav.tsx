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
} from 'lucide-react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

interface MobileBottomNavProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

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
];

export function MobileBottomNav({ activeTab, onTabChange }: MobileBottomNavProps) {
  const [moreOpen, setMoreOpen] = useState(false);

  // Check if the active tab is in the "more" list
  const isActiveInMore = moreTabs.some((t) => t.id === activeTab);

  const handleTabChange = (tabId: string) => {
    onTabChange(tabId);
    setMoreOpen(false);
  };

  return (
    <>
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-700/50 md:hidden safe-area-bottom"
        role="tablist"
        aria-label="Main navigation"
      >
        <div className="flex items-center justify-around h-14 pb-[env(safe-area-inset-bottom)]">
          {mainTabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex flex-col items-center justify-center gap-0.5 px-3 py-1.5 min-w-[56px]
                  transition-colors
                  ${isActive ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                <tab.icon className="size-5" />
                <span className="text-[10px] font-medium">{tab.label}</span>
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
                  transition-colors
                  ${isActiveInMore ? 'text-amber-400' : 'text-slate-400 hover:text-slate-200'}
                `}
              >
                <MoreHorizontal className="size-5" />
                <span className="text-[10px] font-medium">More</span>
              </button>
            </SheetTrigger>
            <SheetContent side="bottom" className="bg-slate-900 border-slate-700 text-white rounded-t-xl h-[70vh]">
              <SheetHeader>
                <SheetTitle className="text-white text-center">All Modules</SheetTitle>
              </SheetHeader>
              <ScrollArea className="h-[calc(70vh-80px)] mt-4">
                <div className="grid grid-cols-4 gap-3 px-4 pb-8">
                  {moreTabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        onClick={() => handleTabChange(tab.id)}
                        className={`
                          flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl
                          transition-colors min-h-[72px]
                          ${isActive
                            ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                            : 'bg-white/5 text-slate-300 hover:bg-white/10 border border-transparent'
                          }
                        `}
                      >
                        <tab.icon className="size-5" />
                        <span className="text-[10px] font-medium leading-tight text-center">
                          {tab.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </ScrollArea>
            </SheetContent>
          </Sheet>
        </div>
      </nav>

      {/* Spacer for bottom nav */}
      <div className="h-14 md:hidden" />
    </>
  );
}
