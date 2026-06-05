'use client';

import { useState, useMemo } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Calendar,
  FileCheck,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Building2,
  Flame,
  Leaf,
  Award,
  Bell,
  ChevronRight,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type ComplianceStatus = 'valid' | 'expired' | 'pending';

interface ComplianceItem {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: ComplianceStatus;
  expiryDate: string;
  licenseNumber: string;
  category: string;
  documentUploaded: boolean;
}

interface TaxDate {
  id: string;
  tax: string;
  dueDay: number;
  description: string;
  nextDue: string;
}

interface RegulatoryUpdate {
  id: string;
  title: string;
  date: string;
  source: string;
  summary: string;
}

const COMPLIANCE_ITEMS: ComplianceItem[] = [
  {
    id: 'epra',
    name: 'EPRA License',
    icon: <ShieldCheck className="size-4 text-green-400" />,
    status: 'valid',
    expiryDate: '2025-12-31',
    licenseNumber: 'EPRA/2024/ST-04521',
    category: 'Regulatory',
    documentUploaded: true,
  },
  {
    id: 'county',
    name: 'County Business Permit',
    icon: <Building2 className="size-4 text-blue-400" />,
    status: 'valid',
    expiryDate: '2025-06-30',
    licenseNumber: 'CBP/NRB/2024/7832',
    category: 'County',
    documentUploaded: true,
  },
  {
    id: 'fire',
    name: 'Fire Safety Certificate',
    icon: <Flame className="size-4 text-orange-400" />,
    status: 'expired',
    expiryDate: '2025-02-15',
    licenseNumber: 'FSC/NRB/2023/1204',
    category: 'Safety',
    documentUploaded: true,
  },
  {
    id: 'environment',
    name: 'Environmental License',
    icon: <Leaf className="size-4 text-emerald-400" />,
    status: 'valid',
    expiryDate: '2025-09-30',
    licenseNumber: 'NEMA/EIA/2024/345',
    category: 'Environmental',
    documentUploaded: false,
  },
  {
    id: 'kebs',
    name: 'KEBS Certification',
    icon: <Award className="size-4 text-purple-400" />,
    status: 'pending',
    expiryDate: '2025-04-15',
    licenseNumber: 'KEBS/QMS/2024/892',
    category: 'Quality',
    documentUploaded: false,
  },
  {
    id: 'nema',
    name: 'NEMA Compliance',
    icon: <Leaf className="size-4 text-teal-400" />,
    status: 'valid',
    expiryDate: '2025-11-30',
    licenseNumber: 'NEMA/COMPL/2024/567',
    category: 'Environmental',
    documentUploaded: true,
  },
];

const TAX_DATES: TaxDate[] = [
  { id: 'paye', tax: 'PAYE', dueDay: 9, description: 'Pay As You Earn - 9th of each month', nextDue: '2025-03-09' },
  { id: 'vat', tax: 'VAT', dueDay: 20, description: 'Value Added Tax - 20th of each month', nextDue: '2025-03-20' },
  { id: 'corp', tax: 'Corporate Tax', dueDay: 20, description: 'Corporate Tax - 20th of 4th month after period end', nextDue: '2025-04-20' },
  { id: 'nssf', tax: 'NSSF', dueDay: 15, description: 'National Social Security Fund - 15th of each month', nextDue: '2025-03-15' },
  { id: 'nhif', tax: 'NHIF/SHIF', dueDay: 9, description: 'National Hospital Insurance Fund - 9th of each month', nextDue: '2025-03-09' },
  { id: 'housing', tax: 'Housing Levy', dueDay: 9, description: 'Affordable Housing Levy - 9th of each month', nextDue: '2025-03-09' },
];

const REGULATORY_UPDATES: RegulatoryUpdate[] = [
  {
    id: 'ru1',
    title: 'New EPRA Fuel Price Review Schedule',
    date: '2025-03-01',
    source: 'EPRA',
    summary: 'EPRA will now publish fuel price on the 1st and 15th of each month, with immediate effect.',
  },
  {
    id: 'ru2',
    title: 'Updated Fire Safety Requirements for Fuel Stations',
    date: '2025-02-20',
    source: 'County Government',
    summary: 'All fuel stations must install automated fire suppression systems by June 2025.',
  },
  {
    id: 'ru3',
    title: 'KEBS Sulphur Content Limit Reduction',
    date: '2025-02-15',
    source: 'KEBS',
    summary: 'Maximum sulphur content in AGO reduced from 50ppm to 10ppm effective April 2025.',
  },
];

export function RegionalCompliance() {
  const { toast } = useToast();

  const [items, setItems] = useState<ComplianceItem[]>(COMPLIANCE_ITEMS);

  const validCount = items.filter((i) => i.status === 'valid').length;
  const expiredCount = items.filter((i) => i.status === 'expired').length;
  const pendingCount = items.filter((i) => i.status === 'pending').length;
  const complianceScore = Math.round((validCount / items.length) * 100);

  // Expiring soon (within 30 days)
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 86400000);
  const expiringSoon = items.filter((item) => {
    const expiry = new Date(item.expiryDate);
    return expiry <= thirtyDaysFromNow && expiry >= now && item.status === 'valid';
  });

  const documentsUploaded = items.filter((i) => i.documentUploaded).length;
  const documentsMissing = items.filter((i) => !i.documentUploaded).length;

  const statusStyles: Record<ComplianceStatus, { bg: string; text: string; border: string }> = {
    valid: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' },
    expired: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
    pending: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
  };

  const handleRenew = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, status: 'pending' as ComplianceStatus } : item
      )
    );
    toast({ title: 'Renewal Initiated', description: 'Your renewal application has been submitted' });
  };

  const handleUploadDoc = (itemId: string) => {
    setItems((prev) =>
      prev.map((item) =>
        item.id === itemId ? { ...item, documentUploaded: true } : item
      )
    );
    toast({ title: 'Document Uploaded', description: 'Compliance document has been uploaded' });
  };

  return (
    <div className="space-y-6">
      {/* ── Compliance Score + Summary ───────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Compliance Score Ring */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Compliance Score</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center py-4">
            <div className="relative size-32">
              <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="52" fill="none" stroke="#1e293b" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="52" fill="none"
                  stroke={complianceScore >= 80 ? '#22c55e' : complianceScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="10"
                  strokeDasharray={`${(complianceScore / 100) * 327} 327`}
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold">{complianceScore}%</span>
                <span className="text-[10px] text-slate-400">Compliant</span>
              </div>
            </div>
            <div className="flex items-center gap-4 mt-3 text-xs">
              <span className="flex items-center gap-1 text-green-400"><CheckCircle2 className="size-3" /> {validCount} Valid</span>
              <span className="flex items-center gap-1 text-red-400"><XCircle className="size-3" /> {expiredCount} Expired</span>
              <span className="flex items-center gap-1 text-yellow-400"><Clock className="size-3" /> {pendingCount} Pending</span>
            </div>
          </CardContent>
        </Card>

        {/* Expiring Soon Alerts */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="size-4 text-amber-400" />
              Expiring Soon
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Licenses expiring within 30 days</CardDescription>
          </CardHeader>
          <CardContent>
            {expiringSoon.length === 0 && expiredCount === 0 ? (
              <div className="text-center text-slate-500 text-sm py-4">
                <CheckCircle2 className="size-8 mx-auto mb-2 text-green-400" />
                All licenses are up to date
              </div>
            ) : (
              <div className="space-y-2">
                {expiredCount > 0 && items.filter((i) => i.status === 'expired').map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <XCircle className="size-4 text-red-400" />
                      <div>
                        <div className="text-xs font-semibold text-red-400">{item.name}</div>
                        <div className="text-[10px] text-slate-500">Expired: {item.expiryDate}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-red-400 hover:bg-red-500/10 h-7 text-xs" onClick={() => handleRenew(item.id)}>
                      Renew
                    </Button>
                  </div>
                ))}
                {expiringSoon.map((item) => (
                  <div key={item.id} className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="size-4 text-amber-400" />
                      <div>
                        <div className="text-xs font-semibold text-amber-400">{item.name}</div>
                        <div className="text-[10px] text-slate-500">Expires: {item.expiryDate}</div>
                      </div>
                    </div>
                    <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-500/10 h-7 text-xs" onClick={() => handleRenew(item.id)}>
                      Renew
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Document Tracker */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileCheck className="size-4 text-amber-400" />
              Document Tracker
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Compliance document status</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-400">Documents Uploaded</span>
              <span className="text-xs font-semibold text-green-400">{documentsUploaded} / {items.length}</span>
            </div>
            <Progress value={(documentsUploaded / items.length) * 100} className="h-2" />
            {documentsMissing > 0 && (
              <div className="space-y-1.5 mt-2">
                <div className="text-[10px] text-red-400 uppercase tracking-wider">Missing Documents</div>
                {items.filter((i) => !i.documentUploaded).map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-slate-700/30 border border-slate-700/50">
                    <span className="text-xs text-slate-300">{item.name}</span>
                    <Button size="sm" variant="ghost" className="text-amber-400 hover:bg-amber-500/10 h-6 text-xs" onClick={() => handleUploadDoc(item.id)}>
                      Upload
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* ── Compliance Checklist ─────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <ShieldCheck className="size-4 text-amber-400" />
            Compliance Checklist
          </CardTitle>
          <CardDescription className="text-slate-400 text-xs">Required licenses and permits for fuel station operations in Kenya</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {items.map((item) => {
              const style = statusStyles[item.status];
              return (
                <div key={item.id} className={`p-4 rounded-xl border transition-colors ${
                  item.status === 'expired'
                    ? 'bg-red-500/5 border-red-500/30'
                    : item.status === 'pending'
                    ? 'bg-yellow-500/5 border-yellow-500/30'
                    : 'bg-slate-700/20 border-slate-700/50'
                }`}>
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-lg bg-slate-700/50 flex items-center justify-center">
                        {item.icon}
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold">{item.name}</h4>
                        <Badge className={`${style.bg} ${style.text} border ${style.border} text-[10px] px-1.5 py-0 mt-0.5 capitalize`}>
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                    {item.documentUploaded ? (
                      <CheckCircle2 className="size-4 text-green-400" />
                    ) : (
                      <XCircle className="size-4 text-red-400" />
                    )}
                  </div>

                  <div className="space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">License #</span>
                      <span className="text-slate-300 font-mono">{item.licenseNumber}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Category</span>
                      <span className="text-slate-300">{item.category}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Expiry</span>
                      <span className={item.status === 'expired' ? 'text-red-400 font-semibold' : 'text-slate-300'}>
                        {item.expiryDate}
                      </span>
                    </div>
                  </div>

                  {item.status === 'expired' && (
                    <Button size="sm" className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white text-xs" onClick={() => handleRenew(item.id)}>
                      <RefreshCw className="size-3 mr-1" /> Renew Now
                    </Button>
                  )}
                  {!item.documentUploaded && (
                    <Button size="sm" variant="outline" className="w-full mt-3 border-slate-600 text-slate-300 hover:bg-slate-700 text-xs" onClick={() => handleUploadDoc(item.id)}>
                      Upload Document
                    </Button>
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Tax Calendar & Regulatory Updates ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Tax Calendar */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Calendar className="size-4 text-amber-400" />
              KRA Tax Calendar
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Key filing dates for Kenya Revenue Authority</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-64 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Tax</TableHead>
                    <TableHead className="text-slate-400 text-xs">Due Day</TableHead>
                    <TableHead className="text-slate-400 text-xs">Next Due</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TAX_DATES.map((td) => {
                    const isOverdue = new Date(td.nextDue) < now;
                    const isDueSoon = !isOverdue && (new Date(td.nextDue).getTime() - now.getTime()) < 7 * 86400000;
                    return (
                      <TableRow key={td.id} className="border-slate-700/50">
                        <TableCell>
                          <div className="text-xs font-semibold text-white">{td.tax}</div>
                          <div className="text-[10px] text-slate-500">{td.description}</div>
                        </TableCell>
                        <TableCell className="text-xs text-slate-300">{td.dueDay}th</TableCell>
                        <TableCell>
                          <Badge className={`text-[10px] px-1.5 py-0 border ${
                            isOverdue
                              ? 'bg-red-500/20 text-red-400 border-red-500/30'
                              : isDueSoon
                              ? 'bg-amber-500/20 text-amber-400 border-amber-500/30'
                              : 'bg-green-500/20 text-green-400 border-green-500/30'
                          }`}>
                            {td.nextDue}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* Regulatory Updates */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Bell className="size-4 text-amber-400" />
              Regulatory Updates
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Recent changes to fuel industry regulations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {REGULATORY_UPDATES.map((update) => (
                <div key={update.id} className="p-3 rounded-lg bg-slate-700/20 border border-slate-700/50 hover:border-slate-600 transition-colors">
                  <div className="flex items-start justify-between mb-1.5">
                    <h4 className="text-xs font-semibold text-white">{update.title}</h4>
                    <ChevronRight className="size-3.5 text-slate-500 shrink-0 ml-2" />
                  </div>
                  <p className="text-[10px] text-slate-400 mb-2">{update.summary}</p>
                  <div className="flex items-center gap-2 text-[10px] text-slate-500">
                    <span>{update.date}</span>
                    <span>·</span>
                    <span className="text-amber-400">{update.source}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
