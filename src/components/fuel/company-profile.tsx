'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Building2,
  Phone,
  Mail,
  MapPin,
  CreditCard,
  Smartphone,
  MessageSquare,
  MailOpen,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';

// ─── Types ───────────────────────────────────────────────────────────────────

interface CompanySettings {
  // Company Details
  companyName: string;
  poBox: string;
  phone: string;
  email: string;
  physicalAddress: string;
  // Currency & Tax
  currency: string;
  vatRegistration: string;
  kraPin: string;
  etrSerial: string;
  // Bank Details
  bankName: string;
  branchName: string;
  accountHolderName: string;
  accountNumber: string;
  swiftCode: string;
  // M-PESA Settings
  paybillNumber: string;
  tillNumber: string;
  mpesaConsumerKey: string;
  mpesaConsumerSecret: string;
  mpesaSandbox: boolean;
  // SMS Settings
  smsGateway: string;
  senderId: string;
  smsApiKey: string;
  // Email Settings
  smtpHost: string;
  smtpPort: string;
  smtpUsername: string;
  smtpPassword: string;
  emailFromAddress: string;
}

const defaultSettings: CompanySettings = {
  companyName: '',
  poBox: '',
  phone: '',
  email: '',
  physicalAddress: '',
  currency: 'KES',
  vatRegistration: '',
  kraPin: '',
  etrSerial: '',
  bankName: '',
  branchName: '',
  accountHolderName: '',
  accountNumber: '',
  swiftCode: '',
  paybillNumber: '',
  tillNumber: '',
  mpesaConsumerKey: '',
  mpesaConsumerSecret: '',
  mpesaSandbox: true,
  smsGateway: 'africas-talking',
  senderId: '',
  smsApiKey: '',
  smtpHost: '',
  smtpPort: '587',
  smtpUsername: '',
  smtpPassword: '',
  emailFromAddress: '',
};

// ─── Masked input helper ────────────────────────────────────────────────────

function MaskedInput({
  value,
  onChange,
  placeholder,
  label,
  id,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder: string;
  label: string;
  id: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs text-slate-400">{label}</Label>
      <div className="relative">
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 pr-9"
        />
        <Button
          variant="ghost"
          size="sm"
          className="absolute right-1 top-1/2 -translate-y-1/2 size-7 p-0 text-slate-400 hover:text-white"
          onClick={() => setVisible(!visible)}
          type="button"
        >
          {visible ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
        </Button>
      </div>
    </div>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function CompanyProfile() {
  const token = useAuthStore((s) => s.token);
  const [settings, setSettings] = useState<CompanySettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);
  const [savingSections, setSavingSections] = useState<Record<string, boolean>>({});
  const [savedSections, setSavedSections] = useState<Record<string, boolean>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  // Load settings on mount
  useEffect(() => {
    const loadSettings = async () => {
      setIsLoading(true);
      try {
        const headers: Record<string, string> = { 'Content-Type': 'application/json' };
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const res = await fetch('/api/settings?category=general', { headers });
        const data = await res.json();

        if (data.success && data.data) {
          setSettings({ ...defaultSettings, ...data.data });
        }
      } catch {
        // Use defaults if API not available
      } finally {
        setIsLoading(false);
      }
    };
    loadSettings();
  }, [token]);

  const updateField = useCallback((field: keyof CompanySettings, value: string | boolean) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  }, []);

  const saveSection = async (section: string) => {
    setSavingSections((prev) => ({ ...prev, [section]: true }));
    setSavedSections((prev) => ({ ...prev, [section]: false }));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[section];
      return next;
    });

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers,
        body: JSON.stringify({ category: 'general', section, data: settings }),
      });

      if (!res.ok) throw new Error('Failed to save');

      setSavedSections((prev) => ({ ...prev, [section]: true }));
      setTimeout(() => {
        setSavedSections((prev) => ({ ...prev, [section]: false }));
      }, 3000);
    } catch {
      setErrors((prev) => ({ ...prev, [section]: 'Failed to save settings. Please try again.' }));
    } finally {
      setSavingSections((prev) => ({ ...prev, [section]: false }));
    }
  };

  const SaveButton = ({ section }: { section: string }) => (
    <div className="flex items-center gap-2">
      <Button
        onClick={() => saveSection(section)}
        disabled={savingSections[section]}
        className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-8 text-xs"
      >
        {savingSections[section] ? (
          <RefreshCw className="size-3.5 mr-1 animate-spin" />
        ) : (
          <Save className="size-3.5 mr-1" />
        )}
        {savingSections[section] ? 'Saving...' : 'Save'}
      </Button>
      {savedSections[section] && (
        <Badge className="text-[10px] bg-green-500/20 text-green-400">
          <CheckCircle className="size-3 mr-0.5" /> Saved
        </Badge>
      )}
      {errors[section] && (
        <Badge className="text-[10px] bg-red-500/20 text-red-400">
          <AlertTriangle className="size-3 mr-0.5" /> {errors[section]}
        </Badge>
      )}
    </div>
  );

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 rounded-full border-2 border-amber-500 border-t-transparent animate-spin" />
          <p className="text-sm text-slate-400">Loading company settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Building2 className="size-5 text-amber-400" />
          <div>
            <h2 className="text-lg font-bold text-white">Company Profile</h2>
            <p className="text-xs text-slate-400">Manage your company, financial, and integration settings</p>
          </div>
        </div>
        <Badge className="bg-amber-500/20 text-amber-400 text-xs">
          {settings.currency} • {settings.companyName || 'Not configured'}
        </Badge>
      </div>

      {/* ── Company Details ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <Building2 className="size-4 text-amber-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Company Details</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Business information and contact details</CardDescription>
              </div>
            </div>
            <SaveButton section="company" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="companyName" className="text-xs text-slate-400">Company Name</Label>
              <Input
                id="companyName"
                value={settings.companyName}
                onChange={(e) => updateField('companyName', e.target.value)}
                placeholder="e.g. FuelPro Kenya Ltd"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="poBox" className="text-xs text-slate-400">P.O. Box</Label>
              <Input
                id="poBox"
                value={settings.poBox}
                onChange={(e) => updateField('poBox', e.target.value)}
                placeholder="e.g. P.O. Box 12345-00100"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="phone" className="text-xs text-slate-400">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <Input
                  id="phone"
                  value={settings.phone}
                  onChange={(e) => updateField('phone', e.target.value)}
                  placeholder="e.g. +254 700 000 000"
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-slate-400">Email Address</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-400" />
                <Input
                  id="email"
                  type="email"
                  value={settings.email}
                  onChange={(e) => updateField('email', e.target.value)}
                  placeholder="e.g. info@fuelpro.ke"
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 pl-9"
                />
              </div>
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="physicalAddress" className="text-xs text-slate-400">Physical Address</Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-3 size-3.5 text-slate-400" />
                <Input
                  id="physicalAddress"
                  value={settings.physicalAddress}
                  onChange={(e) => updateField('physicalAddress', e.target.value)}
                  placeholder="e.g. Westlands Road, Nairobi, Kenya"
                  className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500 pl-9"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Currency & Tax ─────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CreditCard className="size-4 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Currency & Tax</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Currency, KRA, and tax registration details</CardDescription>
              </div>
            </div>
            <SaveButton section="tax" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="currency" className="text-xs text-slate-400">Currency</Label>
              <Select value={settings.currency} onValueChange={(v) => updateField('currency', v)}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="KES">KES - Kenyan Shilling</SelectItem>
                  <SelectItem value="USD">USD - US Dollar</SelectItem>
                  <SelectItem value="EUR">EUR - Euro</SelectItem>
                  <SelectItem value="GBP">GBP - British Pound</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="vatRegistration" className="text-xs text-slate-400">VAT Registration Number</Label>
              <Input
                id="vatRegistration"
                value={settings.vatRegistration}
                onChange={(e) => updateField('vatRegistration', e.target.value)}
                placeholder="e.g. VAT-123456789"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="kraPin" className="text-xs text-slate-400">KRA PIN</Label>
              <Input
                id="kraPin"
                value={settings.kraPin}
                onChange={(e) => updateField('kraPin', e.target.value)}
                placeholder="e.g. A00123456789X"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="etrSerial" className="text-xs text-slate-400">ETR Serial Number</Label>
              <Input
                id="etrSerial"
                value={settings.etrSerial}
                onChange={(e) => updateField('etrSerial', e.target.value)}
                placeholder="e.g. ETR-SN-001234"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Bank Details ───────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <CreditCard className="size-4 text-blue-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Bank Details</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Business bank account information</CardDescription>
              </div>
            </div>
            <SaveButton section="bank" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="bankName" className="text-xs text-slate-400">Bank Name</Label>
              <Input
                id="bankName"
                value={settings.bankName}
                onChange={(e) => updateField('bankName', e.target.value)}
                placeholder="e.g. Kenya Commercial Bank"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="branchName" className="text-xs text-slate-400">Branch Name</Label>
              <Input
                id="branchName"
                value={settings.branchName}
                onChange={(e) => updateField('branchName', e.target.value)}
                placeholder="e.g. Westlands Branch"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountHolderName" className="text-xs text-slate-400">Account Holder Name</Label>
              <Input
                id="accountHolderName"
                value={settings.accountHolderName}
                onChange={(e) => updateField('accountHolderName', e.target.value)}
                placeholder="e.g. FuelPro Kenya Ltd"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="accountNumber" className="text-xs text-slate-400">Account Number</Label>
              <Input
                id="accountNumber"
                value={settings.accountNumber}
                onChange={(e) => updateField('accountNumber', e.target.value)}
                placeholder="e.g. 1234567890"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="swiftCode" className="text-xs text-slate-400">Swift Code</Label>
              <Input
                id="swiftCode"
                value={settings.swiftCode}
                onChange={(e) => updateField('swiftCode', e.target.value)}
                placeholder="e.g. KCABKENX"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── M-PESA Settings ────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white border-green-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Smartphone className="size-4 text-green-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">M-PESA Settings</CardTitle>
                <CardDescription className="text-slate-400 text-xs">Safaricom M-PESA Daraja API configuration</CardDescription>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Badge className={`text-[10px] ${settings.mpesaSandbox ? 'bg-amber-500/20 text-amber-400' : 'bg-green-500/20 text-green-400'}`}>
                {settings.mpesaSandbox ? 'Sandbox' : 'Production'}
              </Badge>
              <SaveButton section="mpesa" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="paybillNumber" className="text-xs text-slate-400">Paybill Number</Label>
              <Input
                id="paybillNumber"
                value={settings.paybillNumber}
                onChange={(e) => updateField('paybillNumber', e.target.value)}
                placeholder="e.g. 123456"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="tillNumber" className="text-xs text-slate-400">Till Number</Label>
              <Input
                id="tillNumber"
                value={settings.tillNumber}
                onChange={(e) => updateField('tillNumber', e.target.value)}
                placeholder="e.g. 789012"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <MaskedInput
              id="mpesaConsumerKey"
              label="Consumer Key"
              value={settings.mpesaConsumerKey}
              onChange={(v) => updateField('mpesaConsumerKey', v)}
              placeholder="Enter Daraja Consumer Key"
            />
            <MaskedInput
              id="mpesaConsumerSecret"
              label="Consumer Secret"
              value={settings.mpesaConsumerSecret}
              onChange={(v) => updateField('mpesaConsumerSecret', v)}
              placeholder="Enter Daraja Consumer Secret"
            />
            <div className="sm:col-span-2 flex items-center justify-between bg-slate-700/30 rounded-lg p-3">
              <div>
                <span className="text-sm text-slate-300 font-medium">Environment Mode</span>
                <p className="text-xs text-slate-400">Switch between sandbox testing and live production</p>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs text-amber-400">Sandbox</span>
                <Switch
                  checked={!settings.mpesaSandbox}
                  onCheckedChange={(v) => updateField('mpesaSandbox', !v)}
                />
                <span className="text-xs text-green-400">Production</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── SMS Settings ───────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <MessageSquare className="size-4 text-purple-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">SMS Settings</CardTitle>
                <CardDescription className="text-slate-400 text-xs">SMS gateway configuration for notifications</CardDescription>
              </div>
            </div>
            <SaveButton section="sms" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="smsGateway" className="text-xs text-slate-400">Gateway Provider</Label>
              <Select value={settings.smsGateway} onValueChange={(v) => updateField('smsGateway', v)}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600/50 text-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="africas-talking">Africa&apos;s Talking</SelectItem>
                  <SelectItem value="twilio">Twilio</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="senderId" className="text-xs text-slate-400">Sender ID</Label>
              <Input
                id="senderId"
                value={settings.senderId}
                onChange={(e) => updateField('senderId', e.target.value)}
                placeholder="e.g. FUELPRO"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <MaskedInput
              id="smsApiKey"
              label="API Key"
              value={settings.smsApiKey}
              onChange={(v) => updateField('smsApiKey', v)}
              placeholder="Enter SMS gateway API key"
            />
          </div>
        </CardContent>
      </Card>

      {/* ── Email Settings ─────────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <MailOpen className="size-4 text-cyan-400" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">Email Settings</CardTitle>
                <CardDescription className="text-slate-400 text-xs">SMTP configuration for outgoing emails</CardDescription>
              </div>
            </div>
            <SaveButton section="email" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="smtpHost" className="text-xs text-slate-400">SMTP Host</Label>
              <Input
                id="smtpHost"
                value={settings.smtpHost}
                onChange={(e) => updateField('smtpHost', e.target.value)}
                placeholder="e.g. smtp.gmail.com"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpPort" className="text-xs text-slate-400">SMTP Port</Label>
              <Input
                id="smtpPort"
                value={settings.smtpPort}
                onChange={(e) => updateField('smtpPort', e.target.value)}
                placeholder="e.g. 587"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="smtpUsername" className="text-xs text-slate-400">Username</Label>
              <Input
                id="smtpUsername"
                value={settings.smtpUsername}
                onChange={(e) => updateField('smtpUsername', e.target.value)}
                placeholder="e.g. no-reply@fuelpro.ke"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
            <MaskedInput
              id="smtpPassword"
              label="Password"
              value={settings.smtpPassword}
              onChange={(v) => updateField('smtpPassword', v)}
              placeholder="Enter SMTP password"
            />
            <div className="space-y-1.5 sm:col-span-2">
              <Label htmlFor="emailFromAddress" className="text-xs text-slate-400">From Address</Label>
              <Input
                id="emailFromAddress"
                type="email"
                value={settings.emailFromAddress}
                onChange={(e) => updateField('emailFromAddress', e.target.value)}
                placeholder="e.g. FuelPro <no-reply@fuelpro.ke>"
                className="bg-slate-700/50 border-slate-600/50 text-white placeholder:text-slate-500"
              />
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
