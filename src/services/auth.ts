/**
 * Authentication Service - Story 6-4
 * Manages JWT tokens and session state
 */

const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:3001/api';

interface AuthTokens {
  token: string;
  refreshToken: string;
  expiresIn: number;
  userId: string;
}

class AuthService {
  private token: string | null = null;
  private refreshToken: string | null = null;
  private userId: string | null = null;
  private refreshTimeout: number | null = null;

  constructor() {
    // Try to restore session from memory (not localStorage for security)
    // In a real app, we'd use httpOnly cookies
  }

  /**
   * Create a new session
   */
  async createSession(userId?: string): Promise<AuthTokens | null> {
    try {
      const response = await fetch(`${API_BASE}/auth/session`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: userId || 'anonymous' }),
      });

      if (!response.ok) {
        throw new Error('Failed to create session');
      }

      const tokens: AuthTokens = await response.json();
      this.setTokens(tokens);
      this.scheduleRefresh(tokens.expiresIn);

      return tokens;
    } catch (error) {
      console.error('[AUTH] Session creation failed:', error);
      return null;
    }
  }

  /**
   * Refresh the current session
   */
  async refreshSession(): Promise<boolean> {
    if (!this.refreshToken) {
      return false;
    }

    try {
      const response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken: this.refreshToken }),
      });

      if (!response.ok) {
        throw new Error('Failed to refresh session');
      }

      const data = await response.json();
      this.token = data.token;
      this.scheduleRefresh(data.expiresIn);

      return true;
    } catch (error) {
      console.error('[AUTH] Session refresh failed:', error);
      this.clearTokens();
      return false;
    }
  }

  /**
   * Logout and invalidate session
   */
  async logout(): Promise<void> {
    try {
      if (this.token) {
        await fetch(`${API_BASE}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.token}`,
          },
        });
      }
    } catch (error) {
      console.error('[AUTH] Logout failed:', error);
    } finally {
      this.clearTokens();
    }
  }

  /**
   * Get current access token
   */
  getToken(): string | null {
    return this.token;
  }

  /**
   * Get current user ID
   */
  getUserId(): string | null {
    return this.userId;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.token;
  }

  /**
   * Get CSRF token
   */
  async getCsrfToken(): Promise<string | null> {
    try {
      const response = await fetch(`${API_BASE}/auth/csrf-token`);
      if (!response.ok) {
        throw new Error('Failed to get CSRF token');
      }
      const data = await response.json();
      return data.csrfToken;
    } catch (error) {
      console.error('[AUTH] CSRF token fetch failed:', error);
      return null;
    }
  }

  /**
   * Make authenticated API request
   */
  async fetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers = new Headers(options.headers || {});

    // Add authorization header
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    // Add CSRF token for state-changing requests
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(options.method?.toUpperCase() || 'GET')) {
      const csrfToken = await this.getCsrfToken();
      if (csrfToken) {
        headers.set('X-CSRF-Token', csrfToken);
      }
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    // Handle 401 by attempting to refresh
    if (response.status === 401 && this.refreshToken) {
      const refreshed = await this.refreshSession();
      if (refreshed) {
        // Retry the request with new token
        headers.set('Authorization', `Bearer ${this.token}`);
        return fetch(url, { ...options, headers });
      }
    }

    return response;
  }

  /**
   * Set tokens and user info
   */
  private setTokens(tokens: AuthTokens): void {
    this.token = tokens.token;
    this.refreshToken = tokens.refreshToken;
    this.userId = tokens.userId;
  }

  /**
   * Clear tokens
   */
  private clearTokens(): void {
    this.token = null;
    this.refreshToken = null;
    this.userId = null;
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
      this.refreshTimeout = null;
    }
  }

  /**
   * Schedule automatic token refresh
   */
  private scheduleRefresh(expiresIn: number): void {
    if (this.refreshTimeout) {
      clearTimeout(this.refreshTimeout);
    }

    // Refresh 5 minutes before expiry
    const refreshTime = (expiresIn - 300) * 1000;
    if (refreshTime > 0) {
      this.refreshTimeout = window.setTimeout(() => {
        this.refreshSession();
      }, refreshTime);
    }
  }
}

// Export singleton instance
export const authService = new AuthService();

// Helper function for making authenticated requests
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  return authService.fetch(url, options);
}
