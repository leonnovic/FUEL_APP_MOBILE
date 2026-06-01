export interface UserLocation {
  country: string;
  country_code: string;
  currency: string;
  timezone: string;
  language: string;
}

class LocationService {
  private location: UserLocation | null = null;
  private CACHE_KEY = 'fuelpro_location';
  private CACHE_DURATION = 30 * 60 * 1000;  // 30 min

  async detectLocation(): Promise<UserLocation> {
    // Check cache
    const cached = this.getCachedLocation();
    if (cached) {
      this.location = cached;
      return cached;
    }

    try {
      const response = await fetch('/api/location/detect');
      if (response.ok) {
        const data = await response.json();
        this.location = data;
        this.cacheLocation(data);
        return data;
      }
    } catch (error) {
      console.warn('Location detection failed:', error);
    }

    // Fallback
    this.location = {
      country: "United States",
      country_code: "US",
      currency: "USD",
      timezone: "America/New_York",
      language: "en",
    };
    return this.location;
  }

  private getCachedLocation(): UserLocation | null {
    try {
      const cached = localStorage.getItem(this.CACHE_KEY);
      if (!cached) return null;
      const { timestamp, data } = JSON.parse(cached);
      if (Date.now() - timestamp > this.CACHE_DURATION) {
        localStorage.removeItem(this.CACHE_KEY);
        return null;
      }
      return data;
    } catch {
      return null;
    }
  }

  private cacheLocation(location: UserLocation): void {
    try {
      localStorage.setItem(this.CACHE_KEY, JSON.stringify({
        timestamp: Date.now(),
        data: location,
      }));
    } catch (error) {
      console.error('Failed to cache location:', error);
    }
  }

  getLocation(): UserLocation | null {
    return this.location;
  }

  getCurrency(): string {
    return this.location?.currency || 'USD';
  }

  getCountryCode(): string {
    return this.location?.country_code || 'US';
  }
}

export const locationService = new LocationService();