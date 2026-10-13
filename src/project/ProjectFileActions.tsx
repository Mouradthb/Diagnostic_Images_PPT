import { useRef, useState, type ChangeEvent } from 'react';
import { FileDown, FileUp, Loader2 } from 'lucide-react';
import type { Part1ReportData } from '../part1/reportData';
import type { Part3ReportData } from '../part3/reportData';
import {
  MAX_PROJECT_FILE_BYTES,
  createProjectFileName,
  prepareProjectImport,
  serializeProjectFile,
  type ProjectDraft,
} from './projectFile';

interface ProjectFileActionsProps extends ProjectDraft {
  disabled?: boolean;
  onRestore: (draft: ProjectDraft) => void;
}

export function ProjectFileActions({
  part1Data,
  part3Data,
  disabled = false,
  onRestore,
}: ProjectFileActionsProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const currentRef = useRef<{ part1Data: Part1ReportData; part3Data: Part3ReportData }>({ part1Data, part3Data });
  currentRef.current = { part1Data, part3Data };
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [isError, setIsError] = useState(false);

  const save = async () => {
    if (busy || disabled) return;
    setBusy(true);
    setMessage('');
    try {
      const snapshot = currentRef.current;
      const savedAt = new Date();
      const json = await serializeProjectFile(snapshot, savedAt);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = createProjectFileName(snapshot.part1Data, savedAt);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
      setIsError(false);
      setMessage('Projet enregistré dans un fichier JSON local.');
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'L’enregistrement du projet a échoué.');
    } finally {
      setBusy(false);
    }
  };

  const importFile = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file || busy || disabled) return;
    setBusy(true);
    setMessage('');
    try {
      if (file.size > MAX_PROJECT_FILE_BYTES) throw new Error('Le fichier de projet dépasse 170 Mo.');
      const json = await file.text();
      const restored = prepareProjectImport(
        json,
        currentRef.current,
        () => window.confirm('Remplacer les données des espaces 01 et 03 par celles de ce projet ? Les photos et résultats de l’espace 02 seront conservés.'),
      );
      if (restored) {
        onRestore(restored);
        setIsError(false);
        setMessage('Projet importé : les espaces 01 et 03 ont été restaurés.');
      } else {
        setIsError(false);
        setMessage('Importation annulée : les formulaires sont inchangés.');
      }
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : 'L’importation du projet a échoué.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="fv-project-file-actions" aria-label="Sauvegarde du projet">
      <div className="fv-project-file-copy">
        <strong>Sauvegarde du projet</strong>
        <span>Formulaires 01 et 03, avec leurs visuels · les photos de diagnostic 02 ne sont pas incluses.</span>
      </div>
      <div className="fv-project-file-controls">
        <button type="button" className="fv-project-file-button" onClick={() => void save()} disabled={busy || disabled}>
          {busy ? <Loader2 className="size-4 animate-spin" /> : <FileDown className="size-4" />}
          Enregistrer le projet
        </button>
        <button type="button" className="fv-project-file-button fv-project-file-button--import" onClick={() => inputRef.current?.click()} disabled={busy || disabled}>
          <FileUp className="size-4" />
          Importer un projet
        </button>
        <input ref={inputRef} type="file" accept=".json,application/json" className="sr-only" aria-label="Choisir un fichier de projet JSON" onChange={(event) => void importFile(event)} />
      </div>
      {message && <p className={isError ? 'fv-project-file-message is-error' : 'fv-project-file-message'} role={isError ? 'alert' : 'status'}>{message}</p>}
    </section>
  );
}
