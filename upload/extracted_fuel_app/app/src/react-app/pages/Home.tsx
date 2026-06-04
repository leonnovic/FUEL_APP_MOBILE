import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router';
import { useStations } from '@/react-app/context/StationContext';
import { useAuth } from '@/react-app/context/AuthContext';
import { usePermissions } from '@/react-app/context/PermissionContext';
import { LocationProvider } from '@/react-app/context/LocationContext';
import Header from '@/react-app/components/Header';
import TabNavigation from '@/react-app/components/TabNavigation';
import MobileBottomNav from '@/react-app/components/MobileBottomNav';
import StationManager from '@/react-app/components/StationManager';
import CombinedStationsView from '@/react-app/components/CombinedStationsView';
import Dashboard from '@/react-app/components/Dashboard';
import DeliveryTracker from '@/react-app/components/DeliveryTracker';
import FuelOffloading from '@/react-app/components/FuelOffloading';
import Invoice from '@/react-app/components/Invoice';
import DebtReminder from '@/react-app/components/DebtReminder';
import SalesTracking from '@/react-app/components/SalesTracking';
import ReportsCenter from '@/react-app/components/ReportsCenter';
import MPESAAnalyzer from '@/react-app/components/MPESAAnalyzer';
import PayrollSystem from '@/react-app/components/PayrollSystem';
import DataManager from '@/react-app/components/DataManager';
import News from '@/react-app/components/News';
import LiveTransaction from '@/react-app/components/LiveTransaction';
import FuelSalesReport from '@/react-app/components/FuelSalesReport';
import Communication from '@/react-app/components/Communication';
import PointOfSale from '@/react-app/components/PointOfSale';
import AIChatbot from '@/react-app/components/AIChatbot';
import CloudSyncIndicator from '@/react-app/components/CloudSyncIndicator';
import SetupWizard from '@/react-app/components/SetupWizard';
import FirstLoginChoice from '@/react-app/components/FirstLoginChoice';
import InventoryManagement from '@/react-app/components/InventoryManagement';
import CustomerLoyalty from '@/react-app/components/CustomerLoyalty';
import AuditTrail from '@/react-app/components/AuditTrail';
import ShiftManagement from '@/react-app/components/ShiftManagement';
import FuelQualityTesting from '@/react-app/components/FuelQualityTesting';
import CreditManagement from '@/react-app/components/CreditManagement';
import AdvancedAnalytics from '@/react-app/components/AdvancedAnalytics';
import IntegrationHub from '@/react-app/components/IntegrationHub';
import RegionalCompliance from '@/react-app/components/RegionalCompliance';
import FuelTypesManager from '@/react-app/components/FuelTypesManager';
import TeamManager from '@/react-app/components/TeamManager';
import DocumentManager from '@/react-app/components/DocumentManager';
import SupplierManagement from '@/react-app/components/SupplierManagement';
import MaintenanceTracker from '@/react-app/components/MaintenanceTracker';
import ExpenseTracker from '@/react-app/components/ExpenseTracker';
import PriceBoard from '@/react-app/components/PriceBoard';

function HomeContent() {
  const { currentStation, stations, isStationLoading, adminSettings, switchStation, verifyStationAccess, createStation, loginAdmin } = useStations();
  const { user, getActiveBinding, bindings } = useAuth();
  const { setRole } = usePermissions();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [showStationManager, setShowStationManager] = useState(false);
  const [showCombined, setShowCombined] = useState(false);

  // Auto-login to role: if user has a binding for current station, auto-set their role
  useEffect(() => {
    if (!user || !currentStation) return;
    const binding = getActiveBinding(currentStation.id);
    if (binding && binding.active) {
      // Auto-set the role from binding
      setRole(binding.role);
      console.log(`[Auto-Login] User ${user.name} auto-assigned role: ${binding.role} at ${currentStation.name}`);
    }
  }, [user, currentStation, getActiveBinding, setRole]);

  // Check for combined view
  useEffect(() => {
    if (searchParams.get('combined') === 'true') {
      setShowCombined(true);
    }
  }, [searchParams]);

  // Listen for tab change events
  useEffect(() => {
    const handleChangeTab = (event: Event) => {
      const customEvent = event as CustomEvent;
      if (customEvent.detail) setActiveTab(customEvent.detail);
    };
    window.addEventListener('changeTab', handleChangeTab);
    return () => window.removeEventListener('changeTab', handleChangeTab);
  }, []);

  // Validate tab access - redirect to allowed tab if current tab is restricted
  const { canAccessTab } = usePermissions();
  useEffect(() => {
    if (!canAccessTab(activeTab)) {
      // Find first accessible tab
      const fallbackTabs = ['dashboard', 'sales', 'pos', 'reports', 'inventory', 'mpesa'];
      const fallback = fallbackTabs.find(t => canAccessTab(t));
      if (fallback && fallback !== activeTab) {
        setActiveTab(fallback);
      }
    }
  }, [activeTab, canAccessTab]);

  if (isStationLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center animate-pulse">
            <span className="text-2xl font-bold text-white">F</span>
          </div>
          <h2 className="text-xl font-bold text-white font-serif">FuelPro</h2>
          <p className="text-gray-400 text-sm mt-2">Loading stations...</p>
          <div className="mt-4 w-48 h-1 bg-white/10 rounded-full mx-auto overflow-hidden">
            <div className="h-full bg-amber-500 rounded-full animate-pulse" style={{ width: '60%' }} />
          </div>
        </div>
      </div>
    );
  }

  // ==========================================
  // NO STATIONS: Show FirstLoginChoice only
  // StationManager NEVER auto-appears
  // ==========================================
  if (stations.length === 0 || !currentStation) {
    // If user clicked "Create Station", show SetupWizard
    if (showSetupWizard) {
      return (
        <SetupWizard onComplete={() => {
          setShowSetupWizard(false);
        }} />
      );
    }

    // If stations exist but none selected, show station selector within FirstLoginChoice
    const showAccessMode = stations.length > 0;

    // Otherwise show the choice: Create OR Access Shared
    return (
      <FirstLoginChoice
        existingStations={stations}
        showAccessMode={showAccessMode}
        onCreateStation={() => setShowSetupWizard(true)}
        onAccessShared={(stationId, password) => {
          if (verifyStationAccess(stationId, password)) {
            switchStation(stationId);
            const accesses = JSON.parse(localStorage.getItem('fuelpro_shared_access') || '[]');
            accesses.push({ stationId, date: new Date().toISOString() });
            localStorage.setItem('fuelpro_shared_access', JSON.stringify(accesses));
            return true;
          }
          return false;
        }}
        onSelectStation={(stationId) => {
          switchStation(stationId);
          return true;
        }}
        loginAdmin={loginAdmin}
      />
    );
  }

  const renderTabContent = () => {
    const tabConfig = adminSettings.tabConfig[activeTab as keyof typeof adminSettings.tabConfig];
    if (tabConfig && !tabConfig.enabled) {
      return (
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto mb-4 bg-gray-200 dark:bg-gray-700 rounded-2xl flex items-center justify-center">
              <span className="text-2xl text-gray-400">!</span>
            </div>
            <h3 className="text-lg font-semibold text-gray-500 dark:text-gray-400">Tab Disabled</h3>
            <p className="text-sm text-gray-400 mt-2">This tab has been disabled by the administrator.</p>
          </div>
        </div>
      );
    }

    switch (activeTab) {
      case 'dashboard': return <Dashboard />;
      case 'delivery': return <DeliveryTracker />;
      case 'offloading': return <FuelOffloading />;
      case 'invoice': return <Invoice />;
      case 'debt': return <DebtReminder />;
      case 'sales': return <SalesTracking />;
      case 'reports': return <ReportsCenter />;
      case 'mpesa': return <MPESAAnalyzer />;
      case 'payroll': return <PayrollSystem />;
      case 'data': return <DataManager />;
      case 'news': return <News />;
      case 'livetransaction': return <LiveTransaction />;
      case 'fuelsalesreport': return <FuelSalesReport />;
      case 'communication': return <Communication />;
      case 'pos': return <PointOfSale />;
      case 'inventory': return <InventoryManagement />;
      case 'customers': return <CustomerLoyalty />;
      case 'audit': return <AuditTrail stationId={currentStation?.id || 'default'} />;
      case 'shifts': return <ShiftManagement />;
      case 'quality': return <FuelQualityTesting />;
      case 'credit': return <CreditManagement />;
      case 'analytics': return <AdvancedAnalytics />;
      case 'integration': return <IntegrationHub />;
      case 'regional': return <RegionalCompliance />;
      case 'fueltypes': return <FuelTypesManager />;
      case 'team': return <TeamManager />;
      case 'documents': return <DocumentManager />;
      case 'suppliers': return <SupplierManagement />;
      case 'maintenance': return <MaintenanceTracker />;
      case 'expenses': return <ExpenseTracker />;
      case 'priceboard': return <PriceBoard />;
      default: return <Dashboard />;
    }
  };

  // Show combined stations view
  if (showCombined) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <Header onShowStations={() => setShowStationManager(true)} />
        <div className="container mx-auto px-2 md:px-4 py-6">
          <div className="mb-4 flex items-center gap-3">
            <button
              onClick={() => { setShowCombined(false); navigate('/'); }}
              className="px-4 py-2 bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-sm"
            >
              Back to Station
            </button>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">Combined Stations View</h2>
          </div>
          <CombinedStationsView />
        </div>
      </div>
    );
  }

  // Show Setup Wizard (when triggered from header, not auto)
  if (showSetupWizard) {
    return <SetupWizard onComplete={() => setShowSetupWizard(false)} />;
  }

  // Show Station Manager (when explicitly requested from header ONLY)
  if (showStationManager) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900">
        <StationManager onClose={() => setShowStationManager(false)} />
      </div>
    );
  }

  // ==========================================
  // MAIN APP: stations exist, show normal UI
  // ==========================================
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20 md:pb-0 transition-colors duration-300">
      <Header
        onShowStations={() => setShowStationManager(true)}
        onShowCombined={() => setShowCombined(true)}
      />

      <div className="container mx-auto px-2 md:px-4 py-2 md:py-6">
        {/* Desktop Tab Navigation */}
        <div className="hidden md:block">
          <TabNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* Mobile Header */}
        <div className="md:hidden mb-2">
          <div className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-bold text-gray-800 dark:text-gray-100 capitalize">
              {adminSettings.tabConfig[activeTab as keyof typeof adminSettings.tabConfig]?.label || activeTab}
            </h2>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 md:rounded-b-2xl rounded-2xl shadow-lg min-h-[calc(100vh-200px)] md:min-h-[600px] overflow-hidden">
          {renderTabContent()}
        </div>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav activeTab={activeTab} onTabChange={setActiveTab} />

      {/* AI Chatbot */}
      <AIChatbot />

      {/* Cloud Sync Indicator */}
      <CloudSyncIndicator />
    </div>
  );
}

export default function Home() {
  const { currentStation } = useStations();
  const stationId = currentStation?.id || 'default';

  return (
    <LocationProvider stationId={stationId}>
      <HomeContent />
    </LocationProvider>
  );
}
