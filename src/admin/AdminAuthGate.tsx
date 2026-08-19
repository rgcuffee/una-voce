import { useEffect, useState, type FormEvent, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  clearLocalAdminPassword,
  localPasswordModeEnabled,
  readLocalAdminPassword,
  storeLocalAdminPassword,
  validateLocalAdminPassword,
} from './localAdminAccess.mjs';

type AuthState =
  | 'checking'
  | 'signed-out'
  | 'signed-in'
  | 'unconfigured'
  | 'local-signed-out';
const localPasswordMode = localPasswordModeEnabled(import.meta.env.DEV);
const adminAllowedEmails = new Set(
  (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [localError, setLocalError] = useState<string | null>(null);

  useEffect(() => {
    if (localPasswordMode) {
      let mounted = true;
      const storedPassword = readLocalAdminPassword(window.localStorage);

      if (!storedPassword) {
        setAuthState('local-signed-out');
        return;
      }

      void validateLocalAdminPassword({
        dev: import.meta.env.DEV,
        password: storedPassword,
      }).then((valid) => {
        if (!mounted) return;
        if (valid) {
          setAuthState('signed-in');
          return;
        }

        clearLocalAdminPassword(window.localStorage);
        setLocalError('The saved local password is no longer valid.');
        setAuthState('local-signed-out');
      });

      return () => {
        mounted = false;
      };
    }

    if (!supabase || !isSupabaseConfigured) {
      setAuthState('unconfigured');
      return;
    }

    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setAuthState(stateForSession(data.session));
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthState(stateForSession(session));
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  async function signInLocally(password: string) {
    setAuthState('checking');
    setLocalError(null);
    const valid = await validateLocalAdminPassword({
      dev: import.meta.env.DEV,
      password,
    });

    if (!valid) {
      setLocalError('Incorrect local password.');
      setAuthState('local-signed-out');
      return;
    }

    storeLocalAdminPassword(window.localStorage, password);
    setAuthState('signed-in');
  }

  async function signIn() {
    if (!supabase) return;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: window.location.href,
      },
    });
  }

  async function signOut() {
    if (!supabase) return;
    await supabase.auth.signOut();
  }

  if (authState === 'signed-in') {
    return <>{children}</>;
  }

  return (
    <AdminLoginPage
      state={authState}
      localError={localError}
      onLocalSignIn={signInLocally}
      onSignIn={signIn}
      onSignOut={signOut}
    />
  );
}

function stateForSession(session: Session | null): AuthState {
  if (!session) return 'signed-out';
  const email = session.user.email?.toLowerCase();
  if (adminAllowedEmails.size > 0 && (!email || !adminAllowedEmails.has(email))) {
    return 'unconfigured';
  }
  return 'signed-in';
}

function AdminLoginPage({
  state,
  localError,
  onLocalSignIn,
  onSignIn,
  onSignOut,
}: {
  state: AuthState;
  localError: string | null;
  onLocalSignIn: (password: string) => Promise<void>;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const local = state === 'local-signed-out';
  const title =
    local
      ? 'Local admin access'
      : state === 'unconfigured'
      ? 'Admin access is not available'
      : 'Admin sign in';
  const message =
    local
      ? 'Enter the password configured for this local development server.'
      : state === 'unconfigured'
      ? 'Use the Google account allowlisted for this dashboard.'
      : 'Sign in with the Google account allowlisted for this dashboard.';

  function submitLocalPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    void onLocalSignIn(formData.get('password')?.toString() ?? '');
  }

  return (
    <main className="admin-login">
      <section className="admin-login-panel">
        <div className="engine-brand">
          <span>Una Voce</span>
          <strong>Admin Hub</strong>
        </div>
        <h1>{title}</h1>
        <p>{message}</p>
        {state === 'checking' ? (
          <div className="engine-empty">Checking session...</div>
        ) : local ? (
          <form className="admin-login-form" onSubmit={submitLocalPassword}>
            <label htmlFor="local-admin-password">Local password</label>
            <input
              id="local-admin-password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              autoFocus
            />
            {localError ? <p className="admin-login-error" role="alert">{localError}</p> : null}
            <button type="submit" className="admin-button primary">
              Sign in locally
            </button>
          </form>
        ) : state === 'unconfigured' ? (
          <button type="button" className="admin-button" onClick={onSignOut}>
            Sign out
          </button>
        ) : (
          <button
            type="button"
            className="admin-button primary"
            onClick={onSignIn}
          >
            Sign in with Google
          </button>
        )}
      </section>
    </main>
  );
}
