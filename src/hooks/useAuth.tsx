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
