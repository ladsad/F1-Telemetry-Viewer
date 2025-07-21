import { OpenF1Service } from './openf1';

// Authentication types
export type AuthMethod = 'none' | 'api-key' | 'oauth2' | 'bearer';

export interface AuthConfig {
  method: AuthMethod;
  apiKey?: string;
  clientId?: string;
  clientSecret?: string;
  redirectUri?: string;
  scopes?: string[];
  baseUrl?: string;
}

export interface TokenData {
  access_token: string;
  refresh_token?: string;
  token_type: string;
  expires_in: number;
  expires_at: number; // Unix timestamp
  scope?: string;
}

export interface AuthUser {
  id: string;
  username?: string;
  email?: string;
  permissions?: string[];
}

export interface AuthState {
  isAuthenticated: boolean;
  user: AuthUser | null;
  token: TokenData | null;
  loading: boolean;
  error: string | null;
}

// Custom errors
export class AuthError extends Error {
  constructor(
    message: string,
    public code: string,
    public status?: number
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export class TokenExpiredError extends AuthError {
  constructor() {
    super('Token has expired', 'TOKEN_EXPIRED', 401);
  }
}

export class RefreshFailedError extends AuthError {
  constructor(message: string) {
    super(`Token refresh failed: ${message}`, 'REFRESH_FAILED', 401);
  }
}

/**
 * Comprehensive Authentication Manager for OpenF1 API
 * Supports multiple authentication methods including OAuth2, API keys, and bearer tokens
 */
export class OpenF1AuthManager {
  private config: AuthConfig;
  private tokenData: TokenData | null = null;
  private refreshPromise: Promise<TokenData> | null = null;
  private refreshTimeout: NodeJS.Timeout | null = null;
  private listeners: Array<(state: AuthState) => void> = [];
  
  // Storage keys
  private readonly TOKEN_STORAGE_KEY = 'openf1_token';
  private readonly USER_STORAGE_KEY = 'openf1_user';
  private readonly CONFIG_STORAGE_KEY = 'openf1_auth_config';

  constructor(config: AuthConfig) {
    this.config = config;
    this.loadStoredAuth();
    this.setupTokenRefresh();
  }

  /**
   * Initialize authentication based on configured method
   */
  async initialize(): Promise<AuthState> {
    try {
      // Try to use stored token first
      if (this.tokenData && this.isTokenValid()) {
        return this.getAuthState();
      }

      // Handle different auth methods
      switch (this.config.method) {
        case 'none':
          return this.getAuthState();
          
        case 'api-key':
          if (!this.config.apiKey) {
            throw new AuthError('API key not provided', 'MISSING_API_KEY');
          }
          return this.authenticateWithApiKey();
          
        case 'oauth2':
          return this.handleOAuth2Flow();
          
        case 'bearer':
          if (!this.tokenData) {
            throw new AuthError('Bearer token not available', 'MISSING_BEARER_TOKEN');
          }
          return this.getAuthState();
          
        default:
          throw new AuthError('Unsupported authentication method', 'UNSUPPORTED_METHOD');
      }
    } catch (error) {
      console.error('Auth initialization failed:', error);
      return {
        isAuthenticated: false,
        user: null,
        token: null,
        loading: false,
        error: error instanceof Error ? error.message : 'Authentication failed'
      };
    }
  }

  /**
   * API Key Authentication
   */
  private async authenticateWithApiKey(): Promise<AuthState> {
    if (!this.config.apiKey) {
      throw new AuthError('API key not configured', 'MISSING_API_KEY');
    }

    // For OpenF1, API key might just be stored and used in headers
    // Since OpenF1 is currently free, this might be a placeholder for future auth
    const tokenData: TokenData = {
      access_token: this.config.apiKey,
      token_type: 'api-key',
      expires_in: Number.MAX_SAFE_INTEGER,
      expires_at: Number.MAX_SAFE_INTEGER
    };

    this.setToken(tokenData);
    
    // Try to validate the API key
    try {
      await this.validateToken();
      return this.getAuthState();
    } catch (error) {
      this.clearAuth();
      throw new AuthError('Invalid API key', 'INVALID_API_KEY');
    }
  }

  /**
   * OAuth2 Authentication Flow
   */
  private async handleOAuth2Flow(): Promise<AuthState> {
    // Check if we're returning from OAuth redirect
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const error = urlParams.get('error');

    if (error) {
      throw new AuthError(`OAuth2 error: ${error}`, 'OAUTH_ERROR');
    }

    if (code) {
      // Exchange code for token
      return this.exchangeCodeForToken(code);
    }

    // Check for stored valid token
    if (this.tokenData && this.isTokenValid()) {
      return this.getAuthState();
    }

    // Redirect to OAuth provider
    this.redirectToOAuthProvider();
    
    return {
      isAuthenticated: false,
      user: null,
      token: null,
      loading: true,
      error: null
    };
  }

  /**
   * Redirect to OAuth2 authorization endpoint
   */
  private redirectToOAuthProvider(): void {
    if (!this.config.clientId || !this.config.redirectUri) {
      throw new AuthError('OAuth2 configuration incomplete', 'OAUTH_CONFIG_INCOMPLETE');
    }

    const params = new URLSearchParams({
      response_type: 'code',
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      scope: this.config.scopes?.join(' ') || 'read',
      state: this.generateState()
    });

    const authUrl = `${this.config.baseUrl || 'https://api.openf1.org'}/oauth/authorize?${params}`;
    window.location.href = authUrl;
  }

  /**
   * Exchange authorization code for access token
   */
  private async exchangeCodeForToken(code: string): Promise<AuthState> {
    if (!this.config.clientId || !this.config.clientSecret || !this.config.redirectUri) {
      throw new AuthError('OAuth2 configuration incomplete', 'OAUTH_CONFIG_INCOMPLETE');
    }

    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openf1.org'}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'authorization_code',
          code,
          redirect_uri: this.config.redirectUri
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new AuthError(
          errorData.error_description || 'Token exchange failed',
          'TOKEN_EXCHANGE_FAILED',
          response.status
        );
      }

      const tokenData = await response.json();
      const processedToken = this.processTokenResponse(tokenData);
      
      this.setToken(processedToken);
      
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
      
      // Fetch user profile
      await this.fetchUserProfile();
      
      return this.getAuthState();
    } catch (error) {
      console.error('Token exchange failed:', error);
      throw error instanceof AuthError ? error : new AuthError('Token exchange failed', 'TOKEN_EXCHANGE_FAILED');
    }
  }

  /**
   * Process token response and add expiration timestamp
   */
  private processTokenResponse(tokenResponse: any): TokenData {
    const now = Date.now();
    return {
      access_token: tokenResponse.access_token,
      refresh_token: tokenResponse.refresh_token,
      token_type: tokenResponse.token_type || 'Bearer',
      expires_in: tokenResponse.expires_in || 3600,
      expires_at: now + (tokenResponse.expires_in || 3600) * 1000,
      scope: tokenResponse.scope
    };
  }

  /**
   * Refresh access token using refresh token
   */
  async refreshToken(): Promise<TokenData> {
    // Prevent multiple concurrent refresh attempts
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    if (!this.tokenData?.refresh_token) {
      throw new RefreshFailedError('No refresh token available');
    }

    this.refreshPromise = this.performTokenRefresh();
    
    try {
      const newToken = await this.refreshPromise;
      this.refreshPromise = null;
      return newToken;
    } catch (error) {
      this.refreshPromise = null;
      throw error;
    }
  }

  /**
   * Perform the actual token refresh
   */
  private async performTokenRefresh(): Promise<TokenData> {
    if (!this.config.clientId || !this.config.clientSecret) {
      throw new RefreshFailedError('Client credentials not configured');
    }

    if (!this.tokenData?.refresh_token) {
      throw new RefreshFailedError('No refresh token available');
    }

    try {
      const response = await fetch(`${this.config.baseUrl || 'https://api.openf1.org'}/oauth/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          refresh_token: this.tokenData.refresh_token
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new RefreshFailedError(errorData.error_description || `HTTP ${response.status}`);
      }

      const tokenData = await response.json();
      const processedToken = this.processTokenResponse(tokenData);
      
      // Preserve refresh token if not provided in response
      if (!processedToken.refresh_token && this.tokenData.refresh_token) {
        processedToken.refresh_token = this.tokenData.refresh_token;
      }
      
      this.setToken(processedToken);
      this.notifyListeners();
      
      return processedToken;
    } catch (error) {
      console.error('Token refresh failed:', error);
      
      // If refresh fails, clear auth and require re-login
      this.clearAuth();
      
      throw error instanceof RefreshFailedError ? error : new RefreshFailedError('Network error');
    }
  }

  /**
   * Validate current token by making a test API call
   */
  private async validateToken(): Promise<boolean> {
    if (!this.tokenData) {
      return false;
    }

    try {
      // Create a temporary OpenF1Service instance for validation
      const testService = new OpenF1Service(this.config.baseUrl || 'https://api.openf1.org/v1');
      testService.setToken(this.tokenData.access_token);
      
      // Make a simple API call to validate the token
      await testService.getSessions(2024, 1);
      return true;
    } catch (error) {
      console.error('Token validation failed:', error);
      return false;
    }
  }

  /**
   * Fetch user profile information
   */
  private async fetchUserProfile(): Promise<void> {
    if (!this.tokenData) {
      return;
    }

    try {
      // OpenF1 might not have a user profile endpoint
      // This is a placeholder for when such functionality is available
      const response = await fetch(`${this.config.baseUrl || 'https://api.openf1.org'}/v1/profile`, {
        headers: {
          'Authorization': `${this.tokenData.token_type} ${this.tokenData.access_token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        const user: AuthUser = {
          id: userData.id || 'anonymous',
          username: userData.username,
          email: userData.email,
          permissions: userData.permissions || []
        };
        
        this.setUser(user);
      }
    } catch (error) {
      console.warn('Failed to fetch user profile:', error);
      // Set anonymous user
      this.setUser({
        id: 'anonymous',
        permissions: ['read']
      });
    }
  }

  /**
   * Set token and update storage
   */
  setToken(token: TokenData): void {
    this.tokenData = token;
    this.storeToken(token);
    this.setupTokenRefresh();
    this.notifyListeners();
  }

  /**
   * Set user and update storage
   */
  private setUser(user: AuthUser): void {
    try {
      localStorage.setItem(this.USER_STORAGE_KEY, JSON.stringify(user));
    } catch (error) {
      console.warn('Failed to store user data:', error);
    }
  }

  /**
   * Get current authentication headers
   */
  getAuthHeaders(): Record<string, string> {
    if (!this.tokenData) {
      return {};
    }

    switch (this.config.method) {
      case 'api-key':
        return { 'X-API-Key': this.tokenData.access_token };
      case 'oauth2':
      case 'bearer':
        return { 'Authorization': `${this.tokenData.token_type} ${this.tokenData.access_token}` };
      default:
        return {};
    }
  }

  /**
   * Check if token is valid and not expired
   */
  isTokenValid(): boolean {
    if (!this.tokenData) {
      return false;
    }

    // Check if token is expired (with 5 minute buffer)
    const expirationBuffer = 5 * 60 * 1000; // 5 minutes
    return this.tokenData.expires_at > (Date.now() + expirationBuffer);
  }

  /**
   * Get current authentication state
   */
  getAuthState(): AuthState {
    const user = this.getStoredUser();
    return {
      isAuthenticated: this.isAuthenticated(),
      user,
      token: this.tokenData,
      loading: false,
      error: null
    };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return this.config.method === 'none' || (this.tokenData !== null && this.isTokenValid());
  }

  /**
   * Logout and clear all auth data
   */
  async logout(): Promise<void> {
    // If OAuth2, try to revoke token
    if (this.config.method === 'oauth2' && this.tokenData) {
      try {
        await this.revokeToken();
      } catch (error) {
        console.warn('Failed to revoke token:', error);
      }
    }

    this.clearAuth();
    this.notifyListeners();
  }

  /**
   * Revoke OAuth2 token
   */
  private async revokeToken(): Promise<void> {
    if (!this.tokenData || !this.config.clientId || !this.config.clientSecret) {
      return;
    }

    await fetch(`${this.config.baseUrl || 'https://api.openf1.org'}/oauth/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': `Basic ${btoa(`${this.config.clientId}:${this.config.clientSecret}`)}`
      },
      body: new URLSearchParams({
        token: this.tokenData.access_token,
        token_type_hint: 'access_token'
      })
    });
  }

  /**
   * Clear all authentication data
   */
  private clearAuth(): void {
    this.tokenData = null;
    
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }

    try {
      localStorage.removeItem(this.TOKEN_STORAGE_KEY);
      localStorage.removeItem(this.USER_STORAGE_KEY);
    } catch (error) {
      console.warn('Failed to clear stored auth data:', error);
    }
  }

  /**
   * Load stored authentication data
   */
  private loadStoredAuth(): void {
    try {
      const storedToken = localStorage.getItem(this.TOKEN_STORAGE_KEY);
      if (storedToken) {
        this.tokenData = JSON.parse(storedToken);
      }
    } catch (error) {
      console.warn('Failed to load stored auth data:', error);
      this.clearAuth();
    }
  }

  /**
   * Store token in localStorage
   */
  private storeToken(token: TokenData): void {
    try {
      localStorage.setItem(this.TOKEN_STORAGE_KEY, JSON.stringify(token));
    } catch (error) {
      console.warn('Failed to store token:', error);
    }
  }

  /**
   * Get stored user data
   */
  private getStoredUser(): AuthUser | null {
    try {
      const storedUser = localStorage.getItem(this.USER_STORAGE_KEY);
      return storedUser ? JSON.parse(storedUser) : null;
    } catch (error) {
      console.warn('Failed to load stored user data:', error);
      return null;
    }
  }

  /**
   * Setup automatic token refresh
   */
  private setupTokenRefresh(): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    if (!this.tokenData || this.config.method !== 'oauth2' || !this.tokenData.refresh_token) {
      return;
    }

    // Schedule refresh 5 minutes before expiration
    const refreshTime = this.tokenData.expires_at - Date.now() - (5 * 60 * 1000);
    
    if (refreshTime > 0) {
      this.refreshTimeout = setTimeout(() => {
        this.refreshToken().catch(error => {
          console.error('Automatic token refresh failed:', error);
          this.notifyListeners();
        });
      }, refreshTime);
    }
  }

  /**
   * Generate random state for OAuth2 CSRF protection
   */
  private generateState(): string {
    return Math.random().toString(36).substring(2, 15) + 
           Math.random().toString(36).substring(2, 15);
  }

  /**
   * Add auth state change listener
   */
  addStateListener(listener: (state: AuthState) => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  /**
   * Notify all listeners of auth state change
   */
  private notifyListeners(): void {
    const state = this.getAuthState();
    this.listeners.forEach(listener => {
      try {
        listener(state);
      } catch (error) {
        console.error('Auth listener error:', error);
      }
    });
  }

  /**
   * Update configuration
   */
  updateConfig(newConfig: Partial<AuthConfig>): void {
    this.config = { ...this.config, ...newConfig };
    try {
      localStorage.setItem(this.CONFIG_STORAGE_KEY, JSON.stringify(this.config));
    } catch (error) {
      console.warn('Failed to store config:', error);
    }
  }

  /**
   * Get current configuration
   */
  getConfig(): AuthConfig {
    return { ...this.config };
  }
}

/**
 * Enhanced OpenF1Service with integrated authentication
 */
export class AuthenticatedOpenF1Service extends OpenF1Service {
  private authManager: OpenF1AuthManager;

  constructor(baseUrl: string, authConfig: AuthConfig, rateLimit = { max: 10, intervalMs: 1000 }) {
    super(baseUrl, rateLimit);
    this.authManager = new OpenF1AuthManager(authConfig);
  }

  /**
   * Initialize authentication
   */
  async initialize(): Promise<AuthState> {
    return this.authManager.initialize();
  }

  /**
   * Override request method to include authentication and handle token refresh
   */
  async request<T = any>(endpoint: string, options: any = {}): Promise<T> {
    // Check if token needs refresh
    if (this.authManager.getConfig().method === 'oauth2' && 
        this.authManager.isAuthenticated() && 
        !this.authManager.isTokenValid()) {
      try {
        await this.authManager.refreshToken();
      } catch (error) {
        console.error('Token refresh failed during request:', error);
        throw new TokenExpiredError();
      }
    }

    // Add auth headers
    const authHeaders = this.authManager.getAuthHeaders();
    const requestOptions = {
      ...options,
      headers: {
        ...authHeaders,
        ...(options.headers || {})
      }
    };

    try {
      return await super.request<T>(endpoint, requestOptions);
    } catch (error) {
      // Handle auth errors
      if (error instanceof Error && error.message.includes('401')) {
        throw new TokenExpiredError();
      }
      throw error;
    }
  }

  /**
   * Get authentication manager
   */
  getAuthManager(): OpenF1AuthManager {
    return this.authManager;
  }

  /**
   * Check if authenticated
   */
  isAuthenticated(): boolean {
    return this.authManager.isAuthenticated();
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.authManager.logout();
    this.clearToken();
  }
}

// Factory function for creating configured auth manager
export function createOpenF1Auth(config: AuthConfig): OpenF1AuthManager {
  return new OpenF1AuthManager(config);
}

// Factory function for creating authenticated service
export function createAuthenticatedOpenF1Service(
  baseUrl: string, 
  authConfig: AuthConfig,
  rateLimit?: { max: number; intervalMs: number }
): AuthenticatedOpenF1Service {
  return new AuthenticatedOpenF1Service(baseUrl, authConfig, rateLimit);
}

// Utility functions
export function isTokenExpired(token: TokenData): boolean {
  return token.expires_at <= Date.now();
}

export function getTokenTimeToExpiry(token: TokenData): number {
  return Math.max(0, token.expires_at - Date.now());
}

export function formatTokenExpiry(token: TokenData): string {
  const timeToExpiry = getTokenTimeToExpiry(token);
  if (timeToExpiry === 0) {
    return 'Expired';
  }
  
  const minutes = Math.floor(timeToExpiry / (60 * 1000));
  const hours = Math.floor(minutes / 60);
  
  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  return `${minutes}m`;
}