import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { User, Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null; data?: { user: User | null } }>;
  signInWithPhone: (phone: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const waitForSession = async (maxAttempts = 12, delayMs = 250): Promise<Error | null> => {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { data, error } = await supabase.auth.getSession();
    if (error) return error as Error;
    if (data.session?.user) return null;
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }

  return new Error("Session could not be initialized. Please try again.");
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, nextSession) => {
      setSession(nextSession);
      setUser(nextSession?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session: activeSession } }) => {
      setSession(activeSession);
      setUser(activeSession?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const signInWithPhone = async (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, "").slice(-10);
    if (!/^[6-9]\d{9}$/.test(cleanPhone)) {
      return { error: new Error("Please enter a valid 10-digit mobile number") };
    }

    const email = `91${cleanPhone}@grabyourcar.app`;
    const password = `wa_${cleanPhone}_gyc2024`;

    const tryPasswordSignIn = async () => {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return error as Error;
      return await waitForSession(16, 250);
    };

    // Always provision/reset shadow account first so credentials are deterministic
    const { error: ensureError } = await supabase.functions.invoke("ensure-shadow-account", {
      body: { phone: cleanPhone },
    });

    if (ensureError) {
      console.error("ensure-shadow-account failed:", ensureError.message);
    }

    const initialSignInError = await tryPasswordSignIn();
    if (!initialSignInError) {
      return { error: null };
    }

    const recoverable =
      initialSignInError.message.toLowerCase().includes("invalid login credentials") ||
      initialSignInError.message.toLowerCase().includes("email not confirmed") ||
      initialSignInError.message.toLowerCase().includes("already registered") ||
      initialSignInError.message.toLowerCase().includes("session could not be initialized");

    if (!recoverable) {
      return { error: initialSignInError };
    }

    // One hard retry: re-provision and sign in again
    const { error: retryEnsureError } = await supabase.functions.invoke("ensure-shadow-account", {
      body: { phone: cleanPhone },
    });

    if (retryEnsureError) {
      return { error: new Error("We couldn't start your booking session. Please retry.") };
    }

    const finalSignInError = await tryPasswordSignIn();
    return {
      error: finalSignInError ? new Error("We couldn't start your booking session. Please retry.") : null,
    };
  };

  const signIn = async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error as Error | null, data: data ? { user: data.user } : undefined };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, loading, signIn, signInWithPhone, signOut }}>
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
