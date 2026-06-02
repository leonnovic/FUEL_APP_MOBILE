/**
 * Direct Google OAuth Configuration
 * Replaces the Emergent proxy with native Google Sign-In
 * 
 * SETUP REQUIRED:
 * 1. Go to https://console.cloud.google.com/
 * 2. Create OAuth 2.0 Web Client ID
 * 3. Add these Authorized JavaScript origins:
 *    - https://fuel-app-mobile.vercel.app
 *    - http://localhost:3000
 *    - http://127.0.0.1:3000
 * 4. Add these Authorized redirect URIs:
 *    - https://fuel-app-mobile.vercel.app/auth/callback
 *    - http://localhost:3000/auth/callback
 * 5. Set VITE_GOOGLE_CLIENT_ID_WEB in environment
 */

export const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB ||
  (typeof window !== 'undefined' && window.__FUEL_PRO_GOOGLE_CLIENT_ID) ||
  '49625052041-kgt0hghf445lmcmhijv46b715m2mpbct.apps.googleusercontent.com';

export function buildGoogleAuthUrl(): string {
  const redirectUri = `${window.location.origin}/auth/callback`;
  
  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    prompt: 'select_account',
    access_type: 'offline',
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

/**
 * Handle OAuth code exchange (happens on backend)
 * Frontend will be redirected to /auth/callback?code=...
 * Backend should exchange this code for a token
 */
export async function exchangeGoogleCode(id_token: string): Promise<{ token: string; user: { id: string; email: string; name: string } }> {
  const response = await fetch(`${import.meta.env.VITE_REACT_APP_BACKEND_URL || window.location.origin}/api/auth/google`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id_token, platform: 'web' }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Google sign-in failed' }));
    throw new Error(error.error || error.message || 'Google sign-in failed');
  }
  
  return response.json();
}
