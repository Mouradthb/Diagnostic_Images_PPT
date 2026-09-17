import { DiagnosticNiveau } from '../types';

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      resolve(result);
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
}

/**
 * Optimise une photo de visite technique (redimensionnement intelligent max 1600px, compression JPEG 85%)
 * afin d'éviter les surcharges de bande passante et les erreurs 503 dues aux fichiers trop lourds.
 */
export async function prepareImageForAnalysis(
  file: File,
  maxDimension = 1600,
  quality = 0.85
): Promise<{ base64Data: string; mimeType: string }> {
  try {
    const dataUrl = await fileToBase64(file);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        // Plusieurs tailles/qualités permettent de rester sous la limite de requête Vercel.
        let lastDataUrl = dataUrl;
        for (const size of [maxDimension, 1200, 900]) {
          const scale = Math.min(1, size / Math.max(img.width, img.height));
          const canvas = document.createElement('canvas');
          canvas.width = Math.max(1, Math.round(img.width * scale));
          canvas.height = Math.max(1, Math.round(img.height * scale));
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve({ base64Data: dataUrl, mimeType: file.type || 'image/jpeg' });
            return;
          }

          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          for (const candidateQuality of [quality, 0.7, 0.55]) {
            lastDataUrl = canvas.toDataURL('image/jpeg', candidateQuality);
            if (lastDataUrl.length < 3_800_000) {
              resolve({ base64Data: lastDataUrl, mimeType: 'image/jpeg' });
              return;
            }
          }
        }

        resolve({ base64Data: lastDataUrl, mimeType: 'image/jpeg' });
      };
      img.onerror = () => {
        resolve({ base64Data: dataUrl, mimeType: file.type || 'image/jpeg' });
      };
      img.src = dataUrl;
    });
  } catch {
    const rawData = await fileToBase64(file);
    return { base64Data: rawData, mimeType: file.type || 'image/jpeg' };
  }
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

export interface BadgeStyle {
  label: DiagnosticNiveau | string;
  bgClass: string;
  textClass: string;
  borderClass: string;
}

export function getNiveauBadgeStyle(niveau: DiagnosticNiveau | string): BadgeStyle {
  const norm = (niveau || '').trim();

  if (norm.includes('Niveau 1') || norm.toLowerCase().includes('niveau 1')) {
    return {
      label: 'Curatif Niveau 1',
      bgClass: 'bg-red-600',
      textClass: 'text-white',
      borderClass: 'border-red-700',
    };
  }
  if (norm.includes('Niveau 2') || norm.toLowerCase().includes('niveau 2')) {
    return {
      label: 'Curatif Niveau 2',
      bgClass: 'bg-orange-500',
      textClass: 'text-white',
      borderClass: 'border-orange-600',
    };
  }
  if (norm.includes('Niveau 3') || norm.toLowerCase().includes('niveau 3')) {
    return {
      label: 'Curatif Niveau 3',
      bgClass: 'bg-emerald-600',
      textClass: 'text-white',
      borderClass: 'border-emerald-700',
    };
  }
  if (norm.toLowerCase().includes('entretien')) {
    return {
      label: 'Entretien',
      bgClass: 'bg-teal-600',
      textClass: 'text-white',
      borderClass: 'border-teal-700',
    };
  }
  if (norm.toLowerCase().includes('signalement')) {
    return {
      label: 'Signalement',
      bgClass: 'bg-blue-600',
      textClass: 'text-white',
      borderClass: 'border-blue-700',
    };
  }
  if (norm.toLowerCase().includes('énergétique') || norm.toLowerCase().includes('energetique')) {
    return {
      label: 'Travaux énergétiques',
      bgClass: 'bg-green-950',
      textClass: 'text-white',
      borderClass: 'border-green-900',
    };
  }

  return {
    label: niveau || 'Non classé',
    bgClass: 'bg-zinc-700',
    textClass: 'text-white',
    borderClass: 'border-zinc-800',
  };
}
