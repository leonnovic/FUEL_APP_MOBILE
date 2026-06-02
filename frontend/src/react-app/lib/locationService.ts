export interface UserLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  latitude: number;
  longitude: number;
  timezone: string;
  currency: string;
  currencySymbol: string;
  language: string;
  ip: string;
}

export interface PaymentMethodConfig {
  id: string;
  name: string;
  type: string;
}

export interface LocationConfig {
  country: string;
  countryCode: string;
  currency: string;
  currencySymbol: string;
  language: string;
  timezone: string;
  fuelUnit: string;
  volumeUnit: string;
  distanceUnit: string;
  taxRate: number;
  paymentMethods: string[];
  regulatoryBody: string;
  fuelPriceSource: string;
  gdprApplicable: boolean;
  ccpaApplicable: boolean;
  complianceRequired: boolean;
}

const CACHE_KEY = "fuelpro_user_location";
const CACHE_DURATION_MS = 30 * 60 * 1000;

function apiUrl(path: string): string {
  const env = (import.meta as unknown as { env?: Record<string, string> }).env || {};
  const base = (env.VITE_REACT_APP_BACKEND_URL || env.VITE_REACT_APP_BACKEND_URL || "").replace(/\/$/, "");
  return `${base}${path}`;
}

function normalizeCountryCode(value?: string): string {
  return (value || "US").trim().toUpperCase();
}

class LocationService {
  private location: UserLocation | null = null;
  private config: LocationConfig | null = null;

  async detectLocation(): Promise<UserLocation> {
    const cached = this.getCachedLocation();
    if (cached) {
      this.location = cached;
      return cached;
    }

    const [browserCoords, ipLocation] = await Promise.allSettled([
      this.getBrowserGeolocation(),
      this.fetchBackendLocation(),
    ]);

    const fallback = ipLocation.status === "fulfilled" ? ipLocation.value : this.defaultLocation();
    const coords = browserCoords.status === "fulfilled" ? browserCoords.value.coords : null;

    this.location = {
      ...fallback,
      latitude: coords?.latitude ?? fallback.latitude,
      longitude: coords?.longitude ?? fallback.longitude,
    };

    this.cacheLocation(this.location);
    return this.location;
  }

  async loadLocationConfig(countryCode?: string): Promise<LocationConfig> {
    const cc = normalizeCountryCode(countryCode || this.location?.countryCode || (await this.detectLocation()).countryCode);
    const response = await fetch(apiUrl(`/api/location/config/${encodeURIComponent(cc)}`), {
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      this.config = this.defaultConfig(cc);
      return this.config;
    }

    const data = await response.json();
    this.config = {
      country: data.country || "United States",
      countryCode: normalizeCountryCode(data.country_code || cc),
      currency: data.currency || "USD",
      currencySymbol: data.currency_symbol || "$",
      language: data.language || "en",
      timezone: data.timezone || "UTC",
      fuelUnit: data.fuel_unit || "litre",
      volumeUnit: data.volume_unit || "L",
      distanceUnit: data.distance_unit || "km",
      taxRate: Number(data.tax_rate || 0),
      paymentMethods: Array.isArray(data.payment_methods) ? data.payment_methods : ["card"],
      regulatoryBody: data.regulatory_body || "",
      fuelPriceSource: data.fuel_price_source || "local_api",
      gdprApplicable: Boolean(data.gdpr_applicable),
      ccpaApplicable: Boolean(data.ccpa_applicable),
      complianceRequired: Boolean(data.compliance_required),
    };
    return this.config;
  }

  async loadPaymentMethods(countryCode?: string): Promise<PaymentMethodConfig[]> {
    const cc = normalizeCountryCode(countryCode || this.config?.countryCode || this.location?.countryCode || "US");
    const response = await fetch(apiUrl(`/api/location/payment-methods/${encodeURIComponent(cc)}`), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data.methods) ? data.methods : [];
  }

  async convertCurrency(amount: number, fromCurrency: string, toCurrency?: string): Promise<number> {
    const target = normalizeCountryCode(toCurrency || this.config?.currency || this.location?.currency || "USD");
    const params = new URLSearchParams({
      amount: String(amount),
      from_currency: fromCurrency,
      to_currency: target,
    });
    const response = await fetch(apiUrl(`/api/location/convert?${params.toString()}`));
    if (!response.ok) return amount;
    const data = await response.json();
    return Number(data.converted_amount ?? amount);
  }

  getLocation(): UserLocation | null {
    return this.location;
  }

  getConfig(): LocationConfig | null {
    return this.config;
  }

  getCurrency(): string {
    return this.config?.currency || this.location?.currency || "USD";
  }

  getLanguage(): string {
    return this.config?.language || this.location?.language || "en";
  }

  getPaymentMethods(): string[] {
    return this.config?.paymentMethods || ["stripe", "card"];
  }

  clearCache(): void {
    this.location = null;
    this.config = null;
    localStorage.removeItem(CACHE_KEY);
  }

  private async fetchBackendLocation(): Promise<UserLocation> {
    const response = await fetch(apiUrl("/api/location/detect"), {
      headers: { Accept: "application/json" },
    });
    if (!response.ok) throw new Error("Location detection failed");
    const data = await response.json();
    return {
      country: data.country || "United States",
      countryCode: normalizeCountryCode(data.country_code),
      region: data.region || "",
      city: data.city || "",
      latitude: Number(data.latitude || 0),
      longitude: Number(data.longitude || 0),
      timezone: data.timezone || "UTC",
      currency: data.currency || "USD",
      currencySymbol: data.currency_symbol || "$",
      language: data.language || "en",
      ip: data.ip || "",
    };
  }

  private getBrowserGeolocation(): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      if (!("geolocation" in navigator)) {
        reject(new Error("Browser geolocation unavailable"));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: CACHE_DURATION_MS,
      });
    });
  }

  private getCachedLocation(): UserLocation | null {
    try {
      const raw = localStorage.getItem(CACHE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as { timestamp: number; data: UserLocation };
      if (Date.now() - parsed.timestamp > CACHE_DURATION_MS) {
        localStorage.removeItem(CACHE_KEY);
        return null;
      }
      return parsed.data;
    } catch {
      return null;
    }
  }

  private cacheLocation(location: UserLocation): void {
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({ timestamp: Date.now(), data: location }));
    } catch {
      // Ignore storage quota/private-mode failures.
    }
  }

  private defaultLocation(): UserLocation {
    return {
      country: "United States",
      countryCode: "US",
      region: "",
      city: "",
      latitude: 0,
      longitude: 0,
      timezone: "UTC",
      currency: "USD",
      currencySymbol: "$",
      language: "en",
      ip: "",
    };
  }

  private defaultConfig(countryCode: string): LocationConfig {
    return {
      country: countryCode === "KE" ? "Kenya" : "United States",
      countryCode,
      currency: countryCode === "KE" ? "KES" : "USD",
      currencySymbol: countryCode === "KE" ? "Sh" : "$",
      language: "en",
      timezone: "UTC",
      fuelUnit: "litre",
      volumeUnit: "L",
      distanceUnit: countryCode === "US" ? "mi" : "km",
      taxRate: 0,
      paymentMethods: countryCode === "KE" ? ["mpesa", "card"] : ["stripe", "paypal", "card"],
      regulatoryBody: "",
      fuelPriceSource: "local_api",
      gdprApplicable: false,
      ccpaApplicable: countryCode === "US",
      complianceRequired: countryCode === "US",
    };
  }
}

export const locationService = new LocationService();
