import { Capacitor } from '@capacitor/core';

const GOOGLE_CONFIG = {
  web: import.meta.env.VITE_GOOGLE_CLIENT_ID_WEB || '',
  android: import.meta.env.VITE_GOOGLE_CLIENT_ID_ANDROID || '',
  ios: import.meta.env.VITE_GOOGLE_CLIENT_ID_IOS || '',
};

export interface GoogleSignInResponse {
  id_token: string;
  access_token: string;
  platform: 'web' | 'android' | 'ios';
}

/**
 * Initialize Google Sign-In on app startup
 */
export async function initGoogleAuth(): Promise<void> {
  const platform = Capacitor.getPlatform();
  
  if (Capacitor.isNativePlatform()) {
    // Native mobile: Capacitor plugin initialization
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      
      const clientId = GOOGLE_CONFIG[platform as keyof typeof GOOGLE_CONFIG];
      if (!clientId) {
        console.warn(`Google client ID not configured for ${platform}`);
        return;
      }
      
      await GoogleAuth.initialize({
        clientId,
        scopes: ['email', 'profile'],
        grantOfflineAccess: false,
      });
    } catch (error) {
      console.warn('Google Auth init failed (native):', error);
    }
  } else {
    // Web: Google Identity Services loads via <script> tag (see index.html)
    if (!(window as any).google) {
      console.warn('Google Identity Services not loaded. Check <script> in index.html');
    }
  }
}

/**
 * Trigger Google Sign-In and get ID token
 * Returns response ready to send to backend
 */
export async function signInWithGoogle(
  platform: 'web' | 'android' | 'ios' = 'web'
): Promise<GoogleSignInResponse> {
  const clientId = GOOGLE_CONFIG[platform];
  if (!clientId) {
    throw new Error(`Google client ID not configured for ${platform}`);
  }
  
  if (Capacitor.isNativePlatform()) {
    // === NATIVE (Android/iOS) ===
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      const result = await GoogleAuth.signIn();
      
      if (!result.authentication?.idToken) {
        throw new Error('No ID token returned from Google Sign-In');
      }
      
      return {
        id_token: result.authentication.idToken,
        access_token: result.authentication.accessToken || '',
        platform,
      };
    } catch (error: any) {
      if (error.message?.includes('10') || error.message?.includes('DEVELOPER_ERROR')) {
        console.error('❌ Android/iOS: SHA-1 not registered in Google Cloud Console');
        console.error('Fix: https://developers.google.com/android/guides/client-auth');
      }
      throw error;
    }
  } else {
    // === WEB (Browser) ===
    return new Promise((resolve, reject) => {
      const google = (window as any).google;
      if (!google) {
        reject(new Error('Google Identity Services not loaded'));
        return;
      }
      
      google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        callback: (response: any) => {
          if (response.error) {
            reject(new Error(`Google OAuth: ${response.error}`));
            return;
          }
          
          resolve({
            id_token: response.id_token,
            access_token: response.access_token || '',
            platform,
          });
        },
      }).requestAccessToken();
    });
  }
}

/**
 * Sign out from Google
 */
export async function signOutGoogle(): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    try {
      const { GoogleAuth } = await import('@codetrix-studio/capacitor-google-auth');
      await GoogleAuth.signOut();
    } catch (error) {
      console.warn('Google Sign-Out failed:', error);
    }
  }
}