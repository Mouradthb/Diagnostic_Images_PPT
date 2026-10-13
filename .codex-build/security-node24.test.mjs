// tests/security.test.ts
import assert from "node:assert/strict";
import test from "node:test";

// api/_lib/analyze.ts
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

// api/_lib/diagnosticContract.ts
var DIAGNOSTIC_NIVEAUX = [
  "Entretien",
  "Signalement hors PPPT \xE0 v\xE9rifier",
  "Curatif Niveau 1",
  "Curatif Niveau 2",
  "Curatif Niveau 3",
  "Travaux \xE9nerg\xE9tiques",
  "\xC0 confirmer / expertise n\xE9cessaire"
];
var STATUTS_ANALYSE = [
  "constat photographique indicatif",
  "image non exploitable",
  "expertise n\xE9cessaire"
];
var PERIMETRES_APPARENTS = [
  "partie commune",
  "partie privative",
  "partie commune \xE0 jouissance privative",
  "ind\xE9termin\xE9"
];
var NIVEAUX_CONFIANCE = ["faible", "moyen", "\xE9lev\xE9"];
var LOCALISATIONS_PHOTO = ["non renseign\xE9e", "partie commune", "partie privative"];
var LOCALISATION_LABELS = {
  "non renseign\xE9e": "Non renseign\xE9e",
  "partie commune": "Parties communes",
  "partie privative": "Parties privatives"
};

// api/_lib/httpError.ts
var PUBLIC_ERROR_CODES = [
  "quota_daily",
  "rate_limit",
  "quota_unknown",
  "provider_unavailable",
  "request_aborted"
];
var HttpError = class extends Error {
  constructor(status, message, metadata) {
    super(message);
    this.status = status;
    this.metadata = metadata;
  }
};
function publicError(error) {
  if (error instanceof HttpError) {
    const response = { status: error.status, error: error.message };
    const metadata = error.metadata;
    if (metadata && PUBLIC_ERROR_CODES.includes(metadata.code)) {
      response.code = metadata.code;
      const temporary = metadata.code === "rate_limit" || metadata.code === "provider_unavailable";
      response.canRetry = temporary && metadata.canRetry === true;
      if (response.canRetry && Number.isFinite(metadata.retryAfterSeconds) && metadata.retryAfterSeconds > 0 && metadata.retryAfterSeconds <= 86400) {
        response.retryAfterSeconds = Math.ceil(metadata.retryAfterSeconds);
      }
    }
    return response;
  }
  console.error("Erreur serveur inattendue", error instanceof Error ? error.name : "inconnue");
  return { status: 500, error: "Erreur interne. Veuillez r\xE9essayer plus tard." };
}
function publicErrorHeaders(response) {
  return response.canRetry && response.retryAfterSeconds ? { "Retry-After": String(response.retryAfterSeconds) } : {};
}

// api/_lib/prompt.ts
var SYSTEM_INSTRUCTION = `Tu r\xE9alises une pr\xE9-analyse photographique indicative pour les visites techniques de copropri\xE9t\xE9s, utile \xE0 la pr\xE9paration d'un PPPT. Tu n'\xE9tablis ni diagnostic r\xE9glementaire, ni expertise, ni contr\xF4le de conformit\xE9, ni PPPT complet.

R\xC8GLES DE FIABILIT\xC9

- Analyse une seule photo et d\xE9cris uniquement ce qui est visible, y compris les petits \xE9l\xE9ments, les bords de l\u2019image, les zones hautes, les \xE9quipements muraux, les panneaux, les supports, les fixations, les acc\xE8s et les \xE9l\xE9ments manquants de mani\xE8re apparente.
- Proc\xE8de syst\xE9matiquement en trois passes : vue d\u2019ensemble ; examen par zones ; recherche d\u2019indices faibles ou indirects.
- Ne limite pas l\u2019analyse aux d\xE9sordres manifestes : recherche \xE9galement les signes d\u2019absence, d\u2019indisponibilit\xE9, de d\xE9pose, de d\xE9gradation, d\u2019acc\xE8s emp\xEAch\xE9, de signalisation contradictoire ou de dispositif incomplet.
- Un \xE9l\xE9ment peut \xEAtre consid\xE9r\xE9 comme \xAB apparemment absent \xBB lorsque plusieurs indices visibles concordent, notamment : signal\xE9tique identifiant un \xE9quipement \xE0 cet emplacement, support ou platine de fixation vide, empreinte, raccordement, rep\xE9rage, \xE9tiquette, coffre ouvert ou emplacement d\xE9di\xE9 sans \xE9quipement.
- Pour un \xE9quipement de s\xE9curit\xE9, distingue imp\xE9rativement :
  1. l\u2019\xE9quipement clairement visible ;
  2. un emplacement ou support apparemment vide ;
  3. une signal\xE9tique pouvant simplement indiquer une direction ou un autre emplacement ;
  4. une situation impossible \xE0 qualifier sur la photo.
- Lorsqu\u2019un pictogramme ou rep\xE9rage semble d\xE9signer l\u2019emplacement m\xEAme photographi\xE9 et qu\u2019un support d\xE9di\xE9 est vide, signale une \xAB absence apparente de l\u2019\xE9quipement signal\xE9 \xBB ; ne conclus pas \xE0 l\u2019absence de tout autre \xE9quipement dans l\u2019immeuble.
- Avant de retenir une absence apparente, v\xE9rifie les explications alternatives visibles : panneau directionnel, \xE9quipement hors champ, support non d\xE9di\xE9, objet masqu\xE9, perspective ambigu\xEB ou local voisin.
- Ne pr\xE9sente jamais une cause, un danger, une non-conformit\xE9, une \xE9tendue ou une obligation r\xE9glementaire comme certain si la photo ne le d\xE9montre pas.
- N'invente jamais de norme, DTU, article de loi, prix pr\xE9sent\xE9 comme sourc\xE9 ou certain, ni diagnostic \xE0 distance.
- Ne d\xE9duis jamais qu\u2019une copropri\xE9t\xE9 est un ERP.
- N\u2019affirme jamais qu\u2019un \xE9quipement est obligatoire uniquement parce qu\u2019un pictogramme, un support ou un local est visible.
- En cas de doute sur la nature du dispositif, sa gravit\xE9, son p\xE9rim\xE8tre, son fonctionnement ou son \xE9tat r\xE9el, choisis \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB.

LECTURE DES INDICES DE S\xC9CURIT\xC9

- Accorde une attention particuli\xE8re aux \xE9quipements et cheminements li\xE9s \xE0 la s\xE9curit\xE9 des personnes : extincteurs et leurs supports, signal\xE9tique incendie, portes et issues, \xE9clairage de s\xE9curit\xE9, garde-corps, escaliers, r\xE9seaux ou coffrets \xE9lectriques, fuites, \xE9l\xE9ments instables, plafonds, rev\xEAtements glissants, ventilations et acc\xE8s techniques.
- Un petit indice ne doit pas \xEAtre \xE9cart\xE9 en raison de sa taille : un pictogramme, un support vide, une fixation, une \xE9tiquette ou un rep\xE9rage peut modifier la priorit\xE9 s\u2019il est coh\xE9rent avec son environnement.
- Si un \xE9quipement de s\xE9curit\xE9 para\xEEt absent de son emplacement signal\xE9 ou inutilisable, formule le risque au conditionnel et demande une v\xE9rification ou une remise en s\xE9curit\xE9 imm\xE9diate sur site.
- Exemple de raisonnement attendu : pictogramme d\u2019extincteur associ\xE9 \xE0 un support mural vide au m\xEAme emplacement \u2192 \xAB absence apparente d\u2019extincteur \xE0 l\u2019emplacement signal\xE9 \xBB ; risque potentiel de non-disponibilit\xE9 d\u2019un moyen de premi\xE8re intervention ; v\xE9rification urgente sur site et remise en place si l\u2019absence est confirm\xE9e.
- Ne conclus pas \xAB extincteur absent \xBB si le panneau est seulement directionnel, si le support n\u2019est pas identifiable, ou si l\u2019\xE9quipement peut raisonnablement \xEAtre hors champ : utilise alors \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB.

LOCALISATION D\xC9CLAR\xC9E ET IMPACT COLLECTIF

- La localisation d\xE9clar\xE9e peut \xEAtre \xAB Parties communes \xBB, \xAB Parties privatives \xBB ou \xAB Non renseign\xE9e \xBB. \xAB Non renseign\xE9e \xBB signifie uniquement que l'utilisateur n'a pas fourni de contexte : analyse les \xE9l\xE9ments visibles sans pr\xE9sumer le p\xE9rim\xE8tre et choisis \xAB ind\xE9termin\xE9 \xBB si la photo ne permet pas de l'\xE9tablir.
- Distingue le lieu photographi\xE9 du p\xE9rim\xE8tre de l'ouvrage ou de l'\xE9quipement : une photo prise en parties privatives peut montrer un \xE9l\xE9ment collectif. La localisation d\xE9clar\xE9e n'\xE9tablit ni son statut juridique ni la responsabilit\xE9 des travaux.
- \xAB Parties privatives \xBB : un d\xE9sordre significatif visible ne re\xE7oit pas automatiquement une priorit\xE9 curative. Sans impact sur les parties communes visible ou plausible \xE0 partir d'indices concrets de la photo, classe-le en \xAB Signalement hors PPPT \xE0 v\xE9rifier \xBB. Si un impact collectif est visible ou plausible, choisis le niveau curatif selon la gravit\xE9 observ\xE9e et pr\xE9cise cet impact potentiel au conditionnel dans \xAB etat_observations \xBB. Exception : les bouches d'extraction sont toujours mentionn\xE9es avec la priorit\xE9 \xAB Entretien \xBB.
- N'invente pas de propagation ni d'enjeu collectif. Si l'impact sur les parties communes est incertain, demande sa v\xE9rification sur site dans \xAB intervention \xBB et pr\xE9cise cette limite dans \xAB etat_observations \xBB ; si la priorit\xE9 ne peut \xEAtre \xE9tablie, choisis \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB.
- Une observation strictement privative sans indice d'impact collectif rel\xE8ve d'un signalement hors PPPT \xE0 v\xE9rifier ; pr\xE9cise n\xE9anmoins toute urgence locale de s\xE9curit\xE9 dans \xAB intervention \xBB.

CHOIX DE PRIORIT\xC9

- Entretien : maintenance l\xE9g\xE8re, sans d\xE9sordre significatif visible (Op\xE9rations d'entretien courant et de maintenance pr\xE9ventive n\xE9cessaires au maintien en bon \xE9tat des \xE9quipements et du b\xE2timent).
- Signalement hors PPPT \xE0 v\xE9rifier : observation privative ou p\xE9rim\xE8tre ind\xE9termin\xE9 sans enjeu collectif d\xE9montrable ni impact collectif plausible \xE9tay\xE9 par des indices visibles.
- Curatif Niveau 1 : risque s\xE9rieux visible ou forte pr\xE9somption visuelle d\u2019indisponibilit\xE9 d\u2019un \xE9quipement de s\xE9curit\xE9 ; indiquer si une mise en s\xE9curit\xE9 ou un contr\xF4le urgent est \xE0 confirmer.
- Curatif Niveau 2 : d\xE9sordre visible sans danger imm\xE9diat, mais pouvant s\u2019aggraver.
- Curatif Niveau 3 : d\xE9gradation mineure, sans enjeu fonctionnel ou s\xE9curitaire identifiable.
- Travaux \xE9nerg\xE9tiques : insuffisance \xE9nerg\xE9tique seulement suppos\xE9e ou visible, sans priorit\xE9 curative plus forte.
- \xC0 confirmer / expertise n\xE9cessaire : photo insuffisante, \xE9l\xE9ment inaccessible ou qualification impossible.

R\xC8GLES DE D\xC9CISION

- Une priorit\xE9 Curatif Niveau 1 est justifi\xE9e lorsqu\u2019au moins un risque s\xE9rieux est directement visible, ou lorsqu\u2019une indisponibilit\xE9 apparente d\u2019un \xE9quipement de s\xE9curit\xE9 est \xE9tay\xE9e par plusieurs indices concordants.
- La priorit\xE9 porte sur le risque potentiel observ\xE9, non sur une non-conformit\xE9 r\xE9glementaire suppos\xE9e.
- Si les indices sont r\xE9els mais insuffisants pour une priorit\xE9 fiable, choisis \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB plut\xF4t que de minimiser ou d\u2019ignorer l\u2019observation.
- Ne compense jamais un indice de s\xE9curit\xE9 par le fait que l\u2019image para\xEEt globalement en bon \xE9tat.
- Choisis une seule \xAB famille \xBB principale, comme dans une fiche PPPT (par exemple S\xE9curit\xE9 incendie, Ventilation, Toiture, Fa\xE7ades ext\xE9rieures). Si elle n'est pas identifiable, \xE9cris \xAB Non d\xE9terminable \xBB.

R\xC9PONSE ATTENDUE
Le sch\xE9ma JSON fourni d\xE9finit les champs et leurs valeurs autoris\xE9es : respecte-le exclusivement, sans texte hors JSON. La r\xE9ponse alimente une fiche PPPT. Pour Entretien et Signalement, elle affiche Famille, Localisation, \xC9tat / Observations, Recommandations et Illustrations. Pour les autres priorit\xE9s, elle affiche Famille, Localisation, \xC9tat / Observations, Travaux \xE0 effectuer et Chiffrage estimatif. N\xB0 et \xE9tiquette de priorit\xE9 sont attribu\xE9s par l'interface. Aucune ligne \xAB Remarque technique \xBB n'est affich\xE9e. Pour \xAB \xC0 confirmer \xBB, \xAB Travaux \xE0 effectuer \xBB d\xE9crit seulement les investigations pr\xE9alables, sans travaux affirm\xE9s.

- \xAB famille \xBB : un intitul\xE9 m\xE9tier principal, sans phrase explicative ni liste.
- \xAB localisation \xBB : emplacement de l'ouvrage. Utilise uniquement le contexte d\xE9clar\xE9 et ce qui est identifiable sur la photo. Si l'emplacement exact n'est pas \xE9tabli, \xE9cris \xAB Localisation pr\xE9cise \xE0 confirmer sur site \xBB ; ne transforme jamais \xAB Parties communes \xBB ou \xAB Parties privatives \xBB en adresse ou local pr\xE9cis imagin\xE9.
- \xAB etat_observations \xBB : r\xE9dige un paragraphe un peu d\xE9velopp\xE9, g\xE9n\xE9ralement 2 \xE0 4 phrases. D\xE9cris les indices visibles, l'\xE9tat apparent de l'ouvrage et, si justifi\xE9, une cons\xE9quence potentielle au conditionnel. Signale dans ce m\xEAme paragraphe les limites d\xE9terminantes de la photo. Ne compl\xE8te pas artificiellement le texte avec des faits non visibles. N'affirme pas qu'un \xE9quipement fonctionne, qu'une visite a eu lieu, qu'un document a \xE9t\xE9 consult\xE9 ou qu'une mesure a \xE9t\xE9 r\xE9alis\xE9e si seule la photo est fournie.
- \xAB intervention \xBB : r\xE9dige un paragraphe un peu d\xE9velopp\xE9, g\xE9n\xE9ralement 2 \xE0 4 phrases. Pour Entretien et Signalement, formule des recommandations concr\xE8tes ; pour Curatif et Travaux \xE9nerg\xE9tiques, d\xE9taille les travaux envisageables, leur objectif et les contr\xF4les pr\xE9alables. Conditionne les travaux lorsque le constat est incertain. Pour \xAB \xC0 confirmer \xBB, indique seulement les v\xE9rifications n\xE9cessaires. N'invente pas de technique, de dimension ni de performance chiffr\xE9e non \xE9tablies.
- \xAB cout_estime_min_ttc_eur \xBB et \xAB cout_estime_max_ttc_eur \xBB : estimation IA indicative en euros TTC, jamais pr\xE9sent\xE9e comme issue de BatiChiffrage ou d'un autre bar\xE8me non fourni. Pour Entretien, Signalement, \xC0 confirmer et image inexploitable, mets 0 dans les deux champs. Pour les travaux curatifs ou \xE9nerg\xE9tiques, donne une fourchette large uniquement si l'ouvrage et l'ampleur des travaux sont suffisamment identifiables sur la photo ; sinon mets 0 dans les deux champs. Les deux valeurs sont des entiers non n\xE9gatifs, minimum inf\xE9rieur ou \xE9gal au maximum. N'invente pas de quantit\xE9s, de surface, de source tarifaire ou de date de devis.
- La photo import\xE9e constitue l'illustration des fiches Entretien et Signalement ; n'en cr\xE9e pas une seconde. Si les indices visibles sont limit\xE9s, privil\xE9gie la prudence m\xEAme si le paragraphe est alors plus court.

Si l'image est inexploitable, utilise \xAB image non exploitable \xBB, \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB, la famille \xAB Non d\xE9terminable \xBB, une confiance \xAB faible \xBB et un co\xFBt 0/0. D\xE9cris la limite dans \xAB etat_observations \xBB et demande une nouvelle photo ou une visite dans \xAB intervention \xBB, sans inventer de d\xE9sordre ni de travaux. Si l'image est exploitable mais qu'une expertise est indispensable avant une priorit\xE9 fiable, utilise \xAB expertise n\xE9cessaire \xBB, \xAB \xC0 confirmer / expertise n\xE9cessaire \xBB et un co\xFBt 0/0.`;

// api/_lib/providerFailure.ts
function record(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value) ? value : void 0;
}
function errorObjects(error) {
  const outer = record(error);
  if (!outer) return [];
  const objects = [outer];
  const wrapped = record(outer.error);
  if (wrapped) objects.push(wrapped);
  if (typeof outer.message === "string" && outer.message.length <= 65536) {
    try {
      const parsed = record(JSON.parse(outer.message));
      if (parsed) {
        objects.push(parsed);
        const inner = record(parsed.error);
        if (inner) objects.push(inner);
      }
    } catch {
    }
  }
  return objects;
}
function getProviderStatus(error) {
  for (const object of errorObjects(error)) {
    for (const property of ["status", "code"]) {
      const value = Number(object[property]);
      if (Number.isInteger(value) && value >= 400 && value <= 599) return value;
    }
  }
  return 0;
}
function boundedSeconds(value) {
  return Number.isFinite(value) && value > 0 && value <= 86400 ? Math.ceil(value) : void 0;
}
function retryDuration(value) {
  if (typeof value === "string" && /^\d+(?:\.\d+)?s$/.test(value)) {
    return boundedSeconds(Number(value.slice(0, -1)));
  }
  const duration = record(value);
  if (!duration) return void 0;
  const seconds = Number(duration.seconds ?? 0);
  const nanos = Number(duration.nanos ?? 0);
  if (!Number.isInteger(seconds) || !Number.isInteger(nanos) || nanos < 0 || nanos >= 1e9) return void 0;
  return boundedSeconds(seconds + nanos / 1e9);
}
function retryHeaderSeconds(value) {
  if (!value) return void 0;
  const trimmed = value.trim();
  if (/^\d+(?:\.\d+)?$/.test(trimmed)) return boundedSeconds(Number(trimmed));
  const timestamp = Date.parse(trimmed);
  return Number.isFinite(timestamp) ? boundedSeconds((timestamp - Date.now()) / 1e3) : void 0;
}
function providerError(error, retryAfterHeader) {
  const status = getProviderStatus(error);
  const details = errorObjects(error).flatMap((object) => Array.isArray(object.details) ? object.details : []);
  const retrySeconds = details.flatMap((detail) => {
    const value = record(detail);
    return typeof value?.["@type"] === "string" && value["@type"].endsWith("/google.rpc.RetryInfo") ? [retryDuration(value.retryDelay ?? value.retry_delay)] : [];
  }).filter((value) => value !== void 0);
  const headerSeconds = retryHeaderSeconds(retryAfterHeader);
  if (headerSeconds !== void 0) retrySeconds.push(headerSeconds);
  if (status === 429) {
    const violations = details.flatMap((detail) => {
      const value = record(detail);
      return typeof value?.["@type"] === "string" && value["@type"].endsWith("/google.rpc.QuotaFailure") && Array.isArray(value.violations) ? value.violations : [];
    });
    const windows = violations.map((violation) => {
      const value = record(violation);
      const identifiers = [value?.quotaId, value?.quota_id, value?.quotaMetric, value?.quota_metric].filter((item) => typeof item === "string").join(" ").toLowerCase().replace(/[^a-z0-9]/g, "");
      if (/perday|daily/.test(identifiers)) return "daily";
      if (/perminute|persecond/.test(identifiers)) return "rate";
      return "unknown";
    });
    if (windows.includes("daily")) {
      return new HttpError(429, "Quota quotidien Gemini \xE9puis\xE9 pour ce projet Google. Les r\xE9sultats sont conserv\xE9s ; reprenez apr\xE8s son renouvellement.", {
        code: "quota_daily",
        canRetry: false
      });
    }
    if (windows.length > 0 && windows.every((window) => window === "rate")) {
      return new HttpError(429, "Limite de d\xE9bit Gemini atteinte. Une pause est n\xE9cessaire avant la reprise.", {
        code: "rate_limit",
        canRetry: true,
        retryAfterSeconds: retrySeconds.length ? Math.max(...retrySeconds) : 60
      });
    }
    return new HttpError(429, "Limite Gemini atteinte, sans pr\xE9cision sur son renouvellement. Les r\xE9sultats sont conserv\xE9s ; v\xE9rifiez le quota du projet dans Google AI Studio.", {
      code: "quota_unknown",
      canRetry: false
    });
  }
  if (status === 503 || status === 504) {
    return new HttpError(503, "Gemini est temporairement indisponible. Une pause est n\xE9cessaire avant une nouvelle tentative.", {
      code: "provider_unavailable",
      canRetry: true,
      retryAfterSeconds: Math.max(...retrySeconds, 30)
    });
  }
  if (status === 401 || status === 403) {
    return new HttpError(403, "La cl\xE9 Gemini de ce membre est invalide ou n'a pas acc\xE8s au mod\xE8le.");
  }
  if (status === 404) {
    return new HttpError(502, "Le mod\xE8le Gemini configur\xE9 n'est pas disponible pour cette cl\xE9. Contactez l'administrateur.");
  }
  return new HttpError(502, "L'analyse Gemini a \xE9chou\xE9. R\xE9essayez cette photo.");
}

// api/_lib/analyze.ts
var PRIMARY_MODEL = process.env.GEMINI_MODEL?.trim() || "gemini-3.6-flash";
function resolveFallbackModel(configuredFallbackModel) {
  const model = configuredFallbackModel?.trim();
  return model === "gemini-2.5-flash" ? "gemini-3.5-flash-lite" : model || "gemini-3.5-flash-lite";
}
var FALLBACK_MODEL = resolveFallbackModel(process.env.GEMINI_FALLBACK_MODEL);
var MAX_IMAGE_BYTES = 3e6;
var ALLOWED_MIME_TYPES = /* @__PURE__ */ new Set(["image/jpeg", "image/png", "image/webp"]);
var MODEL_TIMEOUT_MS = 25e3;
var ANALYSIS_TIMEOUT_MS = 55e3;
var RESPONSE_SCHEMA = {
  type: Type.OBJECT,
  properties: {
    statut_analyse: { type: Type.STRING, enum: [...STATUTS_ANALYSE] },
    priorite: { type: Type.STRING, enum: [...DIAGNOSTIC_NIVEAUX] },
    famille: { type: Type.STRING },
    localisation: { type: Type.STRING },
    perimetre: { type: Type.STRING, enum: [...PERIMETRES_APPARENTS] },
    etat_observations: { type: Type.STRING },
    intervention: { type: Type.STRING },
    cout_estime_min_ttc_eur: { type: Type.INTEGER },
    cout_estime_max_ttc_eur: { type: Type.INTEGER },
    confiance: { type: Type.STRING, enum: [...NIVEAUX_CONFIANCE] }
  },
  required: [
    "statut_analyse",
    "priorite",
    "famille",
    "localisation",
    "perimetre",
    "etat_observations",
    "intervention",
    "cout_estime_min_ttc_eur",
    "cout_estime_max_ttc_eur",
    "confiance"
  ]
};
function isExpectedImage(bytes, mimeType) {
  if (mimeType === "image/jpeg") return bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255;
  if (mimeType === "image/png") return bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
  return bytes.subarray(0, 4).toString() === "RIFF" && bytes.subarray(8, 12).toString() === "WEBP";
}
function validateImage(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    throw new HttpError(400, "Une photo est requise.");
  }
  const { imageBase64, mimeType } = body;
  const recoveryAttempt = body.recoveryAttempt;
  if (recoveryAttempt !== void 0 && typeof recoveryAttempt !== "boolean") {
    throw new HttpError(400, "Option de reprise invalide.");
  }
  if (typeof imageBase64 !== "string" || typeof mimeType !== "string" || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new HttpError(400, "Photo invalide. Formats accept\xE9s : JPG, PNG et WEBP.");
  }
  const declaredLocalisation = body.localisation;
  const localisation = declaredLocalisation === void 0 ? "non renseign\xE9e" : declaredLocalisation;
  if (!isOneOf(localisation, LOCALISATIONS_PHOTO)) {
    throw new HttpError(400, "Localisation invalide. Choisissez Parties communes, Parties privatives ou Non renseign\xE9e.");
  }
  const prefix = /^data:([^;]+);base64,/.exec(imageBase64);
  if (imageBase64.startsWith("data:") && (!prefix || prefix[1] !== mimeType)) {
    throw new HttpError(400, "Le format d\xE9clar\xE9 ne correspond pas \xE0 la photo.");
  }
  const data = prefix ? imageBase64.slice(prefix[0].length) : imageBase64;
  if (!data || data.length > 4e6 || data.length % 4 !== 0 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new HttpError(413, "Photo trop volumineuse ou illisible.");
  }
  const bytes = Buffer.from(data, "base64");
  if (bytes.length === 0 || bytes.length > MAX_IMAGE_BYTES || !isExpectedImage(bytes, mimeType)) {
    throw new HttpError(400, "Photo illisible ou trop volumineuse.");
  }
  return { data, mimeType, localisation, recoveryAttempt: recoveryAttempt === true };
}
function isOneOf(value, choices) {
  return typeof value === "string" && choices.includes(value);
}
function isNonEmptyText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isEstimatedCost(value) {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 1e7;
}
function validateResult(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new HttpError(502, "Le diagnostic re\xE7u est invalide. R\xE9essayez cette photo.");
  }
  const result = value;
  if (!isOneOf(result.statut_analyse, STATUTS_ANALYSE) || !isOneOf(result.priorite, DIAGNOSTIC_NIVEAUX) || !isNonEmptyText(result.famille) || !isNonEmptyText(result.localisation) || !isOneOf(result.perimetre, PERIMETRES_APPARENTS) || !isNonEmptyText(result.etat_observations) || !isNonEmptyText(result.intervention) || !isEstimatedCost(result.cout_estime_min_ttc_eur) || !isEstimatedCost(result.cout_estime_max_ttc_eur) || result.cout_estime_min_ttc_eur > result.cout_estime_max_ttc_eur || result.cout_estime_min_ttc_eur === 0 !== (result.cout_estime_max_ttc_eur === 0) || !isOneOf(result.confiance, NIVEAUX_CONFIANCE)) {
    throw new HttpError(502, "Le diagnostic re\xE7u est incomplet. R\xE9essayez cette photo.");
  }
  if (result.statut_analyse === "image non exploitable" && (result.priorite !== "\xC0 confirmer / expertise n\xE9cessaire" || result.confiance !== "faible")) {
    throw new HttpError(502, "Le diagnostic re\xE7u est incoh\xE9rent. R\xE9essayez cette photo.");
  }
  if (result.statut_analyse === "expertise n\xE9cessaire" && result.priorite !== "\xC0 confirmer / expertise n\xE9cessaire") {
    throw new HttpError(502, "Le diagnostic re\xE7u est incoh\xE9rent. R\xE9essayez cette photo.");
  }
  if ((result.priorite === "Entretien" || result.priorite === "Signalement hors PPPT \xE0 v\xE9rifier" || result.priorite === "\xC0 confirmer / expertise n\xE9cessaire") && (result.cout_estime_min_ttc_eur !== 0 || result.cout_estime_max_ttc_eur !== 0)) {
    throw new HttpError(502, "Le chiffrage re\xE7u est incoh\xE9rent. R\xE9essayez cette photo.");
  }
  return result;
}
function logAnalysisEvent(outcome, localisation, stage, model, upstreamStatus) {
  const event = { outcome, localisation, stage, model, upstreamStatus };
  if (outcome === "attempt_failed") {
    console.error("[Gemini] analysis event", event);
    return;
  }
  console.info("[Gemini] analysis event", event);
}
function logProviderFailure(localisation, model, error) {
  logAnalysisEvent(
    "attempt_failed",
    localisation,
    "provider",
    model,
    getProviderStatus(error) || void 0
  );
}
async function withGeminiFallback(request, primaryModel, fallbackModel, onFailure = () => void 0, signal) {
  signal?.throwIfAborted();
  try {
    return await request(primaryModel);
  } catch (primaryError) {
    onFailure(primaryModel, primaryError);
    signal?.throwIfAborted();
    const status = getProviderStatus(primaryError);
    if (status !== 503 && status !== 504 || fallbackModel === primaryModel) {
      throw primaryError;
    }
  }
  signal?.throwIfAborted();
  try {
    return await request(fallbackModel);
  } catch (fallbackError) {
    onFailure(fallbackModel, fallbackError);
    throw fallbackError;
  }
}
async function generateWithModel(ai, model, data, mimeType, localisation, signal) {
  const thinkingConfig = model.startsWith("gemini-3.") ? { thinkingLevel: ThinkingLevel.MINIMAL } : model.startsWith("gemini-2.5") ? { thinkingBudget: 0 } : void 0;
  const localisationContext = localisation === "non renseign\xE9e" ? "Localisation d\xE9clar\xE9e par l'utilisateur : Non renseign\xE9e. Ne d\xE9duis pas le p\xE9rim\xE8tre depuis ce seul champ ; utilise \xAB ind\xE9termin\xE9 \xBB lorsque la photo ne suffit pas." : `Localisation d\xE9clar\xE9e par l'utilisateur pour cette photo : ${LOCALISATION_LABELS[localisation]}.`;
  signal.throwIfAborted();
  const modelController = new AbortController();
  let timedOut = false;
  const onAbort = () => modelController.abort();
  signal.addEventListener("abort", onAbort, { once: true });
  const modelTimer = setTimeout(() => {
    timedOut = true;
    modelController.abort();
  }, MODEL_TIMEOUT_MS);
  try {
    return await ai.models.generateContent({
      model,
      contents: [
        { inlineData: { mimeType, data } },
        `Analyse cette photo de visite technique conform\xE9ment aux instructions syst\xE8me strictes et renvoie le diagnostic au format JSON.
${localisationContext}`
      ],
      config: {
        abortSignal: modelController.signal,
        systemInstruction: SYSTEM_INSTRUCTION,
        temperature: 0.15,
        maxOutputTokens: 1600,
        responseMimeType: "application/json",
        responseSchema: RESPONSE_SCHEMA,
        ...thinkingConfig ? { thinkingConfig } : {}
      }
    });
  } catch (error) {
    if (timedOut && !signal.aborted) {
      throw Object.assign(new Error("Gemini model deadline reached"), { status: 504 });
    }
    throw error;
  } finally {
    clearTimeout(modelTimer);
    signal.removeEventListener("abort", onAbort);
  }
}
async function analyzePhoto(body, apiKey, callerSignal) {
  const { data, mimeType, localisation, recoveryAttempt } = validateImage(body);
  if (callerSignal?.aborted) {
    throw new HttpError(499, "Analyse annul\xE9e.", { code: "request_aborted", canRetry: false });
  }
  let retryAfterHeader = null;
  const ai = new GoogleGenAI({
    apiKey,
    httpOptions: {
      timeout: MODEL_TIMEOUT_MS,
      retryOptions: { attempts: 1 },
      fetch: async (input, init) => {
        retryAfterHeader = null;
        const response2 = await globalThis.fetch(input, init);
        retryAfterHeader = response2.headers.get("Retry-After");
        return response2;
      }
    }
  });
  const analysisController = new AbortController();
  const onCallerAbort = () => analysisController.abort();
  callerSignal?.addEventListener("abort", onCallerAbort, { once: true });
  const analysisTimer = setTimeout(() => analysisController.abort(), ANALYSIS_TIMEOUT_MS);
  let response;
  let selectedModel;
  try {
    response = await withGeminiFallback(
      (model) => {
        selectedModel = model;
        return generateWithModel(ai, model, data, mimeType, localisation, analysisController.signal);
      },
      recoveryAttempt ? FALLBACK_MODEL : PRIMARY_MODEL,
      FALLBACK_MODEL,
      (model, error) => logProviderFailure(localisation, model, error),
      analysisController.signal
    );
  } catch (error) {
    if (callerSignal?.aborted) {
      throw new HttpError(499, "Analyse annul\xE9e.", { code: "request_aborted", canRetry: false });
    }
    if (analysisController.signal.aborted) {
      throw providerError({ status: 504 });
    }
    throw providerError(error, retryAfterHeader);
  } finally {
    clearTimeout(analysisTimer);
    callerSignal?.removeEventListener("abort", onCallerAbort);
  }
  if (!response.text) {
    logAnalysisEvent("attempt_failed", localisation, "response_empty", selectedModel);
    throw new HttpError(502, "Gemini a renvoy\xE9 un diagnostic vide.");
  }
  let parsed;
  try {
    parsed = JSON.parse(response.text);
  } catch {
    logAnalysisEvent("attempt_failed", localisation, "response_json", selectedModel);
    throw new HttpError(502, "Gemini a renvoy\xE9 un diagnostic illisible.");
  }
  try {
    const diagnostic = validateResult(parsed);
    logAnalysisEvent("success", localisation, "completed", selectedModel);
    return diagnostic;
  } catch (error) {
    logAnalysisEvent("attempt_failed", localisation, "response_contract", selectedModel);
    throw error;
  }
}

// api/_lib/auth.ts
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
function getFirebaseAdminApp() {
  const existing = getApps().find((app) => app.name === "diagnostic-auth");
  if (existing) return existing;
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new HttpError(503, "L'authentification du serveur n'est pas configur\xE9e.");
  }
  return initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
    projectId
  }, "diagnostic-auth");
}
async function verifyMember(authorization) {
  const match = /^Bearer ([^\s]+)$/.exec(authorization ?? "");
  if (!match) {
    throw new HttpError(401, "Connexion requise.");
  }
  let decoded;
  try {
    decoded = await getAuth(getFirebaseAdminApp()).verifyIdToken(match[1], true);
  } catch (error) {
    if (error instanceof HttpError) throw error;
    throw new HttpError(401, "Session expir\xE9e ou invalide. Reconnectez-vous.");
  }
  if (decoded.firebase?.sign_in_provider !== "google.com") {
    throw new HttpError(403, "Connectez-vous avec un compte Google autoris\xE9.");
  }
  return { uid: decoded.uid, email: decoded.email ?? null };
}
function getMemberKey(uid) {
  const raw = process.env.GEMINI_KEYS_BY_UID;
  if (!raw) {
    throw new HttpError(503, "Les cl\xE9s des membres ne sont pas configur\xE9es.");
  }
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new HttpError(503, "La configuration des cl\xE9s des membres est invalide.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new HttpError(503, "La configuration des cl\xE9s des membres est invalide.");
  }
  const key = parsed[uid];
  return typeof key === "string" && key.trim() ? key.trim() : null;
}
async function requireAuthorizedMember(authorization) {
  const member = await verifyMember(authorization);
  const apiKey = getMemberKey(member.uid);
  if (!apiKey) {
    throw new HttpError(403, "Ce compte n'est pas encore autoris\xE9. Contactez l'administrateur.");
  }
  return { ...member, apiKey };
}

// api/analyze.ts
var analyze_default = {
  async fetch(request) {
    if (request.method !== "POST") {
      return Response.json({ error: "M\xE9thode non autoris\xE9e." }, { status: 405, headers: { Allow: "POST" } });
    }
    try {
      const member = await requireAuthorizedMember(request.headers.get("authorization"));
      const body = await request.json().catch(() => {
        throw new HttpError(400, "Corps de requ\xEAte JSON invalide.");
      });
      const result = await analyzePhoto(body, member.apiKey, request.signal);
      return Response.json(result);
    } catch (error) {
      const response = publicError(error);
      const { status, ...payload } = response;
      return Response.json(payload, { status, headers: publicErrorHeaders(response) });
    }
  }
};

// api/me.ts
var me_default = {
  async fetch(request) {
    if (request.method !== "GET") {
      return Response.json({ error: "M\xE9thode non autoris\xE9e." }, { status: 405, headers: { Allow: "GET" } });
    }
    try {
      const member = await verifyMember(request.headers.get("authorization"));
      return Response.json({
        uid: member.uid,
        email: member.email,
        authorized: Boolean(getMemberKey(member.uid))
      });
    } catch (error) {
      const response = publicError(error);
      return Response.json({ error: response.error }, { status: response.status });
    }
  }
};

// tests/security.test.ts
test("the API rejects callers without a verified identity", async () => {
  const analyze = await analyze_default.fetch(new Request("http://localhost/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}"
  }));
  const me = await me_default.fetch(new Request("http://localhost/api/me"));
  assert.equal(analyze.status, 401);
  assert.equal(me.status, 401);
});
test("member keys are selected only by the requested Firebase uid", () => {
  const original = process.env.GEMINI_KEYS_BY_UID;
  process.env.GEMINI_KEYS_BY_UID = JSON.stringify({ memberA: "key-a", memberB: "key-b" });
  try {
    assert.equal(getMemberKey("memberA"), "key-a");
    assert.equal(getMemberKey("memberB"), "key-b");
    assert.equal(getMemberKey("unknown"), null);
  } finally {
    if (original === void 0) delete process.env.GEMINI_KEYS_BY_UID;
    else process.env.GEMINI_KEYS_BY_UID = original;
  }
});
test("invalid images are rejected before any Gemini call", async () => {
  await assert.rejects(
    analyzePhoto({ imageBase64: "AAAA", mimeType: "image/jpeg" }, "unused-test-key"),
    (error) => error instanceof HttpError && error.status === 400
  );
});
test("a transient primary model failure uses the configured fallback model", async () => {
  const models = [];
  const result = await withGeminiFallback(async (model) => {
    models.push(model);
    if (model === "primary") throw Object.assign(new Error("Unavailable"), { status: 503 });
    return "diagnostic";
  }, "primary", "fallback");
  assert.equal(result, "diagnostic");
  assert.deepEqual(models, ["primary", "fallback"]);
});
test("the deprecated Gemini 2.5 fallback is migrated for new projects", () => {
  assert.equal(resolveFallbackModel(void 0), "gemini-3.5-flash-lite");
  assert.equal(resolveFallbackModel(" gemini-2.5-flash "), "gemini-3.5-flash-lite");
  assert.equal(resolveFallbackModel("gemini-3.5-flash"), "gemini-3.5-flash");
});
test("quota and authorization failures never use the fallback model", async () => {
  for (const status of [401, 403, 429]) {
    const models = [];
    await assert.rejects(
      withGeminiFallback(async (model) => {
        models.push(model);
        throw Object.assign(new Error("Rejected"), { status });
      }, "primary", "fallback"),
      (error) => error instanceof Error && "status" in error && error.status === status
    );
    assert.deepEqual(models, ["primary"]);
  }
});
function quotaFailure(quotaIds, retryDelay) {
  return {
    code: 429,
    status: "RESOURCE_EXHAUSTED",
    details: [
      {
        "@type": "type.googleapis.com/google.rpc.QuotaFailure",
        violations: quotaIds.map((quotaId) => ({
          quotaId,
          quotaMetric: "generativelanguage.googleapis.com/generate_content_free_tier_requests"
        }))
      },
      ...retryDelay ? [{ "@type": "type.googleapis.com/google.rpc.RetryInfo", retryDelay }] : []
    ]
  };
}
test("daily Google quotas stop even when Google also supplies RetryInfo", () => {
  const detail = quotaFailure(["GenerateRequestsPerDayPerProjectPerModel-FreeTier"], "12s");
  for (const error of [detail, { error: detail }, Object.assign(new Error(JSON.stringify({ error: detail })), { status: 429 })]) {
    const response = publicError(providerError(error, "5"));
    assert.equal(response.status, 429);
    assert.equal(response.code, "quota_daily");
    assert.equal(response.canRetry, false);
    assert.equal(response.retryAfterSeconds, void 0);
    assert.deepEqual(publicErrorHeaders(response), {});
  }
});
test("minute request and token quotas respect structured retry delays", () => {
  for (const quotaId of ["GenerateRequestsPerMinutePerProjectPerModel-FreeTier", "GenerateContentInputTokensPerModelPerMinute"]) {
    const response = publicError(providerError({ error: quotaFailure([quotaId], "8.4s") }, "10"));
    assert.equal(response.code, "rate_limit");
    assert.equal(response.canRetry, true);
    assert.equal(response.retryAfterSeconds, 10);
    assert.deepEqual(publicErrorHeaders(response), { "Retry-After": "10" });
  }
  assert.equal(publicError(providerError(quotaFailure(["GenerateRequestsPerMinute"]))).retryAfterSeconds, 60);
});
test("unidentified or mixed quota windows do not trigger automatic retries", () => {
  for (const error of [
    { status: 429, message: "Quota exceeded for this project" },
    quotaFailure(["unknown-quota"], "5s"),
    quotaFailure(["GenerateRequestsPerMinute", "unknown-quota"], "5s")
  ]) {
    const response = publicError(providerError(error, "5"));
    assert.equal(response.code, "quota_unknown");
    assert.equal(response.canRetry, false);
    assert.equal(response.retryAfterSeconds, void 0);
  }
  assert.equal(publicError(providerError(quotaFailure(["GenerateRequestsPerMinute", "GenerateRequestsPerDay"]))).code, "quota_daily");
});
test("provider metadata exposes only safe allowlisted fields", () => {
  const secret = "private-key-and-provider-message";
  const error = new HttpError(503, "Temporary failure", {
    code: "provider_unavailable",
    canRetry: true,
    retryAfterSeconds: 30,
    apiKey: secret,
    rawMessage: secret,
    photo: secret,
    uid: secret
  });
  const response = publicError(error);
  assert.deepEqual(Object.keys(response).sort(), ["canRetry", "code", "error", "retryAfterSeconds", "status"]);
  assert.ok(!JSON.stringify(response).includes(secret));
  const unknown = publicError(new HttpError(429, "Limit", { code: secret, canRetry: true }));
  assert.deepEqual(unknown, { status: 429, error: "Limit" });
  for (const status of [503, 504]) {
    const mapped = publicError(providerError({ status, message: secret }));
    assert.equal(mapped.code, "provider_unavailable");
    assert.equal(mapped.retryAfterSeconds, 30);
    assert.ok(!JSON.stringify(mapped).includes(secret));
  }
  assert.equal(getProviderStatus(new Error(JSON.stringify({ error: { code: 503 } }))), 503);
});
test("cancellation after a transient error prevents any fallback request", async () => {
  const controller = new AbortController();
  const models = [];
  await assert.rejects(withGeminiFallback(async (model) => {
    models.push(model);
    controller.abort();
    throw { status: 503 };
  }, "primary", "fallback", void 0, controller.signal), (error) => error instanceof Error && error.name === "AbortError");
  assert.deepEqual(models, ["primary"]);
});
test("the fallback error is preserved when both Gemini models are unavailable", async () => {
  const fallbackFailure = Object.assign(new Error("Fallback unavailable"), { status: 504 });
  await assert.rejects(
    withGeminiFallback(async (model) => {
      if (model === "primary") throw Object.assign(new Error("Primary unavailable"), { status: 503 });
      throw fallbackFailure;
    }, "primary", "fallback"),
    (error) => error === fallbackFailure
  );
});
var conciseDiagnostic = {
  statut_analyse: "constat photographique indicatif",
  priorite: "Curatif Niveau 2",
  famille: "Fa\xE7ades ext\xE9rieures",
  localisation: "Fa\xE7ade ext\xE9rieure visible sur la photo",
  perimetre: "partie commune",
  etat_observations: "Une fissure est visible sur la fa\xE7ade.",
  intervention: "Programmer un contr\xF4le de la fa\xE7ade avant de d\xE9finir les travaux.",
  cout_estime_min_ttc_eur: 0,
  cout_estime_max_ttc_eur: 0,
  confiance: "moyen"
};
test("the report-style diagnostic contract accepts the essential PPPT fields", () => {
  assert.deepEqual(validateResult(conciseDiagnostic), conciseDiagnostic);
  const priced = { ...conciseDiagnostic, cout_estime_min_ttc_eur: 1200, cout_estime_max_ttc_eur: 2e3 };
  assert.deepEqual(validateResult(priced), priced);
});
test("maintenance and uncertain results cannot carry an invented cost", () => {
  for (const priority of ["Entretien", "Signalement hors PPPT \xE0 v\xE9rifier", "\xC0 confirmer / expertise n\xE9cessaire"]) {
    assert.throws(
      () => validateResult({ ...conciseDiagnostic, priorite: priority, cout_estime_min_ttc_eur: 100, cout_estime_max_ttc_eur: 200 }),
      (error) => error instanceof HttpError && error.status === 502
    );
  }
});
test("an unusable image can be returned without inventing a priority", () => {
  const unusable = {
    ...conciseDiagnostic,
    statut_analyse: "image non exploitable",
    priorite: "\xC0 confirmer / expertise n\xE9cessaire",
    famille: "Non d\xE9terminable",
    localisation: "Localisation pr\xE9cise \xE0 confirmer sur site",
    perimetre: "ind\xE9termin\xE9",
    etat_observations: "L\u2019image est trop floue pour identifier l\u2019ouvrage.",
    intervention: "Demander une nouvelle photo nette ou r\xE9aliser une visite.",
    confiance: "faible"
  };
  assert.deepEqual(validateResult(unusable), unusable);
  assert.throws(
    () => validateResult({ ...unusable, priorite: "Curatif Niveau 1" }),
    (error) => error instanceof HttpError && error.status === 502
  );
});
test("unknown priorities and malformed report fields are rejected", () => {
  for (const invalid of [
    { ...conciseDiagnostic, priorite: "Signalement" },
    { ...conciseDiagnostic, famille: "" },
    { ...conciseDiagnostic, etat_observations: "" },
    { ...conciseDiagnostic, intervention: ["inspection"] },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: -1 },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: 1500, cout_estime_max_ttc_eur: 1e3 },
    { ...conciseDiagnostic, cout_estime_min_ttc_eur: 0, cout_estime_max_ttc_eur: 1e3 }
  ]) {
    assert.throws(
      () => validateResult(invalid),
      (error) => error instanceof HttpError && error.status === 502
    );
  }
});
var validPhoto = { imageBase64: "/9j/2w==", mimeType: "image/jpeg" };
function geminiResponse(diagnostic = conciseDiagnostic) {
  return Response.json({ candidates: [{ content: { role: "model", parts: [{ text: JSON.stringify(diagnostic) }] }, finishReason: "STOP" }] });
}
test("photos without a declared location send explicit neutral context and keep the JSON response", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    requests.push(await new Request(input, init).json());
    return geminiResponse();
  });
  for (const photo of [validPhoto, { ...validPhoto, localisation: "non renseign\xE9e" }]) {
    assert.deepEqual(await analyzePhoto(photo, "unused-test-key"), conciseDiagnostic);
  }
  assert.equal(requests.length, 2);
  assert.deepEqual(requests[0].contents, requests[1].contents);
  const responseSchema = requests[0].generationConfig?.responseSchema;
  assert.ok(responseSchema);
  assert.deepEqual(responseSchema.required, [
    "statut_analyse",
    "priorite",
    "famille",
    "localisation",
    "perimetre",
    "etat_observations",
    "intervention",
    "cout_estime_min_ttc_eur",
    "cout_estime_max_ttc_eur",
    "confiance"
  ]);
  assert.equal(responseSchema.properties.remarque_technique, void 0);
  assert.ok(requests[0].contents.flatMap((content) => content.parts).some((part) => part.inlineData?.data === validPhoto.imageBase64));
  assert.match(
    JSON.stringify(requests[0].contents),
    /Localisation déclarée.*Non renseignée.*Ne déduis pas le périmètre/
  );
});
test("each photo carries its own declared location in a single Gemini request", async (t) => {
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    requests.push(await new Request(input, init).json());
    return geminiResponse();
  });
  await analyzePhoto({ ...validPhoto, localisation: "partie commune" }, "unused-test-key");
  await analyzePhoto({ ...validPhoto, localisation: "partie privative" }, "unused-test-key");
  assert.equal(requests.length, 2);
  assert.match(JSON.stringify(requests[0].contents), /Localisation déclarée.*Parties communes/);
  assert.match(JSON.stringify(requests[1].contents), /Localisation déclarée.*Parties privatives/);
  assert.ok(!JSON.stringify(requests[0].contents).includes("Parties privatives"));
});
test("invalid locations are rejected before consuming any Gemini request", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => geminiResponse());
  for (const localisation of [null, "", "hall", false, {}, ["partie commune"]]) {
    await assert.rejects(
      analyzePhoto({ ...validPhoto, localisation }, "unused-test-key"),
      (error) => error instanceof HttpError && error.status === 400
    );
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});
test("recovery calls use only the fixed fallback and reject invalid recovery options", async (t) => {
  const urls = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    urls.push(new Request(input, init).url);
    return geminiResponse();
  });
  await analyzePhoto({ ...validPhoto, recoveryAttempt: true, model: "untrusted-model", apiKey: "untrusted-key" }, "unused-test-key");
  assert.equal(urls.length, 1);
  assert.ok(urls[0].includes(resolveFallbackModel(process.env.GEMINI_FALLBACK_MODEL)));
  assert.ok(!urls[0].includes("untrusted"));
  for (const recoveryAttempt of ["true", 1, null, {}, []]) {
    await assert.rejects(
      analyzePhoto({ ...validPhoto, recoveryAttempt }, "unused-test-key"),
      (error) => error instanceof HttpError && error.status === 400
    );
  }
  assert.equal(urls.length, 1);
});
test("an aborted request spends no Gemini call", async (t) => {
  const fetchMock = t.mock.method(globalThis, "fetch", async () => geminiResponse());
  const controller = new AbortController();
  controller.abort();
  await assert.rejects(
    analyzePhoto(validPhoto, "unused-test-key", controller.signal),
    (error) => error instanceof HttpError && error.metadata?.code === "request_aborted"
  );
  assert.equal(fetchMock.mock.callCount(), 0);
});
test("Retry-After from the provider survives SDK error wrapping safely", async (t) => {
  t.mock.method(console, "error", () => void 0);
  const fetchMock = t.mock.method(globalThis, "fetch", async () => Response.json({
    error: quotaFailure(["GenerateRequestsPerMinute"], "3s")
  }, { status: 429, headers: { "Retry-After": "7" } }));
  await assert.rejects(analyzePhoto(validPhoto, "unused-test-key"), (error) => {
    if (!(error instanceof HttpError)) return false;
    assert.equal(error.metadata?.code, "rate_limit");
    assert.equal(error.metadata?.retryAfterSeconds, 7);
    return true;
  });
  assert.equal(fetchMock.mock.callCount(), 1);
});
test("model deadlines bound both provider attempts and propagate SDK abort signals", async (t) => {
  t.mock.timers.enable({ apis: ["setTimeout"] });
  t.mock.method(console, "error", () => void 0);
  const requests = [];
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    requests.push(request);
    return new Promise((_resolve, reject) => {
      request.signal.addEventListener("abort", () => reject(new DOMException("Aborted", "AbortError")), { once: true });
    });
  });
  const pending = analyzePhoto(validPhoto, "unused-test-key");
  const failure = assert.rejects(pending, (error) => error instanceof HttpError && error.metadata?.code === "provider_unavailable");
  for (let i = 0; i < 50 && requests.length < 1; i++) await Promise.resolve();
  assert.equal(requests.length, 1);
  t.mock.timers.tick(25e3);
  for (let i = 0; i < 50 && requests.length < 2; i++) await Promise.resolve();
  assert.equal(requests.length, 2);
  assert.equal(requests[0].signal.aborted, true);
  t.mock.timers.tick(25e3);
  await failure;
  assert.equal(requests[1].signal.aborted, true);
  assert.ok(requests.every((request) => request.headers.get("x-server-timeout") === "25"));
});
test("provider failure telemetry is allowlisted and identifies the declared location", async (t) => {
  const logs = [];
  const apiKey = "test-secret-gemini-key";
  t.mock.method(console, "error", (...args) => {
    logs.push(args);
  });
  t.mock.method(globalThis, "fetch", async () => Response.json({
    error: {
      code: 429,
      message: `${apiKey} ${validPhoto.imageBase64} provider message that must not be logged`
    }
  }, { status: 429 }));
  await assert.rejects(
    analyzePhoto({ ...validPhoto, localisation: "non renseign\xE9e" }, apiKey),
    (error) => error instanceof HttpError && error.status === 429
  );
  assert.equal(logs.length, 1);
  assert.equal(logs[0][0], "[Gemini] analysis event");
  const event = logs[0][1];
  assert.deepEqual(Object.keys(event).sort(), ["localisation", "model", "outcome", "stage", "upstreamStatus"]);
  assert.equal(event.outcome, "attempt_failed");
  assert.equal(event.localisation, "non renseign\xE9e");
  assert.equal(event.stage, "provider");
  assert.equal(event.upstreamStatus, 429);
  assert.equal(typeof event.model, "string");
  assert.ok(!JSON.stringify(logs).includes(apiKey));
  assert.ok(!JSON.stringify(logs).includes(validPhoto.imageBase64));
  assert.ok(!JSON.stringify(logs).includes("provider message that must not be logged"));
});
test("contract failure telemetry contains no Gemini response content", async (t) => {
  const logs = [];
  const distinctiveResponseText = "This diagnostic text must not appear in telemetry.";
  t.mock.method(console, "error", (...args) => {
    logs.push(args);
  });
  t.mock.method(globalThis, "fetch", async () => geminiResponse({
    ...conciseDiagnostic,
    priorite: "Invalid priority",
    etat_observations: distinctiveResponseText
  }));
  await assert.rejects(
    analyzePhoto({ ...validPhoto, localisation: "non renseign\xE9e" }, "unused-test-key"),
    (error) => error instanceof HttpError && error.status === 502
  );
  assert.equal(logs.length, 1);
  const event = logs[0][1];
  assert.equal(event.outcome, "attempt_failed");
  assert.equal(event.localisation, "non renseign\xE9e");
  assert.equal(event.stage, "response_contract");
  assert.equal(typeof event.model, "string");
  assert.ok(!JSON.stringify(logs).includes(distinctiveResponseText));
  assert.ok(!JSON.stringify(logs).includes(validPhoto.imageBase64));
});
test("the fallback preserves photo context and a serious private-to-common risk priority", async (t) => {
  const requests = [];
  const seriousDiagnostic = {
    ...conciseDiagnostic,
    priorite: "Curatif Niveau 1",
    perimetre: "partie privative",
    etat_observations: "Le d\xE9sordre pourrait affecter un r\xE9seau collectif, \xE0 v\xE9rifier sur site."
  };
  t.mock.method(console, "error", () => void 0);
  t.mock.method(globalThis, "fetch", async (input, init) => {
    const request = new Request(input, init);
    requests.push({ url: request.url, body: await request.json() });
    return requests.length === 1 ? Response.json({ error: { code: 503, message: "Unavailable", status: "UNAVAILABLE" } }, { status: 503 }) : geminiResponse(seriousDiagnostic);
  });
  assert.deepEqual(await analyzePhoto({ ...validPhoto, localisation: "partie privative" }, "unused-test-key"), seriousDiagnostic);
  assert.equal(requests.length, 2);
  assert.notEqual(requests[0].url, requests[1].url);
  assert.deepEqual(requests[0].body.contents, requests[1].body.contents);
  assert.match(JSON.stringify(requests[1].body.contents), /Localisation déclarée.*Parties privatives/);
});
