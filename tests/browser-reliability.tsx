// Manual Vite-only fixture. It is not an entry point of the production build.
import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from '../src/App';
import { DIAGNOSTIC_NIVEAUX, type DiagnosticResult } from '../src/types';
import '../src/index.css';

const params = new URLSearchParams(location.search);
const scenario = params.get('scenario') ?? 'success';
const requestedPriority = params.get('priority');
const priority = DIAGNOSTIC_NIVEAUX.find((value) => value === requestedPriority) ?? 'À confirmer / expertise nécessaire';
const isPricedPriority = priority.startsWith('Curatif') || priority === 'Travaux énergétiques';
const ownerUid = `browser-test-${scenario}-${params.get('run') ?? 'manual'}`;
const calls: boolean[] = [];
let renderCalls = () => undefined;
const diagnostic: DiagnosticResult = {
  statut_analyse: 'constat photographique indicatif',
  priorite: priority,
  famille: priority === 'Travaux énergétiques' ? 'Isolation thermique' : 'Non précisée',
  localisation: 'Non renseignée',
  perimetre: 'indéterminé',
  etat_observations: 'Résultat simulé pour vérifier le fonctionnement de l’interface. Aucun diagnostic réel n’est produit dans ce test.',
  intervention: 'Vérifier le compte à rebours et la réutilisation du résultat. Test local uniquement.',
  cout_estime_min_ttc_eur: isPricedPriority ? 1000 : 0,
  cout_estime_max_ttc_eur: isPricedPriority ? 1500 : 0,
  confiance: 'faible',
};
const originalFetch = window.fetch.bind(window);
window.fetch = async (input, init) => {
  if (input !== '/api/analyze') return originalFetch(input, init);
  const body = JSON.parse(String(init?.body));
  calls.push(body.recoveryAttempt === true);
  renderCalls();
  if (scenario === 'daily' || scenario === 'unknown' || (scenario === 'overload' && calls.length === 1)) {
    const code = scenario === 'daily' ? 'quota_daily' : scenario === 'unknown' ? 'quota_unknown' : 'provider_unavailable';
    return Response.json({
      error: 'Erreur simulée pour tester la reprise.',
      code,
      canRetry: scenario === 'overload',
      ...(scenario === 'overload' ? { retryAfterSeconds: 30 } : {}),
    }, { status: scenario === 'overload' ? 503 : 429 });
  }
  return Response.json(diagnostic);
};

function TestPage() {
  const [callCount, setCallCount] = useState(0);
  renderCalls = () => setCallCount(calls.length);
  return <>
    <div role="status" style={{ padding: '8px 16px', background: '#fff4c1', fontSize: 12 }}>
      Test local : {scenario} · aucun appel Gemini · <span data-testid="calls">{callCount}</span> requête(s) simulée(s) · <span data-testid="recoveries">{calls.filter(Boolean).length}</span> reprise(s) de secours
    </div>
    <App uid={ownerUid} email="test-local@example.invalid" getIdToken={async () => 'simulated-token'} onSignOut={async () => undefined} />
  </>;
}

createRoot(document.getElementById('root')!).render(<TestPage />);
