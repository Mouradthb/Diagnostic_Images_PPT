import { useEffect, useRef, useState } from 'react';
import { GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { Building2, Loader2, LogIn, LogOut, RefreshCw } from 'lucide-react';
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
    <div className="min-h-screen bg-slate-100 text-slate-900 px-4 py-12 flex items-center justify-center">
      <main className="w-full max-w-md bg-white rounded-2xl border border-slate-200 p-7 shadow-sm space-y-5">
        <div className="flex items-center gap-3">
          <span className="p-2.5 bg-blue-600 text-white rounded-xl"><Building2 className="w-7 h-7" /></span>
          <div>
            <h1 className="text-xl font-bold">Diagnostic Technique Bâtiment</h1>
            <p className="text-sm text-slate-500">Accès réservé aux membres autorisés</p>
          </div>
        </div>

        {!auth ? (
          <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">
            Firebase n'est pas encore configuré. L'administrateur doit renseigner les variables de l'application.
          </p>
        ) : state.status === 'loading' || state.status === 'checking' ? (
          <p className="flex items-center gap-2 text-sm text-slate-600">
            <Loader2 className="w-4 h-4 animate-spin" /> Vérification de votre accès…
          </p>
        ) : state.status === 'pending' && state.user ? (
          <div className="space-y-3 text-sm">
            <p>Compte connecté : <strong>{state.user.email}</strong></p>
            <p>Votre accès n'est pas encore configuré. Demandez à l'administrateur d'ajouter votre clé Gemini.</p>
            <p className="text-xs text-slate-500 break-all">Identifiant à transmettre à l'administrateur : {state.user.uid}</p>
            <div className="flex gap-2">
              <button type="button" onClick={() => void checkAccess(state.user!)} className="px-3 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold inline-flex items-center gap-2">
                <RefreshCw className="w-4 h-4" /> Vérifier à nouveau
              </button>
              <button type="button" onClick={() => void signOut(auth)} className="px-3 py-2 rounded-lg border border-slate-300 text-sm inline-flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Déconnexion
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {state.message && <p className="text-sm text-red-700 bg-red-50 p-3 rounded-lg">{state.message}</p>}
            {state.user ? (
              <div className="flex gap-2">
                <button type="button" onClick={() => void checkAccess(state.user!)} className="px-4 py-2 rounded-lg bg-blue-600 text-white text-sm font-semibold">Réessayer</button>
                <button type="button" onClick={() => void signOut(auth)} className="px-4 py-2 rounded-lg border border-slate-300 text-sm">Déconnexion</button>
              </div>
            ) : (
              <button type="button" onClick={() => void login()} className="w-full px-4 py-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold inline-flex items-center justify-center gap-2">
                <LogIn className="w-4 h-4" /> Se connecter avec Google
              </button>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
