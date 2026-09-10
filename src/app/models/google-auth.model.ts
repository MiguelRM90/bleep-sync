/**
 * BleepSync - Google Identity Services (GIS) & OAuth Domain Models
 */

export interface GoogleUserProfile {
  email: string;
  name?: string;
  picture?: string;
}

export interface GoogleTokenResponse {
  access_token: string;
  expires_in?: number | string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
  error_uri?: string;
}

export interface GoogleAuthError {
  type?: string;
  message?: string;
}

export interface GoogleTokenClientConfig {
  client_id: string;
  scope: string;
  callback: (response: GoogleTokenResponse) => void | Promise<void>;
  error_callback?: (error: GoogleAuthError) => void;
  prompt?: string;
}

export interface GoogleTokenClient {
  requestAccessToken(overrideConfig?: { prompt?: string }): void;
}

export interface GoogleAccountsOAuth2 {
  initTokenClient(config: GoogleTokenClientConfig): GoogleTokenClient;
  revoke(token: string, done?: () => void): void;
}

export interface GoogleNamespace {
  accounts?: {
    oauth2?: GoogleAccountsOAuth2;
  };
}

