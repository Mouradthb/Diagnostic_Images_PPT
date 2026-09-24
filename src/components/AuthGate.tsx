import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { ArrowRight, CheckCircle2, Loader2, LogOut, RefreshCw, ShieldCheck } from 'lucide-react';
import App from '../App';
import { getConfiguredAuth } from '../firebase';

const auth = getConfiguredAuth();

interface AccessState {
  status: 'loading' | 'signed-out' | 'checking' | 'authorized' | 'pending' | 'error';
  user: User | null;
  message?: string;
}

export function AuthGate() {
  const [state, setState] = useState<AccessState>({ status: auth ? 'loading' : 'error', user: null });
  const requestId = useRef(0);

  const checkAccess = async (user: User) => {
    const currentRequest = ++requestId.current;
    setState({ status: 'checking', user });

    try {
      const token = await user.getIdToken();
      const response = await fetch('/api/me', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || `Vérification impossible (${response.status}).`);
      if (currentRequest !== requestId.current) return;
      setState({ status: data.authorized ? 'authorized' : 'pending', user });
    } catch (error) {
      if (currentRequest !== requestId.current) return;
      setState({
        status: 'error',
        user,
        message: error instanceof Error ? error.message : 'Vérification impossible.',
      });
    }
  };

  useEffect(() => {
    if (!auth) return;
    return onAuthStateChanged(auth, (user) => {
      if (user) {
        void checkAccess(user);
      } else {
        ++requestId.current;
        setState({ status: 'signed-out', user: null });
      }
    });
  }, []);

  const login = async () => {
    if (!auth) return;
    try {
      await signInWithPopup(auth, new GoogleAuthProvider());
    } catch (error) {
      setState({
        status: 'error',
        user: null,
        message: error instanceof Error ? error.message : 'Connexion Google impossible.',
      });
    }
  };

  if (state.status === 'authorized' && state.user && auth) {
    return (
      <App
        email={state.user.email ?? 'Membre connecté'}
        getIdToken={() => state.user!.getIdToken()}
        onSignOut={() => signOut(auth)}
      />
    );
  }

  return (
    <div className="app-shell flex min-h-[100dvh] items-center justify-center px-4 py-8 text-[#19313b] sm:p-8">
      <main className="neumo-auth-card w-full max-w-md overflow-hidden rounded-[24px] border border-[#dce6e8] bg-white shadow-[0_16px_48px_-28px_rgba(15,50,60,0.4)]">
        <div className="neumo-auth-hero bg-[#1d315b] px-6 py-7 text-white sm:px-8">
          <div className="neumo-logo-plaque mb-5 flex h-[75px] w-[252px] items-center justify-center rounded-xl bg-white px-2 shadow-sm">
            <img src="/france-verte-logo.png" alt="France Verte" className="h-auto w-full object-contain" />
          </div>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#b8e7ca]">Espace de diagnostic · PPPT</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Diagnostic Technique Bâtiment</h1>
          <p className="mt-1 text-sm text-white/65">Accès réservé aux membres de l'équipe</p>
        </div>
        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="neumo-auth-note flex items-center gap-2 rounded-xl px-3 py-2.5 text-xs font-medium text-[#526b76]"><ShieldCheck className="size-4 text-[#087f74]" /> Connexion sécurisée avec Google</div>

        {!auth ? (
          <p className="neumo-error-card rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
            Firebase n'est pas encore configuré. L'administrateur doit renseigner les variables de l'application.
          </p>
        ) : state.status === 'loading' || state.status === 'checking' ? (
          <p className="flex items-center gap-2 text-sm text-[#627781]" role="status">
            <Loader2 className="size-4 animate-spin" /> Vérification de votre accès…
          </p>
        ) : state.status === 'pending' && state.user ? (
          <div className="space-y-3 text-sm">
            <p>Compte connecté : <strong>{state.user.email}</strong></p>
            <p>Votre accès n'est pas encore configuré. Demandez à l'administrateur d'ajouter votre clé Gemini.</p>
            <p className="neumo-auth-note break-all rounded-xl bg-[#f3f7f7] p-3 text-xs text-[#627781]">Identifiant à transmettre à l'administrateur : {state.user.uid}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => void checkAccess(state.user!)} className="neumo-button-primary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#147b52] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#0d6441]">
                <RefreshCw className="size-4" /> Vérifier à nouveau
              </button>
              <button type="button" onClick={() => void signOut(auth)} className="neumo-button-secondary inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce6e8] px-4 text-sm text-[#19313b] transition-colors hover:bg-[#f3f7f7]">
                <LogOut className="size-4" /> Déconnexion
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {state.message && <p role="alert" className="neumo-error-card rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{state.message}</p>}
            {state.user ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => void checkAccess(state.user!)} className="neumo-button-primary min-h-10 rounded-xl bg-[#147b52] px-4 text-sm font-semibold text-white hover:bg-[#0d6441]">Réessayer</button>
                <button type="button" onClick={() => void signOut(auth)} className="neumo-button-secondary min-h-10 rounded-xl border border-[#dce6e8] px-4 text-sm hover:bg-[#f3f7f7]">Déconnexion</button>
              </div>
            ) : (
              <button type="button" onClick={() => void login()} className="neumo-button-primary inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#147b52] px-4 text-sm font-semibold text-white shadow-[0_5px_15px_rgba(20,123,82,0.16)] transition-colors hover:bg-[#0d6441] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#147b52]">
                Se connecter avec Google <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}
          <p className="neumo-panel-divider flex items-center justify-center gap-1.5 border-t border-[#e5ecee] pt-4 text-[11px] text-[#71868e]"><CheckCircle2 className="size-3.5 text-[#087f74]" /> Votre clé Gemini reste gérée par l'administrateur</p>
        </div>
      </main>
    </div>
  );
}
