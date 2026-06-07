/**
 * FuelPro Edge Function: Geo-Redirect
 * Redirects users to appropriate region-specific content
 */

import { NextResponse } from 'next/server';

export const config = {
  matcher: ['/'],
};

const REGION_MAP: Record<string, string> = {
  'nairobi': 'Kenya',
  'mombasa': 'Kenya',
  'kampala': 'Uganda',
  'dar-es-salaam': 'Tanzania',
  'lagos': 'Nigeria',
  'cairo': 'Egypt',
};

export default async function middleware(request: Request) {
  const response = NextResponse.next();
  
  // Get country from CF header (Cloudflare) or geo lookup
  const country = request.headers.get('cf-ipcountry') || 
                  request.headers.get('x-vercel-ip-country') || 
                  'US';
  
  // Get user's preferred language
  const acceptLanguage = request.headers.get('accept-language') || 'en';
  
  // Add headers for client-side use
  response.headers.set('x-user-country', country);
  response.headers.set('x-user-language', acceptLanguage.split(',')[0].split('-')[0]);
  
  // Track analytics (privacy-compliant)
  const geo = {
    country,
    city: request.headers.get('x-vercel-ip-city') || 'Unknown',
    region: request.headers.get('x-vercel-ip-country-region') || 'Unknown',
    timestamp: Date.now(),
  };
  
  // Log to console (in production, send to analytics service)
  console.log('[Edge] User geo:', geo);
  
  return response;
}