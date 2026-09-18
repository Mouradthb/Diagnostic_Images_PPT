import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { ArrowRight, CheckCircle2, Loader2, LogOut, RefreshCw, ScanLine, ShieldCheck } from 'lucide-react';
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
      <main className="w-full max-w-md overflow-hidden rounded-[24px] border border-[#dce6e8] bg-white shadow-[0_16px_48px_-28px_rgba(15,50,60,0.4)]">
        <div className="bg-[#17313d] px-6 py-7 text-white sm:px-8">
          <span className="mb-5 flex size-12 items-center justify-center rounded-2xl border border-white/15 bg-white/10 text-[#8fe3d2]"><ScanLine className="size-6" strokeWidth={1.8} /></span>
          <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[#8fe3d2]">Espace de diagnostic · PPPT</p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">Diagnostic Technique Bâtiment</h1>
          <p className="mt-1 text-sm text-white/65">Accès réservé aux membres de l'équipe</p>
        </div>
        <div className="space-y-5 px-6 py-6 sm:px-8">
          <div className="flex items-center gap-2 text-xs font-medium text-[#637b82]"><ShieldCheck className="size-4 text-[#087f74]" /> Connexion sécurisée avec Google</div>

        {!auth ? (
          <p className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">
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
            <p className="break-all rounded-xl bg-[#f3f7f7] p-3 text-xs text-[#627781]">Identifiant à transmettre à l'administrateur : {state.user.uid}</p>
            <div className="flex flex-col gap-2 sm:flex-row">
              <button type="button" onClick={() => void checkAccess(state.user!)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 text-sm font-semibold text-white transition-colors hover:bg-[#076e65]">
                <RefreshCw className="size-4" /> Vérifier à nouveau
              </button>
              <button type="button" onClick={() => void signOut(auth)} className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-[#dce6e8] px-4 text-sm text-[#19313b] transition-colors hover:bg-[#f3f7f7]">
                <LogOut className="size-4" /> Déconnexion
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {state.message && <p role="alert" className="rounded-xl bg-rose-50 p-3 text-sm text-rose-800">{state.message}</p>}
            {state.user ? (
              <div className="flex flex-col gap-2 sm:flex-row">
                <button type="button" onClick={() => void checkAccess(state.user!)} className="min-h-10 rounded-xl bg-[#087f74] px-4 text-sm font-semibold text-white hover:bg-[#076e65]">Réessayer</button>
                <button type="button" onClick={() => void signOut(auth)} className="min-h-10 rounded-xl border border-[#dce6e8] px-4 text-sm hover:bg-[#f3f7f7]">Déconnexion</button>
              </div>
            ) : (
              <button type="button" onClick={() => void login()} className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#087f74] px-4 text-sm font-semibold text-white shadow-[0_5px_15px_rgba(8,127,116,0.16)] transition-colors hover:bg-[#076e65] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#087f74]">
                Se connecter avec Google <ArrowRight className="size-4" />
              </button>
            )}
          </div>
        )}
          <p className="flex items-center justify-center gap-1.5 border-t border-[#e5ecee] pt-4 text-[11px] text-[#71868e]"><CheckCircle2 className="size-3.5 text-[#087f74]" /> Votre clé Gemini reste gérée par l'administrateur</p>
        </div>
      </main>
    </div>
  );
}
