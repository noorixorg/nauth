import {
  createContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {
  NAuthClient,
  type AuthUser,
  type AuthResponse,
  type ChallengeResponse,
  type SignupRequest,
} from '@nauth-toolkit/client';
import authConfig from '../config/auth.config';
import { RefreshingFetchAdapter } from '../lib/authHttpAdapter';

// ─── Context shape ────────────────────────────────────────────────────────────

export interface AuthContextValue {
  /** Currently authenticated user, or null if not logged in. */
  user: AuthUser | null;
  /** Pending auth challenge (e.g. VERIFY_EMAIL after signup). */
  challenge: AuthResponse | null;
  /** True while the SDK is hydrating state from storage on startup. */
  isLoading: boolean;
  isAuthenticated: boolean;

  // Auth operations — each returns the raw AuthResponse so the caller
  // can inspect challengeName and navigate accordingly.
  login: (email: string, password: string) => Promise<AuthResponse>;
  signup: (data: SignupRequest) => Promise<AuthResponse>;
  logout: () => Promise<void>;
  respondToChallenge: (response: ChallengeResponse) => Promise<AuthResponse>;
  resendCode: (session: string) => Promise<{ destination: string }>;

  // Social
  loginWithGoogle: () => Promise<void>;
  /** Call this on the /auth/callback page after the OAuth redirect. */
  handleOAuthCallback: () => Promise<AuthUser | null>;
}

export const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [challenge, setChallenge] = useState<AuthResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Create the adapter and client once — refs prevent re-creation on re-renders
  // or React StrictMode double-invocations.
  //
  // The adapter is created first (it has no dependency on the client), then the
  // client is created with the adapter, and finally we call setClient() to break
  // the circular dependency. This gives all SDK requests (including getProfile())
  // automatic 401 → token refresh → retry behaviour.
  const adapterRef = useRef<RefreshingFetchAdapter | null>(null);
  const clientRef = useRef<NAuthClient | null>(null);
  if (!adapterRef.current) {
    adapterRef.current = new RefreshingFetchAdapter();
  }
  const adapter = adapterRef.current;
  if (!clientRef.current) {
    clientRef.current = new NAuthClient({ ...authConfig, httpAdapter: adapter });
    adapter.setClient(clientRef.current);
  }
  const client = clientRef.current;

  useEffect(() => {
    let mounted = true;

    // Subscribe to SDK events so React state stays in sync.
    // NOTE: The event shape is { type, data, timestamp } — event.data is the AuthResponse.
    // client.getCurrentUser() is used for auth:success because the SDK has already called
    // setUser() internally before emitting the event, so currentUser is guaranteed to be set.
    const unsubSuccess = client.on('auth:success', () => {
      if (!mounted) return;
      setChallenge(null);
      client.getProfile().then(
        (profile) => {
          if (mounted) setUser(profile);
        },
        () => {
          if (mounted) setUser(client.getCurrentUser());
        }
      );
    });

    const unsubChallenge = client.on('auth:challenge', (event) => {
      if (!mounted) return;
      setChallenge((event.data as AuthResponse) ?? null);
    });

    const unsubLogout = client.on('auth:logout', () => {
      if (!mounted) return;
      setUser(null);
      setChallenge(null);
    });

    const unsubExpired = client.on('auth:session_expired', () => {
      if (!mounted) return;
      setUser(null);
      setChallenge(null);
    });

    // Hydrate from local storage (restores user + tokens from a previous session).
    (async () => {
      await client.initialize();
      if (!mounted) return;
      const current = client.getCurrentUser();
      if (current) {
        try {
          const profile = await client.getProfile();
          if (mounted) setUser(profile);
        } catch {
          if (mounted) setUser(current);
        }
      } else {
        setUser(null);
      }
      if (!mounted) return;
      const storedChallenge = await client.getStoredChallenge();
      if (!mounted) return;
      setChallenge(storedChallenge);
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
      unsubSuccess();
      unsubChallenge();
      unsubLogout();
      unsubExpired();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Auth operations ─────────────────────────────────────────────────────

  const login = (email: string, password: string) =>
    client.login(email, password);

  const signup = (data: SignupRequest) => client.signup(data);

  const logout = () => client.logout();

  const respondToChallenge = (response: ChallengeResponse) =>
    client.respondToChallenge(response);

  const resendCode = (session: string) => client.resendCode(session);

  const loginWithGoogle = () =>
    client.loginWithSocial('google', {
      // Pass the full URL so the backend redirects back to whichever port this
      // app is running on. Requires allowAbsoluteReturnTo: true on the backend.
      returnTo: `${window.location.origin}/auth/callback`,
      oauthParams: { prompt: 'select_account' },
    });

  /**
   * Completes the OAuth redirect flow on /auth/callback.
   *
   * Cookie mode: backend already set auth cookies; we just fetch the profile.
   * JSON mode:   backend embeds an exchangeToken in the redirect URL query
   *              params; we exchange it for tokens.
   */
  const handleOAuthCallback = async (): Promise<AuthUser | null> => {
    const params = new URLSearchParams(window.location.search);
    const error = params.get('error');
    if (error) return null;

    const exchangeToken = params.get('exchangeToken');

    if (exchangeToken) {
      // JSON token delivery mode — fetch full profile after exchange
      await client.exchangeSocialRedirect(exchangeToken);
      const profileUser = await client.getProfile();
      setUser(profileUser);
      return profileUser;
    } else {
      // Cookie mode — cookies are already set by the backend; fetch profile
      const profileUser = await client.getProfile();
      setUser(profileUser);
      return profileUser;
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        challenge,
        isLoading,
        isAuthenticated: !!user,
        login,
        signup,
        logout,
        respondToChallenge,
        resendCode,
        loginWithGoogle,
        handleOAuthCallback,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
