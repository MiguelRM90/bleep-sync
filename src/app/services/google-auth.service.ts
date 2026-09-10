import { Injectable, signal } from '@angular/core';
import { GOOGLE_CLIENT_ID, GOOGLE_SCOPES } from '../constants/google-auth.constant';
import {
  GoogleUserProfile,
  GoogleTokenResponse,
  GoogleAuthError,
  GoogleTokenClient,
  GoogleNamespace,
} from '../models/google-auth.model';

declare const google: GoogleNamespace | undefined;

const STORAGE_KEY_GOOGLE_USER = 'bleepsync_google_user_v1';

@Injectable({
  providedIn: 'root',
})
export class GoogleAuthService {
  private tokenClient: GoogleTokenClient | null = null;

  // Signals
  readonly isScriptLoaded = signal<boolean>(false);
  readonly isAuthenticating = signal<boolean>(false);
  readonly accessToken = signal<string | null>(null);
  readonly tokenExpiresAt = signal<number | null>(null);
  readonly userProfile = signal<GoogleUserProfile | null>(null);
  readonly isConnected = signal<boolean>(false);

  constructor() {
    this.restoreCachedSession();
    this.waitForGisScript();
  }

  /**
   * Restore previous user identity from localStorage
   */
  private restoreCachedSession(): void {
    if (typeof localStorage === 'undefined') return;
    try {
      const cached = localStorage.getItem(STORAGE_KEY_GOOGLE_USER);
      if (cached) {
        const profile: GoogleUserProfile = JSON.parse(cached);
        this.userProfile.set(profile);
        this.isConnected.set(true);
      }
    } catch (e: unknown) {
      console.warn('Failed to restore cached Google user session:', e);
    }
  }

  /**
   * Check when GIS script is ready in window
   */
  private waitForGisScript(retries = 25): void {
    if (typeof window === 'undefined') return;

    if (typeof google !== 'undefined' && google?.accounts?.oauth2) {
      this.isScriptLoaded.set(true);
      return;
    }

    if (retries > 0) {
      setTimeout(() => this.waitForGisScript(retries - 1), 200);
    } else {
      console.warn('Google Identity Services script did not load in time.');
    }
  }

  /**
   * Request user login and consent via GIS popup
   */
  async login(): Promise<string> {
    if (typeof google === 'undefined' || !google?.accounts?.oauth2) {
      throw new Error('Google Identity Services aún no ha terminado de cargar. Revisa tu conexión.');
    }

    this.isAuthenticating.set(true);

    return new Promise<string>((resolve, reject) => {
      try {
        const oauth2 = google.accounts!.oauth2!;
        this.tokenClient = oauth2.initTokenClient({
          client_id: GOOGLE_CLIENT_ID,
          scope: GOOGLE_SCOPES,
          callback: async (resp: GoogleTokenResponse) => {
            this.isAuthenticating.set(false);
            if (resp.error) {
              console.error('Google OAuth error:', resp);
              reject(new Error(resp.error_description || resp.error || 'Error al autorizar con Google'));
              return;
            }

            const token: string = resp.access_token;
            const expiresIn = Number(resp.expires_in) || 3599;
            const expiresAt = Date.now() + (expiresIn - 60) * 1000;

            this.accessToken.set(token);
            this.tokenExpiresAt.set(expiresAt);

            // Fetch user profile info
            try {
              const profile = await this.fetchUserProfile(token);
              this.userProfile.set(profile);
              this.isConnected.set(true);
              if (typeof localStorage !== 'undefined') {
                localStorage.setItem(STORAGE_KEY_GOOGLE_USER, JSON.stringify(profile));
              }
            } catch (err: unknown) {
              console.warn('Could not fetch user profile details:', err);
              this.isConnected.set(true);
            }

            resolve(token);
          },
          error_callback: (err: GoogleAuthError) => {
            this.isAuthenticating.set(false);
            console.error('GIS Error Callback:', err);
            reject(new Error(err?.message || 'Ventana de inicio de sesión cerrada'));
          },
        });

        // Open Google popup
        this.tokenClient.requestAccessToken({ prompt: this.isConnected() ? '' : 'consent' });
      } catch (err: unknown) {
        this.isAuthenticating.set(false);
        const error = err instanceof Error ? err : new Error(String(err));
        reject(error);
      }
    });
  }

  /**
   * Fetch user info from Google's OpenID / userinfo endpoint
   */
  private async fetchUserProfile(token: string): Promise<GoogleUserProfile> {
    const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch userinfo: ${res.status}`);
    }

    const data = (await res.json()) as { email: string; name?: string; given_name?: string; picture?: string };
    return {
      email: data.email,
      name: data.name || data.given_name || 'Doctor/a',
      picture: data.picture,
    };
  }

  /**
   * Get an active, non-expired access token (or prompt to refresh)
   */
  async getValidToken(): Promise<string> {
    const currentToken = this.accessToken();
    const expiresAt = this.tokenExpiresAt();

    if (currentToken && expiresAt && Date.now() < expiresAt) {
      return currentToken;
    }

    // Token is expired or not loaded in memory; re-request via login
    return await this.login();
  }

  /**
   * Disconnect account and revoke token
   */
  logout(): void {
    const token = this.accessToken();
    if (token && typeof google !== 'undefined' && google?.accounts?.oauth2?.revoke) {
      try {
        google.accounts.oauth2.revoke(token, () => {
          // Token revoked on Google servers
        });
      } catch (err: unknown) {
        console.warn('Failed to revoke Google token:', err);
      }
    }

    this.accessToken.set(null);
    this.tokenExpiresAt.set(null);
    this.userProfile.set(null);
    this.isConnected.set(false);

    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY_GOOGLE_USER);
      localStorage.removeItem('bleepsync_google_sheet_id_v1');
    }
  }
}
