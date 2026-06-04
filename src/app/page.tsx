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
import { LiveTransactions } from '@/components/fuel/live-transactions';
import { AuditTrail } from '@/components/fuel/audit-trail';
import { CommunicationHub } from '@/components/fuel/communication-hub';
import { QualityTesting } from '@/components/fuel/quality-testing';
import { CreditManagement } from '@/components/fuel/credit-management';
import { DataManager } from '@/components/fuel/data-manager';
import { AdvancedAnalytics } from '@/components/fuel/advanced-analytics';
import { FuelTypesManager } from '@/components/fuel/fuel-types-manager';
import { CustomerLoyalty } from '@/components/fuel/customer-loyalty';
import { MpesaAnalytics } from '@/components/fuel/mpesa-analytics';
import { FuelOffloading } from '@/components/fuel/fuel-offloading';
import { NewsFeed } from '@/components/fuel/news-feed';
import { FuelSalesReport } from '@/components/fuel/fuel-sales-report';
import { IntegrationHub } from '@/components/fuel/integration-hub';
import { RegionalCompliance } from '@/components/fuel/regional-compliance';
import { DocumentManager } from '@/components/fuel/document-manager';
import { PayrollSystem } from '@/components/fuel/payroll-system';
import { SettingsPage } from '@/components/fuel/settings-page';
import { FuelOrderRequest } from '@/components/fuel/fuel-order-request';
import { ProfitCalculator } from '@/components/fuel/profit-calculator';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

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
        return <FuelOffloading />;
      case 'invoice':
        return <InvoiceSystem />;
      case 'debt':
        return <DebtReminder />;
      case 'reports':
        return <ReportsCenter />;
      case 'mpesa':
        return <MpesaAnalytics />;
      case 'payroll':
        return <PayrollSystem />;
      case 'data':
        return <DataManager />;
      case 'news':
        return <NewsFeed />;
      case 'live':
        return <LiveTransactions />;
      case 'fuel-sales':
        return <FuelSalesReport />;
      case 'communication':
        return <CommunicationHub />;
      case 'inventory':
        return <InventoryManagement />;
      case 'customers':
        return <CustomerLoyalty />;
      case 'audit':
        return <AuditTrail />;
      case 'shifts':
        return <ShiftManagement />;
      case 'quality':
        return <QualityTesting />;
      case 'credit':
        return <CreditManagement />;
      case 'analytics':
        return <AdvancedAnalytics />;
      case 'integration':
        return <IntegrationHub />;
      case 'regional':
        return <RegionalCompliance />;
      case 'fuel-types':
        return <FuelTypesManager />;
      case 'team':
        return <TeamManager />;
      case 'documents':
        return <DocumentManager />;
      case 'suppliers':
        return <SupplierManagement />;
      case 'maintenance':
        return <MaintenanceTracker />;
      case 'expenses':
        return <ExpenseTracker />;
      case 'price-board':
        return <PriceBoard />;
      case 'settings':
        return <SettingsPage />;
      case 'fuel-orders':
        return <FuelOrderRequest />;
      case 'profit-calc':
        return <ProfitCalculator />;
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
        activeTab={activeTab}
        onTabChange={setActiveTab}
      />

      {/* Gradient separator line below header */}
      <div className="h-px bg-gradient-to-r from-transparent via-amber-500/30 to-transparent" />

      {/* Desktop Tab Navigation */}
      <div className="hidden md:block">
        <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
      </div>

      {/* Mobile Tab Label with accent bar */}
      <div className="md:hidden px-3 pt-2">
        <div className={`rounded-xl px-4 py-2.5 shadow-sm border flex items-center gap-3 ${theme === 'dark' ? 'bg-slate-800/60 border-slate-700/50 text-white' : 'bg-white border-gray-200 text-gray-900'}`}>
          <div className="w-1 h-6 rounded-full bg-gradient-to-b from-amber-400 to-amber-600 shrink-0" />
          <h2 className="text-base font-bold capitalize">{activeTab.replace(/-/g, ' ').replace(/([A-Z])/g, ' $1').trim()}</h2>
        </div>
      </div>

      {/* Main Content with fade-in animation on tab switch */}
      <main className="flex-1 p-3 md:p-6 pb-24 md:pb-6">
        <div className="max-w-7xl mx-auto">
          <div className={`rounded-2xl shadow-lg min-h-[calc(100vh-220px)] md:min-h-[600px] overflow-auto ${theme === 'dark' ? '' : 'bg-white'}`}>
            <div className="p-3 md:p-6 animate-fade-in" key={activeTab}>
              {renderTabContent()}
            </div>
          </div>
        </div>
      </main>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Footer with gradient separator */}
      <footer className={`hidden md:block border-t py-3 text-center text-xs ${theme === 'dark' ? 'bg-slate-900 text-slate-500' : 'bg-white text-gray-400'}`}>
        <div className="h-px bg-gradient-to-r from-transparent via-slate-700/50 to-transparent mb-3" />
        <div className="flex items-center justify-center gap-4">
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> Secure</span>
          <span className="text-slate-700/30">|</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-blue-500" /> Encrypted</span>
          <span className="text-slate-700/30">|</span>
          <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-500" /> Any Device</span>
          <span className="text-slate-700/30">|</span>
          <span className="text-slate-600">FuelPro © {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>
  );
}
