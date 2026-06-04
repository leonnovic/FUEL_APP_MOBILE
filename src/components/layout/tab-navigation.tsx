'use client';

import { useRef, useEffect } from 'react';
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
} from 'lucide-react';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const tabs = [
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
];

export function TabNavigation({ activeTab, onTabChange }: TabNavigationProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to active tab
  useEffect(() => {
    const activeEl = scrollRef.current?.querySelector(`[data-tab="${activeTab}"]`);
    if (activeEl) {
      activeEl.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [activeTab]);

  return (
    <div className="sticky top-14 z-30 bg-slate-900/95 backdrop-blur-sm border-b border-slate-700/50">
      <ScrollArea className="w-full" ref={scrollRef}>
        <nav className="flex items-center gap-0 px-2 min-w-max" role="tablist">
          {tabs.map((tab) => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                data-tab={tab.id}
                role="tab"
                aria-selected={isActive}
                onClick={() => onTabChange(tab.id)}
                className={`
                  flex items-center gap-1.5 px-3 py-2 text-xs font-medium whitespace-nowrap
                  transition-colors relative shrink-0
                  ${
                    isActive
                      ? 'text-amber-400'
                      : 'text-slate-400 hover:text-slate-200'
                  }
                `}
              >
                <tab.icon className="size-3.5" />
                {tab.label}
                {/* Active indicator */}
                {isActive && (
                  <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>
        <ScrollBar orientation="horizontal" className="h-1" />
      </ScrollArea>
    </div>
  );
}
