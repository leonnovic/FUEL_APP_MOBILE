'use client';

import { useState, useCallback } from 'react';
import {
  FileText,
  Upload,
  Download,
  FileSpreadsheet,
  File,
  Image as ImageIcon,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Trash2,
  RefreshCw,
  ArrowRight,
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

type ConversionFormat = 'pdf' | 'csv' | 'xlsx' | 'json' | 'png' | 'txt';

interface ConversionJob {
  id: string;
  fileName: string;
  sourceFormat: string;
  targetFormat: ConversionFormat;
  status: 'pending' | 'converting' | 'completed' | 'failed';
  size: string;
  createdAt: string;
  downloadUrl?: string;
  error?: string;
}

const FORMAT_OPTIONS: { value: ConversionFormat; label: string; icon: typeof FileText }[] = [
  { value: 'pdf', label: 'PDF Document', icon: FileText },
  { value: 'csv', label: 'CSV Spreadsheet', icon: FileSpreadsheet },
  { value: 'xlsx', label: 'Excel Spreadsheet', icon: FileSpreadsheet },
  { value: 'json', label: 'JSON Data', icon: File },
  { value: 'png', label: 'PNG Image', icon: ImageIcon },
  { value: 'txt', label: 'Plain Text', icon: FileText },
];

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function DocConverter() {
  const [jobs, setJobs] = useState<ConversionJob[]>([]);
  const [targetFormat, setTargetFormat] = useState<ConversionFormat>('pdf');
  const [isDragOver, setIsDragOver] = useState(false);

  const addJob = useCallback((file: File) => {
    const ext = file.name.split('.').pop()?.toLowerCase() || 'unknown';
    const newJob: ConversionJob = {
      id: `conv-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      fileName: file.name,
      sourceFormat: ext,
      targetFormat,
      status: 'pending',
      size: formatFileSize(file.size),
      createdAt: new Date().toISOString(),
    };
    setJobs(prev => [newJob, ...prev]);

    // Simulate conversion
    setTimeout(() => {
      setJobs(prev => prev.map(j => j.id === newJob.id ? { ...j, status: 'converting' as const } : j));
    }, 500);

    setTimeout(() => {
      setJobs(prev => prev.map(j =>
        j.id === newJob.id
          ? { ...j, status: 'completed' as const, downloadUrl: `#download-${newJob.id}` }
          : j
      ));
    }, 2000 + Math.random() * 2000);
  }, [targetFormat]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const files = Array.from(e.dataTransfer.files);
    files.forEach(addJob);
  }, [addJob]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(addJob);
    e.target.value = '';
  }, [addJob]);

  const removeJob = (id: string) => {
    setJobs(prev => prev.filter(j => j.id !== id));
  };

  const retryJob = (id: string) => {
    setJobs(prev => prev.map(j => {
      if (j.id !== id) return j;
      const updated = { ...j, status: 'pending' as const, error: undefined };
      setTimeout(() => {
        setJobs(p => p.map(jj => jj.id === id ? { ...jj, status: 'converting' as const } : jj));
      }, 500);
      setTimeout(() => {
        setJobs(p => p.map(jj =>
          jj.id === id
            ? { ...jj, status: 'completed' as const, downloadUrl: `#download-${id}` }
            : jj
        ));
      }, 2500);
      return updated;
    }));
  };

  const statusBadge = (status: ConversionJob['status']) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pending</Badge>;
      case 'converting':
        return <Badge className="bg-blue-500/20 text-blue-400 border-blue-500/30"><Loader2 className="size-3 mr-1 animate-spin" />Converting</Badge>;
      case 'completed':
        return <Badge className="bg-green-500/20 text-green-400 border-green-500/30"><CheckCircle2 className="size-3 mr-1" />Completed</Badge>;
      case 'failed':
        return <Badge variant="destructive"><AlertCircle className="size-3 mr-1" />Failed</Badge>;
    }
  };

  const completedCount = jobs.filter(j => j.status === 'completed').length;
  const convertingCount = jobs.filter(j => j.status === 'converting' || j.status === 'pending').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <FileText className="size-6 text-amber-500" />
            Doc Converter
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Convert documents between formats — PDF, CSV, Excel, JSON, images, and more
          </p>
        </div>
        <div className="flex items-center gap-2">
          {convertingCount > 0 && (
            <Badge variant="outline" className="gap-1">
              <Loader2 className="size-3 animate-spin" />
              {convertingCount} converting
            </Badge>
          )}
          {completedCount > 0 && (
            <Badge variant="outline" className="gap-1 text-green-400 border-green-500/30">
              <CheckCircle2 className="size-3" />
              {completedCount} completed
            </Badge>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upload area */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Upload & Convert</CardTitle>
            <CardDescription>Drop files or click to browse. Select the target format below.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground mb-1.5 block">Target Format</Label>
                <Select value={targetFormat} onValueChange={(v) => setTargetFormat(v as ConversionFormat)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMAT_OPTIONS.map(opt => (
                      <SelectItem key={opt.value} value={opt.value}>
                        <span className="flex items-center gap-2">
                          <opt.icon className="size-4" />
                          {opt.label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div
              className={`border-2 border-dashed rounded-xl p-8 text-center transition-colors cursor-pointer ${
                isDragOver
                  ? 'border-amber-500 bg-amber-500/5'
                  : 'border-muted-foreground/20 hover:border-amber-500/50'
              }`}
              onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
              onDragLeave={() => setIsDragOver(false)}
              onDrop={handleDrop}
              onClick={() => document.getElementById('doc-converter-input')?.click()}
            >
              <Upload className="size-10 mx-auto mb-3 text-muted-foreground" />
              <p className="text-sm font-medium">Drop files here or click to browse</p>
              <p className="text-xs text-muted-foreground mt-1">
                Supports PDF, CSV, XLSX, JSON, TXT, PNG, JPG and more
              </p>
              <Input
                id="doc-converter-input"
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
                accept=".pdf,.csv,.xlsx,.xls,.json,.txt,.png,.jpg,.jpeg,.doc,.docx"
              />
            </div>
          </CardContent>
        </Card>

        {/* Quick conversions */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Conversions</CardTitle>
            <CardDescription>Common conversion workflows</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              { from: 'PDF', to: 'CSV', desc: 'Extract tables from PDF' },
              { from: 'XLSX', to: 'PDF', desc: 'Export spreadsheet as PDF' },
              { from: 'CSV', to: 'JSON', desc: 'Convert data to JSON' },
              { from: 'JSON', to: 'CSV', desc: 'Flatten JSON to spreadsheet' },
              { from: 'PDF', to: 'TXT', desc: 'Extract text from PDF' },
              { from: 'IMG', to: 'PDF', desc: 'Images to PDF document' },
            ].map((conv, i) => (
              <button
                key={i}
                className="w-full flex items-center gap-3 p-3 rounded-lg border border-muted-foreground/10 hover:border-amber-500/30 hover:bg-amber-500/5 transition-all text-left"
                onClick={() => {
                  const formatMap: Record<string, ConversionFormat> = { PDF: 'pdf', CSV: 'csv', XLSX: 'xlsx', JSON: 'json', TXT: 'txt', IMG: 'png' };
                  setTargetFormat(formatMap[conv.to] || 'pdf');
                }}
              >
                <Badge variant="outline" className="text-xs shrink-0">{conv.from}</Badge>
                <ArrowRight className="size-3 text-muted-foreground shrink-0" />
                <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs shrink-0">{conv.to}</Badge>
                <span className="text-xs text-muted-foreground truncate">{conv.desc}</span>
              </button>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Conversion jobs table */}
      {jobs.length > 0 && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Conversion History</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setJobs(prev => prev.filter(j => j.status === 'converting' || j.status === 'pending'))}
              >
                <Trash2 className="size-4 mr-1" />
                Clear Completed
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>File</TableHead>
                  <TableHead>Conversion</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {jobs.map(job => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{job.fileName}</TableCell>
                    <TableCell>
                      <span className="flex items-center gap-1.5 text-xs">
                        <Badge variant="outline" className="text-xs">{job.sourceFormat.toUpperCase()}</Badge>
                        <ArrowRight className="size-3 text-muted-foreground" />
                        <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/30 text-xs">{job.targetFormat.toUpperCase()}</Badge>
                      </span>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{job.size}</TableCell>
                    <TableCell>{statusBadge(job.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        {job.status === 'completed' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            <Download className="size-3 mr-1" />
                            Download
                          </Button>
                        )}
                        {job.status === 'failed' && (
                          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => retryJob(job.id)}>
                            <RefreshCw className="size-3 mr-1" />
                            Retry
                          </Button>
                        )}
                        <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => removeJob(job.id)}>
                          <Trash2 className="size-3" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {jobs.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center">
            <FileText className="size-12 mx-auto mb-4 text-muted-foreground/30" />
            <h3 className="text-lg font-medium mb-1">No conversions yet</h3>
            <p className="text-sm text-muted-foreground">
              Upload a file above to start converting. Your conversion history will appear here.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
