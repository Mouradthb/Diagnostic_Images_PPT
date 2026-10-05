import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent, type ReactNode } from 'react';
import { AlertCircle, ArrowRight, CheckCircle2, FileText, ImagePlus, X } from 'lucide-react';
import {
  PART1_REQUIRED_FIELD_PATHS,
  PART1_REQUIRED_VISUAL_ROLES,
  PART1_VISUAL_FILE_POLICY,
  type Part1ValidationIssue,
  type Part1ValidationResult,
  validatePart1ReportData,
} from './reportDataValidation';
import {
  VERSIONS_RAPPORT,
  type Part1ReportData,
  type RoleVisuelPartie1,
  type StatutPatrimonial,
  type VersionRapport,
} from './reportData';

interface Part1ReportFormProps {
  data: Part1ReportData;
  validation: Part1ValidationResult;
  onChange: (nextData: Part1ReportData) => void;
  onOpenDiagnostics: () => void;
}

interface FieldProps {
  label: string;
  htmlFor: string;
  issue?: Part1ValidationIssue;
  children: ReactNode;
  hint?: string;
}

const PATRIMONIAL_OPTIONS: ReadonlyArray<{ value: StatutPatrimonial; label: string }> = [
  { value: 'concerne', label: 'Concerné' },
  { value: 'non_concerne', label: 'Non concerné' },
];

const VISUAL_FIELDS: ReadonlyArray<{ role: RoleVisuelPartie1; label: string; description: string }> = [
  {
    role: 'photo_principale_copropriete',
    label: 'Photo principale du bâtiment',
    description: 'Photo de couverture du rapport',
  },
  {
    role: 'extrait_cadastral',
    label: 'Extrait cadastral',
    description: 'Parcelles et références cadastrales',
  },
  {
    role: 'vue_aerienne_rapprochee',
    label: 'Vue aérienne rapprochée',
    description: 'Vue d’ensemble de la copropriété',
  },
  {
    role: 'vue_patrimoniale',
    label: 'Vue / carte patrimoniale',
    description: 'Contexte patrimonial et environnement',
  },
];

function Field({ label, htmlFor, issue, children, hint }: FieldProps) {
  const issueId = issue ? `${htmlFor}-error` : undefined;
  return (
    <div className="fv-part1-field">
      <label htmlFor={htmlFor} className="fv-part1-label">{label} <span aria-hidden="true">*</span></label>
      {children}
      {hint && <p className="fv-part1-hint">{hint}</p>}
      {issue && <p id={issueId} className="fv-part1-error" role="alert"><AlertCircle className="size-3.5" /> {issue.message}</p>}
    </div>
  );
}

interface VisualFieldProps {
  role: RoleVisuelPartie1;
  label: string;
  description: string;
  file?: File;
  issue?: Part1ValidationIssue;
  inputError?: string;
  onSelect: (role: RoleVisuelPartie1, file: File) => void;
  onRemove: (role: RoleVisuelPartie1) => void;
}

function VisualField({ role, label, description, file, issue, inputError, onSelect, onRemove }: VisualFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = `part1-visual-${role}`;
  const errorId = `${inputId}-error`;
  const visibleError = inputError ?? issue?.message;

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return undefined;
    }
    const nextPreviewUrl = URL.createObjectURL(file);
    setPreviewUrl(nextPreviewUrl);
    return () => URL.revokeObjectURL(nextPreviewUrl);
  }, [file]);

  const handleChange = (event: ChangeEvent<HTMLInputElement>) => {
    const nextFile = event.target.files?.[0];
    event.target.value = '';
    if (nextFile) onSelect(role, nextFile);
  };

  return (
    <div className="fv-part1-visual-field">
      <div className="fv-part1-visual-heading">
        <label htmlFor={inputId} className="fv-part1-label">{label} <span aria-hidden="true">*</span></label>
        <span>{description}</span>
      </div>
      <input
        id={inputId}
        type="file"
        accept={PART1_VISUAL_FILE_POLICY.acceptedMimeTypes.join(',')}
        className="sr-only"
        aria-describedby={visibleError ? errorId : undefined}
        onChange={handleChange}
      />
      {file && previewUrl ? (
        <div className="fv-part1-visual-preview">
          <img src={previewUrl} alt={`Aperçu — ${label}`} />
          <div className="fv-part1-visual-file-name" title={file.name}>{file.name}</div>
          <button type="button" onClick={() => onRemove(role)} aria-label={`Retirer ${label}`} className="fv-part1-visual-remove">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <label htmlFor={inputId} className="fv-part1-visual-dropzone">
          <ImagePlus className="size-5" strokeWidth={1.6} />
          <span>Ajouter un visuel</span>
          <small>JPG · PNG · WEBP<br />20 Mo max.</small>
        </label>
      )}
      {visibleError && <p id={errorId} className="fv-part1-error" role="alert"><AlertCircle className="size-3.5" /> {visibleError}</p>}
    </div>
  );
}

function readNumber(value: string): number | null {
  return value === '' ? null : Number(value);
}

function issueFor(
  validation: Part1ValidationResult,
  showValidation: boolean,
  path: string,
): Part1ValidationIssue | undefined {
  return showValidation ? validation.issues.find((issue) => issue.path === path) : undefined;
}

/**
 * Controlled Part 1 editor. It is deliberately isolated from the photo-analysis
 * state: its files never enter the Part 2 import or API flows.
 */
export function Part1ReportForm({ data, validation, onChange, onOpenDiagnostics }: Part1ReportFormProps) {
  const [showValidation, setShowValidation] = useState(false);
  const [inputErrors, setInputErrors] = useState<Partial<Record<RoleVisuelPartie1, string>>>({});
  const [completionMessage, setCompletionMessage] = useState('');
  const missingCount = validation.issues.filter((issue) => issue.code === 'champ_requis').length;
  const completedCount = PART1_REQUIRED_FIELD_PATHS.length + PART1_REQUIRED_VISUAL_ROLES.length - missingCount;
  const completionPercent = Math.round((completedCount / (PART1_REQUIRED_FIELD_PATHS.length + PART1_REQUIRED_VISUAL_ROLES.length)) * 100);
  const formIsReady = validation.isValid && Object.keys(inputErrors).length === 0;

  const visibleValidation = useMemo(() => ({
    validation,
    showValidation,
  }), [showValidation, validation]);

  const updateData = (update: (previous: Part1ReportData) => Part1ReportData) => {
    setCompletionMessage('');
    onChange(update(data));
  };

  const updateVisual = (role: RoleVisuelPartie1, file: File) => {
    const candidate: Part1ReportData = {
      ...data,
      visuels: { ...data.visuels, [role]: file },
    };
    const fileIssue = validatePart1ReportData(candidate).issues.find((issue) => (
      issue.path === `visuels.${role}` && issue.code !== 'champ_requis'
    ));
    if (fileIssue) {
      setInputErrors((previous) => ({ ...previous, [role]: fileIssue.message }));
      return;
    }
    setInputErrors((previous) => {
      const { [role]: _discarded, ...remaining } = previous;
      return remaining;
    });
    updateData(() => candidate);
  };

  const removeVisual = (role: RoleVisuelPartie1) => {
    setInputErrors((previous) => {
      const { [role]: _discarded, ...remaining } = previous;
      return remaining;
    });
    updateData((previous) => {
      const { [role]: _discarded, ...remaining } = previous.visuels;
      return { ...previous, visuels: remaining };
    });
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setShowValidation(true);
    if (!formIsReady) {
      setCompletionMessage('Complète les champs signalés avant de préparer la génération du rapport.');
      return;
    }
    setCompletionMessage('La Partie 1 est complète et pourra être intégrée au rapport PPTX unifié.');
  };

  const inputProps = (path: string) => {
    const issue = issueFor(visibleValidation.validation, visibleValidation.showValidation, path);
    return {
      'aria-invalid': Boolean(issue),
      className: `fv-part1-control${issue ? ' is-invalid' : ''}`,
    };
  };

  return (
    <main className="fv-part1-page" aria-labelledby="part1-heading">
      <header className="fv-part1-intro">
        <div>
          <p className="fv-eyebrow">Partie 1 · Rapport PPPT</p>
          <h2 id="part1-heading">Informations du rapport</h2>
          <p>Renseignez les informations administratives, le bâtiment, le patrimoine et les quatre visuels de référence.</p>
        </div>
        <div className="fv-part1-progress" aria-label={`${completedCount} éléments renseignés sur 34`}>
          <div><strong>{completedCount} / {PART1_REQUIRED_FIELD_PATHS.length + PART1_REQUIRED_VISUAL_ROLES.length}</strong> éléments renseignés</div>
          <div className="fv-part1-progress-track" aria-hidden="true"><span style={{ width: `${completionPercent}%` }} /></div>
          <span>{completionPercent} %</span>
        </div>
      </header>

      <form className="fv-part1-form" noValidate onSubmit={submit}>
        <section className="fv-part1-section" aria-labelledby="part1-report-heading">
          <div className="fv-part1-section-heading">
            <span>01</span>
            <div><p>Informations générales</p><h3 id="part1-report-heading">Rapport et copropriété</h3></div>
          </div>
          <div className="fv-part1-grid fv-part1-grid--three">
            <Field label="Date de visite" htmlFor="part1-date-visite" issue={issueFor(validation, showValidation, 'rapport.dateVisite')} hint="Format JJ/MM/AAAA">
              <input id="part1-date-visite" type="text" inputMode="numeric" placeholder="JJ/MM/AAAA" value={data.rapport.dateVisite ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, rapport: { ...previous.rapport, dateVisite: event.target.value } }))} {...inputProps('rapport.dateVisite')} />
            </Field>
            <Field label="Date du rapport" htmlFor="part1-date-rapport" issue={issueFor(validation, showValidation, 'rapport.dateRapport')} hint="Format JJ/MM/AAAA">
              <input id="part1-date-rapport" type="text" inputMode="numeric" placeholder="JJ/MM/AAAA" value={data.rapport.dateRapport ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, rapport: { ...previous.rapport, dateRapport: event.target.value } }))} {...inputProps('rapport.dateRapport')} />
            </Field>
            <Field label="Version du rapport" htmlFor="part1-version" issue={issueFor(validation, showValidation, 'rapport.version')}>
              <select id="part1-version" value={data.rapport.version ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, rapport: { ...previous.rapport, version: event.target.value === '' ? null : event.target.value as VersionRapport } }))} {...inputProps('rapport.version')}>
                <option value="">Choisir une version</option>
                {VERSIONS_RAPPORT.map((version) => <option key={version} value={version}>{version}</option>)}
              </select>
            </Field>
          </div>
          <div className="fv-part1-grid fv-part1-grid--single">
            <Field label="Nom de la copropriété / résidence" htmlFor="part1-copropriete-nom" issue={issueFor(validation, showValidation, 'copropriete.nom')}>
              <input id="part1-copropriete-nom" type="text" value={data.copropriete.nom ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, copropriete: { ...previous.copropriete, nom: event.target.value } }))} {...inputProps('copropriete.nom')} />
            </Field>
            <Field label="Adresse du site" htmlFor="part1-copropriete-adresse" issue={issueFor(validation, showValidation, 'copropriete.adresse')}>
              <textarea id="part1-copropriete-adresse" rows={2} value={data.copropriete.adresse ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, copropriete: { ...previous.copropriete, adresse: event.target.value } }))} {...inputProps('copropriete.adresse')} />
            </Field>
          </div>
        </section>

        <section className="fv-part1-section" aria-labelledby="part1-team-heading">
          <div className="fv-part1-section-heading">
            <span>02</span>
            <div><p>Intervenants</p><h3 id="part1-team-heading">Donneur d'ordre et équipe</h3></div>
          </div>
          <div className="fv-part1-grid fv-part1-grid--two">
            <Field label="Nom du donneur d'ordre / syndic" htmlFor="part1-syndic-nom" issue={issueFor(validation, showValidation, 'donneurOrdre.nom')}>
              <input id="part1-syndic-nom" type="text" value={data.donneurOrdre.nom ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, donneurOrdre: { ...previous.donneurOrdre, nom: event.target.value } }))} {...inputProps('donneurOrdre.nom')} />
            </Field>
            <Field label="Adresse du donneur d'ordre / syndic" htmlFor="part1-syndic-adresse" issue={issueFor(validation, showValidation, 'donneurOrdre.adresse')}>
              <textarea id="part1-syndic-adresse" rows={2} value={data.donneurOrdre.adresse ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, donneurOrdre: { ...previous.donneurOrdre, adresse: event.target.value } }))} {...inputProps('donneurOrdre.adresse')} />
            </Field>
          </div>
          <div className="fv-part1-subsection"><p>Équipe France Verte</p></div>
          <div className="fv-part1-grid fv-part1-grid--two">
            <Field label="Nom du chargé de projet" htmlFor="part1-charge-projet-nom" issue={issueFor(validation, showValidation, 'equipe.chargeProjet.nom')}>
              <input id="part1-charge-projet-nom" type="text" autoComplete="name" value={data.equipe.chargeProjet.nom ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, equipe: { ...previous.equipe, chargeProjet: { ...previous.equipe.chargeProjet, nom: event.target.value } } }))} {...inputProps('equipe.chargeProjet.nom')} />
            </Field>
            <Field label="Poste du chargé de projet" htmlFor="part1-charge-projet-fonction" issue={issueFor(validation, showValidation, 'equipe.chargeProjet.fonction')}>
              <input id="part1-charge-projet-fonction" type="text" value={data.equipe.chargeProjet.fonction ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, equipe: { ...previous.equipe, chargeProjet: { ...previous.equipe.chargeProjet, fonction: event.target.value } } }))} {...inputProps('equipe.chargeProjet.fonction')} />
            </Field>
            <Field label="Nom du vérificateur" htmlFor="part1-verificateur-nom" issue={issueFor(validation, showValidation, 'equipe.verificateur.nom')}>
              <input id="part1-verificateur-nom" type="text" autoComplete="name" value={data.equipe.verificateur.nom ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, equipe: { ...previous.equipe, verificateur: { ...previous.equipe.verificateur, nom: event.target.value } } }))} {...inputProps('equipe.verificateur.nom')} />
            </Field>
            <Field label="Poste du vérificateur" htmlFor="part1-verificateur-fonction" issue={issueFor(validation, showValidation, 'equipe.verificateur.fonction')}>
              <input id="part1-verificateur-fonction" type="text" value={data.equipe.verificateur.fonction ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, equipe: { ...previous.equipe, verificateur: { ...previous.equipe.verificateur, fonction: event.target.value } } }))} {...inputProps('equipe.verificateur.fonction')} />
            </Field>
            <Field label="Nom de l'intervenant sur site" htmlFor="part1-intervenant-site" issue={issueFor(validation, showValidation, 'equipe.intervenantSite.nom')}>
              <input id="part1-intervenant-site" type="text" autoComplete="name" value={data.equipe.intervenantSite.nom ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, equipe: { ...previous.equipe, intervenantSite: { nom: event.target.value } } }))} {...inputProps('equipe.intervenantSite.nom')} />
            </Field>
          </div>
        </section>

        <section className="fv-part1-section" aria-labelledby="part1-building-heading">
          <div className="fv-part1-section-heading">
            <span>03</span>
            <div><p>Identification</p><h3 id="part1-building-heading">Cadastre et bâtiment</h3></div>
          </div>
          <div className="fv-part1-grid fv-part1-grid--three">
            <Field label="Référence cadastrale" htmlFor="part1-cadastre" issue={issueFor(validation, showValidation, 'cadastre.reference')}>
              <input id="part1-cadastre" type="text" value={data.cadastre.reference ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, cadastre: { reference: event.target.value } }))} {...inputProps('cadastre.reference')} />
            </Field>
            <Field label="Année / période de construction" htmlFor="part1-construction" issue={issueFor(validation, showValidation, 'batiment.periodeConstruction')}>
              <input id="part1-construction" type="text" value={data.batiment.periodeConstruction ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, periodeConstruction: event.target.value } }))} {...inputProps('batiment.periodeConstruction')} />
            </Field>
            <Field label="Type de chauffage" htmlFor="part1-chauffage" issue={issueFor(validation, showValidation, 'batiment.typeChauffage')}>
              <input id="part1-chauffage" type="text" value={data.batiment.typeChauffage ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, typeChauffage: event.target.value } }))} {...inputProps('batiment.typeChauffage')} />
            </Field>
            <Field label="Date du règlement de copropriété" htmlFor="part1-reglement" issue={issueFor(validation, showValidation, 'batiment.dateReglementCopropriete')} hint="Format JJ/MM/AAAA">
              <input id="part1-reglement" type="text" inputMode="numeric" placeholder="JJ/MM/AAAA" value={data.batiment.dateReglementCopropriete ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, dateReglementCopropriete: event.target.value } }))} {...inputProps('batiment.dateReglementCopropriete')} />
            </Field>
            <Field label="Date d'immatriculation" htmlFor="part1-immatriculation-date" issue={issueFor(validation, showValidation, 'batiment.dateImmatriculation')} hint="Format JJ/MM/AAAA">
              <input id="part1-immatriculation-date" type="text" inputMode="numeric" placeholder="JJ/MM/AAAA" value={data.batiment.dateImmatriculation ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, dateImmatriculation: event.target.value } }))} {...inputProps('batiment.dateImmatriculation')} />
            </Field>
            <Field label="Numéro d'immatriculation" htmlFor="part1-immatriculation-number" issue={issueFor(validation, showValidation, 'batiment.numeroImmatriculation')}>
              <input id="part1-immatriculation-number" type="text" value={data.batiment.numeroImmatriculation ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, numeroImmatriculation: event.target.value } }))} {...inputProps('batiment.numeroImmatriculation')} />
            </Field>
          </div>
          <div className="fv-part1-subsection"><p>Caractéristiques du bâtiment</p></div>
          <div className="fv-part1-grid fv-part1-grid--four">
            <Field label="Nombre de bâtiments" htmlFor="part1-batiments" issue={issueFor(validation, showValidation, 'batiment.nombreBatiments')}><input id="part1-batiments" type="number" min="0" step="1" value={data.batiment.nombreBatiments ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreBatiments: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreBatiments')} /></Field>
            <Field label="Nombre d'entrées" htmlFor="part1-entrees" issue={issueFor(validation, showValidation, 'batiment.nombreEntrees')}><input id="part1-entrees" type="number" min="0" step="1" value={data.batiment.nombreEntrees ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreEntrees: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreEntrees')} /></Field>
            <Field label="Nombre total de lots" htmlFor="part1-lots" issue={issueFor(validation, showValidation, 'batiment.nombreLots')}><input id="part1-lots" type="number" min="0" step="1" value={data.batiment.nombreLots ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreLots: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreLots')} /></Field>
            <Field label="Nombre de niveaux" htmlFor="part1-niveaux" issue={issueFor(validation, showValidation, 'batiment.nombreNiveaux')}><input id="part1-niveaux" type="number" min="0" step="1" value={data.batiment.nombreNiveaux ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreNiveaux: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreNiveaux')} /></Field>
            <Field label="Lots principaux" htmlFor="part1-lots-principaux" issue={issueFor(validation, showValidation, 'batiment.nombreLotsPrincipaux')}><input id="part1-lots-principaux" type="number" min="0" step="1" value={data.batiment.nombreLotsPrincipaux ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreLotsPrincipaux: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreLotsPrincipaux')} /></Field>
            <Field label="Lots d'habitation" htmlFor="part1-lots-habitation" issue={issueFor(validation, showValidation, 'batiment.nombreLotsHabitation')}><input id="part1-lots-habitation" type="number" min="0" step="1" value={data.batiment.nombreLotsHabitation ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreLotsHabitation: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreLotsHabitation')} /></Field>
            <Field label="Nombre d'ascenseurs" htmlFor="part1-ascenseurs" issue={issueFor(validation, showValidation, 'batiment.nombreAscenseurs')}><input id="part1-ascenseurs" type="number" min="0" step="1" value={data.batiment.nombreAscenseurs ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, nombreAscenseurs: readNumber(event.target.value) } }))} {...inputProps('batiment.nombreAscenseurs')} /></Field>
            <Field label="SHAB approximative (m²)" htmlFor="part1-shab" issue={issueFor(validation, showValidation, 'batiment.shabApproximative')}><input id="part1-shab" type="number" min="0" step="0.1" value={data.batiment.shabApproximative ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, shabApproximative: readNumber(event.target.value) } }))} {...inputProps('batiment.shabApproximative')} /></Field>
            <Field label="Altitude (m)" htmlFor="part1-altitude" issue={issueFor(validation, showValidation, 'batiment.altitude')}><input id="part1-altitude" type="number" step="1" value={data.batiment.altitude ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, batiment: { ...previous.batiment, altitude: readNumber(event.target.value) } }))} {...inputProps('batiment.altitude')} /></Field>
          </div>
        </section>

        <section className="fv-part1-section" aria-labelledby="part1-heritage-heading">
          <div className="fv-part1-section-heading">
            <span>04</span>
            <div><p>Contexte</p><h3 id="part1-heritage-heading">Votre situation</h3></div>
          </div>
          <p className="fv-part1-section-copy">Indiquez le statut applicable à chacune des trois situations patrimoniales.</p>
          <div className="fv-part1-heritage-list">
            {([
              ['aucunPerimetreProtection', 'Aucun périmètre de protection'],
              ['sitePatrimonialRemarquable', 'Site patrimonial remarquable'],
              ['abordsMonumentHistorique', "Abords d'un monument historique"],
            ] as const).map(([key, label]) => {
              const path = `patrimoine.${key}`;
              const issue = issueFor(validation, showValidation, path);
              const id = `part1-${key}`;
              return <Field key={key} label={label} htmlFor={id} issue={issue}>
                <select id={id} value={data.patrimoine[key] ?? ''} onChange={(event) => updateData((previous) => ({ ...previous, patrimoine: { ...previous.patrimoine, [key]: event.target.value === '' ? null : event.target.value as StatutPatrimonial } }))} {...inputProps(path)}>
                  <option value="">Choisir un statut</option>
                  {PATRIMONIAL_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </Field>;
            })}
          </div>
        </section>

        <section className="fv-part1-section" aria-labelledby="part1-visuals-heading">
          <div className="fv-part1-section-heading">
            <span>05</span>
            <div><p>Documents visuels</p><h3 id="part1-visuals-heading">Visuels de référence</h3></div>
          </div>
          <p className="fv-part1-section-copy">Importez les quatre visuels. Les futures cartes générées pourront ensuite alimenter les emplacements cadastraux et patrimoniaux sans modifier les données du rapport.</p>
          <div className="fv-part1-visual-grid">
            {VISUAL_FIELDS.map((field) => <VisualField key={field.role} {...field} file={data.visuels[field.role]} issue={issueFor(validation, showValidation, `visuels.${field.role}`)} inputError={inputErrors[field.role]} onSelect={updateVisual} onRemove={removeVisual} />)}
          </div>
        </section>

        <footer className="fv-part1-actions">
          <div className={formIsReady ? 'fv-part1-readiness is-ready' : 'fv-part1-readiness'}>
            {formIsReady ? <CheckCircle2 className="size-4" /> : <FileText className="size-4" />}
            <span>{formIsReady ? 'Partie 1 complète : elle pourra être intégrée au rapport PPTX.' : 'Tous les champs et visuels sont obligatoires avant la génération du rapport.'}</span>
          </div>
          {completionMessage && <p className={formIsReady ? 'fv-part1-completion is-ready' : 'fv-part1-completion'} role="status">{completionMessage}</p>}
          <div className="fv-part1-action-buttons">
            <button type="button" className="fv-part1-secondary-button" onClick={onOpenDiagnostics}>Voir les diagnostics</button>
            <button type="submit" className="fv-primary-button">Valider la Partie 1 <ArrowRight className="fv-button-arrow size-3.5" /></button>
          </div>
        </footer>
      </form>
    </main>
  );
}
