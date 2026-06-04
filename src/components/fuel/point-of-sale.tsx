'use client';

import { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Receipt,
  CreditCard,
  Banknote,
  Smartphone,
  User,
  CheckCircle2,
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { useFuelStore } from '@/store/fuel-store';

type PaymentMethod = 'cash' | 'mpesa' | 'card' | 'credit';

interface ReceiptItem {
  product: string;
  litres: number;
  pricePerLitre: number;
  total: number;
}

export function PointOfSale() {
  const fuelTypes = useFuelStore((s) => s.fuelTypes);
  const pmsPrice = useFuelStore((s) => s.pmsPrice);
  const agoPrice = useFuelStore((s) => s.agoPrice);
  const addSale = useFuelStore((s) => s.addSale);
  const clients = useFuelStore((s) => s.clients);
  const salesHistory = useFuelStore((s) => s.salesHistory);

  const clientsArr = useMemo(() => Object.values(clients), [clients]);

  // Build product options: default PMS/AGO + custom fuel types
  const productOptions = useMemo(() => {
    const defaults = [
      { id: 'pms', name: 'PMS (Super Petrol)', price: pmsPrice || 212.36 },
      { id: 'ago', name: 'AGO (Diesel)', price: agoPrice || 199.47 },
    ];
    const custom = fuelTypes
      .filter((ft) => !ft.name.toLowerCase().includes('pms') && !ft.name.toLowerCase().includes('super') && !ft.name.toLowerCase().includes('ago') && !ft.name.toLowerCase().includes('diesel'))
      .map((ft) => ({ id: ft.id, name: ft.name, price: ft.price }));
    return [...defaults, ...custom];
  }, [fuelTypes, pmsPrice, agoPrice]);

  // Form state
  const [selectedProduct, setSelectedProduct] = useState(productOptions[0]?.id || 'pms');
  const [inputMode, setInputMode] = useState<'litres' | 'amount'>('amount');
  const [litres, setLitres] = useState(0);
  const [amount, setAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [selectedClient, setSelectedClient] = useState('');
  const [completedSale, setCompletedSale] = useState<ReceiptItem[] | null>(null);
  const [showReceipt, setShowReceipt] = useState(false);

  // Current product price
  const currentProduct = productOptions.find((p) => p.id === selectedProduct);
  const currentPrice = currentProduct?.price || 0;

  // Calculate total
  const calculatedLitres = inputMode === 'litres' ? litres : currentPrice > 0 ? amount / currentPrice : 0;
  const calculatedAmount = inputMode === 'amount' ? amount : litres * currentPrice;

  // Quick amount buttons
  const quickAmounts = [500, 1000, 2000, 5000];

  const handleQuickAmount = (val: number) => {
    setInputMode('amount');
    setAmount(val);
    setLitres(0);
  };

  // Complete sale
  const handleCompleteSale = () => {
    if (calculatedAmount <= 0) return;

    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10);

    // Create receipt items
    const receiptItems: ReceiptItem[] = [
      {
        product: currentProduct?.name || selectedProduct,
        litres: Math.round(calculatedLitres * 100) / 100,
        pricePerLitre: currentPrice,
        total: Math.round(calculatedAmount * 100) / 100,
      },
    ];

    // Add sale to store based on product type
    const isPms = selectedProduct === 'pms' || currentProduct?.name.toLowerCase().includes('pms') || currentProduct?.name.toLowerCase().includes('super');

    addSale({
      date: dateStr,
      pmsOpeningReading: 0,
      pmsClosingReading: isPms ? Math.round(calculatedLitres * 100) / 100 : 0,
      agoOpeningReading: 0,
      agoClosingReading: !isPms ? Math.round(calculatedLitres * 100) / 100 : 0,
      pmsPrice: isPms ? currentPrice : 0,
      agoPrice: !isPms ? currentPrice : 0,
    });

    setCompletedSale(receiptItems);
    setShowReceipt(true);

    // Reset form
    setLitres(0);
    setAmount(0);
    setSelectedClient('');
  };

  const closeReceipt = () => {
    setShowReceipt(false);
    setCompletedSale(null);
  };

  const paymentMethods: { id: PaymentMethod; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'cash', label: 'Cash', icon: <Banknote className="size-4" />, color: 'bg-green-500/10 border-green-500/20 text-green-400' },
    { id: 'mpesa', label: 'M-PESA', icon: <Smartphone className="size-4" />, color: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' },
    { id: 'card', label: 'Card', icon: <CreditCard className="size-4" />, color: 'bg-blue-500/10 border-blue-500/20 text-blue-400' },
    { id: 'credit', label: 'Credit', icon: <User className="size-4" />, color: 'bg-purple-500/10 border-purple-500/20 text-purple-400' },
  ];

  const inputClass = 'bg-slate-700/50 border-slate-600 text-white placeholder:text-slate-500';

  // Today's sales count
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySalesCount = useMemo(
    () => Object.values(salesHistory).filter((s) => s.date === todayStr).length,
    [salesHistory, todayStr]
  );

  return (
    <div className="space-y-6">
      {/* ── POS Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <ShoppingCart className="size-5 text-blue-400" />
            Point of Sale
          </h2>
          <p className="text-xs text-slate-400">Today: {todaySalesCount} transactions</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ── Left: Sale Entry ───────────────────────────────────────────── */}
        <div className="lg:col-span-2 space-y-4">
          {/* Product Selector */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Select Product</CardTitle>
            </CardHeader>
            <CardContent>
              <Select value={selectedProduct} onValueChange={setSelectedProduct}>
                <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white">
                  <SelectValue placeholder="Select fuel type" />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {productOptions.map((opt) => (
                    <SelectItem key={opt.id} value={opt.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                      {opt.name} — Ksh {opt.price.toFixed(2)}/L
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Quantity / Amount Input */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Quantity</CardTitle>
                <div className="flex items-center gap-1">
                  <Button
                    variant={inputMode === 'amount' ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-7 ${inputMode === 'amount' ? 'bg-amber-500 text-black' : 'border-slate-600 text-slate-300'}`}
                    onClick={() => setInputMode('amount')}
                  >
                    By Amount
                  </Button>
                  <Button
                    variant={inputMode === 'litres' ? 'default' : 'outline'}
                    size="sm"
                    className={`text-xs h-7 ${inputMode === 'litres' ? 'bg-amber-500 text-black' : 'border-slate-600 text-slate-300'}`}
                    onClick={() => setInputMode('litres')}
                  >
                    By Litres
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {inputMode === 'amount' ? (
                <div>
                  <Label className="text-slate-400 text-xs">Amount (Ksh)</Label>
                  <Input
                    type="number"
                    value={amount || ''}
                    onChange={(e) => setAmount(Number(e.target.value))}
                    placeholder="0"
                    className={`${inputClass} text-lg font-semibold`}
                  />
                </div>
              ) : (
                <div>
                  <Label className="text-slate-400 text-xs">Litres</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={litres || ''}
                    onChange={(e) => setLitres(Number(e.target.value))}
                    placeholder="0"
                    className={`${inputClass} text-lg font-semibold`}
                  />
                </div>
              )}

              {/* Quick amount buttons */}
              <div className="grid grid-cols-4 gap-2">
                {quickAmounts.map((qa) => (
                  <Button
                    key={qa}
                    variant="outline"
                    size="sm"
                    className="border-slate-600 text-slate-300 hover:bg-slate-700 text-xs"
                    onClick={() => handleQuickAmount(qa)}
                  >
                    Ksh {qa.toLocaleString()}
                  </Button>
                ))}
              </div>

              {/* Calculated display */}
              <div className="bg-slate-700/30 rounded-lg p-4 text-center">
                <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Total</div>
                <div className="text-3xl font-bold text-white">Ksh {Math.round(calculatedAmount).toLocaleString()}</div>
                <div className="text-sm text-slate-400 mt-1">
                  {calculatedLitres.toFixed(2)} L @ Ksh {currentPrice.toFixed(2)}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Payment Method */}
          <Card className="bg-slate-800/60 border-slate-700/50 text-white">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Payment Method</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {paymentMethods.map((pm) => (
                  <button
                    key={pm.id}
                    onClick={() => setPaymentMethod(pm.id)}
                    className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-colors ${
                      paymentMethod === pm.id
                        ? `${pm.color} ring-1 ring-current`
                        : 'border-slate-700 text-slate-400 hover:bg-slate-700/30'
                    }`}
                  >
                    {pm.icon}
                    <span className="text-xs font-medium">{pm.label}</span>
                  </button>
                ))}
              </div>

              {/* Client selector for credit */}
              {paymentMethod === 'credit' && (
                <div className="mt-4">
                  <Label className="text-slate-400 text-xs">Select Client</Label>
                  <Select value={selectedClient} onValueChange={setSelectedClient}>
                    <SelectTrigger className="bg-slate-700/50 border-slate-600 text-white mt-1">
                      <SelectValue placeholder="Choose a client" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-800 border-slate-700">
                      {clientsArr.length === 0 ? (
                        <SelectItem value="__none" disabled className="text-slate-400">No clients added yet</SelectItem>
                      ) : (
                        clientsArr.map((c) => (
                          <SelectItem key={c.id} value={c.id} className="text-slate-200 focus:bg-slate-700 focus:text-white">
                            {c.name} — Balance: Ksh {c.balanceDue.toLocaleString()}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Complete Sale */}
          <Button
            onClick={handleCompleteSale}
            disabled={calculatedAmount <= 0}
            className="w-full bg-amber-500 hover:bg-amber-600 text-black font-semibold py-6 text-base disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCircle2 className="size-5 mr-2" />
            Complete Sale — Ksh {Math.round(calculatedAmount).toLocaleString()}
          </Button>
        </div>

        {/* ── Right: Receipt Preview ─────────────────────────────────────── */}
        <div>
          <Card className="bg-slate-800/60 border-slate-700/50 text-white sticky top-4">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Receipt className="size-4 text-amber-400" />
                Receipt Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {showReceipt && completedSale ? (
                <div className="bg-white text-black rounded-lg p-4 space-y-3 text-xs">
                  <div className="text-center border-b border-gray-200 pb-2">
                    <div className="font-bold text-sm">FUELPRO STATION</div>
                    <div className="text-gray-500">Nairobi, Kenya</div>
                    <div className="text-gray-500">{new Date().toLocaleString()}</div>
                  </div>
                  <div className="border-b border-dashed border-gray-300 pb-2">
                    <div className="flex justify-between text-gray-500">
                      <span>Payment:</span>
                      <span className="uppercase font-medium text-black">{paymentMethod}</span>
                    </div>
                    {selectedClient && paymentMethod === 'credit' && (
                      <div className="flex justify-between text-gray-500 mt-1">
                        <span>Client:</span>
                        <span className="text-black">{clientsArr.find((c) => c.id === selectedClient)?.name || 'N/A'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1.5 border-b border-dashed border-gray-300 pb-2">
                    <div className="flex text-gray-500 font-medium">
                      <span className="flex-1">Item</span>
                      <span className="w-14 text-right">Qty</span>
                      <span className="w-20 text-right">Amount</span>
                    </div>
                    {completedSale.map((item, idx) => (
                      <div key={idx} className="flex text-black">
                        <span className="flex-1">{item.product}</span>
                        <span className="w-14 text-right">{item.litres.toFixed(1)}L</span>
                        <span className="w-20 text-right">{item.total.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                  <div className="flex justify-between font-bold text-sm pt-1">
                    <span>TOTAL</span>
                    <span>Ksh {completedSale.reduce((s, i) => s + i.total, 0).toLocaleString()}</span>
                  </div>
                  <div className="text-center text-gray-400 pt-2 border-t border-gray-200">
                    Thank you for your purchase!
                  </div>
                  <Button
                    onClick={closeReceipt}
                    className="w-full bg-slate-800 hover:bg-slate-700 text-white mt-3 text-xs"
                  >
                    Close Receipt
                  </Button>
                </div>
              ) : (
                <div className="text-center py-12 text-slate-500">
                  <Receipt className="size-12 mx-auto mb-3 opacity-30" />
                  <p className="text-sm">Complete a sale to see receipt</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
