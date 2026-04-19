import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

const AUTH_BOOTSTRAP_TIMEOUT_MS = 15000;
const AUTH_STORAGE_KEY = import.meta.env.VITE_SUPABASE_PROJECT_ID
  ? `sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`
  : null;

const clearPersistedSession = () => {
  if (typeof window === "undefined" || !AUTH_STORAGE_KEY) return;
  try {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch {
    // ignore
  }
};

const isValidSessionShape = (candidate: unknown): candidate is Session => {
  if (!candidate || typeof candidate !== "object") return false;
  const c = candidate as Record<string, unknown>;
  if (typeof c.access_token !== "string" || !c.access_token) return false;
  const u = c.user as Record<string, unknown> | undefined;
  // Supabase requires `sub` (user.id). Without it, the JWT is corrupt and
  // every /user call returns "invalid claim: missing sub claim" → 403.
  if (!u || typeof u !== "object") return false;
  if (typeof u.id !== "string" || !u.id) return false;
  return true;
};

const readPersistedSession = (): Session | null => {
  if (typeof window === "undefined" || !AUTH_STORAGE_KEY) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;

    const parsed = JSON.parse(raw);
    let candidate: unknown = null;
    if (Array.isArray(parsed)) {
      candidate = parsed.find((entry) => entry && typeof entry === "object" && "access_token" in entry) ?? null;
    } else if (parsed && typeof parsed === "object" && "access_token" in parsed) {
      candidate = parsed;
    }

    if (isValidSessionShape(candidate)) {
      return candidate;
    }

    if (candidate) {
      console.warn("[Auth] Discarding cached session — missing sub/user claims (will force re-auth)");
      clearPersistedSession();
    }
  } catch (error) {
    console.warn("[Auth] Failed to read persisted session cache", error);
    clearPersistedSession();
  }

  return null;
};

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  initialized: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);


export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true;
    let bootstrapResolved = false;
    let bootstrapTimeout: number | null = null;

    const clearBootstrapTimeout = () => {
      if (bootstrapTimeout) {
        window.clearTimeout(bootstrapTimeout);
        bootstrapTimeout = null;
      }
    };

    const applySession = (nextSession: Session | null) => {
      if (!isMounted) return;

      setSession(nextSession);
      setUser(nextSession?.user ?? null);
    };

    const finishBootstrap = (nextSession: Session | null) => {
      if (!isMounted) return;

      bootstrapResolved = true;
      clearBootstrapTimeout();
      applySession(nextSession);
      setInitialized(true);
      setLoading(false);
    };

    const persistedSession = readPersistedSession();
    if (persistedSession) {
      // Render the UI immediately with the cached session so users never
      // see an indefinite "Loading sign in..." spinner while we verify
      // the session in the background.
      applySession(persistedSession);
      setInitialized(true);
      setLoading(false);
    } else {
      // No cached session — surface the auth UI quickly even if the
      // network call is slow, so users can sign in without waiting.
      const FAST_NO_SESSION_MS = 1500;
      window.setTimeout(() => {
        if (!isMounted || bootstrapResolved) return;
        setInitialized(true);
        setLoading(false);
      }, FAST_NO_SESSION_MS);
    }

    bootstrapTimeout = window.setTimeout(() => {
      if (!isMounted) return;

      const fallbackSession = readPersistedSession();
      console.warn("[Auth] Session bootstrap timed out; continuing with cached session fallback", {
        hasCachedSession: !!fallbackSession,
      });
      finishBootstrap(fallbackSession);
    }, AUTH_BOOTSTRAP_TIMEOUT_MS);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, nextSession) => {
      applySession(nextSession ?? readPersistedSession());

      if (bootstrapResolved || event !== "INITIAL_SESSION") {
        clearBootstrapTimeout();
        if (isMounted) {
          setInitialized(true);
          setLoading(false);
        }
      }
    });

    supabase.auth
      .getSession()
      .then(({ data: { session: activeSession } }) => {
        finishBootstrap(activeSession ?? readPersistedSession());
      })
      .catch((error) => {
        console.warn("[Auth] Failed to restore session during bootstrap", error);

        if (!isMounted) return;
        finishBootstrap(readPersistedSession());
      });

    return () => {
      isMounted = false;
      clearBootstrapTimeout();
      subscription.unsubscribe();
    };
  }, []);

  const signInWithPhone = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return { error: new Error("Please enter a valid 10-digit mobile number") };
    }

    const email = `91${cleanPhone}@grabyourcar.app`;
    const password = `wa_${cleanPhone}_gyc2024`;

    const tryPasswordSignIn = async (): Promise<Error | null> => {
      try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) return error as Error;
        // Wait for session to propagate
        for (let i = 0; i < 20; i++) {
          const { data } = await supabase.auth.getSession();
          if (data.session?.user) return null;
          await new Promise((r) => setTimeout(r, 200));
        }
        return new Error("Session timeout");
      } catch (e: any) {
        return new Error(e?.message || "Sign-in failed");
      }
    };

    // Step 1: Provision shadow account (fast – no more listUsers!)
    console.log("[auth] Ensuring shadow account for", cleanPhone);
    const { error: ensureError } = await supabase.functions.invoke("ensure-shadow-account", {
      body: { phone: cleanPhone },
    });

    if (ensureError) {
      console.error("[auth] ensure-shadow-account failed:", ensureError.message);
    }

    // Step 2: Sign in
    const signInError = await tryPasswordSignIn();
    if (!signInError) {
      console.log("[auth] Sign-in successful");
      return { error: null };
    }

    console.warn("[auth] First sign-in failed:", signInError.message);

    // Step 3: One retry – re-provision and try again
    const { error: retryError } = await supabase.functions.invoke("ensure-shadow-account", {
      body: { phone: cleanPhone },
    });

    if (retryError) {
      console.error("[auth] Retry ensure failed:", retryError.message);
      return { error: new Error("Could not start booking session. Please retry.") };
    }

    // Small delay to let password update propagate
    await new Promise((r) => setTimeout(r, 500));

    const finalError = await tryPasswordSignIn();
    if (finalError) {
      console.error("[auth] Final sign-in failed:", finalError.message);
      return { error: new Error("Could not start booking session. Please retry.") };
    }

    console.log("[auth] Sign-in successful on retry");
    return { error: null };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null, data: data ? { user: data.user } : undefined };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, initialized, signIn, signInWithPhone, signOut }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
