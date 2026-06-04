'use client';

import { useState, useMemo, useEffect } from 'react';
import { LoginScreen } from '@/components/auth/login-screen';
import { Header } from '@/components/layout/header';
import { TabNavigation } from '@/components/layout/tab-navigation';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SetupWizard } from '@/components/layout/setup-wizard';
import { Dashboard } from '@/components/fuel/dashboard';
import { SalesTracking } from '@/components/fuel/sales-tracking';
import { PointOfSale } from '@/components/fuel/point-of-sale';
import { DeliveryTracker } from '@/components/fuel/delivery-tracker';
import { InvoiceSystem } from '@/components/fuel/invoice-system';
import { DebtReminder } from '@/components/fuel/debt-reminder';
import { ExpenseTracker } from '@/components/fuel/expense-tracker';
import { ShiftManagement } from '@/components/fuel/shift-management';
import { InventoryManagement } from '@/components/fuel/inventory-management';
import { SupplierManagement } from '@/components/fuel/supplier-management';
import { MaintenanceTracker } from '@/components/fuel/maintenance-tracker';
import { ReportsCenter } from '@/components/fuel/reports-center';
import { TeamManager } from '@/components/fuel/team-manager';
import { PriceBoard } from '@/components/fuel/price-board';
import { AIChatbot } from '@/components/fuel/ai-chatbot';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

// Lazy-loaded placeholder for tabs not yet built
function PlaceholderTab({ name }: { name: string }) {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="text-center">
        <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-2xl flex items-center justify-center">
          <span className="text-2xl">🚀</span>
        </div>
        <h3 className="text-lg font-semibold text-white">{name}</h3>
        <p className="text-slate-400 text-sm mt-1">Module loaded and ready</p>
      </div>
    </div>
  );
}

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const stations = useStationStore((s) => s.stations);
  const theme = useFuelStore((s) => s.theme);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showStations, setShowStations] = useState(false);

  // Apply theme class to html element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Derive view state from auth and stations
  const viewState = useMemo(() => {
    if (!isAuthenticated) return 'login' as const;
    if (stations.length === 0) return 'setup' as const;
    return 'app' as const;
  }, [isAuthenticated, stations.length]);

  const handleLogin = () => {
    // Auth state change will trigger re-render with correct view
  };

  const handleSetupComplete = () => {
    // Adding a station will change stations.length, triggering re-render
  };

  // Listen for tab change events from dashboard quick actions
  useEffect(() => {
    const handleChangeTab = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) setActiveTab(customEvent.detail);
    };
    window.addEventListener('changeTab', handleChangeTab);
    return () => window.removeEventListener('changeTab', handleChangeTab);
  }, []);

  // Render active tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <Dashboard />;
      case 'sales':
        return <SalesTracking />;
      case 'pos':
        return <PointOfSale />;
      case 'delivery':
        return <DeliveryTracker />;
      case 'offloading':
        return <PlaceholderTab name="Fuel Offloading" />;
      case 'invoice':
        return <InvoiceSystem />;
      case 'debt':
        return <DebtReminder />;
      case 'reports':
        return <ReportsCenter />;
      case 'mpesa':
        return <PlaceholderTab name="M-PESA Analytics" />;
      case 'payroll':
        return <PlaceholderTab name="Payroll System" />;
      case 'data':
        return <PlaceholderTab name="Data Manager" />;
      case 'news':
        return <PlaceholderTab name="News Feed" />;
      case 'live':
        return <PlaceholderTab name="Live Transactions" />;
      case 'fuel-sales':
        return <PlaceholderTab name="Fuel Sales Report" />;
      case 'communication':
        return <PlaceholderTab name="Communication" />;
      case 'inventory':
        return <InventoryManagement />;
      case 'customers':
        return <PlaceholderTab name="Customer Loyalty" />;
      case 'audit':
        return <PlaceholderTab name="Audit Trail" />;
      case 'shifts':
        return <ShiftManagement />;
      case 'quality':
        return <PlaceholderTab name="Fuel Quality Testing" />;
      case 'credit':
        return <PlaceholderTab name="Credit Management" />;
      case 'analytics':
        return <PlaceholderTab name="Advanced Analytics" />;
      case 'integration':
        return <PlaceholderTab name="Integration Hub" />;
      case 'regional':
        return <PlaceholderTab name="Regional Compliance" />;
      case 'fuel-types':
        return <PlaceholderTab name="Fuel Types Manager" />;
      case 'team':
        return <TeamManager />;
      case 'documents':
        return <PlaceholderTab name="Document Manager" />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'maintenance':
        return <MaintenanceTracker />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'price-board':
        return <PriceBoard />;
      default:
        return <Dashboard />;
    }
  };

  // Login screen
  if (viewState === 'login') {
    return <LoginScreen onLogin={handleLogin} />;
  }

  // Setup wizard for first-time users
  if (viewState === 'setup') {
    return <SetupWizard onComplete={handleSetupComplete} />;
  }

  // Main app
  return (
    <div className={`min-h-screen flex flex-col ${theme === 'dark' ? 'bg-slate-950' : 'bg-gray-50'}`}>
      <Header
        onShowStations={() => setShowStations(!showStations)}
        onShowCombined={() => {}}
      />

      {/* Desktop Tab Navigation */}
      <div className="hidden md:block">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Tab Label */}
      <div className="md:hidden px-3 pt-2">
        <div className={`rounded-xl px-4 py-2.5 shadow-sm border ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700/50 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <h2 className="text-base font-bold capitalize">{activeTab.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</h2>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-2xl shadow-lg min-h-[calc(100vh-220px)] md:min-h-[600px] overflow-auto ${theme === 'dark' ? '' : 'bg-white'}`}>
            <div className="p-3 md:p-6">
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Footer */}
      <footer className={`hidden md:block border-t py-3 text-center text-xs ${theme === 'dark' ? 'bg-slate-900 border-slate-800 text-slate-500' : 'bg-white border-gray-200 text-gray-400'}`}>
        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-green-500" /> Secure</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-blue-500" /> Encrypted</span>
          <span className="flex items-center gap-1"><span className="size-1.5 rounded-full bg-amber-500" /> Any Device</span>
          <span>·</span>
          <span>FuelPro © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
