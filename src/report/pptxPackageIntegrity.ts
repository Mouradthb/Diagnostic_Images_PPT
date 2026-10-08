import JSZip from 'jszip';

const PPTX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
const CONTENT_TYPES_PATH = '[Content_Types].xml';
const OVERRIDE_PART_PATTERN = /<Override\b[^>]*\bPartName="([^"]+)"[^>]*\/>/g;

function packagePath(partName: string): string {
  return partName.replace(/^\//, '');
}

/**
 * PptxGenJS may leave content-type overrides for slide masters that it did
 * not write to the archive. PowerPoint often tolerates these stale entries,
 * but they make the Open XML package structurally inconsistent. Remove only
 * overrides whose target part is absent; presentation content is untouched.
 */
export async function normalizePptxPackage(blob: Blob): Promise<Blob> {
  const archive = await JSZip.loadAsync(blob);
  const contentTypesFile = archive.file(CONTENT_TYPES_PATH);
  if (!contentTypesFile) throw new Error('Le package PPTX ne contient pas [Content_Types].xml.');

  const contentTypes = await contentTypesFile.async('string');
  const normalized = contentTypes.replace(OVERRIDE_PART_PATTERN, (override, partName: string) => (
    archive.file(packagePath(partName)) ? override : ''
  ));

  if (normalized === contentTypes) return blob;

  archive.file(CONTENT_TYPES_PATH, normalized);
  return archive.generateAsync({
    type: 'blob',
    mimeType: PPTX_MIME_TYPE,
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });
}
