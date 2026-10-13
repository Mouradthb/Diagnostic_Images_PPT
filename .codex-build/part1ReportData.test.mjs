// tests/part1ReportData.test.ts
import assert from "node:assert/strict";
import { File as NodeFile } from "node:buffer";
import test from "node:test";

// src/part1/reportData.ts
var ROLES_VISUELS_PARTIE1 = [
  "photo_principale_copropriete",
  "extrait_cadastral",
  "vue_aerienne_rapprochee",
  "vue_patrimoniale"
];
var DONNEES_DERIVEES_PARTIE1 = [
  "texteMission",
  "textePiedPage",
  "nombreTotalPages",
  "numerotationPages",
  "renvoisSommaire"
];
var DECISIONS_PARTIE1_A_CONFIRMER = [
  {
    id: "origine_des_cartes",
    description: "La G\xE9oplateforme nationale est la source retenue pour les futures cartes g\xE9n\xE9r\xE9es ; les param\xE8tres exacts de r\xE9cup\xE9ration et de composition restent \xE0 impl\xE9menter."
  }
];
function createEmptyPart1ReportData() {
  return {
    rapport: {
      dateVisite: null,
      dateRapport: null,
      version: null
    },
    copropriete: {
      nom: null,
      adresse: null
    },
    donneurOrdre: {
      nom: null,
      adresse: null
    },
    equipe: {
      chargeProjet: { nom: null, fonction: null },
      verificateur: { nom: null, fonction: null },
      intervenantSite: { nom: null }
    },
    cadastre: {
      reference: null
    },
    batiment: {
      periodeConstruction: null,
      dateReglementCopropriete: null,
      dateImmatriculation: null,
      numeroImmatriculation: null,
      nombreBatiments: null,
      nombreEntrees: null,
      nombreLots: null,
      nombreNiveaux: null,
      nombreLotsPrincipaux: null,
      typeChauffage: null,
      nombreLotsHabitation: null,
      nombreAscenseurs: null,
      shabApproximative: null,
      altitude: null
    },
    patrimoine: {
      aucunPerimetreProtection: null,
      sitePatrimonialRemarquable: null,
      abordsMonumentHistorique: null
    },
    visuels: {}
  };
}

// src/part1/reportDataValidation.ts
var PART1_VISUAL_FILE_POLICY = {
  acceptedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
  maxBytes: 2e7
};
var PART1_REQUIRED_FIELD_PATHS = [
  "rapport.dateVisite",
  "rapport.dateRapport",
  "rapport.version",
  "copropriete.nom",
  "copropriete.adresse",
  "donneurOrdre.nom",
  "donneurOrdre.adresse",
  "equipe.chargeProjet.nom",
  "equipe.chargeProjet.fonction",
  "equipe.verificateur.nom",
  "equipe.verificateur.fonction",
  "equipe.intervenantSite.nom",
  "cadastre.reference",
  "batiment.periodeConstruction",
  "batiment.dateReglementCopropriete",
  "batiment.dateImmatriculation",
  "batiment.numeroImmatriculation",
  "batiment.nombreBatiments",
  "batiment.nombreEntrees",
  "batiment.nombreLots",
  "batiment.nombreNiveaux",
  "batiment.nombreLotsPrincipaux",
  "batiment.typeChauffage",
  "batiment.nombreLotsHabitation",
  "batiment.nombreAscenseurs",
  "batiment.shabApproximative",
  "batiment.altitude",
  "patrimoine.aucunPerimetreProtection",
  "patrimoine.sitePatrimonialRemarquable",
  "patrimoine.abordsMonumentHistorique"
];
var PART1_REQUIRED_VISUAL_ROLES = ROLES_VISUELS_PARTIE1;
function issue(path, code, message) {
  return { path, code, message };
}
function hasText(value) {
  return typeof value === "string" && value.trim().length > 0;
}
function isFrenchDate(value) {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(value);
  if (!match) return false;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}
function isPatrimonialStatus(value) {
  return value === "concerne" || value === "non_concerne";
}
function isReportVersion(value) {
  return value === "Initiale" || value === "Finale";
}
function isFileLike(value) {
  return typeof value === "object" && value !== null && typeof value.type === "string" && typeof value.size === "number";
}
function valueAtPath(data, path) {
  switch (path) {
    case "rapport.dateVisite":
      return data.rapport.dateVisite;
    case "rapport.dateRapport":
      return data.rapport.dateRapport;
    case "rapport.version":
      return data.rapport.version;
    case "copropriete.nom":
      return data.copropriete.nom;
    case "copropriete.adresse":
      return data.copropriete.adresse;
    case "donneurOrdre.nom":
      return data.donneurOrdre.nom;
    case "donneurOrdre.adresse":
      return data.donneurOrdre.adresse;
    case "equipe.chargeProjet.nom":
      return data.equipe.chargeProjet.nom;
    case "equipe.chargeProjet.fonction":
      return data.equipe.chargeProjet.fonction;
    case "equipe.verificateur.nom":
      return data.equipe.verificateur.nom;
    case "equipe.verificateur.fonction":
      return data.equipe.verificateur.fonction;
    case "equipe.intervenantSite.nom":
      return data.equipe.intervenantSite.nom;
    case "cadastre.reference":
      return data.cadastre.reference;
    case "batiment.periodeConstruction":
      return data.batiment.periodeConstruction;
    case "batiment.dateReglementCopropriete":
      return data.batiment.dateReglementCopropriete;
    case "batiment.dateImmatriculation":
      return data.batiment.dateImmatriculation;
    case "batiment.numeroImmatriculation":
      return data.batiment.numeroImmatriculation;
    case "batiment.nombreBatiments":
      return data.batiment.nombreBatiments;
    case "batiment.nombreEntrees":
      return data.batiment.nombreEntrees;
    case "batiment.nombreLots":
      return data.batiment.nombreLots;
    case "batiment.nombreNiveaux":
      return data.batiment.nombreNiveaux;
    case "batiment.nombreLotsPrincipaux":
      return data.batiment.nombreLotsPrincipaux;
    case "batiment.typeChauffage":
      return data.batiment.typeChauffage;
    case "batiment.nombreLotsHabitation":
      return data.batiment.nombreLotsHabitation;
    case "batiment.nombreAscenseurs":
      return data.batiment.nombreAscenseurs;
    case "batiment.shabApproximative":
      return data.batiment.shabApproximative;
    case "batiment.altitude":
      return data.batiment.altitude;
    case "patrimoine.aucunPerimetreProtection":
      return data.patrimoine.aucunPerimetreProtection;
    case "patrimoine.sitePatrimonialRemarquable":
      return data.patrimoine.sitePatrimonialRemarquable;
    case "patrimoine.abordsMonumentHistorique":
      return data.patrimoine.abordsMonumentHistorique;
  }
}
function hasRequiredValue(value) {
  return typeof value === "string" ? hasText(value) : value !== null && value !== void 0;
}
function validateText(value, path, issues) {
  if (value !== null && !hasText(value)) {
    issues.push(issue(path, "texte_vide", "Le texte renseign\xE9 ne peut pas \xEAtre vide."));
  }
}
function validateDate(value, path, issues) {
  validateText(value, path, issues);
  if (value !== null && hasText(value) && !isFrenchDate(value)) {
    issues.push(issue(path, "date_invalide", "La date doit respecter le format JJ/MM/AAAA et repr\xE9senter une date existante."));
  }
}
function validateInteger(value, path, issues) {
  if (value !== null && (!Number.isInteger(value) || value < 0)) {
    issues.push(issue(path, "entier_invalide", "La valeur doit \xEAtre un entier positif ou nul."));
  }
}
function validateNonNegativeNumber(value, path, issues) {
  if (value !== null && (!Number.isFinite(value) || value < 0)) {
    issues.push(issue(path, "nombre_invalide", "La valeur doit \xEAtre un nombre positif ou nul."));
  }
}
function validatePart1ReportData(data, options = {}) {
  const issues = [];
  const filePolicy = options.visualFilePolicy ?? PART1_VISUAL_FILE_POLICY;
  validateDate(data.rapport.dateVisite, "rapport.dateVisite", issues);
  validateDate(data.rapport.dateRapport, "rapport.dateRapport", issues);
  validateText(data.rapport.version, "rapport.version", issues);
  if (data.rapport.version !== null && !isReportVersion(data.rapport.version)) {
    issues.push(issue("rapport.version", "version_invalide", "La version doit \xEAtre \xAB Initiale \xBB ou \xAB Finale \xBB."));
  }
  validateText(data.copropriete.nom, "copropriete.nom", issues);
  validateText(data.copropriete.adresse, "copropriete.adresse", issues);
  validateText(data.donneurOrdre.nom, "donneurOrdre.nom", issues);
  validateText(data.donneurOrdre.adresse, "donneurOrdre.adresse", issues);
  validateText(data.equipe.chargeProjet.nom, "equipe.chargeProjet.nom", issues);
  validateText(data.equipe.chargeProjet.fonction, "equipe.chargeProjet.fonction", issues);
  validateText(data.equipe.verificateur.nom, "equipe.verificateur.nom", issues);
  validateText(data.equipe.verificateur.fonction, "equipe.verificateur.fonction", issues);
  validateText(data.equipe.intervenantSite.nom, "equipe.intervenantSite.nom", issues);
  validateText(data.cadastre.reference, "cadastre.reference", issues);
  validateText(data.batiment.periodeConstruction, "batiment.periodeConstruction", issues);
  validateDate(data.batiment.dateReglementCopropriete, "batiment.dateReglementCopropriete", issues);
  validateDate(data.batiment.dateImmatriculation, "batiment.dateImmatriculation", issues);
  validateText(data.batiment.numeroImmatriculation, "batiment.numeroImmatriculation", issues);
  validateText(data.batiment.typeChauffage, "batiment.typeChauffage", issues);
  validateInteger(data.batiment.nombreBatiments, "batiment.nombreBatiments", issues);
  validateInteger(data.batiment.nombreEntrees, "batiment.nombreEntrees", issues);
  validateInteger(data.batiment.nombreLots, "batiment.nombreLots", issues);
  validateInteger(data.batiment.nombreNiveaux, "batiment.nombreNiveaux", issues);
  validateInteger(data.batiment.nombreLotsPrincipaux, "batiment.nombreLotsPrincipaux", issues);
  validateInteger(data.batiment.nombreLotsHabitation, "batiment.nombreLotsHabitation", issues);
  validateInteger(data.batiment.nombreAscenseurs, "batiment.nombreAscenseurs", issues);
  validateNonNegativeNumber(data.batiment.shabApproximative, "batiment.shabApproximative", issues);
  if (data.batiment.altitude !== null && !Number.isFinite(data.batiment.altitude)) {
    issues.push(issue("batiment.altitude", "nombre_invalide", "L\u2019altitude doit \xEAtre un nombre fini."));
  }
  const heritageEntries = Object.entries(data.patrimoine);
  for (const [key, value] of heritageEntries) {
    if (value !== null && !isPatrimonialStatus(value)) {
      issues.push(issue(`patrimoine.${key}`, "statut_patrimonial_invalide", "Le statut doit \xEAtre \xAB concerne \xBB ou \xAB non_concerne \xBB."));
    }
  }
  for (const path of PART1_REQUIRED_FIELD_PATHS) {
    if (!hasRequiredValue(valueAtPath(data, path)) && !issues.some((entry) => entry.path === path)) {
      issues.push(issue(path, "champ_requis", "Ce champ est obligatoire pour g\xE9n\xE9rer la Partie 1."));
    }
  }
  for (const role of PART1_REQUIRED_VISUAL_ROLES) {
    if (!data.visuels[role]) {
      issues.push(issue(`visuels.${role}`, "champ_requis", "Ce visuel est obligatoire pour g\xE9n\xE9rer la Partie 1."));
    }
  }
  for (const role of ROLES_VISUELS_PARTIE1) {
    const visual = data.visuels[role];
    if (!visual) continue;
    const path = `visuels.${role}`;
    if (!isFileLike(visual)) {
      issues.push(issue(path, "visuel_invalide", "Le visuel doit fournir un type et une taille de fichier."));
      continue;
    }
    if (!filePolicy.acceptedMimeTypes.includes(visual.type)) {
      issues.push(issue(path, "type_visuel_invalide", "Seuls les fichiers JPG, PNG et WEBP sont accept\xE9s."));
    }
    if (!Number.isFinite(visual.size) || visual.size < 0 || visual.size > filePolicy.maxBytes) {
      issues.push(issue(path, "taille_visuel_invalide", "La taille du visuel est invalide ou d\xE9passe la limite autoris\xE9e."));
    }
  }
  return {
    issues,
    isValid: issues.length === 0,
    openDecisions: DECISIONS_PARTIE1_A_CONFIRMER
  };
}

// tests/part1ReportData.test.ts
function visualFile(contents, name, type) {
  return new NodeFile([contents], name, { type });
}
function completeData() {
  return {
    rapport: {
      dateVisite: "01/06/2026",
      dateRapport: "07/08/2026",
      version: "Initiale"
    },
    copropriete: {
      nom: "LE COTE SQUARE",
      adresse: "18 Rue de la Barri\xE8re, Rive de Gier"
    },
    donneurOrdre: {
      nom: "R\xE9gie l\u2019immobili\xE8re St\xE9phanoise",
      adresse: "7 rue Voltaire 42100 Saint Etienne"
    },
    equipe: {
      chargeProjet: { nom: "Anthony BELTRAN", fonction: "Ing\xE9nieur thermicien" },
      verificateur: { nom: "Mahmoud ATIQ", fonction: "Responsable du p\xF4le" },
      intervenantSite: { nom: "Youssef BICHA" }
    },
    cadastre: { reference: "AV 0359" },
    batiment: {
      periodeConstruction: "Entre 2001 et 2010",
      dateReglementCopropriete: "06/03/2007",
      dateImmatriculation: "27/07/2017",
      numeroImmatriculation: "AA7634256",
      nombreBatiments: 1,
      nombreEntrees: 1,
      nombreLots: 61,
      nombreNiveaux: 4,
      nombreLotsPrincipaux: 22,
      typeChauffage: "Individuel",
      nombreLotsHabitation: 22,
      nombreAscenseurs: 1,
      shabApproximative: 1676.3,
      altitude: 250
    },
    patrimoine: {
      aucunPerimetreProtection: "concerne",
      sitePatrimonialRemarquable: "non_concerne",
      abordsMonumentHistorique: "non_concerne"
    },
    visuels: {
      photo_principale_copropriete: visualFile("cover", "cover.jpg", "image/jpeg"),
      extrait_cadastral: visualFile("cadastre", "cadastre.png", "image/png"),
      vue_aerienne_rapprochee: visualFile("aerial", "aerial.webp", "image/webp"),
      vue_patrimoniale: visualFile("heritage", "heritage.jpg", "image/jpeg")
    }
  };
}
test("Part 1 data uses one source for repeated property data and keeps derived data outside the input model", () => {
  const empty = createEmptyPart1ReportData();
  assert.equal(empty.copropriete.nom, null);
  assert.equal(empty.copropriete.adresse, null);
  assert.equal(empty.equipe.chargeProjet.fonction, null);
  assert.equal(empty.equipe.verificateur.fonction, null);
  assert.deepEqual(empty.visuels, {});
  assert.ok(!("residence" in empty));
  assert.ok(!("adresseSite" in empty));
  assert.ok(DONNEES_DERIVEES_PARTIE1.includes("texteMission"));
  assert.ok(DONNEES_DERIVEES_PARTIE1.includes("nombreTotalPages"));
  assert.deepEqual(ROLES_VISUELS_PARTIE1, [
    "photo_principale_copropriete",
    "extrait_cadastral",
    "vue_aerienne_rapprochee",
    "vue_patrimoniale"
  ]);
});
test("a complete Part 1 draft with supported visuals satisfies the mandatory-data policy and is not mutated", () => {
  const data = completeData();
  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, true);
  assert.deepEqual(result.issues, []);
  assert.equal(data.copropriete.nom, "LE COTE SQUARE");
  assert.equal(data.visuels.photo_principale_copropriete?.name, "cover.jpg");
});
test("every user field and every Part 1 visual is mandatory by default", () => {
  const result = validatePart1ReportData(createEmptyPart1ReportData());
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path }) => path), [
    ...PART1_REQUIRED_FIELD_PATHS,
    ...PART1_REQUIRED_VISUAL_ROLES.map((role) => `visuels.${role}`)
  ]);
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes("equipe.chargeProjet.fonction"));
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes("equipe.verificateur.fonction"));
  assert.ok(PART1_REQUIRED_FIELD_PATHS.includes("patrimoine.abordsMonumentHistorique"));
});
test("invalid dates, text, building values and patrimonial status are rejected", () => {
  const data = completeData();
  data.rapport.dateVisite = "2026-06-01";
  data.rapport.version = "V1";
  data.batiment.dateImmatriculation = "31/02/2026";
  data.copropriete.nom = "   ";
  data.batiment.nombreLots = 2.5;
  data.batiment.nombreAscenseurs = -1;
  data.batiment.shabApproximative = Number.NaN;
  data.batiment.altitude = Number.POSITIVE_INFINITY;
  data.patrimoine.sitePatrimonialRemarquable = "unknown";
  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: "rapport.dateVisite", code: "date_invalide" },
    { path: "rapport.version", code: "version_invalide" },
    { path: "copropriete.nom", code: "texte_vide" },
    { path: "batiment.dateImmatriculation", code: "date_invalide" },
    { path: "batiment.nombreLots", code: "entier_invalide" },
    { path: "batiment.nombreAscenseurs", code: "entier_invalide" },
    { path: "batiment.shabApproximative", code: "nombre_invalide" },
    { path: "batiment.altitude", code: "nombre_invalide" },
    { path: "patrimoine.sitePatrimonialRemarquable", code: "statut_patrimonial_invalide" }
  ]);
});
test("report version accepts only Initiale or Finale", () => {
  const initiale = completeData();
  initiale.rapport.version = "Initiale";
  const finale = completeData();
  finale.rapport.version = "Finale";
  assert.equal(validatePart1ReportData(initiale).isValid, true);
  assert.equal(validatePart1ReportData(finale).isValid, true);
});
test("visual validation applies the configured type and size policy to each known Part 1 visual role", () => {
  const data = completeData();
  data.visuels.extrait_cadastral = { type: "application/pdf", size: 1 };
  data.visuels.vue_aerienne_rapprochee = {
    type: "image/jpeg",
    size: PART1_VISUAL_FILE_POLICY.maxBytes + 1
  };
  data.visuels.vue_patrimoniale = { type: "image/png", size: -1 };
  const result = validatePart1ReportData(data);
  assert.equal(result.isValid, false);
  assert.deepEqual(result.issues.map(({ path, code }) => ({ path, code })), [
    { path: "visuels.extrait_cadastral", code: "type_visuel_invalide" },
    { path: "visuels.vue_aerienne_rapprochee", code: "taille_visuel_invalide" },
    { path: "visuels.vue_patrimoniale", code: "taille_visuel_invalide" }
  ]);
});
test("remaining open decisions do not become invented report fields", () => {
  const ids = DECISIONS_PARTIE1_A_CONFIRMER.map(({ id }) => id);
  assert.ok(ids.includes("origine_des_cartes"));
  assert.ok(!ids.includes("votre_situation_patrimoniale"));
  assert.ok(!ids.includes("champs_et_visuels_obligatoires"));
  assert.ok(!ids.includes("selection_des_collaborateurs"));
  const data = createEmptyPart1ReportData();
  assert.equal("votreSituation" in data, false);
});
