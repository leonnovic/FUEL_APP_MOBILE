'use client';

import { useState, useMemo, useEffect, useCallback, type ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { LoginScreen } from '@/components/auth/login-screen';
import { Header } from '@/components/layout/header';
import { TabNavigation } from '@/components/layout/tab-navigation';
import { MobileBottomNav } from '@/components/layout/mobile-bottom-nav';
import { SetupWizard } from '@/components/layout/setup-wizard';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';
import { useFuelStore } from '@/store/fuel-store';

// Loading fallback component
function TabLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div className="flex flex-col items-center gap-3">
        <div className="size-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
        <p className="text-sm text-slate-400">Loading...</p>
      </div>
    </div>
  );
}

// Dynamic imports - load components on demand to reduce initial compilation memory
const Dashboard = dynamic(() => import('@/components/fuel/dashboard').then(m => ({ default: m.Dashboard })), { loading: TabLoader });
const SalesTracking = dynamic(() => import('@/components/fuel/sales-tracking').then(m => ({ default: m.SalesTracking })), { loading: TabLoader });
const PointOfSale = dynamic(() => import('@/components/fuel/point-of-sale').then(m => ({ default: m.PointOfSale })), { loading: TabLoader });
const DeliveryTracker = dynamic(() => import('@/components/fuel/delivery-tracker').then(m => ({ default: m.DeliveryTracker })), { loading: TabLoader });
const InvoiceSystem = dynamic(() => import('@/components/fuel/invoice-system').then(m => ({ default: m.InvoiceSystem })), { loading: TabLoader });
const DebtReminder = dynamic(() => import('@/components/fuel/debt-reminder').then(m => ({ default: m.DebtReminder })), { loading: TabLoader });
const ExpenseTracker = dynamic(() => import('@/components/fuel/expense-tracker').then(m => ({ default: m.ExpenseTracker })), { loading: TabLoader });
const ShiftManagement = dynamic(() => import('@/components/fuel/shift-management').then(m => ({ default: m.ShiftManagement })), { loading: TabLoader });
const InventoryManagement = dynamic(() => import('@/components/fuel/inventory-management').then(m => ({ default: m.InventoryManagement })), { loading: TabLoader });
const SupplierManagement = dynamic(() => import('@/components/fuel/supplier-management').then(m => ({ default: m.SupplierManagement })), { loading: TabLoader });
const MaintenanceTracker = dynamic(() => import('@/components/fuel/maintenance-tracker').then(m => ({ default: m.MaintenanceTracker })), { loading: TabLoader });
const ReportsCenter = dynamic(() => import('@/components/fuel/reports-center').then(m => ({ default: m.ReportsCenter })), { loading: TabLoader });
const TeamManager = dynamic(() => import('@/components/fuel/team-manager').then(m => ({ default: m.TeamManager })), { loading: TabLoader });
const PriceBoard = dynamic(() => import('@/components/fuel/price-board').then(m => ({ default: m.PriceBoard })), { loading: TabLoader });
const AIChatbot = dynamic(() => import('@/components/fuel/ai-chatbot').then(m => ({ default: m.AIChatbot })), { ssr: false });
const LiveTransactions = dynamic(() => import('@/components/fuel/live-transactions').then(m => ({ default: m.LiveTransactions })), { loading: TabLoader });
const AuditTrail = dynamic(() => import('@/components/fuel/audit-trail').then(m => ({ default: m.AuditTrail })), { loading: TabLoader });
const CommunicationHub = dynamic(() => import('@/components/fuel/communication-hub').then(m => ({ default: m.CommunicationHub })), { loading: TabLoader });
const QualityTesting = dynamic(() => import('@/components/fuel/quality-testing').then(m => ({ default: m.QualityTesting })), { loading: TabLoader });
const CreditManagement = dynamic(() => import('@/components/fuel/credit-management').then(m => ({ default: m.CreditManagement })), { loading: TabLoader });
const DataManager = dynamic(() => import('@/components/fuel/data-manager').then(m => ({ default: m.DataManager })), { loading: TabLoader });
const AdvancedAnalytics = dynamic(() => import('@/components/fuel/advanced-analytics').then(m => ({ default: m.AdvancedAnalytics })), { loading: TabLoader });
const FuelTypesManager = dynamic(() => import('@/components/fuel/fuel-types-manager').then(m => ({ default: m.FuelTypesManager })), { loading: TabLoader });
const CustomerLoyalty = dynamic(() => import('@/components/fuel/customer-loyalty').then(m => ({ default: m.CustomerLoyalty })), { loading: TabLoader });
const MpesaAnalytics = dynamic(() => import('@/components/fuel/mpesa-analytics').then(m => ({ default: m.MpesaAnalytics })), { loading: TabLoader });
const FuelOffloading = dynamic(() => import('@/components/fuel/fuel-offloading').then(m => ({ default: m.FuelOffloading })), { loading: TabLoader });
const NewsFeed = dynamic(() => import('@/components/fuel/news-feed').then(m => ({ default: m.NewsFeed })), { loading: TabLoader });
const FuelSalesReport = dynamic(() => import('@/components/fuel/fuel-sales-report').then(m => ({ default: m.FuelSalesReport })), { loading: TabLoader });
const IntegrationHub = dynamic(() => import('@/components/fuel/integration-hub').then(m => ({ default: m.IntegrationHub })), { loading: TabLoader });
const RegionalCompliance = dynamic(() => import('@/components/fuel/regional-compliance').then(m => ({ default: m.RegionalCompliance })), { loading: TabLoader });
const DocumentManager = dynamic(() => import('@/components/fuel/document-manager').then(m => ({ default: m.DocumentManager })), { loading: TabLoader });
const PayrollSystem = dynamic(() => import('@/components/fuel/payroll-system').then(m => ({ default: m.PayrollSystem })), { loading: TabLoader });
const SettingsPage = dynamic(() => import('@/components/fuel/settings-page').then(m => ({ default: m.SettingsPage })), { loading: TabLoader });
const FuelOrderRequest = dynamic(() => import('@/components/fuel/fuel-order-request').then(m => ({ default: m.FuelOrderRequest })), { loading: TabLoader });
const ProfitCalculator = dynamic(() => import('@/components/fuel/profit-calculator').then(m => ({ default: m.ProfitCalculator })), { loading: TabLoader });
const StationPerformance = dynamic(() => import('@/components/fuel/station-performance').then(m => ({ default: m.StationPerformance })), { loading: TabLoader });
const FuelPricePredictor = dynamic(() => import('@/components/fuel/fuel-price-predictor').then(m => ({ default: m.FuelPricePredictor })), { loading: TabLoader });
const StationLocator = dynamic(() => import('@/components/fuel/station-locator').then(m => ({ default: m.StationLocator })), { loading: TabLoader });
const FleetManager = dynamic(() => import('@/components/fuel/fleet-manager').then(m => ({ default: m.FleetManager })), { loading: TabLoader });

export default function Home() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.token);
  const validateSession = useAuthStore((s) => s.validateSession);
  const stations = useStationStore((s) => s.stations);
  const currentStation = useStationStore((s) => s.currentStation);
  const setStations = useStationStore((s) => s.setStations);
  const theme = useFuelStore((s) => s.theme);
  const syncFromServer = useFuelStore((s) => s.syncFromServer);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showStations, setShowStations] = useState(false);

  // Apply theme class to html element
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.classList.toggle('dark', theme === 'dark');
    }
  }, [theme]);

  // Validate session on mount (cross-device sync)
  useEffect(() => {
    if (token) {
      validateSession().catch(() => {});
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync data from server when station changes
  useEffect(() => {
    if (isAuthenticated && token && currentStation?.id) {
      syncFromServer(currentStation.id).catch(() => {});
    }
  }, [isAuthenticated, token, currentStation?.id, syncFromServer]);

  // Fetch user's stations from API after login
  useEffect(() => {
    if (isAuthenticated && token && stations.length === 0) {
      fetch('/api/stations', {
        headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
      })
        .then(res => res.json())
        .then(data => {
          if (data.success && data.data?.length > 0) {
            setStations(data.data.map((s: any) => ({
              id: s.id,
              name: s.name,
              location: s.location,
              country: s.country || 'Kenya',
              currency: s.currency || 'KSH',
              ownerId: s.ownerId,
              createdAt: s.createdAt,
              updatedAt: s.updatedAt,
            })));
          }
        })
        .catch(() => {});
    }
  }, [isAuthenticated, token]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-refresh data every 30 seconds for cross-device sync
  useEffect(() => {
    if (!isAuthenticated || !token || !currentStation?.id) return;
    const interval = setInterval(() => {
      syncFromServer(currentStation.id).catch(() => {});
    }, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, token, currentStation?.id, syncFromServer]);

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
      case 'station-perf':
        return <StationPerformance />;
      case 'price-predict':
        return <FuelPricePredictor />;
      case 'station-locator':
        return <StationLocator />;
      case 'fleet':
        return <FleetManager />;
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
