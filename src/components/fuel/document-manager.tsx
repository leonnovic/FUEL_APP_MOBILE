'use client';

import { useState, useMemo } from 'react';
import {
  FileText,
  Upload,
  Search,
  Plus,
  File,
  FileSpreadsheet,
  FileImage,
  FileArchive,
  Trash2,
  Eye,
  FolderOpen,
  HardDrive,
  Clock,
  Download,
  X,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';

type DocCategory = 'invoices' | 'receipts' | 'reports' | 'contracts' | 'compliance' | 'other';

interface DocEntry {
  id: string;
  name: string;
  type: string;
  category: DocCategory;
  size: number; // bytes
  uploadDate: string;
  uploadedBy: string;
}

const CATEGORY_CONFIG: Record<DocCategory, { label: string; color: string; bg: string }> = {
  invoices: { label: 'Invoices', color: 'text-amber-400', bg: 'bg-amber-500/20' },
  receipts: { label: 'Receipts', color: 'text-green-400', bg: 'bg-green-500/20' },
  reports: { label: 'Reports', color: 'text-blue-400', bg: 'bg-blue-500/20' },
  contracts: { label: 'Contracts', color: 'text-purple-400', bg: 'bg-purple-500/20' },
  compliance: { label: 'Compliance', color: 'text-teal-400', bg: 'bg-teal-500/20' },
  other: { label: 'Other', color: 'text-slate-400', bg: 'bg-slate-500/20' },
};

function getFileIcon(type: string) {
  if (type.includes('pdf')) return <FileText className="size-4 text-red-400" />;
  if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return <FileSpreadsheet className="size-4 text-green-400" />;
  if (type.includes('image') || type.includes('png') || type.includes('jpg')) return <FileImage className="size-4 text-blue-400" />;
  if (type.includes('zip') || type.includes('rar')) return <FileArchive className="size-4 text-amber-400" />;
  return <File className="size-4 text-slate-400" />;
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const MOCK_DOCS: DocEntry[] = [
  { id: 'd1', name: 'March 2025 Sales Report', type: 'application/pdf', category: 'reports', size: 245000, uploadDate: '2025-03-01', uploadedBy: 'Admin' },
  { id: 'd2', name: 'Delivery Invoice - Kenol KBC-4521', type: 'application/pdf', category: 'invoices', size: 128000, uploadDate: '2025-02-28', uploadedBy: 'Manager' },
  { id: 'd3', name: 'EPRA License 2025', type: 'application/pdf', category: 'compliance', size: 890000, uploadDate: '2025-02-25', uploadedBy: 'Admin' },
  { id: 'd4', name: 'Fuel Supplier Contract - Shell', type: 'application/pdf', category: 'contracts', size: 1240000, uploadDate: '2025-02-20', uploadedBy: 'Admin' },
  { id: 'd5', name: 'February 2025 Expense Report', type: 'application/vnd.ms-excel', category: 'reports', size: 67000, uploadDate: '2025-03-01', uploadedBy: 'Accountant' },
  { id: 'd6', name: 'M-PESA Receipt Batch Feb', type: 'application/pdf', category: 'receipts', size: 345000, uploadDate: '2025-02-28', uploadedBy: 'Manager' },
  { id: 'd7', name: 'Fire Safety Certificate', type: 'image/png', category: 'compliance', size: 2100000, uploadDate: '2025-02-15', uploadedBy: 'Admin' },
  { id: 'd8', name: 'NEMA Compliance Report', type: 'application/pdf', category: 'compliance', size: 560000, uploadDate: '2025-02-10', uploadedBy: 'Admin' },
  { id: 'd9', name: 'Staff Payroll February 2025', type: 'application/vnd.ms-excel', category: 'reports', size: 89000, uploadDate: '2025-02-28', uploadedBy: 'Accountant' },
  { id: 'd10', name: 'Tank Calibration Certificate', type: 'application/pdf', category: 'compliance', size: 780000, uploadDate: '2025-01-15', uploadedBy: 'Admin' },
  { id: 'd11', name: 'KEBS Quality Test Results', type: 'application/pdf', category: 'compliance', size: 340000, uploadDate: '2025-02-22', uploadedBy: 'Admin' },
  { id: 'd12', name: 'Station Insurance Policy', type: 'application/pdf', category: 'contracts', size: 1560000, uploadDate: '2025-01-05', uploadedBy: 'Admin' },
];

export function DocumentManager() {
  const { toast } = useToast();

  const [documents, setDocuments] = useState<DocEntry[]>(MOCK_DOCS);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<DocCategory | 'all'>('all');
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<DocEntry | null>(null);
  const [dragActive, setDragActive] = useState(false);

  // Form state
  const [formName, setFormName] = useState('');
  const [formType, setFormType] = useState('application/pdf');
  const [formCategory, setFormCategory] = useState<DocCategory>('reports');

  // Filter documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchesSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCategory = filterCategory === 'all' || doc.category === filterCategory;
      return matchesSearch && matchesCategory;
    });
  }, [documents, searchQuery, filterCategory]);

  // Recent documents (last 5)
  const recentDocs = useMemo(() => {
    return [...documents]
      .sort((a, b) => b.uploadDate.localeCompare(a.uploadDate))
      .slice(0, 5);
  }, [documents]);

  // Storage overview
  const totalSize = documents.reduce((sum, d) => sum + d.size, 0);
  const categoryBreakdown = useMemo(() => {
    const breakdown: Record<DocCategory, number> = { invoices: 0, receipts: 0, reports: 0, contracts: 0, compliance: 0, other: 0 };
    documents.forEach((doc) => {
      breakdown[doc.category] += doc.size;
    });
    return breakdown;
  }, [documents]);

  const handleAddDocument = () => {
    if (!formName) return;
    const newDoc: DocEntry = {
      id: `doc-${Date.now()}`,
      name: formName,
      type: formType,
      category: formCategory,
      size: Math.floor(Math.random() * 2000000) + 50000,
      uploadDate: new Date().toISOString().slice(0, 10),
      uploadedBy: 'Admin',
    };
    setDocuments([newDoc, ...documents]);
    setAddDialogOpen(false);
    setFormName('');
    toast({ title: 'Document Added', description: `${formName} has been uploaded` });
  };

  const handleDelete = (id: string) => {
    setDocuments(documents.filter((d) => d.id !== id));
    toast({ title: 'Document Deleted' });
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = () => {
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    toast({ title: 'Files Received', description: 'File upload simulated successfully' });
  };

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  return (
    <div className="space-y-6">
      {/* ── Storage Overview ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Documents</CardDescription>
              <div className="size-8 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <FileText className="size-4 text-amber-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.length}</div>
            <div className="text-xs text-slate-400 mt-1">Across all categories</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Total Size</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <HardDrive className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatSize(totalSize)}</div>
            <div className="text-xs text-slate-400 mt-1">Storage used</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Compliance Docs</CardDescription>
              <div className="size-8 rounded-lg bg-teal-500/20 flex items-center justify-center">
                <FolderOpen className="size-4 text-teal-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-teal-400">{documents.filter((d) => d.category === 'compliance').length}</div>
            <div className="text-xs text-slate-400 mt-1">{formatSize(categoryBreakdown.compliance)}</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">This Month</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Upload className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">
              {documents.filter((d) => d.uploadDate >= '2025-03-01' || (d.uploadDate >= '2025-02-01' && d.uploadDate < '2025-03-01')).length}
            </div>
            <div className="text-xs text-slate-400 mt-1">Uploaded recently</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Upload Zone + Category Breakdown ─────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Upload Zone */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Upload className="size-4 text-amber-400" />
              Upload Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
                dragActive
                  ? 'border-amber-500 bg-amber-500/10'
                  : 'border-slate-600 hover:border-slate-500'
              }`}
            >
              <Upload className={`size-10 mx-auto mb-3 ${dragActive ? 'text-amber-400' : 'text-slate-500'}`} />
              <p className="text-sm text-slate-300 mb-1">Drag & drop files here</p>
              <p className="text-xs text-slate-500 mb-4">PDF, Excel, Images, ZIP — Max 10MB</p>
              <Dialog open={addDialogOpen} onOpenChange={setAddDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    <Plus className="size-3.5 mr-1.5" />
                    Add Document
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Add Document</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 mt-2">
                    <div>
                      <Label className="text-slate-400 text-xs">Document Name</Label>
                      <Input value={formName} onChange={(e) => setFormName(e.target.value)} placeholder="Enter document name" className={inputClass} />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-slate-400 text-xs">Type</Label>
                        <Select value={formType} onValueChange={setFormType}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            <SelectItem value="application/pdf">PDF</SelectItem>
                            <SelectItem value="application/vnd.ms-excel">Excel</SelectItem>
                            <SelectItem value="image/png">Image</SelectItem>
                            <SelectItem value="text/csv">CSV</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label className="text-slate-400 text-xs">Category</Label>
                        <Select value={formCategory} onValueChange={(v) => setFormCategory(v as DocCategory)}>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-slate-800 border-slate-700 text-white">
                            {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((cat) => (
                              <SelectItem key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">File Upload</Label>
                      <div className="border border-dashed border-slate-600 rounded-lg p-4 text-center">
                        <Upload className="size-6 text-slate-500 mx-auto mb-1" />
                        <p className="text-xs text-slate-500">Click to browse or drag file</p>
                      </div>
                    </div>
                    <Button onClick={handleAddDocument} disabled={!formName} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                      Upload Document
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardContent>
        </Card>

        {/* Category Breakdown */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FolderOpen className="size-4 text-amber-400" />
              Storage by Category
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {(Object.entries(CATEGORY_CONFIG) as [DocCategory, typeof CATEGORY_CONFIG[DocCategory]][]).map(([cat, config]) => {
              const catSize = categoryBreakdown[cat];
              const catCount = documents.filter((d) => d.category === cat).length;
              const maxCatSize = Math.max(...Object.values(categoryBreakdown));
              const widthPercent = maxCatSize > 0 ? (catSize / maxCatSize) * 100 : 0;
              return (
                <div key={cat}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge className={`${config.bg} ${config.color} border border-current/20 text-[10px] px-1.5 py-0`}>
                        {config.label}
                      </Badge>
                      <span className="text-xs text-slate-400">{catCount} files</span>
                    </div>
                    <span className="text-xs text-slate-300 font-medium">{formatSize(catSize)}</span>
                  </div>
                  <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                    <div className="h-full bg-amber-500 rounded-full transition-all" style={{ width: `${widthPercent}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </div>

      {/* ── Recent Documents ─────────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="size-4 text-amber-400" />
            Recent Documents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-3 overflow-x-auto pb-2">
            {recentDocs.map((doc) => {
              const catConfig = CATEGORY_CONFIG[doc.category];
              return (
                <button
                  key={doc.id}
                  onClick={() => setPreviewDoc(doc)}
                  className="shrink-0 w-36 p-3 rounded-xl border bg-slate-700/20 border-slate-700/50 hover:border-slate-600 transition-colors text-left"
                >
                  <div className="size-8 rounded-lg bg-slate-700/50 flex items-center justify-center mb-2">
                    {getFileIcon(doc.type)}
                  </div>
                  <div className="text-xs font-medium text-white truncate">{doc.name}</div>
                  <div className="text-[10px] text-slate-500 mt-0.5">{doc.uploadDate}</div>
                  <div className="text-[10px] text-slate-500">{formatSize(doc.size)}</div>
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* ── Search & Document List ────────────────────────────────────────── */}
      <Card className="bg-slate-800/60 border-slate-700/50 text-white">
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <FileText className="size-4 text-amber-400" />
            All Documents
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Search & Filter */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-slate-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search documents..."
                className={`${inputClass} pl-9`}
              />
            </div>
            <Select value={filterCategory} onValueChange={(v) => setFilterCategory(v as DocCategory | 'all')}>
              <SelectTrigger className={`${inputClass} w-full sm:w-40`}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-slate-800 border-slate-700 text-white">
                <SelectItem value="all">All Categories</SelectItem>
                {(Object.keys(CATEGORY_CONFIG) as DocCategory[]).map((cat) => (
                  <SelectItem key={cat} value={cat}>{CATEGORY_CONFIG[cat].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Document Table */}
          <div className="max-h-72 overflow-y-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-slate-700 hover:bg-transparent">
                  <TableHead className="text-slate-400 text-xs">Name</TableHead>
                  <TableHead className="text-slate-400 text-xs">Category</TableHead>
                  <TableHead className="text-slate-400 text-xs">Size</TableHead>
                  <TableHead className="text-slate-400 text-xs">Uploaded</TableHead>
                  <TableHead className="text-slate-400 text-xs">By</TableHead>
                  <TableHead className="text-slate-400 text-xs text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.map((doc) => {
                  const catConfig = CATEGORY_CONFIG[doc.category];
                  return (
                    <TableRow key={doc.id} className="border-slate-700/50">
                      <TableCell>
                        <div className="flex items-center gap-2">
                          {getFileIcon(doc.type)}
                          <span className="text-xs font-medium text-slate-200 truncate max-w-[200px]">{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={`${catConfig.bg} ${catConfig.color} border border-current/20 text-[10px] px-1.5 py-0`}>
                          {catConfig.label}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-slate-400 text-xs">{formatSize(doc.size)}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{doc.uploadDate}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{doc.uploadedBy}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-amber-400 hover:bg-amber-500/10" onClick={() => setPreviewDoc(doc)}>
                            <Eye className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-green-400 hover:bg-green-500/10">
                            <Download className="size-3" />
                          </Button>
                          <Button size="sm" variant="ghost" className="h-6 w-6 p-0 text-slate-400 hover:text-red-400 hover:bg-red-500/10" onClick={() => handleDelete(doc.id)}>
                            <Trash2 className="size-3" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {filteredDocs.length === 0 && (
            <div className="text-center text-slate-500 text-sm py-8">No documents found</div>
          )}
        </CardContent>
      </Card>

      {/* ── Document Preview Dialog ───────────────────────────────────────── */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => { if (!open) setPreviewDoc(null); }}>
        <DialogContent className="bg-slate-800 border-slate-700 text-white">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {previewDoc && getFileIcon(previewDoc.type)}
              Document Details
            </DialogTitle>
          </DialogHeader>
          {previewDoc && (
            <div className="space-y-3 mt-2">
              <div className="p-4 rounded-lg bg-slate-700/30 border border-slate-700/50 text-center">
                {getFileIcon(previewDoc.type)}
                <div className="mt-2 text-xs text-slate-400">File preview not available</div>
                <div className="text-[10px] text-slate-500">In a real app, document preview would appear here</div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Name</span>
                  <span className="text-slate-200 font-medium">{previewDoc.name}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Category</span>
                  <Badge className={`${CATEGORY_CONFIG[previewDoc.category].bg} ${CATEGORY_CONFIG[previewDoc.category].color} border border-current/20 text-[10px] px-1.5 py-0`}>
                    {CATEGORY_CONFIG[previewDoc.category].label}
                  </Badge>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Size</span>
                  <span className="text-slate-300">{formatSize(previewDoc.size)}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Type</span>
                  <span className="text-slate-300">{previewDoc.type}</span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500">Uploaded</span>
                  <span className="text-slate-300">{previewDoc.uploadDate} by {previewDoc.uploadedBy}</span>
                </div>
              </div>
              <div className="flex gap-2">
                <Button className="flex-1 bg-amber-500 hover:bg-amber-600 text-black font-semibold text-xs">
                  <Download className="size-3.5 mr-1.5" /> Download
                </Button>
                <Button
                  variant="outline"
                  className="border-red-500/50 text-red-400 hover:bg-red-500/10 text-xs"
                  onClick={() => { handleDelete(previewDoc.id); setPreviewDoc(null); }}
                >
                  <Trash2 className="size-3.5 mr-1.5" /> Delete
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
