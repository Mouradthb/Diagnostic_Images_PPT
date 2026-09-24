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
      bgClass: 'bg-[#DC2626]',
      textClass: 'text-white',
      borderClass: 'border-transparent',
    };
  }
  if (norm.includes('Niveau 2') || norm.toLowerCase().includes('niveau 2')) {
    return {
      label: 'Curatif Niveau 2',
      bgClass: 'bg-[#F97316]',
      textClass: 'text-[#1B1B1F]',
      borderClass: 'border-transparent',
    };
  }
  if (norm.includes('Niveau 3') || norm.toLowerCase().includes('niveau 3')) {
    return {
      label: 'Curatif Niveau 3',
      bgClass: 'bg-[#D7F3E1]',
      textClass: 'text-[#0B3D24]',
      borderClass: 'border-transparent',
    };
  }
  if (norm.toLowerCase().includes('entretien')) {
    return {
      label: 'Entretien',
      bgClass: 'bg-[#E0F2FE]',
      textClass: 'text-[#0C4A6E]',
      borderClass: 'border-transparent',
    };
  }
  if (norm.toLowerCase().includes('signalement')) {
    return {
      label: 'Signalement à vérifier',
      bgClass: 'bg-[#1D315B]',
      textClass: 'text-white',
      borderClass: 'border-transparent',
    };
  }
  if (norm.toLowerCase().includes('confirmer') || norm.toLowerCase().includes('expertise')) {
    return {
      label: 'À confirmer',
      bgClass: 'bg-[#E5E7EB]',
      textClass: 'text-[#374151]',
      borderClass: 'border-transparent',
    };
  }
  if (norm.toLowerCase().includes('énergétique') || norm.toLowerCase().includes('energetique')) {
    return {
      label: 'Travaux énergétiques',
      bgClass: 'bg-[#D7F3E1]',
      textClass: 'text-[#0B3D24]',
      borderClass: 'border-transparent',
    };
  }

  return {
    label: niveau || 'Non classé',
    bgClass: 'bg-[#E5E7EB]',
    textClass: 'text-[#374151]',
    borderClass: 'border-transparent',
  };
}
