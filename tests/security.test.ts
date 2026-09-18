import assert from 'node:assert/strict';
import test from 'node:test';
import analyzeRoute from '../api/analyze';
import meRoute from '../api/me';
import { getMemberKey } from '../api/_lib/auth.js';
import { analyzePhoto, validateResult } from '../api/_lib/analyze.js';
import { HttpError } from '../api/_lib/httpError.js';

test('the API rejects callers without a verified identity', async () => {
  const analyze = await analyzeRoute.fetch(new Request('http://localhost/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  }));
  const me = await meRoute.fetch(new Request('http://localhost/api/me'));
  assert.equal(analyze.status, 401);
  assert.equal(me.status, 401);
});

test('member keys are selected only by the requested Firebase uid', () => {
  const original = process.env.GEMINI_KEYS_BY_UID;
  process.env.GEMINI_KEYS_BY_UID = JSON.stringify({ memberA: 'key-a', memberB: 'key-b' });
  try {
    assert.equal(getMemberKey('memberA'), 'key-a');
    assert.equal(getMemberKey('memberB'), 'key-b');
    assert.equal(getMemberKey('unknown'), null);
  } finally {
    if (original === undefined) delete process.env.GEMINI_KEYS_BY_UID;
    else process.env.GEMINI_KEYS_BY_UID = original;
  }
});

test('invalid images are rejected before any Gemini call', async () => {
  await assert.rejects(
    analyzePhoto({ imageBase64: 'AAAA', mimeType: 'image/jpeg' }, 'unused-test-key'),
    (error: unknown) => error instanceof HttpError && error.status === 400
  );
});

const indicativeResult = {
  statut_analyse: 'constat photographique indicatif',
  niveau: 'Curatif Niveau 2',
  domaines_techniques: ['façade'],
  perimetre_apparent: 'partie commune',
  constat_factuel: 'Une fissure est visible sur la façade.',
  hypotheses_causes: ['Mouvement local à confirmer sur site.'],
  enjeux: ['sauvegarde du bâti', 'performance énergétique'],
  risques_evolution: 'La fissure pourrait s’étendre.',
  action_immediate: 'Aucune mise en sécurité identifiable sur cette image seule.',
  verification_preconisee: 'Inspecter la façade sur site.',
  remediation_proposee: 'Définir les travaux après vérification.',
  references_a_verifier: [],
  niveau_confiance: 'moyen',
  limites: 'La profondeur de la fissure ne peut être mesurée sur la photo.',
};

test('the full diagnostic contract accepts combined curative and energy issues', () => {
  assert.deepEqual(validateResult(indicativeResult), indicativeResult);
});

test('an unusable image can be returned without inventing a priority', () => {
  const unusable = {
    ...indicativeResult,
    statut_analyse: 'image non exploitable',
    niveau: 'À confirmer / expertise nécessaire',
    domaines_techniques: [],
    perimetre_apparent: 'indéterminé',
    constat_factuel: 'L’image est trop floue pour identifier l’ouvrage.',
    hypotheses_causes: [],
    enjeux: [],
    risques_evolution: 'Non déterminable sur image seule.',
    action_immediate: 'Aucune identifiable sur image seule.',
    verification_preconisee: 'Fournir une photo plus nette ou réaliser une visite.',
    remediation_proposee: 'Aucun travail ne peut être défini à ce stade.',
    niveau_confiance: 'faible',
    limites: 'Ouvrage et désordre non identifiables.',
  };
  assert.deepEqual(validateResult(unusable), unusable);
  assert.throws(
    () => validateResult({ ...unusable, niveau: 'Curatif Niveau 1' }),
    (error: unknown) => error instanceof HttpError && error.status === 502
  );
});

test('unknown priorities and malformed detailed fields are rejected', () => {
  for (const invalid of [
    { ...indicativeResult, niveau: 'Signalement' },
    { ...indicativeResult, enjeux: ['risque inconnu'] },
    { ...indicativeResult, constat_factuel: '' },
    { ...indicativeResult, hypotheses_causes: 'cause supposée' },
  ]) {
    assert.throws(
      () => validateResult(invalid),
      (error: unknown) => error instanceof HttpError && error.status === 502
    );
  }
});
