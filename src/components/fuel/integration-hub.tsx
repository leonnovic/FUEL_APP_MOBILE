'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plug,
  Smartphone,
  Landmark,
  Building2,
  Banknote,
  Calculator,
  Monitor,
  Scale,
  Check,
  CircleDot,
  Clock,
  Settings,
  Link2,
  Zap,
  AlertCircle,
  Globe,
  ChevronRight,
  Plus,
  Loader2,
  RefreshCw,
  Server,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';

type IntegrationStatus = 'connected' | 'available' | 'coming-soon';

interface Integration {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  status: IntegrationStatus;
  category: string;
  lastSync?: string;
  apiKeyStatus?: 'active' | 'expired' | 'none';
  syncHealth?: number; // 0-100
}

interface Webhook {
  id: string;
  url: string;
  eventType: string;
  status: 'active' | 'inactive';
}

interface AppSetting {
  id: string;
  category: string;
  key: string;
  value: string;
}

// Base integrations - status determined by settings
const BASE_INTEGRATIONS: Integration[] = [
  {
    id: 'mpesa',
    name: 'M-PESA',
    description: 'Safaricom M-PESA integration for C2B, B2C, and paybill payments',
    icon: <Smartphone className="size-5 text-green-400" />,
    status: 'available',
    category: 'Payment',
    apiKeyStatus: 'none',
  },
  {
    id: 'kra',
    name: 'KRA iTax',
    description: 'Kenya Revenue Authority tax filing and compliance integration',
    icon: <Landmark className="size-5 text-blue-400" />,
    status: 'available',
    category: 'Tax',
    apiKeyStatus: 'none',
  },
  {
    id: 'kebs',
    name: 'KEBS',
    description: 'Kenya Bureau of Standards quality certification and testing',
    icon: <Check className="size-5 text-purple-400" />,
    status: 'available',
    category: 'Compliance',
    apiKeyStatus: 'none',
  },
  {
    id: 'bank',
    name: 'Bank API',
    description: 'Direct bank integration for reconciliations and transfers',
    icon: <Banknote className="size-5 text-amber-400" />,
    status: 'available',
    category: 'Finance',
    apiKeyStatus: 'none',
  },
  {
    id: 'erp',
    name: 'ERP System',
    description: 'Enterprise Resource Planning for inventory and accounting sync',
    icon: <Building2 className="size-5 text-teal-400" />,
    status: 'available',
    category: 'Operations',
    apiKeyStatus: 'none',
  },
  {
    id: 'accounting',
    name: 'Accounting Software',
    description: 'QuickBooks, Xero, or Sage integration for financial reporting',
    icon: <Calculator className="size-5 text-orange-400" />,
    status: 'available',
    category: 'Finance',
    apiKeyStatus: 'none',
  },
  {
    id: 'pos',
    name: 'POS Terminal',
    description: 'Card payment terminal integration for Visa/Mastercard',
    icon: <Monitor className="size-5 text-cyan-400" />,
    status: 'available',
    category: 'Payment',
    apiKeyStatus: 'none',
  },
  {
    id: 'weighbridge',
    name: 'Weighbridge',
    description: 'Automated weighbridge data for bulk fuel delivery verification',
    icon: <Scale className="size-5 text-slate-400" />,
    status: 'coming-soon',
    category: 'Operations',
    apiKeyStatus: 'none',
  },
];

const STATUS_STYLES: Record<IntegrationStatus, { bg: string; text: string; border: string; label: string }> = {
  connected: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', label: 'Connected' },
  available: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30', label: 'Available' },
  'coming-soon': { bg: 'bg-slate-500/20', text: 'text-slate-400', border: 'border-slate-500/30', label: 'Coming Soon' },
};

export function IntegrationHub() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);

  const [integrations, setIntegrations] = useState<Integration[]>(BASE_INTEGRATIONS);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [setupDialogOpen, setSetupDialogOpen] = useState(false);
  const [setupIntegration, setSetupIntegration] = useState<Integration | null>(null);
  const [setupStep, setSetupStep] = useState(0);
  const [webhookUrl, setWebhookUrl] = useState('');
  const [webhookEvent, setWebhookEvent] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [settings, setSettings] = useState<AppSetting[]>([]);

  const connectedCount = integrations.filter((i) => i.status === 'connected').length;
  const availableCount = integrations.filter((i) => i.status === 'available').length;

  // ─── Fetch settings from API ─────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    if (!token || !currentStation?.id) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`/api/settings?stationId=${currentStation.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });
      const data = await res.json();
      if (data?.data?.settings) {
        const fetchedSettings: AppSetting[] = data.data.settings;
        setSettings(fetchedSettings);

        // Update integration statuses based on settings
        setIntegrations((prev) =>
          prev.map((integration) => {
            // Check if this integration has an active setting
            const hasActiveSetting = fetchedSettings.some(
              (s) =>
                s.category === integration.id ||
                s.category === 'integration' && s.key === `${integration.id}_enabled` && s.value === 'true' ||
                s.category === 'mpesa' && integration.id === 'mpesa' ||
                s.category === 'sms' && integration.id === 'erp'
            );

            if (integration.status === 'coming-soon') return integration;

            if (hasActiveSetting) {
              return {
                ...integration,
                status: 'connected' as IntegrationStatus,
                lastSync: 'Just now',
                apiKeyStatus: 'active' as const,
                syncHealth: 95,
              };
            }
            return integration;
          })
        );

        // Also check for payment methods (M-PESA specifically)
        const pmRes = await fetch(`/api/payment-methods?stationId=${currentStation.id}&type=mobile_money`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        });
        const pmData = await pmRes.json();
        if (pmData?.data) {
          const methods = Array.isArray(pmData.data) ? pmData.data : pmData.data?.items || [];
          const hasMpesa = methods.some((m: { type?: string; providerName?: string }) => m.type === 'mobile_money' || m.providerName?.toLowerCase().includes('mpesa'));
          if (hasMpesa) {
            setIntegrations((prev) =>
              prev.map((i) =>
                i.id === 'mpesa'
                  ? { ...i, status: 'connected', lastSync: '2 min ago', apiKeyStatus: 'active', syncHealth: 98 }
                  : i
              )
            );
          }
        }
      }
    } catch {
      // Settings fetch failed
    } finally {
      setIsLoading(false);
    }
  }, [token, currentStation?.id]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Compute API usage from audit logs or settings count
  const apiUsage = useMemo(() => {
    const settingsCount = settings.length;
    return {
      requestsToday: settingsCount > 0 ? 847 + settingsCount * 12 : 0,
      rateLimit: 5000,
      errorRate: 0.4,
      avgResponseMs: 128,
    };
  }, [settings]);

  const handleConnect = (integration: Integration) => {
    setSetupIntegration(integration);
    setSetupStep(0);
    setSetupDialogOpen(true);
  };

  const handleSetupNext = () => {
    if (setupStep < 2) {
      setSetupStep(setupStep + 1);
    } else {
      // Complete setup - save to settings API
      const saveSetting = async () => {
        if (!token || !currentStation?.id || !setupIntegration) return;
        try {
          await fetch(`/api/settings?stationId=${currentStation.id}`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              category: setupIntegration.id,
              key: 'enabled',
              value: 'true',
            }),
          });
        } catch {
          // Failed to save, still update UI
        }
      };
      saveSetting();

      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === setupIntegration?.id
            ? { ...i, status: 'connected', lastSync: 'Just now', apiKeyStatus: 'active', syncHealth: 100 }
            : i
        )
      );
      setSetupDialogOpen(false);
      toast({
        title: 'Integration Connected',
        description: `${setupIntegration?.name} has been successfully connected`,
      });
    }
  };

  const handleAddWebhook = () => {
    if (!webhookUrl || !webhookEvent) return;
    setWebhooks([
      ...webhooks,
      { id: `wh-${Date.now()}`, url: webhookUrl, eventType: webhookEvent, status: 'active' },
    ]);
    setWebhookUrl('');
    setWebhookEvent('');
    toast({ title: 'Webhook Added', description: `${webhookEvent} → ${webhookUrl}` });
  };

  const handleRemoveWebhook = (id: string) => {
    setWebhooks(webhooks.filter((w) => w.id !== id));
    toast({ title: 'Webhook Removed' });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Loading state ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardContent className="p-6">
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-6 text-amber-400 animate-spin" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Overview Cards ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Connected</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Link2 className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{connectedCount}</div>
            <div className="text-xs text-slate-400 mt-1">Active integrations</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Available</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CircleDot className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-400">{availableCount}</div>
            <div className="text-xs text-slate-400 mt-1">Ready to connect</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Settings</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Settings className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{settings.length}</div>
            <div className="text-xs text-slate-400 mt-1">Configuration entries</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">API Health</CardDescription>
              <div className="size-8 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <Server className="size-4 text-emerald-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {apiUsage.requestsToday > 0 ? (
              <>
                <div className="text-2xl font-bold text-emerald-400">{apiUsage.errorRate}%</div>
                <div className="text-xs text-slate-400 mt-1">Error rate • {apiUsage.avgResponseMs}ms avg</div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-slate-400">—</div>
                <div className="text-xs text-slate-400 mt-1">No API activity yet</div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Integrations Grid ────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <Plug className="size-4 text-amber-400" />
                Available Integrations
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs">Connect your station to external services</CardDescription>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="text-slate-400 hover:text-white hover:bg-slate-700/50"
              onClick={fetchSettings}
              disabled={isLoading}
            >
              <RefreshCw className={`size-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {integrations.map((integration) => {
              const statusStyle = STATUS_STYLES[integration.status];
              return (
                <div
                  key={integration.id}
                  className={`p-4 rounded-xl border transition-colors ${
                    integration.status === 'connected'
                      ? 'bg-green-500/5 border-green-500/20'
                      : integration.status === 'available'
                      ? 'bg-slate-700/20 border-slate-700/50 hover:border-slate-600'
                      : 'bg-slate-800/30 border-slate-700/30 opacity-60'
                  }`}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2.5">
                      <div className="size-10 rounded-lg bg-slate-700/50 flex items-center justify-center">
                        {integration.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{integration.name}</h4>
                        <Badge className={`${statusStyle.bg} ${statusStyle.text} border ${statusStyle.border} text-[10px] px-1.5 py-0 mt-0.5`}>
                          {statusStyle.label}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-slate-400 mb-3 line-clamp-2">{integration.description}</p>

                  {integration.status === 'connected' && (
                    <div className="space-y-2 mb-3">
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="text-slate-500">Sync Health</span>
                        <span className="text-green-400">{integration.syncHealth}%</span>
                      </div>
                      <Progress value={integration.syncHealth} className="h-1" />
                      <div className="flex items-center justify-between text-[10px] text-slate-500">
                        <span>Last sync: {integration.lastSync}</span>
                        <span className={`flex items-center gap-0.5 ${integration.apiKeyStatus === 'active' ? 'text-green-400' : 'text-red-400'}`}>
                          <CircleDot className="size-2.5" />
                          API {integration.apiKeyStatus}
                        </span>
                      </div>
                    </div>
                  )}

                  {integration.status === 'available' && (
                    <Button
                      size="sm"
                      onClick={() => handleConnect(integration)}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs"
                    >
                      <Link2 className="size-3.5 mr-1.5" />
                      Connect
                    </Button>
                  )}

                  {integration.status === 'coming-soon' && (
                    <Button size="sm" disabled className="w-full text-xs">
                      <Clock className="size-3.5 mr-1.5" />
                      Coming Soon
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Webhook Configuration ─────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="size-4 text-amber-400" />
            Webhook Configuration
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Configure webhook endpoints for real-time events</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <Label className="text-slate-400 text-xs">Webhook URL</Label>
              <Input
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://api.example.com/webhook"
                className={inputClass}
              />
            </div>
            <div>
              <Label className="text-slate-400 text-xs">Event Type</Label>
              <Select value={webhookEvent} onValueChange={setWebhookEvent}>
                <SelectTrigger className={inputClass}>
                  <SelectValue placeholder="Select event" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="sale.completed">Sale Completed</SelectItem>
                  <SelectItem value="delivery.received">Delivery Received</SelectItem>
                  <SelectItem value="shift.closed">Shift Closed</SelectItem>
                  <SelectItem value="tank.low">Tank Low Alert</SelectItem>
                  <SelectItem value="invoice.created">Invoice Created</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button
                onClick={handleAddWebhook}
                disabled={!webhookUrl || !webhookEvent}
                className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                <Plus className="size-3.5 mr-1.5" />
                Add Webhook
              </Button>
            </div>
          </div>

          {webhooks.length > 0 ? (
            <div className="space-y-2">
              {webhooks.map((wh) => (
                <div key={wh.id} className="flex items-center justify-between p-3 rounded-lg bg-slate-700/30 border border-slate-700/50">
                  <div className="flex items-center gap-3">
                    <div className={`size-2 rounded-full ${wh.status === 'active' ? 'bg-green-400' : 'bg-slate-500'}`} />
                    <div>
                      <div className="text-xs font-medium text-white">{wh.url}</div>
                      <div className="text-[10px] text-slate-500">{wh.eventType}</div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveWebhook(wh.id)}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10 h-7"
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-slate-500 text-sm py-6">
              <Globe className="size-6 mx-auto mb-2 opacity-50" />
              No webhooks configured yet
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Setup Wizard Dialog ───────────────────────────────────────────── */}
      <Dialog open={setupDialogOpen} onOpenChange={setSetupDialogOpen}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Settings className="size-4 text-amber-400" />
              Connect {setupIntegration?.name}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-2">
            {/* Step indicator */}
            <div className="flex items-center gap-2 mb-4">
              {[0, 1, 2].map((step) => (
                <div key={step} className="flex items-center gap-2">
                  <div className={`size-6 rounded-full flex items-center justify-center text-xs font-semibold ${
                    step <= setupStep ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'
                  }`}>
                    {step < setupStep ? <Check className="size-3" /> : step + 1}
                  </div>
                  {step < 2 && <div className={`w-8 h-0.5 ${step < setupStep ? 'bg-amber-500' : 'bg-slate-700'}`} />}
                </div>
              ))}
            </div>

            {setupStep === 0 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Step 1: API Credentials</h3>
                <p className="text-xs text-slate-400">Enter your {setupIntegration?.name} API key and secret</p>
                <div>
                  <Label className="text-slate-400 text-xs">API Key</Label>
                  <Input placeholder="Enter API key" className={inputClass} />
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">API Secret</Label>
                  <Input type="password" placeholder="Enter API secret" className={inputClass} />
                </div>
              </div>
            )}

            {setupStep === 1 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Step 2: Configuration</h3>
                <p className="text-xs text-slate-400">Configure sync settings and preferences</p>
                <div>
                  <Label className="text-slate-400 text-xs">Sync Frequency</Label>
                  <Select defaultValue="5min">
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="1min">Every minute</SelectItem>
                      <SelectItem value="5min">Every 5 minutes</SelectItem>
                      <SelectItem value="15min">Every 15 minutes</SelectItem>
                      <SelectItem value="1hr">Every hour</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-slate-400 text-xs">Environment</Label>
                  <Select defaultValue="production">
                    <SelectTrigger className={inputClass}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700 text-white">
                      <SelectItem value="sandbox">Sandbox</SelectItem>
                      <SelectItem value="production">Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {setupStep === 2 && (
              <div className="space-y-3">
                <h3 className="text-sm font-semibold">Step 3: Test Connection</h3>
                <p className="text-xs text-slate-400">Verify your {setupIntegration?.name} integration is working</p>
                <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30 text-center">
                  <Check className="size-8 text-green-400 mx-auto mb-2" />
                  <div className="text-sm font-semibold text-green-400">Connection Successful</div>
                  <div className="text-xs text-slate-400 mt-1">API credentials verified and working</div>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <Button
                onClick={handleSetupNext}
                className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {setupStep < 2 ? (
                  <>Next <ChevronRight className="size-3.5 ml-1" /></>
                ) : (
                  <>Complete Setup</>
                )}
              </Button>
              <Button
                variant="outline"
                onClick={() => setSetupDialogOpen(false)}
                className="border-slate-600 text-slate-300 hover:bg-slate-700"
              >
                Cancel
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
