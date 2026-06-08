import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import {
  CountryProfile, getCountryById, detectCountryFromTimezone,
  formatPhoneForCountry, formatCurrency, getFuelTaxBreakdown,
  COUNTRY_LIST
} from '@/react-app/config/countries';
import { getCountryByCode } from '@/react-app/lib/world-country-utils';

/** Get the first available country profile as universal fallback */
function getUniversalFallback(): CountryProfile {
  return COUNTRY_LIST[0] || getCountryById('US') || {
    id: 'US', name: 'United States', shortName: 'USA',
    currency: { code: 'USD', symbol: '$', name: 'US Dollar' },
    timezone: 'America/New_York', flag: '🇺🇸',
    phone: { prefix: '+1' }, vatRate: 0,
    revenueAuthority: { name: 'IRS', shortName: 'IRS', website: 'https://irs.gov', vatRate: 0, exciseDuty: 0, roadMaintenanceLevy: 0, petroleumDevelopmentLevy: 0, regulatoryLevy: 0, monthlyReturnDue: '15th', eFilingPortal: 'https://irs.gov' },
    payroll: { nssfLabel: 'Social Security', nssfEmployeeRate: 0.062, nssfEmployerRate: 0.062, payeThreshold: 0, payeRates: [], nhifLabel: 'Health Insurance', nhifRates: [], minimumWage: 7.25, housingLevy: false, housingLevyRate: 0 },
    paymentMethods: [{ id: 'card', name: 'Card', type: 'card', provider: 'Bank', chargeRate: 0.015 }, { id: 'cash', name: 'Cash', type: 'cash', provider: 'Cash', chargeRate: 0 }],
    mobileMoney: [],
    fuelRegulations: { priceSettingBody: 'Department of Energy', licenseBody: 'State Authority', priceReviewFrequency: 'Monthly', requiresEfd: false, requiresEtr: false, requiresEtims: false, fuelTypes: ['Petrol', 'Diesel'], requiresGhsCompliance: false, pumpCalibrationRequired: false },
    units: { volume: 'gallons', currency: 'USD', distance: 'miles', weight: 'lbs' },
    defaultLanguage: 'en',
    complianceDocuments: [],
    communication: { defaultMessage: '', whatsappEnabled: false, smsEnabled: false },
    newsSources: [],
  } as CountryProfile;
}

/** Get user's detected country code from any source */
function resolveUserCountry(): string {
  try {
    const saved = localStorage.getItem('fuelpro_location_country');
    if (saved) {
      const parsed = JSON.parse(saved);
      const cc = parsed.currentCountry || parsed.country;
      if (cc) return cc.toUpperCase();
    }
  } catch { /* */ }
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz) {
    const fromTz = detectCountryFromTimezone();
    if (fromTz) return fromTz;
  }
  return 'US';
}

const LOCATION_STORAGE_KEY = 'fuelpro_location_v1';
const STATION_COUNTRY_KEY = 'fuelpro_station_countries';

export interface StationLocation {
  stationId: string;
  countryCode: string;
  city: string;
  timezone: string;
  coordinates: { lat: number; lng: number } | null;
  detected: boolean; // was auto-detected or manually set
  updatedAt: string;
  // Precise GPS location
  preciseCoords: { lat: number; lng: number; accuracy: number } | null;
  preciseAddress: string; // Reverse-geocoded address
  preciseTimestamp: string;
}

interface LocationContextType {
  // Current location
  currentCountry: CountryProfile;
  currentLocation: StationLocation | null;
  currentStation: StationLocation | null; // alias for currentLocation for compatibility
  allCountries: CountryProfile[];
  
  // Getters
  getCountry: (countryCode: string) => CountryProfile;
  getStationLocation: (stationId: string) => StationLocation | null;
  getStationCountry: (stationId: string) => CountryProfile;
  
  // Formatters
  fmtCurrency: (amount: number) => string;
  fmtPhone: (phone: string) => string;
  fmtDate: (date: Date | string) => string;
  fmtNumber: (num: number) => string;
  
  // Tax & compliance
  getFuelTax: (pricePerLiter: number) => ReturnType<typeof getFuelTaxBreakdown>;
  
  // Setters
  setStationCountry: (stationId: string, countryCode: string) => void;
  setStationCity: (stationId: string, city: string) => void;
  detectLocation: (stationId: string) => Promise<StationLocation>;
  
  // Precise location
  preciseLocation: { lat: number; lng: number; accuracy: number; address: string } | null;
  preciseLocationLoading: boolean;
  detectPreciseLocation: () => Promise<void>;
  
  // Mobile money
  getActiveMobileMoney: () => CountryProfile['mobileMoney'];
  getMobileMoneyById: (id: string) => CountryProfile['mobileMoney'][0] | undefined;
  
  // Payment methods
  getActivePaymentMethods: () => CountryProfile['paymentMethods'];
  
  // Quick properties
  currencySymbol: string;
  currencyCode: string;
  language: string;
  revenueAuthority: CountryProfile['revenueAuthority'];
  payrollConfig: CountryProfile['payroll'];
  communication: CountryProfile['communication'];
  units: CountryProfile['units'];
  complianceDocs: CountryProfile['complianceDocuments'];
  fuelRegulations: CountryProfile['fuelRegulations'];
  newsSources: CountryProfile['newsSources'];
}

const LocationContext = createContext<LocationContextType | null>(null);

function loadStationCountries(): Record<string, StationLocation> {
  try {
    const raw = localStorage.getItem(STATION_COUNTRY_KEY);
    if (!raw) return {};
    const data = JSON.parse(raw) as Record<string, StationLocation>;
    // Migrate old data: add missing precise fields
    Object.values(data).forEach(loc => {
      (loc as any).preciseCoords ??= null;
      (loc as any).preciseAddress ??= '';
      (loc as any).preciseTimestamp ??= '';
    });
    return data;
  } catch { return {}; }
}

function saveStationCountries(data: Record<string, StationLocation>) {
  localStorage.setItem(STATION_COUNTRY_KEY, JSON.stringify(data));
}

export function LocationProvider({ children, stationId }: { children: React.ReactNode; stationId?: string }) {
  const [stationCountries, setStationCountries] = useState<Record<string, StationLocation>>(loadStationCountries);
  const [preciseLocation, setPreciseLocation] = useState<{ lat: number; lng: number; accuracy: number; address: string } | null>(null);
  const [preciseLocationLoading, setPreciseLocationLoading] = useState(false);
  
  const currentLocation = stationId ? stationCountries[stationId] : null;
  
  const currentCountry = React.useMemo(() => {
    if (currentLocation?.countryCode) {
      return getCountryById(currentLocation.countryCode) || getUniversalFallback();
    }
    // Auto-detect from browser timezone or resolved country
    const resolved = resolveUserCountry();
    return getCountryById(resolved) || getUniversalFallback();
  }, [currentLocation]);

  // Persist changes
  useEffect(() => {
    saveStationCountries(stationCountries);
  }, [stationCountries]);

  const getCountry = useCallback((code: string) => {
    return getCountryById(code) || getCountryByCode(code.toUpperCase()) || getUniversalFallback();
  }, []);

  const getStationLocation = useCallback((sid: string) => {
    return stationCountries[sid] || null;
  }, [stationCountries]);

  const getStationCountry = useCallback((sid: string) => {
    const loc = stationCountries[sid];
    if (loc?.countryCode) return getCountryById(loc.countryCode) || getUniversalFallback();
    const resolved = resolveUserCountry();
    return getCountryById(resolved) || getUniversalFallback();
  }, [stationCountries]);

  const fmtCurrency = useCallback((amount: number) => {
    return formatCurrency(amount, currentCountry.id);
  }, [currentCountry]);

  const fmtPhone = useCallback((phone: string) => {
    return formatPhoneForCountry(phone, currentCountry.id);
  }, [currentCountry]);

  const fmtDate = useCallback((date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    const locale = currentCountry.defaultLanguage === 'en' ? `en-${currentCountry.id}` : `${currentCountry.defaultLanguage}-${currentCountry.id}`;
    try {
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    }
  }, [currentCountry]);

  const fmtNumber = useCallback((num: number) => {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }, []);

  const getFuelTax = useCallback((pricePerLiter: number) => {
    return getFuelTaxBreakdown(pricePerLiter, currentCountry.id);
  }, [currentCountry]);

  const setStationCountry = useCallback((sid: string, countryCode: string) => {
    const upperCode = countryCode.toUpperCase();
    const country = getCountryById(upperCode) || getCountryByCode(upperCode);
    setStationCountries(prev => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || { stationId: sid, city: '', timezone: '', coordinates: null, detected: false, updatedAt: '', preciseCoords: null, preciseAddress: '', preciseTimestamp: '' }),
        stationId: sid,
        countryCode: upperCode,
        timezone: country?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
        detected: false,
        updatedAt: new Date().toISOString(),
      }
    }));
  }, []);

  const setStationCity = useCallback((sid: string, city: string) => {
    const resolved = resolveUserCountry();
    setStationCountries(prev => ({
      ...prev,
      [sid]: {
        ...(prev[sid] || { stationId: sid, countryCode: resolved, timezone: '', coordinates: null, detected: false, updatedAt: '', preciseCoords: null, preciseAddress: '', preciseTimestamp: '' }),
        stationId: sid,
        city,
        countryCode: prev[sid]?.countryCode || resolved,
        updatedAt: new Date().toISOString(),
      }
    }));
  }, []);

  const detectLocation = useCallback(async (sid: string): Promise<StationLocation> => {
    return new Promise((resolve) => {
      // Try geolocation API
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const detected = detectCountryFromTimezone();
            const loc: StationLocation = {
              stationId: sid,
              countryCode: detected,
              city: 'Auto-detected',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              coordinates: { lat: position.coords.latitude, lng: position.coords.longitude },
              detected: true,
              updatedAt: new Date().toISOString(),
              preciseCoords: { lat: position.coords.latitude, lng: position.coords.longitude, accuracy: position.coords.accuracy },
              preciseAddress: 'Auto-detected',
              preciseTimestamp: new Date().toISOString(),
            };
            setStationCountries(prev => ({ ...prev, [sid]: loc }));
            resolve(loc);
          },
          () => {
            // Fallback to timezone detection
            const detected = detectCountryFromTimezone();
            const loc: StationLocation = {
              stationId: sid,
              countryCode: detected,
              city: 'Timezone detected',
              timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
              coordinates: null,
              detected: true,
              updatedAt: new Date().toISOString(),
              preciseCoords: null,
              preciseAddress: '',
              preciseTimestamp: '',
            };
            setStationCountries(prev => ({ ...prev, [sid]: loc }));
            resolve(loc);
          },
          { timeout: 10000, enableHighAccuracy: false }
        );
      } else {
        const detected = detectCountryFromTimezone();
        const loc: StationLocation = {
          stationId: sid,
          countryCode: detected,
          city: 'Timezone detected',
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          coordinates: null,
          detected: true,
          updatedAt: new Date().toISOString(),
          preciseCoords: null,
          preciseAddress: '',
          preciseTimestamp: '',
        };
        setStationCountries(prev => ({ ...prev, [sid]: loc }));
        resolve(loc);
      }
    });
  }, []);

  const getActiveMobileMoney = useCallback(() => currentCountry.mobileMoney, [currentCountry]);
  const getMobileMoneyById = useCallback((id: string) => currentCountry.mobileMoney.find(m => m.id === id), [currentCountry]);
  const getActivePaymentMethods = useCallback(() => currentCountry.paymentMethods, [currentCountry]);

  // Precise GPS location detection
  const detectPreciseLocation = useCallback(async () => {
    if (!navigator.geolocation) return;
    setPreciseLocationLoading(true);
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject, {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 0,
        });
      });
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      const accuracy = pos.coords.accuracy;

      // Reverse geocode using OpenStreetMap Nominatim
      let address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=18&addressdetails=1`,
          { headers: { 'User-Agent': 'FuelPro/1.0' } }
        );
        if (res.ok) {
          const data = await res.json();
          const a = data.address || {};
          address = a.city || a.town || a.village || a.suburb || a.district || a.county || a.state || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
        }
      } catch { /* fallback to coordinates */ }

      setPreciseLocation({ lat, lng, accuracy, address });
    } catch {
      // Fallback: try country detection with approximate coords
      const resolved = resolveUserCountry();
      const country = getCountryById(resolved) || getCountryByCode(resolved);
      if (country) {
        // Use capital city approximate coordinates if available
        setPreciseLocation({ lat: 0, lng: 0, accuracy: 100000, address: country.name });
      }
    } finally {
      setPreciseLocationLoading(false);
    }
  }, []);

  // Auto-detect precise location on mount
  useEffect(() => {
    detectPreciseLocation();
  }, [detectPreciseLocation]);

  return (
    <LocationContext.Provider value={{
      currentCountry,
      currentLocation,
      currentStation: currentLocation, // alias for compatibility
      allCountries: COUNTRY_LIST,
      getCountry,
      getStationLocation,
      getStationCountry,
      fmtCurrency,
      fmtPhone,
      fmtDate,
      fmtNumber,
      getFuelTax,
      setStationCountry,
      setStationCity,
      detectLocation,
      preciseLocation,
      preciseLocationLoading,
      detectPreciseLocation,
      getActiveMobileMoney,
      getMobileMoneyById,
      getActivePaymentMethods,
      currencySymbol: currentCountry.currency.symbol,
      currencyCode: currentCountry.currency.code,
      language: currentCountry.defaultLanguage,
      revenueAuthority: currentCountry.revenueAuthority,
      payrollConfig: currentCountry.payroll,
      communication: currentCountry.communication,
      units: currentCountry.units,
      complianceDocs: currentCountry.complianceDocuments,
      fuelRegulations: currentCountry.fuelRegulations,
      newsSources: currentCountry.newsSources,
    }}>
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error('useLocation must be used within LocationProvider');
  return ctx;
}
