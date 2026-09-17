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
        let width = img.width;
        let height = img.height;

        // Si l'image est plus grande que la dimension cible, redimensionner proportionnellement
        if (width > maxDimension || height > maxDimension) {
          if (width > height) {
            height = Math.round((height * maxDimension) / width);
            width = maxDimension;
          } else {
            width = Math.round((width * maxDimension) / height);
            height = maxDimension;
          }
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          return resolve({ base64Data: dataUrl, mimeType: file.type || 'image/jpeg' });
        }

        ctx.drawImage(img, 0, 0, width, height);
        const optimizedDataUrl = canvas.toDataURL('image/jpeg', quality);
        resolve({
          base64Data: optimizedDataUrl,
          mimeType: 'image/jpeg',
        });
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
