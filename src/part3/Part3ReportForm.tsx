import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from 'react';
import { AlertCircle, FileText, ImagePlus, X } from 'lucide-react';
import {
  LIBELLES_STATUTS_DOCUMENTAIRES_PARTIE3,
  PART3_REQUIRED_STATUS_PATHS,
  STATUTS_DOCUMENTAIRES_PARTIE3,
  TABLEAUX_DOCUMENTAIRES_PARTIE3,
  type DonneesDocumentairesPartie3,
  type LigneDocumentairePartie3,
  type Part3ReportData,
  type RoleVisuelDpePartie3,
  type StatutDocumentairePartie3,
  type TableauDocumentairePartie3Id,
} from './reportData';
import {
  PART3_DPE_VISUAL_FILE_POLICY,
  type Part3ValidationIssue,
  type Part3ValidationResult,
  validatePart3ReportData,
} from './reportDataValidation';

interface Part3ReportFormProps {
  data: Part3ReportData;
  validation: Part3ValidationResult;
  onChange: (nextData: Part3ReportData) => void;
  showValidation?: boolean;
  onTransientValidityChange?: (isValid: boolean) => void;
  footer?: ReactNode;
}

const DPE_VISUAL_FIELDS: ReadonlyArray<{
  role: RoleVisuelDpePartie3;
  label: string;
  description: string;
}> = [
  {
    role: 'etiquette_energetique_etat_initial',
    label: 'Étiquette énergétique — état initial',
    description: 'Facultatif · capture de l’étiquette DPE collectif',
  },
  {
    role: 'etiquette_energetique_scenario_renovation_ambitieux',
    label: 'Étiquette énergétique — scénario de rénovation le plus ambitieux',
    description: 'Facultatif · capture de l’étiquette du scénario',
  },
];

function issueFor(
  validation: Part3ValidationResult,
  showValidation: boolean,
  path: string,
): Part3ValidationIssue | undefined {
  return showValidation ? validation.issues.find((issue) => issue.path === path) : undefined;
}

function statusPath(tableId: string, rowId: string): string {
  return `documentation.${tableId}.${rowId}.statut`;
}

function commentPath(tableId: string, rowId: string): string {
  return `documentation.${tableId}.${rowId}.commentaire`;
}

/**
 * Changes exactly one documentary row. The catalogue determines every key, so
 * it is safe to use the record view solely at this controlled UI boundary.
 */
function updateDocumentaryRow(
  data: Part3ReportData,
  tableId: TableauDocumentairePartie3Id,
  rowId: string,
  update: (row: LigneDocumentairePartie3) => LigneDocumentairePartie3,
): Part3ReportData {
  const currentTable = data.documentation[tableId] as Record<string, LigneDocumentairePartie3>;
  const nextTable = {
    ...currentTable,
    [rowId]: update(currentTable[rowId]),
  };
  return {
    ...data,
    documentation: {
      ...data.documentation,
      [tableId]: nextTable,
    } as DonneesDocumentairesPartie3,
  };
}

interface DpeVisualFieldProps {
  role: RoleVisuelDpePartie3;
  label: string;
  description: string;
  file?: File;
  issue?: Part3ValidationIssue;
  inputError?: string;
  onSelect: (role: RoleVisuelDpePartie3, file: File) => void;
  onRemove: (role: RoleVisuelDpePartie3) => void;
}

function DpeVisualField({
  role,
  label,
  description,
  file,
  issue,
  inputError,
  onSelect,
  onRemove,
}: DpeVisualFieldProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const inputId = `part3-visual-${role}`;
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
    <div className="fv-part3-visual-field">
      <div className="fv-part3-visual-heading">
        <label htmlFor={inputId} className="fv-part3-label">{label}</label>
        <span>{description}</span>
      </div>
      <input
        id={inputId}
        type="file"
        accept={PART3_DPE_VISUAL_FILE_POLICY.acceptedMimeTypes.join(',')}
        className="sr-only"
        aria-describedby={visibleError ? errorId : undefined}
        onChange={handleChange}
      />
      {file && previewUrl ? (
        <div className="fv-part3-visual-preview">
          <img src={previewUrl} alt={`Aperçu — ${label}`} />
          <div className="fv-part3-visual-file-name" title={file.name}>{file.name}</div>
          <button type="button" onClick={() => onRemove(role)} aria-label={`Retirer ${label}`} className="fv-part3-visual-remove">
            <X className="size-3.5" />
          </button>
        </div>
      ) : (
        <label htmlFor={inputId} className="fv-part3-visual-dropzone">
          <ImagePlus className="size-5" strokeWidth={1.6} />
          <span>Ajouter une capture</span>
          <small>JPG · PNG · WEBP<br />20 Mo max.</small>
        </label>
      )}
      {visibleError && <p id={errorId} className="fv-part3-error" role="alert"><AlertCircle className="size-3.5" /> {visibleError}</p>}
    </div>
  );
}

/**
 * Controlled Part 3 editor. Its optional DPE images stay in local browser
 * state and never enter the photo-analysis request path.
 */
export function Part3ReportForm({
  data,
  validation,
  onChange,
  showValidation: requestedValidation = false,
  onTransientValidityChange,
  footer,
}: Part3ReportFormProps) {
  const [showValidation, setShowValidation] = useState(false);
  const [inputErrors, setInputErrors] = useState<Partial<Record<RoleVisuelDpePartie3, string>>>({});
  const missingCount = validation.issues.filter((issue) => issue.code === 'champ_requis').length;
  const completedCount = PART3_REQUIRED_STATUS_PATHS.length - missingCount;
  const completionPercent = Math.round((completedCount / PART3_REQUIRED_STATUS_PATHS.length) * 100);
  const visibleValidation = useMemo(() => ({ validation, showValidation }), [showValidation, validation]);

  useEffect(() => {
    if (requestedValidation) setShowValidation(true);
  }, [requestedValidation]);

  useEffect(() => {
    onTransientValidityChange?.(Object.keys(inputErrors).length === 0);
  }, [inputErrors, onTransientValidityChange]);

  const updateData = (update: (previous: Part3ReportData) => Part3ReportData) => {
    onChange(update(data));
  };

  const updateDpeVisual = (role: RoleVisuelDpePartie3, file: File) => {
    const candidate: Part3ReportData = {
      ...data,
      dpeCollectif: {
        ...data.dpeCollectif,
        visuels: { ...data.dpeCollectif.visuels, [role]: file },
      },
    };
    const fileIssue = validatePart3ReportData(candidate).issues.find((issue) => (
      issue.path === `dpeCollectif.visuels.${role}`
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

  const removeDpeVisual = (role: RoleVisuelDpePartie3) => {
    setInputErrors((previous) => {
      const { [role]: _discarded, ...remaining } = previous;
      return remaining;
    });
    updateData((previous) => {
      const { [role]: _discarded, ...remaining } = previous.dpeCollectif.visuels;
      return {
        ...previous,
        dpeCollectif: { ...previous.dpeCollectif, visuels: remaining },
      };
    });
  };

  return (
    <main className="fv-part3-page" aria-labelledby="part3-heading">
      <header className="fv-part3-intro">
        <div>
          <p className="fv-eyebrow">Partie 3 · Documentation et synthèse</p>
          <h2 id="part3-heading">Documents et synthèse PPPT</h2>
          <p>Renseignez le statut des documents disponibles. Les commentaires et les deux captures DPE collectif restent facultatifs.</p>
        </div>
        <div className="fv-part3-progress" aria-label={`${completedCount} statuts renseignés sur ${PART3_REQUIRED_STATUS_PATHS.length}`}>
          <div><strong>{completedCount} / {PART3_REQUIRED_STATUS_PATHS.length}</strong> statuts renseignés</div>
          <div className="fv-part3-progress-track" aria-hidden="true"><span style={{ width: `${completionPercent}%` }} /></div>
          <span>{completionPercent} %</span>
        </div>
      </header>

      <form className="fv-part3-form" noValidate onSubmit={(event) => event.preventDefault()}>
        <section className="fv-part3-section" aria-labelledby="part3-documents-heading">
          <div className="fv-part3-section-heading">
            <span>05</span>
            <div><p>Analyse documentaire</p><h3 id="part3-documents-heading">Documents transmis</h3></div>
          </div>
          <p className="fv-part3-section-copy">Le statut est obligatoire pour chaque ligne. Le commentaire est facultatif et sera repris dans les tableaux de la Partie 3.</p>

          <div className="fv-part3-document-groups">
            {TABLEAUX_DOCUMENTAIRES_PARTIE3.map((table) => {
              const tableId = table.id as TableauDocumentairePartie3Id;
              const rows = data.documentation[tableId] as Record<string, LigneDocumentairePartie3>;
              return (
                <section key={table.id} className="fv-part3-document-group" aria-labelledby={`part3-${table.id}`}>
                  <h4 id={`part3-${table.id}`}>{table.titre}</h4>
                  <div className="fv-part3-document-table" role="table" aria-label={table.titre}>
                    <div className="fv-part3-document-row fv-part3-document-row--header" role="row">
                      <span role="columnheader">Document</span>
                      <span role="columnheader">Statut <em>*</em></span>
                      <span role="columnheader">Commentaire <small>facultatif</small></span>
                    </div>
                    {table.lignes.map((catalogueRow) => {
                      const row = rows[catalogueRow.id];
                      const currentStatusPath = statusPath(table.id, catalogueRow.id);
                      const currentCommentPath = commentPath(table.id, catalogueRow.id);
                      const statusIssue = issueFor(visibleValidation.validation, visibleValidation.showValidation, currentStatusPath);
                      const commentIssue = issueFor(visibleValidation.validation, visibleValidation.showValidation, currentCommentPath);
                      const fieldId = `part3-${table.id}-${catalogueRow.id}`;
                      return (
                        <div key={catalogueRow.id} className="fv-part3-document-row" role="row">
                          <label htmlFor={`${fieldId}-status`} className="fv-part3-document-name">{catalogueRow.designation}</label>
                          <div className="fv-part3-document-control">
                            <select
                              id={`${fieldId}-status`}
                              value={row.statut ?? ''}
                              aria-invalid={Boolean(statusIssue)}
                              className={`fv-part3-control fv-part3-status-control${row.statut ? ` is-${row.statut}` : ''}${statusIssue ? ' is-invalid' : ''}`}
                              onChange={(event) => updateData((previous) => updateDocumentaryRow(
                                previous,
                                tableId,
                                catalogueRow.id,
                                (previousRow) => ({
                                  ...previousRow,
                                  statut: event.target.value === '' ? null : event.target.value as StatutDocumentairePartie3,
                                }),
                              ))}
                            >
                              <option value="">Choisir</option>
                              {STATUTS_DOCUMENTAIRES_PARTIE3.map((status) => (
                                <option key={status} value={status}>{LIBELLES_STATUTS_DOCUMENTAIRES_PARTIE3[status]}</option>
                              ))}
                            </select>
                            {statusIssue && <p className="fv-part3-error" role="alert"><AlertCircle className="size-3.5" /> {statusIssue.message}</p>}
                          </div>
                          <div className="fv-part3-document-control">
                            <textarea
                              id={`${fieldId}-comment`}
                              rows={2}
                              value={row.commentaire ?? ''}
                              aria-label={`Commentaire — ${catalogueRow.designation}`}
                              aria-invalid={Boolean(commentIssue)}
                              className={`fv-part3-control${commentIssue ? ' is-invalid' : ''}`}
                              onChange={(event) => updateData((previous) => updateDocumentaryRow(
                                previous,
                                tableId,
                                catalogueRow.id,
                                (previousRow) => ({ ...previousRow, commentaire: event.target.value === '' ? null : event.target.value }),
                              ))}
                            />
                            {commentIssue && <p className="fv-part3-error" role="alert"><AlertCircle className="size-3.5" /> {commentIssue.message}</p>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              );
            })}
          </div>
        </section>

        <section className="fv-part3-section" aria-labelledby="part3-dpe-heading">
          <div className="fv-part3-section-heading">
            <span>06</span>
            <div><p>Synthèse du PPPT</p><h3 id="part3-dpe-heading">Diagnostic de performance énergétique collectif</h3></div>
          </div>
          <p className="fv-part3-section-copy">Ajoutez si vous les avez les deux captures d’étiquette. Elles sont facultatives, restent dans votre session et ne sont jamais envoyées pour l’analyse photo.</p>
          <div className="fv-part3-visual-grid">
            {DPE_VISUAL_FIELDS.map((field) => (
              <DpeVisualField
                key={field.role}
                {...field}
                file={data.dpeCollectif.visuels[field.role]}
                issue={issueFor(validation, showValidation, `dpeCollectif.visuels.${field.role}`)}
                inputError={inputErrors[field.role]}
                onSelect={updateDpeVisual}
                onRemove={removeDpeVisual}
              />
            ))}
          </div>
        </section>

        <section className="fv-part3-derived-note" aria-label="Tableau curatif dérivé">
          <FileText className="size-4" />
          <p><strong>Tableau récapitulatif des curatifs.</strong> Il sera généré depuis les diagnostics éligibles de la Partie 2, sans modifier leurs résultats ni leur export autonome. Chaque montant reste une estimation IA indicative à vérifier par un ingénieur.</p>
        </section>

        {footer}
      </form>
    </main>
  );
}
