import { useEffect, useState, type ReactNode } from 'react';
import type { Session } from '@supabase/supabase-js';
import { isSupabaseConfigured, supabase } from '../lib/supabase';

type AuthState = 'checking' | 'signed-out' | 'signed-in' | 'unconfigured';
const adminAllowedEmails = new Set(
  (import.meta.env.VITE_ADMIN_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email: string) => email.trim().toLowerCase())
    .filter(Boolean),
);

export function AdminAuthGate({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>('checking');

  useEffect(() => {
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

  return <AdminLoginPage state={authState} onSignIn={signIn} onSignOut={signOut} />;
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
  onSignIn,
  onSignOut,
}: {
  state: AuthState;
  onSignIn: () => void;
  onSignOut: () => void;
}) {
  const title =
    state === 'unconfigured'
      ? 'Admin access is not available'
      : 'Admin sign in';
  const message =
    state === 'unconfigured'
      ? 'Use the Google account allowlisted for this dashboard.'
      : 'Sign in with the Google account allowlisted for this dashboard.';

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
