import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase, configStatus, classifySupabaseError } from '../lib/supabase';

type AuthError = {
  message: string;
  code: string;
};

type AuthContextType = {
  session: Session | null;
  user: User | null;
  loading: boolean;
  error: AuthError | null;
  configValid: boolean;
  configErrors: string[];
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signOut: () => Promise<void>;
  clearError: () => void;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<AuthError | null>(null);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data, error: err }) => {
      if (err) {
        console.error('Session restore failed:', classifySupabaseError(err));
      }
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, sess) => {
      setSession(sess);
      setUser(sess?.user ?? null);
      setLoading(false);
    });

    return () => listener.subscription.unsubscribe();
  }, []);

  const signIn = async (email: string, password: string) => {
    setError(null);
    if (!supabase) {
      const msg = configStatus.errors.length
        ? configStatus.errors.join(' ')
        : 'Supabase client not initialized.';
      const e: AuthError = { message: msg, code: 'CONFIG_ERROR' };
      setError(e);
      return { error: e };
    }
    const { error: err } = await supabase.auth.signInWithPassword({ email, password });
    if (err) {
      const e: AuthError = { message: classifySupabaseError(err), code: err.name || 'AUTH_ERROR' };
      setError(e);
      return { error: e };
    }
    return { error: null };
  };

  const signUp = async (email: string, password: string) => {
    setError(null);
    if (!supabase) {
      const msg = configStatus.errors.length
        ? configStatus.errors.join(' ')
        : 'Supabase client not initialized.';
      const e: AuthError = { message: msg, code: 'CONFIG_ERROR' };
      setError(e);
      return { error: e };
    }
    const { data, error: err } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin },
    });
    if (err) {
      const e: AuthError = { message: classifySupabaseError(err), code: err.name || 'AUTH_ERROR' };
      setError(e);
      return { error: e };
    }
    if (data.user && !data.session) {
      const e: AuthError = {
        message: 'Registration successful. Email confirmation may be required — check your inbox.',
        code: 'CONFIRMATION_REQUIRED',
      };
      setError(e);
    }
    return { error: null };
  };

  const signOut = async () => {
    setError(null);
    if (supabase) {
      await supabase.auth.signOut();
    }
    setSession(null);
    setUser(null);
  };

  const clearError = () => setError(null);

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        loading,
        error,
        configValid: configStatus.valid,
        configErrors: configStatus.errors,
        signIn,
        signUp,
        signOut,
        clearError,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (ctx === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}
