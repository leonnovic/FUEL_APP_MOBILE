'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Building,
  MapPin,
  Fuel,
  Droplets,
  Gauge,
  ArrowRight,
  ArrowLeft,
  Check,
  Zap,
  Globe,
  Phone,
  Mail,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { useFuelStore } from '@/store/fuel-store';
import { useStationStore } from '@/store/station-store';
import { useAuthStore } from '@/store/auth-store';

interface SetupWizardProps {
  onComplete: () => void;
}

const STEPS = [
  { id: 1, title: 'Station Details', desc: 'Name and location of your station' },
  { id: 2, title: 'Fuel Types & Pricing', desc: 'Configure your fuel products' },
  { id: 3, title: 'Add Pumps', desc: 'Set up your pump configuration' },
  { id: 4, title: 'Company Details', desc: 'Business information' },
  { id: 5, title: 'Complete', desc: 'You are all set!' },
];

export function SetupWizard({ onComplete }: SetupWizardProps) {
  const [step, setStep] = useState(1);

  // Step 1: Station details
  const [stationName, setStationName] = useState('');
  const [stationLocation, setStationLocation] = useState('');
  const [stationCountry, setStationCountry] = useState('Kenya');
  const [stationCurrency, setStationCurrency] = useState('KES');

  // Step 2: Fuel types & pricing
  const [pmsPrice, setPmsPrice] = useState('');
  const [agoPrice, setAgoPrice] = useState('');
  const [pmsCapacity, setPmsCapacity] = useState('');
  const [agoCapacity, setAgoCapacity] = useState('');

  // Step 3: Pumps (simplified)
  const [pumpCount, setPumpCount] = useState('4');

  // Step 4: Company details
  const [companyName, setCompanyName] = useState('');
  const [companyPhone, setCompanyPhone] = useState('');
  const [companyEmail, setCompanyEmail] = useState('');
  const [companyAddress, setCompanyAddress] = useState('');

  const addStation = useStationStore((s) => s.addStation);
  const addFuelType = useFuelStore((s) => s.addFuelType);
  const setCompanyData = useFuelStore((s) => s.setCompanyData);
  const setPmsPriceStore = useFuelStore((s) => s.setPmsPrice);
  const setAgoPriceStore = useFuelStore((s) => s.setAgoPrice);
  const user = useAuthStore((s) => s.user);

  const progress = (step / STEPS.length) * 100;

  const canNext = () => {
    switch (step) {
      case 1:
        return stationName.trim() !== '' && stationLocation.trim() !== '';
      case 2:
        return pmsPrice !== '' || agoPrice !== '';
      case 3:
        return pumpCount !== '' && parseInt(pumpCount) > 0;
      case 4:
        return companyName.trim() !== '';
      default:
        return true;
    }
  };

  const handleSave = () => {
    const ownerId = user?.id ?? 'demo-user';

    // Save station
    addStation({
      name: stationName,
      location: stationLocation,
      country: stationCountry,
      currency: stationCurrency,
      ownerId,
    });

    // Save fuel types
    const stationId = useStationStore.getState().currentStation?.id ?? '';

    if (pmsPrice) {
      addFuelType({
        name: 'PMS (Super)',
        category: 'fuel',
        price: parseFloat(pmsPrice),
        tankCapacity: pmsCapacity ? parseFloat(pmsCapacity) : 20000,
        currentLevel: pmsCapacity ? parseFloat(pmsCapacity) * 0.6 : 12000,
      });
      setPmsPriceStore(parseFloat(pmsPrice));
    }

    if (agoPrice) {
      addFuelType({
        name: 'AGO (Diesel)',
        category: 'fuel',
        price: parseFloat(agoPrice),
        tankCapacity: agoCapacity ? parseFloat(agoCapacity) : 20000,
        currentLevel: agoCapacity ? parseFloat(agoCapacity) * 0.5 : 10000,
      });
      setAgoPriceStore(parseFloat(agoPrice));
    }

    // Save company
    setCompanyData({
      name: companyName || stationName,
      phone: companyPhone,
      email: companyEmail,
      address: companyAddress,
    });

    setStep(5);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Progress bar */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-slate-400">
              Step {step} of {STEPS.length}
            </span>
            <span className="text-sm text-amber-400 font-medium">
              {STEPS[step - 1].title}
            </span>
          </div>
          <Progress value={progress} className="h-2 bg-slate-700" />
        </div>

        {/* Step indicators */}
        <div className="flex items-center justify-center gap-2 mb-8">
          {STEPS.map((s) => (
            <div
              key={s.id}
              className={`
                flex items-center justify-center size-8 rounded-full text-xs font-bold transition-colors
                ${step > s.id ? 'bg-emerald-500 text-white' : step === s.id ? 'bg-amber-500 text-black' : 'bg-slate-700 text-slate-400'}
              `}
            >
              {step > s.id ? <Check className="size-4" /> : s.id}
            </div>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building className="size-5 text-amber-400" />
                    Station Details
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Enter your fuel station name and location
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Station Name *</Label>
                    <Input
                      value={stationName}
                      onChange={(e) => setStationName(e.target.value)}
                      placeholder="e.g. Shell Express Nairobi"
                      className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Location *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                      <Input
                        value={stationLocation}
                        onChange={(e) => setStationLocation(e.target.value)}
                        placeholder="e.g. Kenyatta Avenue, Nairobi"
                        className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Country</Label>
                      <div className="relative">
                        <Globe className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          value={stationCountry}
                          onChange={(e) => setStationCountry(e.target.value)}
                          className="pl-10 bg-white/5 border-white/20 text-white"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Currency</Label>
                      <Input
                        value={stationCurrency}
                        onChange={(e) => setStationCurrency(e.target.value)}
                        className="bg-white/5 border-white/20 text-white"
                      />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Fuel className="size-5 text-amber-400" />
                    Fuel Types & Pricing
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Set up your fuel products and current prices
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* PMS */}
                  <div className="p-4 rounded-lg bg-amber-500/5 border border-amber-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Droplets className="size-5 text-amber-400" />
                      <span className="text-white font-medium">PMS (Super Petrol)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Price per Litre</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            {stationCurrency}
                          </span>
                          <Input
                            type="number"
                            value={pmsPrice}
                            onChange={(e) => setPmsPrice(e.target.value)}
                            placeholder="195.50"
                            className="pl-14 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Tank Capacity (L)</Label>
                        <Input
                          type="number"
                          value={pmsCapacity}
                          onChange={(e) => setPmsCapacity(e.target.value)}
                          placeholder="20000"
                          className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AGO */}
                  <div className="p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                    <div className="flex items-center gap-2 mb-3">
                      <Gauge className="size-5 text-emerald-400" />
                      <span className="text-white font-medium">AGO (Diesel)</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Price per Litre</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            {stationCurrency}
                          </span>
                          <Input
                            type="number"
                            value={agoPrice}
                            onChange={(e) => setAgoPrice(e.target.value)}
                            placeholder="179.30"
                            className="pl-14 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-slate-300 text-xs">Tank Capacity (L)</Label>
                        <Input
                          type="number"
                          value={agoCapacity}
                          onChange={(e) => setAgoCapacity(e.target.value)}
                          placeholder="20000"
                          className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="step3"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Zap className="size-5 text-amber-400" />
                    Add Pumps
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Configure your pump setup for the station
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Number of Pumps</Label>
                    <Input
                      type="number"
                      value={pumpCount}
                      onChange={(e) => setPumpCount(e.target.value)}
                      min="1"
                      max="20"
                      className="bg-white/5 border-white/20 text-white"
                    />
                  </div>

                  {/* Visual pump layout */}
                  <div className="grid grid-cols-4 gap-2">
                    {Array.from({ length: Math.min(parseInt(pumpCount) || 4, 16) }, (_, i) => (
                      <div
                        key={i}
                        className="flex flex-col items-center justify-center p-3 rounded-lg bg-amber-500/10 border border-amber-500/20"
                      >
                        <Fuel className="size-5 text-amber-400 mb-1" />
                        <span className="text-xs text-white font-medium">P{i + 1}</span>
                      </div>
                    ))}
                  </div>

                  <p className="text-xs text-slate-400 text-center">
                    Pump configuration can be customized later in settings
                  </p>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center gap-2">
                    <Building className="size-5 text-amber-400" />
                    Company Details
                  </CardTitle>
                  <CardDescription className="text-slate-300">
                    Business information for invoices and reports
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-slate-300">Company Name *</Label>
                    <Input
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      placeholder="e.g. FuelPro Ltd."
                      className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-slate-300">Phone</Label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          value={companyPhone}
                          onChange={(e) => setCompanyPhone(e.target.value)}
                          placeholder="+254 700 000"
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className="text-slate-300">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
                        <Input
                          type="email"
                          value={companyEmail}
                          onChange={(e) => setCompanyEmail(e.target.value)}
                          placeholder="info@fuel.co"
                          className="pl-10 bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-slate-300">Address</Label>
                    <Input
                      value={companyAddress}
                      onChange={(e) => setCompanyAddress(e.target.value)}
                      placeholder="Business address"
                      className="bg-white/5 border-white/20 text-white placeholder:text-slate-500"
                    />
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="step5"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm text-center">
                <CardContent className="py-12 space-y-6">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
                    className="mx-auto size-20 rounded-full bg-emerald-500/20 flex items-center justify-center"
                  >
                    <Check className="size-10 text-emerald-400" />
                  </motion.div>
                  <div>
                    <h2 className="text-2xl font-bold text-white mb-2">Setup Complete!</h2>
                    <p className="text-slate-300">
                      Your station &quot;{stationName}&quot; is ready to go.
                    </p>
                  </div>
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5 }}
                  >
                    <Button
                      onClick={onComplete}
                      className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-11 px-8 text-base"
                    >
                      <Zap className="size-5 mr-2" />
                      Launch FuelPro
                    </Button>
                  </motion.div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation buttons */}
        {step < 5 && (
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="ghost"
              onClick={() => setStep(Math.max(1, step - 1))}
              disabled={step === 1}
              className="text-slate-400 hover:text-white hover:bg-white/10"
            >
              <ArrowLeft className="size-4 mr-1" />
              Back
            </Button>

            {step < 4 ? (
              <Button
                onClick={() => setStep(step + 1)}
                disabled={!canNext()}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold"
              >
                Next
                <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <Button
                onClick={handleSave}
                disabled={!canNext()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
              >
                <Check className="size-4 mr-1" />
                Complete Setup
              </Button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
