// Account state shared across the app: who is signed in, what the backend
// has enabled (Google / email / billing), and the one global AuthModal.
//
// `status` goes "loading" -> "ready" exactly once, after /api/auth/config and
// /api/auth/me have both answered (or failed). The AdSense gate in App.tsx
// waits for "ready" so a premium user never sees ads flash in before their
// session is known. When the backend has accounts disabled (no SESSION_SECRET)
// `config.enabled` is false and every account affordance stays hidden - the
// site then looks exactly as it did before accounts existed.

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  deleteAccount as apiDeleteAccount,
  fetchAuthConfig,
  fetchMe,
  login as apiLogin,
  loginWithGoogle as apiLoginWithGoogle,
  logout as apiLogout,
  signup as apiSignup,
} from "@/lib/api";
import { googleSignOut } from "@/lib/googleIdentity";
import type { AuthConfig, AuthUser } from "@/types/api";

export type AuthStatus = "loading" | "ready";
export type AuthModalMode = "signin" | "signup";

const DISABLED_CONFIG: AuthConfig = {
  enabled: false,
  google_client_id: null,
  email_password: false,
  password_reset: false,
  billing: false,
  plans: [],
  free_chart_limit: 10,
  premium_chart_limit: 200,
};

interface AuthContextValue {
  status: AuthStatus;
  config: AuthConfig;
  user: AuthUser | null;
  /** True once config says accounts are on - the only flag UI should gate on. */
  enabled: boolean;
  isPremium: boolean;
  modal: { open: boolean; mode: AuthModalMode; reason: string | null };
  openAuthModal: (mode?: AuthModalMode, reason?: string) => void;
  closeAuthModal: () => void;
  signIn: (email: string, password: string) => Promise<AuthUser>;
  signUp: (email: string, password: string, name?: string) => Promise<AuthUser>;
  signInWithGoogle: (credential: string) => Promise<AuthUser>;
  signOut: () => Promise<void>;
  deleteAccount: () => Promise<void>;
  /** Re-read /auth/me (after a Stripe redirect, password change, ...). */
  refresh: () => Promise<void>;
  /** Replace the cached user (endpoints that return the updated row). */
  setUser: (u: AuthUser | null) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>("loading");
  const [config, setConfig] = useState<AuthConfig>(DISABLED_CONFIG);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [modal, setModal] = useState<AuthContextValue["modal"]>({
    open: false,
    mode: "signin",
    reason: null,
  });
  const booted = useRef(false);

  useEffect(() => {
    if (booted.current) return;
    booted.current = true;
    (async () => {
      try {
        const cfg = await fetchAuthConfig();
        setConfig(cfg);
        if (cfg.enabled) {
          const me = await fetchMe();
          setUser(me.user);
        }
      } catch {
        // Backend unreachable or accounts off: behave as a public site.
        setConfig(DISABLED_CONFIG);
        setUser(null);
      } finally {
        setStatus("ready");
      }
    })();
  }, []);

  const refresh = useCallback(async () => {
    try {
      const me = await fetchMe();
      setUser(me.user);
    } catch {
      /* keep what we have */
    }
  }, []);

  const openAuthModal = useCallback((mode: AuthModalMode = "signin", reason?: string) => {
    setModal({ open: true, mode, reason: reason ?? null });
  }, []);
  const closeAuthModal = useCallback(() => setModal((m) => ({ ...m, open: false })), []);

  const signIn = useCallback(async (email: string, password: string) => {
    const { user: u } = await apiLogin(email, password);
    setUser(u);
    return u;
  }, []);
  const signUp = useCallback(async (email: string, password: string, name?: string) => {
    const { user: u } = await apiSignup(email, password, name);
    setUser(u);
    return u;
  }, []);
  const signInWithGoogle = useCallback(async (credential: string) => {
    const { user: u } = await apiLoginWithGoogle(credential);
    setUser(u);
    return u;
  }, []);
  const signOut = useCallback(async () => {
    try {
      await apiLogout();
    } finally {
      googleSignOut();
      setUser(null);
    }
  }, []);
  const deleteAccount = useCallback(async () => {
    await apiDeleteAccount();
    googleSignOut();
    setUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      status,
      config,
      user,
      enabled: config.enabled,
      isPremium: !!user?.is_premium,
      modal,
      openAuthModal,
      closeAuthModal,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      deleteAccount,
      refresh,
      setUser,
    }),
    [
      status,
      config,
      user,
      modal,
      openAuthModal,
      closeAuthModal,
      signIn,
      signUp,
      signInWithGoogle,
      signOut,
      deleteAccount,
      refresh,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}

// Known backend error codes -> i18n keys. Anything else falls back to a
// generic message so a new backend code never shows raw snake_case to users.
const ERROR_KEYS: Record<string, string> = {
  invalid_credentials: "auth_error_invalid_credentials",
  email_exists: "auth_error_email_exists",
  invalid_email: "auth_error_invalid_email",
  password_too_short: "auth_error_password_too_short",
  rate_limited: "auth_error_rate_limited",
  google_token_invalid: "auth_error_google",
  google_disabled: "auth_error_google",
  accounts_disabled: "auth_error_disabled",
  not_signed_in: "auth_error_not_signed_in",
  reset_token_invalid: "auth_error_reset_token",
  reset_disabled: "auth_error_reset_disabled",
  chart_limit_reached: "saved_limit_reached",
  billing_disabled: "acct_billing_unavailable",
  already_premium: "acct_already_premium",
};

export function authErrorKey(err: unknown): string {
  const code = (err as { code?: string } | null)?.code;
  return (code && ERROR_KEYS[code]) || "auth_error_generic";
}
