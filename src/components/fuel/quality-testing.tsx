'use client';

import { useState, useMemo } from 'react';
import {
  FlaskConical,
  Plus,
  CheckCircle,
  XCircle,
  AlertTriangle,
  BookOpen,
  Percent,
  TestTube,
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
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';
import { useToast } from '@/hooks/use-toast';

type TestType = 'Density' | 'Flash Point' | 'Water Content' | 'Sulphur';
type TestStatus = 'Pass' | 'Fail';

interface QualityTest {
  id: string;
  date: string;
  fuelType: string;
  testType: TestType;
  result: number;
  unit: string;
  threshold: { min: number; max: number };
  status: TestStatus;
}

interface KEBSStandard {
  fuelType: string;
  testType: TestType;
  min: number;
  max: number;
  unit: string;
}

const KEBS_STANDARDS: KEBSStandard[] = [
  { fuelType: 'PMS', testType: 'Density', min: 720, max: 775, unit: 'kg/m³' },
  { fuelType: 'PMS', testType: 'Flash Point', min: -40, max: -10, unit: '°C' },
  { fuelType: 'PMS', testType: 'Water Content', min: 0, max: 0.5, unit: '% vol' },
  { fuelType: 'PMS', testType: 'Sulphur', min: 0, max: 50, unit: 'mg/kg' },
  { fuelType: 'AGO', testType: 'Density', min: 820, max: 860, unit: 'kg/m³' },
  { fuelType: 'AGO', testType: 'Flash Point', min: 55, max: 120, unit: '°C' },
  { fuelType: 'AGO', testType: 'Water Content', min: 0, max: 0.2, unit: '% vol' },
  { fuelType: 'AGO', testType: 'Sulphur', min: 0, max: 50, unit: 'mg/kg' },
  { fuelType: 'DPK', testType: 'Density', min: 775, max: 840, unit: 'kg/m³' },
  { fuelType: 'DPK', testType: 'Flash Point', min: 38, max: 65, unit: '°C' },
  { fuelType: 'DPK', testType: 'Water Content', min: 0, max: 0.1, unit: '% vol' },
  { fuelType: 'DPK', testType: 'Sulphur', min: 0, max: 0.1, unit: '% mass' },
];

const TEST_TYPES: TestType[] = ['Density', 'Flash Point', 'Water Content', 'Sulphur'];
const FUEL_TYPES = ['PMS', 'AGO', 'DPK'];

function generateInitialTests(): QualityTest[] {
  const tests: QualityTest[] = [];
  const now = new Date();
  const rng = (min: number, max: number) => Math.round((min + Math.random() * (max - min)) * 100) / 100;

  for (let i = 0; i < 12; i++) {
    const fuelType = FUEL_TYPES[i % 3];
    const testType = TEST_TYPES[Math.floor(i / 3) % 4];
    const standard = KEBS_STANDARDS.find((s) => s.fuelType === fuelType && s.testType === testType);
    if (!standard) continue;

    // Generate a result that mostly passes
    const willPass = Math.random() > 0.15;
    let result: number;
    if (willPass) {
      result = rng(standard.min + (standard.max - standard.min) * 0.1, standard.max - (standard.max - standard.min) * 0.1);
    } else {
      // Generate a failing result
      if (Math.random() > 0.5) {
        result = standard.max + rng(1, 5);
      } else {
        result = standard.min - rng(1, 5);
      }
    }

    const date = new Date(now.getTime() - i * 86400000 * 2);
    tests.push({
      id: `qt-${i + 1}`,
      date: date.toISOString().slice(0, 10),
      fuelType,
      testType,
      result: Math.round(result * 100) / 100,
      unit: standard.unit,
      threshold: { min: standard.min, max: standard.max },
      status: willPass ? 'Pass' : 'Fail',
    });
  }

  return tests.sort((a, b) => b.date.localeCompare(a.date));
}

export function QualityTesting() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const { toast } = useToast();

  const [tests, setTests] = useState<QualityTest[]>(generateInitialTests);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formFuelType, setFormFuelType] = useState('PMS');
  const [formTestType, setFormTestType] = useState<TestType>('Density');
  const [formResult, setFormResult] = useState('');

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Summary stats
  const thisMonth = useMemo(() => {
    const monthStr = new Date().toISOString().slice(0, 7);
    return tests.filter((t) => t.date.startsWith(monthStr));
  }, [tests]);

  const passRate = useMemo(() => {
    if (thisMonth.length === 0) return 0;
    return Math.round((thisMonth.filter((t) => t.status === 'Pass').length / thisMonth.length) * 100);
  }, [thisMonth]);

  const failedTests = useMemo(() => tests.filter((t) => t.status === 'Fail'), [tests]);

  const handleAddTest = () => {
    const resultVal = parseFloat(formResult);
    if (isNaN(resultVal)) return;

    const standard = KEBS_STANDARDS.find(
      (s) => s.fuelType === formFuelType && s.testType === formTestType
    );
    if (!standard) return;

    const status: TestStatus = resultVal >= standard.min && resultVal <= standard.max ? 'Pass' : 'Fail';

    const newTest: QualityTest = {
      id: `qt-${Date.now()}`,
      date: new Date().toISOString().slice(0, 10),
      fuelType: formFuelType,
      testType: formTestType,
      result: resultVal,
      unit: standard.unit,
      threshold: { min: standard.min, max: standard.max },
      status,
    };

    setTests((prev) => [newTest, ...prev]);
    setDialogOpen(false);
    setFormResult('');

    if (status === 'Fail') {
      toast({
        title: '⚠️ Test Failed',
        description: `${formTestType} test for ${formFuelType} is outside KEBS standards`,
        variant: 'destructive',
      });
    } else {
      toast({ title: 'Test Recorded', description: `${formTestType} test for ${formFuelType}: Pass` });
    }
  };

  return (
    <div className="space-y-6">
      {/* ── Summary Cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Pass Rate</CardDescription>
              <div className="size-8 rounded-lg bg-green-500/20 flex items-center justify-center">
                <Percent className="size-4 text-green-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{passRate}%</div>
            <div className="text-xs text-slate-400 mt-1">This month</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Tests This Month</CardDescription>
              <div className="size-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <TestTube className="size-4 text-blue-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{thisMonth.length}</div>
            <div className="text-xs text-slate-400 mt-1">{thisMonth.filter((t) => t.status === 'Pass').length} passed</div>
          </CardContent>
        </Card>

        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardDescription className="text-slate-400 text-xs uppercase tracking-wider">Failed Tests</CardDescription>
              <div className="size-8 rounded-lg bg-red-500/20 flex items-center justify-center">
                <AlertTriangle className="size-4 text-red-400" />
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{failedTests.length}</div>
            <div className="text-xs text-slate-400 mt-1">Requires attention</div>
          </CardContent>
        </Card>
      </div>

      {/* ── Failed Tests Alert ─────────────────────────────────────────── */}
      {failedTests.length > 0 && (
        <Card className="bg-red-500/5 border-red-500/30 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2 text-red-400">
              <AlertTriangle className="size-4" />
              Failed Tests Alert
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {failedTests.map((test) => (
                <div key={test.id} className="p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-red-300">{test.fuelType} - {test.testType}</span>
                    <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px]">FAIL</Badge>
                  </div>
                  <div className="text-xs text-slate-300">
                    Result: {test.result} {test.unit} (Range: {test.threshold.min} - {test.threshold.max})
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{test.date}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Quality Test Table ────────────────────────────────────────── */}
        <Card className="lg:col-span-2 bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <FlaskConical className="size-4 text-amber-400" />
                  Quality Test Records
                </CardTitle>
                <CardDescription className="text-slate-400 text-xs">All fuel quality tests</CardDescription>
              </div>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button size="sm" className="bg-amber-500 hover:bg-amber-600 text-black font-semibold">
                    <Plus className="size-3.5 mr-1.5" />
                    Add Test
                  </Button>
                </DialogTrigger>
                <DialogContent className="bg-slate-800 border-slate-700 text-white">
                  <DialogHeader>
                    <DialogTitle>Record Quality Test</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-2">
                    <div>
                      <Label className="text-slate-400 text-xs">Fuel Type</Label>
                      <Select value={formFuelType} onValueChange={setFormFuelType}>
                        <SelectTrigger className={inputClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          {FUEL_TYPES.map((ft) => (
                            <SelectItem key={ft} value={ft}>{ft}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">Test Type</Label>
                      <Select value={formTestType} onValueChange={(v) => setFormTestType(v as TestType)}>
                        <SelectTrigger className={inputClass}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-800 border-slate-700 text-white">
                          {TEST_TYPES.map((tt) => (
                            <SelectItem key={tt} value={tt}>{tt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label className="text-slate-400 text-xs">
                        Result{' '}
                        {(() => {
                          const std = KEBS_STANDARDS.find(
                            (s) => s.fuelType === formFuelType && s.testType === formTestType
                          );
                          return std ? `(${std.min} - ${std.max} ${std.unit})` : '';
                        })()}
                      </Label>
                      <Input
                        type="number"
                        step="0.01"
                        placeholder="Enter result value"
                        value={formResult}
                        onChange={(e) => setFormResult(e.target.value)}
                        className={inputClass}
                      />
                    </div>
                    <Button
                      onClick={handleAddTest}
                      disabled={!formResult}
                      className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold"
                    >
                      Record Test
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow className="border-slate-700 hover:bg-transparent">
                    <TableHead className="text-slate-400 text-xs">Date</TableHead>
                    <TableHead className="text-slate-400 text-xs">Fuel</TableHead>
                    <TableHead className="text-slate-400 text-xs">Test</TableHead>
                    <TableHead className="text-slate-400 text-xs">Result</TableHead>
                    <TableHead className="text-slate-400 text-xs">Range</TableHead>
                    <TableHead className="text-slate-400 text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tests.map((test) => (
                    <TableRow key={test.id} className={`border-slate-700/50 ${test.status === 'Fail' ? 'bg-red-500/5' : ''}`}>
                      <TableCell className="text-slate-300 text-xs">{test.date}</TableCell>
                      <TableCell className="text-slate-300 text-xs font-medium">{test.fuelType}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{test.testType}</TableCell>
                      <TableCell className="text-xs font-semibold">
                        {test.result} <span className="text-slate-500">{test.unit}</span>
                      </TableCell>
                      <TableCell className="text-slate-500 text-xs">
                        {test.threshold.min}-{test.threshold.max}
                      </TableCell>
                      <TableCell>
                        {test.status === 'Pass' ? (
                          <Badge className="bg-green-500/20 text-green-400 border-green-500/30 text-[10px] px-1.5 py-0">
                            <CheckCircle className="size-3 mr-1" />Pass
                          </Badge>
                        ) : (
                          <Badge className="bg-red-500/20 text-red-400 border-red-500/30 text-[10px] px-1.5 py-0">
                            <XCircle className="size-3 mr-1" />Fail
                          </Badge>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* ── KEBS Standards Reference ────────────────────────────────── */}
        <Card className="bg-slate-800/60 border-slate-700/50 text-white">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <BookOpen className="size-4 text-amber-400" />
              KEBS Standards
            </CardTitle>
            <CardDescription className="text-slate-400 text-xs">Kenya Bureau of Standards</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="max-h-96 overflow-y-auto space-y-4">
              {FUEL_TYPES.map((ft) => (
                <div key={ft}>
                  <h4 className="text-sm font-semibold text-amber-400 mb-2">{ft}</h4>
                  <div className="space-y-1.5">
                    {KEBS_STANDARDS.filter((s) => s.fuelType === ft).map((std) => (
                      <div key={`${std.fuelType}-${std.testType}`} className="p-2 rounded bg-slate-700/30">
                        <div className="text-xs font-medium text-slate-300">{std.testType}</div>
                        <div className="text-[10px] text-slate-400">
                          Range: {std.min} - {std.max} {std.unit}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Separator className="bg-slate-700/50 mt-3" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
