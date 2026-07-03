import { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";
import * as WebBrowser from "expo-web-browser";
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

import { isSupabaseConfigured, supabase } from "../services/supabase";

WebBrowser.maybeCompleteAuthSession();

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  configured: boolean;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (
    email: string,
    password: string,
    displayName?: string,
  ) => Promise<{ needsConfirm: boolean; alreadyRegistered: boolean }>;
  signInWithGoogle: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
  }, []);

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName?: string) => {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: displayName
          ? { data: { display_name: displayName } }
          : undefined,
      });
      if (error) {
        // With email confirmations OFF Supabase reports duplicates directly.
        if (/already registered|already exists/i.test(error.message)) {
          return { needsConfirm: false, alreadyRegistered: true };
        }
        throw error;
      }
      // With confirmations ON, Supabase returns an obfuscated user with an
      // empty identities array for duplicate emails (anti-enumeration).
      const alreadyRegistered = (data.user?.identities?.length ?? 1) === 0;
      return {
        needsConfirm: !data.session && !alreadyRegistered,
        alreadyRegistered,
      };
    },
    [],
  );

  const resetPassword = useCallback(async (email: string) => {
    const redirectTo = Linking.createURL("auth/reset");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const redirectTo = Linking.createURL("auth/callback");
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo, skipBrowserRedirect: true },
    });
    if (error) throw error;
    if (!data?.url) throw new Error("Could not start Google sign-in.");

    const result = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);
    if (result.type !== "success" || !result.url) return; // user cancelled

    const parsed = Linking.parse(result.url);
    const code = parsed.queryParams?.code as string | undefined;
    if (code) {
      const { error: exErr } = await supabase.auth.exchangeCodeForSession(code);
      if (exErr) throw exErr;
    }
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <AuthContext.Provider
      value={{
        session,
        user: session?.user ?? null,
        loading,
        configured: isSupabaseConfigured,
        signInWithEmail,
        signUpWithEmail,
        signInWithGoogle,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
