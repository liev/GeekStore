import { create } from 'zustand';
import { jwtDecode } from 'jwt-decode';

const TOKEN_KEY = 'goblinspot_token';

interface JwtPayload {
  sub: string;
  email: string;
  'http://schemas.microsoft.com/ws/2008/06/identity/claims/role': string;
  exp: number;
}

/**
 * Centralised authentication state.
 *
 * Replaces the scattered `localStorage.getItem('goblinspot_token')` /
 * `jwtDecode` calls that were duplicated across Dashboard, AdminPanel,
 * MyPurchases, Catalog, and Profile.
 */
export interface AuthState {
  /** JWT token string, or null when unauthenticated. */
  token: string | null;
  /** Decoded user ID from the JWT (numeric). */
  userId: number | null;
  /** Decoded email from the JWT. */
  email: string | null;
  /** Decoded role (Admin, Seller, Buyer, Forastero, etc.). */
  role: string | null;
  /** Whether the token is non-null and not expired. */
  isAuthenticated: boolean;

  /** Hydrate state from localStorage on first load. */
  hydrate: () => void;
  /** Set a new token after login, decoding it immediately. */
  setToken: (token: string) => void;
  /** Clear auth state (logout / expired). */
  logout: () => void;
}

/**
 * Decodes a JWT and extracts the fields we care about.
 * Returns null if the token is invalid or expired.
 */
function decodeToken(token: string): { userId: number; email: string; role: string } | null {
  try {
    const decoded = jwtDecode<JwtPayload>(token);
    if (decoded.exp * 1000 < Date.now()) return null; // expired
    return {
      userId: parseInt(decoded.sub, 10),
      email: decoded.email,
      role: decoded['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'],
    };
  } catch {
    return null;
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  userId: null,
  email: null,
  role: null,
  isAuthenticated: false,

  hydrate: () => {
    const stored = localStorage.getItem(TOKEN_KEY);
    if (!stored) return;
    const decoded = decodeToken(stored);
    if (!decoded) {
      localStorage.removeItem(TOKEN_KEY);
      return;
    }
    set({
      token: stored,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      isAuthenticated: true,
    });
  },

  setToken: (token: string) => {
    const decoded = decodeToken(token);
    if (!decoded) return;
    localStorage.setItem(TOKEN_KEY, token);
    set({
      token,
      userId: decoded.userId,
      email: decoded.email,
      role: decoded.role,
      isAuthenticated: true,
    });
  },

  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({
      token: null,
      userId: null,
      email: null,
      role: null,
      isAuthenticated: false,
    });
  },
}));
