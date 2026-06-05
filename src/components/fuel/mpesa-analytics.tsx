'use client';

import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import {
  Smartphone,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  DollarSign,
  Plus,
  Filter,
  AlertTriangle,
  Wallet,
  RefreshCw,
  CreditCard,
  TrendingUp,
  Upload,
  FileText,
  Search,
  Download,
  Sparkles,
  Zap,
  Eye,
  X,
  Loader2,
  Lock,
  ChevronDown,
  Users,
  BarChart3,
  Shield,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Copy,
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from 'recharts';
import { useToast } from '@/hooks/use-toast';
import { useAuthStore } from '@/store/auth-store';
import { useStationStore } from '@/store/station-store';

// ─── Types ────────────────────────────────────────────────────────────────
type MpesaTransactionType = 'C2B' | 'B2C' | 'Paybill' | 'Till';
type MpesaTransactionStatus = 'completed' | 'pending' | 'failed' | 'reversed';
type ExtractionMode = 'auto' | 'pattern' | 'ai';

interface MpesaTransaction {
  id: string;
  time: string;
  phone: string;
  amount: number;
  type: MpesaTransactionType;
  status: MpesaTransactionStatus;
  reference: string;
  description?: string;
}

interface ParsedInflow {
  receipt: string;
  date: string;
  time: string;
  details: string;
  paidIn: number;
  withdrawal: number;
  balance: number;
  category: string;
}

interface ParseResult {
  inflows: ParsedInflow[];
  excluded: ParsedInflow[];
  totalValid: number;
  totalExcluded: number;
  uniqueCustomers: number;
  avgPayment: number;
  lineCount: number;
  rawTextLength: number;
  processingLog: string[];
  topCustomer: {
    name: string;
    total: number;
    payments: number;
    period: string;
  } | null;
  balanceAnalysis: {
    trueInflow: number;
    recordedNet: number;
    balanceDelta: number;
    unrecordedInflow: number;
    discrepancyRate: number;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function formatKsh(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

function formatKshDecimal(val: number): string {
  return `Ksh ${val.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function formatPhone(phone: string): string {
  if (phone.startsWith('254')) return `+${phone.slice(0, 3)} ${phone.slice(3, 6)} ${phone.slice(6)}`;
  return phone;
}

// ─── Data is fetched from API ──────────────────────────────────────────────

const chartConfig: ChartConfig = {
  c2b: { label: 'C2B', color: '#22c55e' },
  b2c: { label: 'B2C', color: '#f59e0b' },
  paybill: { label: 'Paybill', color: '#06b6d4' },
  till: { label: 'Till', color: '#a855f7' },
};

const TYPE_COLORS: Record<MpesaTransactionType, string> = {
  C2B: 'bg-green-500/80 text-white',
  B2C: 'bg-amber-500/80 text-black',
  Paybill: 'bg-cyan-500/80 text-white',
  Till: 'bg-purple-500/80 text-white',
};

const STATUS_COLORS: Record<MpesaTransactionStatus, string> = {
  completed: 'bg-green-500/20 text-green-400 border-green-500/30',
  pending: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  failed: 'bg-red-500/20 text-red-400 border-red-500/30',
  reversed: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
};

// ─── Component ────────────────────────────────────────────────────────────
export function MpesaAnalytics() {
  const { toast } = useToast();
  const token = useAuthStore((s) => s.token);
  const currentStation = useStationStore((s) => s.currentStation);
  const [transactions, setTransactions] = useState<MpesaTransaction[]>([]);
  const [isLoadingTxns, setIsLoadingTxns] = useState(true);
  const [filterType, setFilterType] = useState<MpesaTransactionType | 'all'>('all');
  const [filterStatus, setFilterStatus] = useState<MpesaTransactionStatus | 'all'>('all');
  const [filterDate, setFilterDate] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addPhone, setAddPhone] = useState('');
  const [addAmount, setAddAmount] = useState(0);
  const [addType, setAddType] = useState<MpesaTransactionType>('C2B');
  const [addReference, setAddReference] = useState('');

  // PDF Analyzer state
  const [analyzerTab, setAnalyzerTab] = useState('pdf-upload');
  const [extractionMode, setExtractionMode] = useState<ExtractionMode>('auto');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfPassword, setPdfPassword] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingProgress, setProcessingProgress] = useState(0);
  const [processingLog, setProcessingLog] = useState<string[]>([]);
  const [parseResult, setParseResult] = useState<ParseResult | null>(null);
  const [manualText, setManualText] = useState('');
  const [aiResponse, setAiResponse] = useState('');
  const [isAiProcessing, setIsAiProcessing] = useState(false);
  const [inflowSearch, setInflowSearch] = useState('');
  const [pdfDragActive, setPdfDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // ─── Fetch M-PESA transactions from sales/expenses API ──────────────────
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!token || !currentStation?.id) {
        setIsLoadingTxns(false);
        return;
      }
      setIsLoadingTxns(true);
      try {
        const headers: Record<string, string> = {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        };
        // Fetch sales with M-PESA payment method
        const salesRes = await fetch(`/api/sales?stationId=${currentStation.id}&pageSize=100`, { headers });
        const salesData = await salesRes.json();

        const mpesaTxns: MpesaTransaction[] = [];
        if (salesData?.data) {
          const sales = Array.isArray(salesData.data) ? salesData.data : salesData.data?.items || [];
          for (const sale of sales) {
            const isMpesa = !sale.paymentMethod || sale.paymentMethod === 'mpesa' || sale.paymentMethod === 'mobile_money';
            if (isMpesa) {
              mpesaTxns.push({
                id: sale.id,
                time: sale.date || sale.createdAt,
                phone: sale.customerPhone || '',
                amount: sale.totalSales || sale.pmsSalesKsh + sale.agoSalesKsh || 0,
                type: 'C2B' as MpesaTransactionType,
                status: 'completed' as MpesaTransactionStatus,
                reference: sale.id?.slice(0, 8).toUpperCase() || '',
                description: `Fuel sale - Ksh ${sale.totalSales || 0}`,
              });
            }
          }
        }

        // Fetch expenses paid via M-PESA
        try {
          const expRes = await fetch(`/api/expenses?stationId=${currentStation.id}&pageSize=50`, { headers });
          const expData = await expRes.json();
          if (expData?.data) {
            const expenses = Array.isArray(expData.data) ? expData.data : expData.data?.items || [];
            for (const exp of expenses) {
              if (exp.paymentMethod === 'mpesa' || exp.paymentMethod === 'mobile_money' || exp.category === 'mpesa') {
                mpesaTxns.push({
                  id: exp.id,
                  time: exp.date || exp.createdAt,
                  phone: '',
                  amount: exp.amount || 0,
                  type: 'B2C' as MpesaTransactionType,
                  status: 'completed' as MpesaTransactionStatus,
                  reference: exp.id?.slice(0, 8).toUpperCase() || '',
                  description: `${exp.category || 'Expense'} - ${exp.description || ''}`,
                });
              }
            }
          }
        } catch {
          // Expenses fetch failed, continue with sales only
        }

        setTransactions(mpesaTxns);
      } catch {
        // Failed to fetch, leave empty
      } finally {
        setIsLoadingTxns(false);
      }
    };
    fetchTransactions();
  }, [token, currentStation?.id]);

  // ─── PDF Upload Handler ────────────────────────────────────────────────
  const handlePdfUpload = useCallback(async () => {
    if (!pdfFile && !manualText) {
      toast({ title: 'Error', description: 'Please upload a PDF or paste text', variant: 'destructive' });
      return;
    }

    setIsProcessing(true);
    setProcessingProgress(10);
    setProcessingLog(['Starting extraction...']);
    setParseResult(null);

    try {
      const formData = new FormData();
      if (pdfFile) {
        formData.append('file', pdfFile);
      }
      if (manualText) {
        formData.append('text', manualText);
      }
      formData.append('mode', extractionMode);
      if (pdfPassword) {
        formData.append('password', pdfPassword);
      }

      setProcessingProgress(30);
      setProcessingLog((prev) => [...prev, 'Uploading to server...']);

      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/mpesa/parse', {
        method: 'POST',
        headers,
        body: formData,
      });

      setProcessingProgress(70);
      setProcessingLog((prev) => [...prev, 'Processing response...']);

      const data = await res.json();

      setProcessingProgress(90);
      setProcessingLog((prev) => [...prev, 'Parsing results...']);

      if (data.error) {
        throw new Error(data.error);
      }

      if (data.success && data.data) {
        setParseResult(data.data);
        setProcessingLog(data.data.processingLog || ['Complete']);
        toast({
          title: 'Extraction Complete',
          description: `Found ${data.data.inflows.length} inflows, ${data.data.excluded.length} excluded items`,
        });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setProcessingLog((prev) => [...prev, `Error: ${msg}`]);
      toast({ title: 'Extraction Failed', description: msg, variant: 'destructive' });
    } finally {
      setProcessingProgress(100);
      setIsProcessing(false);
    }
  }, [pdfFile, manualText, extractionMode, pdfPassword, token, toast]);

  // ─── AI Only Extraction ────────────────────────────────────────────────
  const handleAiExtraction = useCallback(async () => {
    if (!manualText.trim()) {
      toast({ title: 'Error', description: 'Please paste M-PESA statement text', variant: 'destructive' });
      return;
    }

    setIsAiProcessing(true);
    setAiResponse('');

    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Analyze this M-PESA statement text and extract all transactions. For each transaction, identify: receipt number, date, time, details/description, amount paid in, withdrawal amount, and balance. Also classify each as either "operating revenue" (merchant payments, received from customers) or "excluded" (loans, charges, fees, transfers). Provide a summary with total operating revenue, total excluded, unique customers, and any discrepancies.\n\nM-PESA Statement Text:\n${manualText}`,
          context: 'mpesa-extraction',
        }),
      });

      const data = await res.json();
      if (data.response) {
        setAiResponse(data.response);
      } else if (data.error) {
        throw new Error(data.error);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'AI Extraction Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsAiProcessing(false);
    }
  }, [manualText, token, toast]);

  // ─── Reconcile with AI ────────────────────────────────────────────────
  const handleReconcileWithAi = useCallback(async () => {
    if (!parseResult) return;

    setIsAiProcessing(true);
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const summary = {
        totalInflows: parseResult.totalValid,
        totalExcluded: parseResult.totalExcluded,
        uniqueCustomers: parseResult.uniqueCustomers,
        discrepancyRate: parseResult.balanceAnalysis.discrepancyRate,
        topCustomer: parseResult.topCustomer?.name,
        inflowCount: parseResult.inflows.length,
        excludedCount: parseResult.excluded.length,
      };

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: `Reconcile this M-PESA data and identify any anomalies, missing transactions, or discrepancies. Provide actionable recommendations:\n\n${JSON.stringify(summary, null, 2)}`,
          context: 'mpesa-reconciliation',
        }),
      });

      const data = await res.json();
      if (data.response) {
        setAiResponse(data.response);
        toast({ title: 'AI Reconciliation Complete' });
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unknown error';
      toast({ title: 'Reconciliation Failed', description: msg, variant: 'destructive' });
    } finally {
      setIsAiProcessing(false);
    }
  }, [parseResult, token, toast]);

  // ─── CSV Export ────────────────────────────────────────────────────────
  const handleCsvExport = useCallback(() => {
    const rows = parseResult
      ? [
          ['Receipt', 'Date', 'Customer', 'Paid In', 'Balance', 'Category'].join(','),
          ...parseResult.inflows.map((i) =>
            [i.receipt, i.date, `"${i.details}"`, i.paidIn, i.balance, i.category].join(',')
          ),
          ...parseResult.excluded.map((i) =>
            [i.receipt, i.date, `"${i.details}"`, i.paidIn, i.balance, i.category].join(',')
          ),
        ]
      : [
          ['ID', 'Time', 'Phone', 'Amount', 'Type', 'Status', 'Reference'].join(','),
          ...transactions.map((t) =>
            [t.id, t.time, t.phone, t.amount, t.type, t.status, t.reference].join(',')
          ),
        ];

    const csv = rows.join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `mpesa-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: 'CSV Exported', description: 'File downloaded successfully' });
  }, [parseResult, transactions, toast]);

  // ─── Filtered Transactions ────────────────────────────────────────────
  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterType !== 'all' && t.type !== filterType) return false;
      if (filterStatus !== 'all' && t.status !== filterStatus) return false;
      if (filterDate) {
        const txDate = new Date(t.time).toISOString().slice(0, 10);
        if (txDate !== filterDate) return false;
      }
      return true;
    });
  }, [transactions, filterType, filterStatus, filterDate]);

  // ─── Summary Calculations ─────────────────────────────────────────────
  const totalMpesa = useMemo(() => transactions.reduce((sum, t) => sum + t.amount, 0), [transactions]);

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayMpesa = useMemo(
    () => transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === todayStr && t.status === 'completed').reduce((sum, t) => sum + t.amount, 0),
    [transactions, todayStr]
  );

  const pendingReversals = useMemo(
    () => transactions.filter((t) => t.status === 'reversed' || t.status === 'pending').reduce((sum, t) => sum + t.amount, 0),
    [transactions]
  );

  const avgTransaction = useMemo(
    () => transactions.length ? Math.round(totalMpesa / transactions.length) : 0,
    [totalMpesa, transactions.length]
  );

  const floatBalance = useMemo(() => {
    const inflowTotal = transactions.filter((t) => t.type === 'C2B' || t.type === 'Paybill' || t.type === 'Till').reduce((s, t) => s + t.amount, 0);
    const outflowTotal = transactions.filter((t) => t.type === 'B2C').reduce((s, t) => s + t.amount, 0);
    return inflowTotal - outflowTotal;
  }, [transactions]);

  // ─── Chart Data ───────────────────────────────────────────────────────
  const dailyData = useMemo(() => {
    const days: { day: string; c2b: number; b2c: number; paybill: number; till: number }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dayStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-KE', { weekday: 'short' });
      const dayTxns = transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === dayStr && t.status === 'completed');
      days.push({
        day: label,
        c2b: dayTxns.filter((t) => t.type === 'C2B').reduce((s, t) => s + t.amount, 0),
        b2c: dayTxns.filter((t) => t.type === 'B2C').reduce((s, t) => s + t.amount, 0),
        paybill: dayTxns.filter((t) => t.type === 'Paybill').reduce((s, t) => s + t.amount, 0),
        till: dayTxns.filter((t) => t.type === 'Till').reduce((s, t) => s + t.amount, 0),
      });
    }
    return days;
  }, [transactions]);

  // ─── Type Breakdown ──────────────────────────────────────────────────
  const typeBreakdown = useMemo(() => {
    const completed = transactions.filter((t) => t.status === 'completed');
    return {
      C2B: completed.filter((t) => t.type === 'C2B').reduce((s, t) => s + t.amount, 0),
      B2C: completed.filter((t) => t.type === 'B2C').reduce((s, t) => s + t.amount, 0),
      Paybill: completed.filter((t) => t.type === 'Paybill').reduce((s, t) => s + t.amount, 0),
      Till: completed.filter((t) => t.type === 'Till').reduce((s, t) => s + t.amount, 0),
    };
  }, [transactions]);

  // ─── Filtered inflow table ─────────────────────────────────────────────
  const filteredInflows = useMemo(() => {
    if (!parseResult) return [];
    if (!inflowSearch) return parseResult.inflows;
    const q = inflowSearch.toLowerCase();
    return parseResult.inflows.filter(
      (i) =>
        i.receipt.toLowerCase().includes(q) ||
        i.details.toLowerCase().includes(q) ||
        i.date.includes(q) ||
        i.category.toLowerCase().includes(q)
    );
  }, [parseResult, inflowSearch]);

  // ─── Add Transaction Handler ──────────────────────────────────────────
  const handleAddTransaction = () => {
    if (!addPhone || !addAmount) {
      toast({ title: 'Error', description: 'Phone number and amount are required', variant: 'destructive' });
      return;
    }
    const newTxn: MpesaTransaction = {
      id: `MP${String(Date.now()).slice(-8)}`,
      time: new Date().toISOString(),
      phone: addPhone.startsWith('+') ? addPhone.replace('+', '') : addPhone.startsWith('0') ? `254${addPhone.slice(1)}` : addPhone,
      amount: addAmount,
      type: addType,
      status: 'pending',
      reference: addReference || `QJK${Math.random().toString(36).substring(2, 8).toUpperCase()}`,
      description: `${addType} transaction`,
    };
    setTransactions((prev) => [newTxn, ...prev]);
    toast({ title: 'Transaction Initiated', description: `${addType} of ${formatKsh(addAmount)} queued for processing` });
    setShowAddDialog(false);
    setAddPhone('');
    setAddAmount(0);
    setAddReference('');
  };

  // ─── Drag handlers ────────────────────────────────────────────────────
  const handlePdfDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragActive(true);
  };

  const handlePdfDragLeave = () => setPdfDragActive(false);

  const handlePdfDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setPdfDragActive(false);
    const files = e.dataTransfer.files;
    if (files.length > 0 && files[0].type === 'application/pdf') {
      setPdfFile(files[0]);
      toast({ title: 'PDF Loaded', description: files[0].name });
    } else {
      toast({ title: 'Invalid File', description: 'Please upload a PDF file', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-6">
      {/* ══════════════════════════════════════════════════════════════════
          SECTION 1: M-PESA PDF ANALYZER
         ══════════════════════════════════════════════════════════════════ */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="size-4 text-amber-400" />
                M-PESA PDF Analyzer
              </CardTitle>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Upload M-PESA statements to extract and analyze inflows
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-slate-400 text-xs">Mode:</Label>
              <Select value={extractionMode} onValueChange={(v) => setExtractionMode(v as ExtractionMode)}>
                <SelectTrigger className={`${inputClass} w-32 h-8 text-xs`}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700 text-white">
                  <SelectItem value="auto">
                    <div className="flex items-center gap-1.5">
                      <Zap className="size-3 text-amber-400" /> Auto
                    </div>
                  </SelectItem>
                  <SelectItem value="pattern">
                    <div className="flex items-center gap-1.5">
                      <Search className="size-3 text-cyan-400" /> Pattern
                    </div>
                  </SelectItem>
                  <SelectItem value="ai">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="size-3 text-purple-400" /> AI Only
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs value={analyzerTab} onValueChange={setAnalyzerTab}>
            <TabsList className="bg-slate-700/50">
              <TabsTrigger value="pdf-upload" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-xs">
                <Upload className="size-3 mr-1" /> PDF Upload
              </TabsTrigger>
              <TabsTrigger value="manual-paste" className="data-[state=active]:bg-amber-500/20 data-[state=active]:text-amber-400 text-xs">
                <Copy className="size-3 mr-1" /> Manual Paste
              </TabsTrigger>
              <TabsTrigger value="ai-only" className="data-[state=active]:bg-purple-500/20 data-[state=active]:text-purple-400 text-xs">
                <Sparkles className="size-3 mr-1" /> AI Only
              </TabsTrigger>
            </TabsList>

            {/* ── PDF Upload Tab ──────────────────────────────────────────── */}
            <TabsContent value="pdf-upload" className="mt-4 space-y-4">
              <div
                onDragOver={handlePdfDragOver}
                onDragLeave={handlePdfDragLeave}
                onDrop={handlePdfDrop}
                className={`border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
                  pdfDragActive
                    ? 'border-amber-500 bg-amber-500/10 scale-[1.01]'
                    : 'border-slate-600 hover:border-slate-500'
                }`}
                onClick={() => fileInputRef.current?.click()}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pdf"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) {
                      setPdfFile(f);
                      toast({ title: 'PDF Loaded', description: f.name });
                    }
                  }}
                />
                <Upload className={`size-10 mx-auto mb-3 ${pdfDragActive ? 'text-amber-400' : 'text-slate-500'}`} />
                <p className="text-sm text-slate-300 mb-1">Drag & drop M-PESA PDF statement here</p>
                <p className="text-xs text-slate-500 mb-3">Supports encrypted and plain M-PESA statements</p>
                {pdfFile ? (
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30">
                    <FileText className="size-3 mr-1" /> {pdfFile.name} ({(pdfFile.size / 1024).toFixed(1)} KB)
                    <button
                      className="ml-2 hover:text-white"
                      onClick={(e) => { e.stopPropagation(); setPdfFile(null); }}
                    >
                      <X className="size-3" />
                    </button>
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-slate-600 text-slate-500">Click to browse</Badge>
                )}
              </div>

              {/* Password field */}
              <div className="flex items-end gap-3">
                <div className="flex-1">
                  <Label className="text-slate-400 text-xs flex items-center gap-1">
                    <Lock className="size-3" /> PDF Password (optional)
                  </Label>
                  <Input
                    type="password"
                    placeholder="Enter password for encrypted statements"
                    value={pdfPassword}
                    onChange={(e) => setPdfPassword(e.target.value)}
                    className={inputClass}
                  />
                </div>
                <Button
                  onClick={handlePdfUpload}
                  disabled={isProcessing || !pdfFile}
                  className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0"
                >
                  {isProcessing ? (
                    <><Loader2 className="size-4 mr-2 animate-spin" /> Processing...</>
                  ) : (
                    <><ArrowDownLeft className="size-4 mr-2" /> Extract Inflows</>
                  )}
                </Button>
              </div>
            </TabsContent>

            {/* ── Manual Paste Tab ────────────────────────────────────────── */}
            <TabsContent value="manual-paste" className="mt-4 space-y-4">
              <div>
                <Label className="text-slate-400 text-xs">Paste M-PESA Statement Text</Label>
                <textarea
                  className="w-full h-40 rounded-lg bg-slate-700/50 border border-slate-600 text-white text-xs p-3 placeholder:text-slate-500 resize-y font-mono"
                  placeholder="Paste your M-PESA statement text here...&#10;&#10;Example:&#10;QJK4R2V7G6  1/3/25 9:30 AM  Merchant Payment from John Mwangi  5,000.00  252,850.00&#10;QJK4R2V7G7  1/3/25 10:15 AM  Received from Akinyi Odhiambo  3,200.00  256,050.00"
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
              <Button
                onClick={handlePdfUpload}
                disabled={isProcessing || !manualText.trim()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                {isProcessing ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> Processing...</>
                ) : (
                  <><ArrowDownLeft className="size-4 mr-2" /> Extract Inflows</>
                )}
              </Button>
            </TabsContent>

            {/* ── AI Only Tab ─────────────────────────────────────────────── */}
            <TabsContent value="ai-only" className="mt-4 space-y-4">
              <div>
                <Label className="text-slate-400 text-xs flex items-center gap-1">
                  <Sparkles className="size-3 text-purple-400" /> Paste text for AI-powered extraction
                </Label>
                <textarea
                  className="w-full h-40 rounded-lg bg-slate-700/50 border border-slate-600 text-white text-xs p-3 placeholder:text-slate-500 resize-y font-mono"
                  placeholder="Paste your M-PESA statement text for AI analysis...&#10;The AI will extract transactions, classify them, and provide insights."
                  value={manualText}
                  onChange={(e) => setManualText(e.target.value)}
                />
              </div>
              <Button
                onClick={handleAiExtraction}
                disabled={isAiProcessing || !manualText.trim()}
                className="bg-purple-600 hover:bg-purple-700 text-white font-semibold"
              >
                {isAiProcessing ? (
                  <><Loader2 className="size-4 mr-2 animate-spin" /> AI Processing...</>
                ) : (
                  <><Sparkles className="size-4 mr-2" /> Analyze with AI</>
                )}
              </Button>

              {aiResponse && (
                <div className="bg-slate-700/30 border border-slate-700/50 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-4 text-purple-400" />
                    <span className="text-sm font-medium text-purple-400">AI Analysis</span>
                  </div>
                  <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto">
                    {aiResponse}
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>

          {/* ── Processing Progress ──────────────────────────────────────── */}
          {isProcessing && (
            <div className="mt-4 space-y-2">
              <Progress value={processingProgress} className="h-2 bg-slate-700" />
              <div className="max-h-24 overflow-y-auto space-y-0.5">
                {processingLog.map((log, i) => (
                  <div key={i} className="text-[10px] text-slate-500 flex items-center gap-1">
                    <ChevronDown className="size-2" /> {log}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 2: EXTRACTION RESULTS (shown when parseResult exists)
         ══════════════════════════════════════════════════════════════════ */}
      {parseResult && (
        <>
          {/* ── Revenue Breakdown Cards ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-green-900/30 border-green-700/30 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-green-400 text-xs uppercase tracking-wider">Operating Revenue</CardDescription>
                  <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="size-4 text-green-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-400">{formatKshDecimal(parseResult.totalValid)}</div>
                <div className="text-xs text-green-500/70 mt-1">{parseResult.inflows.length} transactions</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Excluded Loans</CardDescription>
                  <div className="size-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <XCircle className="size-4 text-slate-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-400">{formatKshDecimal(parseResult.excluded.filter((e) => e.category === 'loan').reduce((s, e) => s + e.paidIn, 0))}</div>
                <div className="text-xs text-slate-500 mt-1">{parseResult.excluded.filter((e) => e.category === 'loan').length} items</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Excluded Charges</CardDescription>
                  <div className="size-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <XCircle className="size-4 text-slate-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-400">{formatKshDecimal(parseResult.excluded.filter((e) => e.category === 'charge').reduce((s, e) => s + e.paidIn, 0))}</div>
                <div className="text-xs text-slate-500 mt-1">{parseResult.excluded.filter((e) => e.category === 'charge').length} items</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Excluded Transfers</CardDescription>
                  <div className="size-8 rounded-lg bg-slate-500/20 flex items-center justify-center">
                    <XCircle className="size-4 text-slate-400" />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-slate-400">{formatKshDecimal(parseResult.excluded.filter((e) => e.category === 'transfer').reduce((s, e) => s + e.paidIn, 0))}</div>
                <div className="text-xs text-slate-500 mt-1">{parseResult.excluded.filter((e) => e.category === 'transfer').length} items</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Key Metrics ────────────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Inflows</CardDescription>
                  <DollarSign className="size-4 text-green-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold">{formatKshDecimal(parseResult.totalValid + parseResult.totalExcluded)}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Received</CardDescription>
                  <ArrowDownLeft className="size-4 text-amber-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-amber-400">{formatKshDecimal(parseResult.totalValid)}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Unique Customers</CardDescription>
                  <Users className="size-4 text-cyan-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-cyan-400">{parseResult.uniqueCustomers}</div>
              </CardContent>
            </Card>

            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Average Payment</CardDescription>
                  <BarChart3 className="size-4 text-purple-400" />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-xl font-bold text-purple-400">{formatKshDecimal(parseResult.avgPayment)}</div>
              </CardContent>
            </Card>
          </div>

          {/* ── Top Customer + Balance Analysis ─────────────────────────── */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Customer */}
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Users className="size-4 text-amber-400" /> Top Customer
                </CardTitle>
              </CardHeader>
              <CardContent>
                {parseResult.topCustomer ? (
                  <div className="space-y-3">
                    <div className="flex items-center gap-3">
                      <div className="size-10 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-400 font-bold text-sm">
                        {parseResult.topCustomer.name.charAt(0)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{parseResult.topCustomer.name}</div>
                        <div className="text-xs text-slate-400">{parseResult.topCustomer.payments} payments in period</div>
                      </div>
                    </div>
                    <Separator className="bg-slate-700/50" />
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Total Spent</div>
                        <div className="text-sm font-bold text-amber-400">{formatKshDecimal(parseResult.topCustomer.total)}</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-500 uppercase">Period</div>
                        <div className="text-sm font-medium">{parseResult.topCustomer.period || 'N/A'}</div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 text-sm py-4">No customer data found</div>
                )}
              </CardContent>
            </Card>

            {/* Balance Analysis */}
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Shield className="size-4 text-cyan-400" /> Balance Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 uppercase">True Inflow</div>
                      <div className="text-sm font-bold text-green-400">{formatKshDecimal(parseResult.balanceAnalysis.trueInflow)}</div>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 uppercase">Recorded Net</div>
                      <div className="text-sm font-bold">{formatKshDecimal(parseResult.balanceAnalysis.recordedNet)}</div>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 uppercase">Balance Delta</div>
                      <div className="text-sm font-bold text-amber-400">{formatKshDecimal(parseResult.balanceAnalysis.balanceDelta)}</div>
                    </div>
                    <div className="bg-slate-700/30 rounded-lg p-2.5">
                      <div className="text-[10px] text-slate-500 uppercase">Unrecorded Inflow</div>
                      <div className="text-sm font-bold text-orange-400">{formatKshDecimal(parseResult.balanceAnalysis.unrecordedInflow)}</div>
                    </div>
                  </div>
                  <Separator className="bg-slate-700/50" />
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-slate-400">Discrepancy Rate</span>
                    <div className="flex items-center gap-2">
                      <div className="w-32 h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${parseResult.balanceAnalysis.discrepancyRate > 10 ? 'bg-red-500' : parseResult.balanceAnalysis.discrepancyRate > 5 ? 'bg-amber-500' : 'bg-green-500'}`}
                          style={{ width: `${Math.min(parseResult.balanceAnalysis.discrepancyRate, 100)}%` }}
                        />
                      </div>
                      <span className={`text-sm font-bold ${parseResult.balanceAnalysis.discrepancyRate > 10 ? 'text-red-400' : parseResult.balanceAnalysis.discrepancyRate > 5 ? 'text-amber-400' : 'text-green-400'}`}>
                        {parseResult.balanceAnalysis.discrepancyRate.toFixed(1)}%
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Inflow Table ───────────────────────────────────────────── */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base flex items-center gap-2">
                    <BarChart3 className="size-4 text-amber-400" /> Inflow Details
                  </CardTitle>
                  <CardDescription className="text-slate-400 text-xs">
                    {filteredInflows.length} operating revenue transactions
                  </CardDescription>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-slate-500" />
                    <Input
                      className={`${inputClass} pl-8 h-8 w-48 text-xs`}
                      placeholder="Search inflows..."
                      value={inflowSearch}
                      onChange={(e) => setInflowSearch(e.target.value)}
                    />
                  </div>
                  <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs" onClick={handleCsvExport}>
                    <Download className="size-3 mr-1" /> CSV
                  </Button>
                  <Button
                    size="sm"
                    className="bg-purple-600 hover:bg-purple-700 text-white h-8 text-xs"
                    onClick={handleReconcileWithAi}
                    disabled={isAiProcessing}
                  >
                    {isAiProcessing ? <Loader2 className="size-3 mr-1 animate-spin" /> : <Sparkles className="size-3 mr-1" />}
                    Reconcile with AI
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredInflows.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-8">No inflow data available</div>
              ) : (
                <div className="max-h-72 overflow-y-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="border-slate-700 hover:bg-transparent">
                        <TableHead className="text-slate-400 text-xs">Receipt No</TableHead>
                        <TableHead className="text-slate-400 text-xs">Date</TableHead>
                        <TableHead className="text-slate-400 text-xs">Customer</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Paid In</TableHead>
                        <TableHead className="text-slate-400 text-xs text-right">Balance</TableHead>
                        <TableHead className="text-slate-400 text-xs">Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredInflows.map((inflow, idx) => (
                        <TableRow key={idx} className="border-slate-700/50">
                          <TableCell className="text-slate-300 text-xs font-mono">{inflow.receipt}</TableCell>
                          <TableCell className="text-slate-300 text-xs">{inflow.date} {inflow.time}</TableCell>
                          <TableCell className="text-slate-200 text-xs max-w-[200px] truncate">{inflow.details}</TableCell>
                          <TableCell className="text-xs font-semibold text-right text-green-400">{formatKshDecimal(inflow.paidIn)}</TableCell>
                          <TableCell className="text-xs text-right text-slate-400">{formatKshDecimal(inflow.balance)}</TableCell>
                          <TableCell>
                            <Badge className={`text-[10px] px-1.5 py-0 ${
                              inflow.category === 'operating'
                                ? 'bg-green-500/20 text-green-400 border-green-500/30'
                                : 'bg-slate-500/20 text-slate-400 border-slate-500/30'
                            }`}>
                              {inflow.category}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>

          {/* ── AI Reconciliation Response ──────────────────────────────── */}
          {aiResponse && analyzerTab !== 'ai-only' && (
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-semibold flex items-center gap-2">
                  <Sparkles className="size-4 text-purple-400" /> AI Reconciliation Report
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-xs text-slate-300 whitespace-pre-wrap max-h-64 overflow-y-auto bg-slate-700/20 rounded-lg p-4">
                  {aiResponse}
                </div>
              </CardContent>
            </Card>
          )}

          {/* ── Processing Log ──────────────────────────────────────────── */}
          {processingLog.length > 0 && !isProcessing && (
            <Card className="bg-slate-800/60 border-slate-700/50 text-white">
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-semibold text-slate-400 flex items-center gap-2">
                  <Eye className="size-3" /> Processing Log
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="max-h-32 overflow-y-auto space-y-0.5">
                  {processingLog.map((log, i) => (
                    <div key={i} className="text-[10px] text-slate-500 font-mono flex items-center gap-1">
                      <ArrowRight className="size-2 text-slate-600" /> {log}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════
          SECTION 3: ORIGINAL M-PESA ANALYTICS (existing transaction data)
         ══════════════════════════════════════════════════════════════════ */}
      <div className="border-t border-slate-700/50 pt-6">
        <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
          <Smartphone className="size-4 text-amber-400" /> Live Transaction Analytics
        </h3>
      </div>

      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total M-PESA</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Smartphone className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(totalMpesa)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.length} transactions</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Today&apos;s M-PESA</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <ArrowDownLeft className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(todayMpesa)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.filter((t) => new Date(t.time).toISOString().slice(0, 10) === todayStr && t.status === 'completed').length} completed</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Pending Reversals</CardDescription>
              <div className="size-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <RefreshCw className="size-4 text-orange-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(pendingReversals)}</div>
            <div className="text-xs text-slate-400 mt-1">{transactions.filter((t) => t.status === 'reversed' || t.status === 'pending').length} pending</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Avg Transaction</CardDescription>
              <div className="size-8 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <TrendingUp className="size-4 text-cyan-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatKsh(avgTransaction)}</div>
            <div className="text-xs text-slate-400 mt-1">Per transaction</div>
          </CardContent>
        </Card>
      </div>

      {/* ── M-PESA Balance + Type Breakdown ────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Float Balance Card */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">M-PESA Float Balance</CardTitle>
              <Wallet className="size-4 text-amber-400" />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="text-3xl font-bold text-amber-400">{formatKsh(floatBalance)}</div>
            <Separator className="bg-slate-700/50" />
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Minimum Float Alert</span>
              <span className="text-amber-400 font-semibold">Ksh 50,000</span>
            </div>
            <div className="flex items-center gap-2">
              {floatBalance < 50000 ? (
                <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-xs">
                  <AlertTriangle className="size-3 mr-1" /> Low Float
                </Badge>
              ) : (
                <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-xs">
                  <DollarSign className="size-3 mr-1" /> Float OK
                </Badge>
              )}
            </div>
            <div className="w-full bg-slate-700 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${floatBalance < 50000 ? 'bg-red-500' : 'bg-green-500'}`}
                style={{ width: `${Math.min((floatBalance / 500000) * 100, 100)}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Transaction Type Breakdown */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white lg:col-span-2">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-semibold">Transaction Types</CardTitle>
              <CreditCard className="size-4 text-cyan-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(['C2B', 'B2C', 'Paybill', 'Till'] as const).map((type) => (
                <div key={type} className="bg-slate-700/30 rounded-xl p-3 border border-slate-700/30">
                  <div className="flex items-center gap-2 mb-2">
                    <div className={`size-2 rounded-full ${type === 'C2B' ? 'bg-green-500' : type === 'B2C' ? 'bg-amber-500' : type === 'Paybill' ? 'bg-cyan-500' : 'bg-purple-500'}`} />
                    <span className="text-xs text-slate-400">{type}</span>
                  </div>
                  <div className="text-base font-bold">{formatKsh(typeBreakdown[type])}</div>
                  <div className="text-[10px] text-slate-500 mt-1">
                    {transactions.filter((t) => t.type === type && t.status === 'completed').length} txns
                  </div>
                  <div className="text-[10px] text-slate-500 mt-0.5">
                    {type === 'C2B' ? 'Customer → Business' : type === 'B2C' ? 'Business → Customer' : type === 'Paybill' ? 'Paybill Payment' : 'Till Number'}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* ── Filters + Add Button ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardContent className="pt-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-end gap-3">
            <div className="flex items-center gap-2 text-slate-400">
              <Filter className="size-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Filters</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 flex-1 w-full">
              <div>
                <Label className="text-slate-400 text-xs">Date</Label>
                <Input type="date" value={filterDate} onChange={(e) => setFilterDate(e.target.value)} className={inputClass} />
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Type</Label>
                <Select value={filterType} onValueChange={(v) => setFilterType(v as MpesaTransactionType | 'all')}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="C2B">C2B</SelectItem>
                    <SelectItem value="B2C">B2C</SelectItem>
                    <SelectItem value="Paybill">Paybill</SelectItem>
                    <SelectItem value="Till">Till Number</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-slate-400 text-xs">Status</Label>
                <Select value={filterStatus} onValueChange={(v) => setFilterStatus(v as MpesaTransactionStatus | 'all')}>
                  <SelectTrigger className={inputClass}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700 text-white">
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="failed">Failed</SelectItem>
                    <SelectItem value="reversed">Reversed</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
              <DialogTrigger asChild>
                <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold shrink-0">
                  <Plus className="size-4 mr-2" />
                  Add Transaction
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-slate-800 border-slate-700 text-white">
                <DialogHeader>
                  <DialogTitle>New M-PESA Transaction</DialogTitle>
                  <DialogDescription className="text-slate-400">Initiate a new M-PESA transaction</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label className="text-slate-400 text-xs">Phone Number</Label>
                    <Input
                      placeholder="0712 345678"
                      value={addPhone}
                      onChange={(e) => setAddPhone(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Amount (Ksh)</Label>
                    <Input
                      type="number"
                      placeholder="0"
                      value={addAmount || ''}
                      onChange={(e) => setAddAmount(Number(e.target.value))}
                      className={inputClass}
                    />
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Transaction Type</Label>
                    <Select value={addType} onValueChange={(v) => setAddType(v as MpesaTransactionType)}>
                      <SelectTrigger className={inputClass}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-800 border-slate-700 text-white">
                        <SelectItem value="C2B">C2B - Customer to Business</SelectItem>
                        <SelectItem value="B2C">B2C - Business to Customer</SelectItem>
                        <SelectItem value="Paybill">Paybill</SelectItem>
                        <SelectItem value="Till">Till Number</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-slate-400 text-xs">Reference (Optional)</Label>
                    <Input
                      placeholder="Invoice number or description"
                      value={addReference}
                      onChange={(e) => setAddReference(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" className="text-slate-400" onClick={() => setShowAddDialog(false)}>Cancel</Button>
                  <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold" onClick={handleAddTransaction}>
                    Initiate Transaction
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      {/* ── Transaction List ────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Recent M-PESA Transactions</CardTitle>
              <CardDescription className="text-slate-400 text-xs">{filtered.length} transactions found</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="bg-slate-700/50 text-slate-300 text-xs">
                <Clock className="size-3 mr-1" /> Live
              </Badge>
              <Button size="sm" variant="outline" className="border-slate-600 text-slate-300 hover:bg-slate-700 h-8 text-xs" onClick={handleCsvExport}>
                <Download className="size-3 mr-1" /> CSV
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="text-center text-slate-500 text-sm py-8">No transactions match the current filters</div>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Time</TableHead>
                    <TableHead className="text-slate-400 text-xs">Phone</TableHead>
                    <TableHead className="text-slate-400 text-xs text-right">Amount</TableHead>
                    <TableHead className="text-slate-400 text-xs">Type</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                    <TableHead className="text-slate-400 text-xs">Reference</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((txn) => (
                    <TableRow key={txn.id} className="border-slate-700/50">
                      <TableCell className="text-slate-300 text-xs whitespace-nowrap">
                        {new Date(txn.time).toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' })}
                        <div className="text-[10px] text-slate-500">{new Date(txn.time).toLocaleDateString('en-KE', { month: 'short', day: 'numeric' })}</div>
                      </TableCell>
                      <TableCell className="text-slate-300 text-xs">{formatPhone(txn.phone)}</TableCell>
                      <TableCell className="text-xs font-semibold text-right">
                        <span className={txn.type === 'B2C' ? 'text-red-300' : 'text-green-300'}>
                          {txn.type === 'B2C' ? '-' : '+'}{formatKsh(txn.amount)}
                        </span>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${TYPE_COLORS[txn.type]} text-[10px] px-1.5 py-0`}>
                          {txn.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`${STATUS_COLORS[txn.status]} text-[10px] px-1.5 py-0`}>
                          {txn.status.charAt(0).toUpperCase() + txn.status.slice(1)}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs font-mono">{txn.reference}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Daily Volume Chart ──────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold">Daily M-PESA Transaction Volume</CardTitle>
          <CardDescription className="text-slate-400 text-xs">Last 7 days — by transaction type</CardDescription>
        </CardHeader>
        <CardContent>
          {dailyData.every((d) => d.c2b + d.b2c + d.paybill + d.till === 0) ? (
            <div className="text-center text-slate-500 text-sm py-8">No transaction data to chart</div>
          ) : (
            <ChartContainer config={chartConfig} className="h-[260px] w-full">
              <BarChart data={dailyData} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                <XAxis dataKey="day" stroke="#94a3b8" fontSize={11} />
                <YAxis stroke="#94a3b8" fontSize={11} tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="c2b" stackId="a" fill="var(--color-c2b)" radius={[0, 0, 0, 0]} />
                <Bar dataKey="b2c" stackId="a" fill="var(--color-b2c)" />
                <Bar dataKey="paybill" stackId="a" fill="var(--color-paybill)" />
                <Bar dataKey="till" stackId="a" fill="var(--color-till)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
