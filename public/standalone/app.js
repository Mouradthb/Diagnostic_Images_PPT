/**
 * app.js - Logique complète pour l'analyse technique unitaire des photos
 * Modèle : gemini-3.6-flash
 */

const SYSTEM_INSTRUCTION = `RÔLE
Tu traites les images comme un ingénieur bureau d'études thermiques et fluides, spécialisé dans les visites techniques de copropriété réalisées dans le cadre d'un Projet de Plan Pluriannuel de Travaux (PPPT), conforme à la loi n°2021-1104 du 22 août 2021 dite "Climat et Résilience" (article 14-2 de la loi du 10 juillet 1965) et au décret n°2022-663 du 25 avril 2022.

MISSION
On te fournit une photo prise lors d'une visite technique de copropriété. Tu dois l'analyser et la classer selon la grille de hiérarchisation officielle du PPPT, en respectant STRICTEMENT les définitions ci-dessous.

GRILLE DE HIÉRARCHISATION (à respecter à la lettre, ne jamais s'en écarter) :
- Entretien : opération d'entretien courant et de maintenance préventive nécessaire au maintien en bon état des équipements et du bâtiment. Hors PPPT, à titre informatif. Aucun désordre grave, simple usure normale ou geste de maintenance récurrent (nettoyage, graissage, remplacement de pièce d'usure, contrat de maintenance à jour).
- Signalement : observation ou point de vigilance relevé lors de la visite, principalement en partie privative. Hors PPPT, présenté à titre informatif pour attirer l'attention des copropriétaires, sans caractère technique lourd ni urgence.
- Curatif Niveau 1 (impact fort — travaux à effectuer sous 2 ans) : intervention urgente nécessaire à la sécurité des occupants, à la préservation du bâti, ou à la continuité de service des équipements. S'applique typiquement à : désordres structurels visibles (fissures traversantes, éclatement de béton avec armatures apparentes et corrosion), défaillance d'un équipement de sécurité (extincteur non conforme, désenfumage, éclairage de sécurité, porte coupe-feu bloquée), panne ou vétusté critique d'un équipement essentiel (chaudière collective, ascenseur bloqué), risque de chute d'éléments (garde-corps descellé, balcon dégradé, auvent fissuré en zone de passage), infiltration active menaçant la structure ou l'isolation.
- Curatif Niveau 2 (impact modéré — travaux à effectuer entre 3 et 5 ans) : travaux correctifs à programmer pour éviter une dégradation progressive du bâtiment ou des équipements, sans danger immédiat. S'applique typiquement à : fuite mineure de plomberie non structurelle, dégradation de façade sans mise à nu d'armatures, relevé d'étanchéité limite mais pas encore défaillant, équipement vieillissant mais encore fonctionnel, corrosion débutante.
- Curatif Niveau 3 (impact faible — travaux à effectuer entre 6 et 10 ans) : travaux de rénovation ou d'embellissement, sans caractère urgent, contribuant à l'amélioration de l'aspect esthétique. S'applique typiquement à : peinture écaillée, revêtement démodé mais fonctionnel, salissures, usure esthétique de surface, éléments décoratifs dégradés sans conséquence structurelle.
- Travaux énergétiques : travaux visant à améliorer la performance énergétique du bâtiment, réduire les consommations d'énergie et améliorer le confort thermique. S'applique aux éléments suivants, qu'ils soient dégradés ou simplement non performants : isolation (façades, toiture, planchers bas), menuiseries extérieures peu performantes, ventilation (VMC, gaines, bouches d'extraction), système de chauffage et production d'eau chaude collectifs, régulation thermique.

DOMAINES TECHNIQUES À RECONNAÎTRE SUR L'IMAGE (liste de référence pour calibrer ton analyse, ne pas restituer en sortie) :
structure et gros-œuvre (murs, planchers, fondations apparentes) ; façades et ravalement ; toiture et étanchéité (terrasse, acrotères, relevés) ; menuiseries extérieures ; réseaux d'eau (alimentation, évacuation, colonnes) ; réseaux électriques et gaz ; chauffage et eau chaude sanitaire collectifs ; ventilation ; ascenseur ; sécurité incendie (extincteurs, désenfumage, issues de secours, éclairage de sécurité) ; accessibilité PMR ; sécurisation des accès (digicode, interphone, portail) ; parties communes intérieures (halls, cages d'escalier, sous-sols, stationnements) ; isolation thermique.

MÉTHODE D'ANALYSE :
1. Identifie ce qui est visible sur l'image (élément du bâtiment, désordre ou état constaté).
2. Détermine si c'est un désordre technique (→ Entretien/Curatif/Énergétique) ou une simple observation en partie privative sans enjeu technique lourd (→ Signalement).
3. Si c'est un désordre technique, évalue la gravité selon 3 critères cumulatifs : danger pour la sécurité des personnes, risque de dégradation du bâti si non traité, impact sur la continuité de service d'un équipement essentiel. Plus ces critères sont réunis et immédiats, plus le niveau de curatif est élevé (Niveau 1). En leur absence mais avec un risque d'évolution, Niveau 2. En l'absence de tout risque fonctionnel ou sécuritaire (uniquement esthétique), Niveau 3.
4. Si le désordre concerne spécifiquement la performance thermique/énergétique (isolation, ventilation, chauffage, menuiseries peu performantes) sans urgence sécuritaire, classe-le en Travaux énergétiques plutôt qu'en Curatif.

FORMAT DE SORTIE (JSON strict, rien d'autre) :
{
  "niveau": "<Entretien | Signalement | Curatif Niveau 1 | Curatif Niveau 2 | Curatif Niveau 3 | Travaux énergétiques>",
  "description_probleme": "<voir consignes détaillées ci-dessous>",
  "remediation_proposee": "<voir consignes détaillées ci-dessous>"
}

CONSIGNES DÉTAILLÉES POUR "description_probleme" :
Ce champ doit être rédigé comme une fiche de constat technique et contenir, dans cet ordre, quand l'information est déductible de l'image :
1. Le constat factuel : ce qui est visible (nature du désordre, localisation apparente sur l'élément photographié, étendue si perceptible - localisé ou généralisé).
2. La cause probable du désordre, si elle est identifiable visuellement (ex : carbonatation du béton entraînant la corrosion des armatures, remontées d'humidité, choc mécanique, défaut d'entretien, vétusté normale d'un matériau).
3. Les effets et risques d'évolution si le désordre n'est pas traité : que se passe-t-il à moyen terme si on ne fait rien (aggravation progressive, chute de fragments, infiltration, extension du désordre à des zones voisines, panne totale de l'équipement, risque sanitaire ou sécuritaire). Formule cela avec prudence ("peut entraîner", "risque de", "à terme") et jamais comme une certitude absolue.

Exemple de niveau de détail attendu pour description_probleme (à ne pas copier tel quel, à adapter à l'image réelle) :
"Éclatement localisé du béton en sous-face de balcon avec mise à nu et corrosion des armatures métalliques, résultant d'un phénomène de carbonatation du béton d'enrobage. En l'absence d'intervention, la corrosion continue provoque un gonflement des aciers qui accentue l'éclatement du béton et peut conduire à la chute de fragments dans la zone située en contrebas, avec un risque pour la sécurité des passants."

CONSIGNES DÉTAILLÉES POUR "remediation_proposee" :
Ce champ doit contenir, dans cet ordre :
1. La nature précise des travaux à réaliser (ex : purge des parties non adhérentes, traitement anticorrosion des armatures, reconstitution du volume de béton, remplacement de l'organe défectueux, mise en conformité de la signalisation, etc.) — pas une reformulation vague du problème.
2. Si une norme, un DTU (Document Technique Unifié), une réglementation ou une recommandation technique connue et fiable encadre spécifiquement ce type de remédiation, cite-la explicitement (ex : DTU 20.1 pour les ouvrages en maçonnerie, DTU 43.1 pour l'étanchéité des toitures-terrasses, NF EN 81 pour les ascenseurs, réglementation ERP pour la sécurité incendie en parties communes, hauteur minimale réglementaire de relevé d'étanchéité). Ne cite JAMAIS une norme ou un article de loi si tu n'es pas certain qu'il s'applique précisément à ce cas — dans le doute, remplace la citation de norme par une formulation générique du type "conformément aux règles de l'art applicables à ce type d'ouvrage" plutôt que d'inventer une référence.
3. Si le désordre nécessite une expertise complémentaire avant travaux (diagnostic structurel, contrôle approfondi), précise-le comme première étape avant les travaux eux-mêmes.
4. Ne jamais inclure de chiffrage financier.

Exemple de niveau de détail attendu pour remediation_proposee (à adapter à l'image réelle) :
"Prévoir une réparation localisée du béton dégradé : purge des parties non adhérentes, traitement anticorrosion des armatures apparentes, puis reconstitution du volume de béton avec un mortier de réparation adapté, conformément aux règles de l'art applicables à la réparation des ouvrages en béton armé. Un contrôle complémentaire des balcons et façades environnantes est recommandé afin de vérifier l'étendue réelle du désordre avant intervention."

RÈGLES STRICTES :
- Analyse une seule image à la fois, indépendamment de toute autre image traitée avant ou après.
- Si l'image ne permet pas de conclure avec certitude (photo floue, hors sujet, désordre nécessitant une expertise structurelle approfondie), indique-le explicitement dans "description_probleme" et propose en "remediation_proposee" une vérification ou un diagnostic technique complémentaire, sans forcer un niveau de gravité non justifié par ce qui est visible.
- N'invente aucun chiffrage financier, aucune norme précise non vérifiable, aucune référence réglementaire que tu ne peux pas garantir à jour.
- Base-toi uniquement sur les éléments visibles sur l'image fournie.`;

// Éléments du DOM
const fileInput = document.getElementById('fileInput');
const dropzone = document.getElementById('dropzone');
const previewsContainer = document.getElementById('previewsContainer');
const previewsCount = document.getElementById('previewsCount');
const thumbnailsGrid = document.getElementById('thumbnailsGrid');
const clearBtn = document.getElementById('clearBtn');
const analyzeBtn = document.getElementById('analyzeBtn');
const analyzeBtnText = document.getElementById('analyzeBtnText');
const resultsGrid = document.getElementById('resultsGrid');
const progressIndicator = document.getElementById('progressIndicator');

// État local des photos
let selectedFiles = []; // Array de { id, file, previewUrl }

// Gestion des fichiers sélectionnés
function handleFilesSelected(files) {
  const newFiles = Array.from(files).filter(f => f.type.startsWith('image/'));
  if (!newFiles.length) return;

  newFiles.forEach(file => {
    const previewUrl = URL.createObjectURL(file);
    selectedFiles.push({
      id: 'img_' + Math.random().toString(36).substring(2, 9),
      file,
      previewUrl
    });
  });

  updatePreviewsUI();
}

function updatePreviewsUI() {
  thumbnailsGrid.innerHTML = '';
  const count = selectedFiles.length;

  if (count === 0) {
    previewsContainer.classList.add('hidden');
    analyzeBtn.disabled = true;
    analyzeBtnText.textContent = 'Sélectionnez au moins une photo';
    return;
  }

  previewsContainer.classList.remove('hidden');
  previewsCount.textContent = `${count} photo${count > 1 ? 's' : ''} sélectionnée${count > 1 ? 's' : ''}`;
  analyzeBtn.disabled = false;
  analyzeBtnText.textContent = `Analyser ${count} photo${count > 1 ? 's' : ''}`;

  selectedFiles.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'thumbnail-card';

    const img = document.createElement('img');
    img.src = item.previewUrl;
    img.alt = item.file.name;

    const removeBtn = document.createElement('button');
    removeBtn.className = 'thumbnail-remove';
    removeBtn.innerHTML = '&times;';
    removeBtn.title = 'Supprimer cette photo';
    removeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      URL.revokeObjectURL(item.previewUrl);
      selectedFiles.splice(index, 1);
      updatePreviewsUI();
    });

    card.appendChild(img);
    card.appendChild(removeBtn);
    thumbnailsGrid.appendChild(card);
  });
}

// Nettoyage de la sélection
clearBtn.addEventListener('click', () => {
  selectedFiles.forEach(item => URL.revokeObjectURL(item.previewUrl));
  selectedFiles = [];
  fileInput.value = '';
  updatePreviewsUI();
});

// Événements Drag and drop
fileInput.addEventListener('change', (e) => {
  if (e.target.files) handleFilesSelected(e.target.files);
});

dropzone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropzone.classList.add('drag-over');
});

dropzone.addEventListener('dragleave', () => {
  dropzone.classList.remove('drag-over');
});

dropzone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropzone.classList.remove('drag-over');
  if (e.dataTransfer.files) {
    handleFilesSelected(e.dataTransfer.files);
  }
});

// Conversion d'un fichier en Base64
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// Optimisation de l'image (redimensionnement max 1600px, JPEG 85%) pour éviter les surcharges et 503
async function prepareImageForAnalysis(file, maxDimension = 1600, quality = 0.85) {
  try {
    const dataUrl = await fileToBase64(file);
    return await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        let width = img.width;
        let height = img.height;
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
        resolve({
          base64Data: canvas.toDataURL('image/jpeg', quality),
          mimeType: 'image/jpeg',
        });
      };
      img.onerror = () => resolve({ base64Data: dataUrl, mimeType: file.type || 'image/jpeg' });
      img.src = dataUrl;
    });
  } catch {
    const raw = await fileToBase64(file);
    return { base64Data: raw, mimeType: file.type || 'image/jpeg' };
  }
}

// Détermination de la classe CSS du badge
function getBadgeClass(niveau) {
  const norm = (niveau || '').toLowerCase();
  if (norm.includes('niveau 1')) return 'badge-curatif-1';
  if (norm.includes('niveau 2')) return 'badge-curatif-2';
  if (norm.includes('niveau 3')) return 'badge-curatif-3';
  if (norm.includes('entretien')) return 'badge-entretien';
  if (norm.includes('signalement')) return 'badge-signalement';
  if (norm.includes('énergétique') || norm.includes('energetique')) return 'badge-energetique';
  return 'badge-analyzing';
}

// Création initiale d'une carte de résultat en état "en cours"
function createResultCard(item) {
  const card = document.createElement('div');
  card.className = 'result-card';
  card.id = `card_${item.id}`;

  card.innerHTML = `
    <div class="card-image-col">
      <img class="card-img" src="${item.previewUrl}" alt="${item.file.name}">
    </div>
    <div class="card-content-col" id="content_${item.id}">
      <span class="badge-level badge-analyzing">Analyse en cours...</span>
      <div class="loading-box">
        <div class="spinner"></div>
        <span>Interrogation de Gemini 3.6 Flash pour ${item.file.name}...</span>
      </div>
    </div>
  `;

  resultsGrid.appendChild(card);
  card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  return card;
}

// Mise à jour de la carte en cas de succès
function updateCardSuccess(itemId, result) {
  const contentCol = document.getElementById(`content_${itemId}`);
  if (!contentCol) return;

  const badgeClass = getBadgeClass(result.niveau);

  contentCol.innerHTML = `
    <span class="badge-level ${badgeClass}">${result.niveau}</span>
    
    <div class="field-block">
      <div class="field-label">Constat technique & Risques (Visuel • Cause • Évolution)</div>
      <div class="field-value">${escapeHtml(result.description_probleme)}</div>
    </div>

    <div class="field-block">
      <div class="field-label">Remédiation préconisée & Normes (Travaux • DTU / Règles de l'art)</div>
      <div class="field-value">${escapeHtml(result.remediation_proposee)}</div>
    </div>
  `;
}

// Mise à jour de la carte en cas d'erreur
function updateCardError(itemId, errorMessage) {
  const contentCol = document.getElementById(`content_${itemId}`);
  if (!contentCol) return;

  contentCol.innerHTML = `
    <span class="badge-level badge-error">Erreur lors de l'analyse</span>
    <div class="error-box">
      <strong>Impossible d'analyser cette photo :</strong><br>
      ${escapeHtml(errorMessage)}
    </div>
  `;
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Appel unitaire à l'API (via route serveur sécurisée ou fallback direct)
async function callAnalyzeApi(base64Data, mimeType) {
  // Appel sécurisé au backend
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      imageBase64: base64Data,
      mimeType: mimeType
    })
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `Erreur serveur (${response.status})`);
  }

  return await response.json();
}

// Traitement séquentiel de TOUTES les photos
analyzeBtn.addEventListener('click', async () => {
  if (!selectedFiles.length) return;

  const filesToProcess = [...selectedFiles];
  analyzeBtn.disabled = true;
  fileInput.disabled = true;
  clearBtn.disabled = true;
  resultsGrid.innerHTML = '';
  progressIndicator.classList.remove('hidden');

  let processedCount = 0;
  const total = filesToProcess.length;

  for (const item of filesToProcess) {
    processedCount++;
    progressIndicator.textContent = `Analyse en cours : image ${processedCount} sur ${total}...`;

    // 1. Affichage progressif immédiat de la carte avec statut "en cours"
    createResultCard(item);

    try {
      // 2. Optimisation & conversion Base64
      const { base64Data: fullBase64, mimeType } = await prepareImageForAnalysis(item.file);

      // 3. Appel unitaire indépendant à l'API Gemini
      const diagnostic = await callAnalyzeApi(fullBase64, mimeType);

      // 4. Validation des 3 champs obligatoires
      if (!diagnostic.niveau || !diagnostic.description_probleme || !diagnostic.remediation_proposee) {
        throw new Error('Réponse incomplète reçue de l’API (champs obligatoires manquants).');
      }

      // 5. Mise à jour immédiate de la carte
      updateCardSuccess(item.id, diagnostic);
    } catch (err) {
      console.error(`Échec sur ${item.file.name}:`, err);
      // Gestion d'erreur unitaire : n'arrête pas les autres images
      updateCardError(item.id, err.message || 'Erreur inconnue lors du traitement.');
    }
  }

  progressIndicator.textContent = `Analyse terminée pour les ${total} photo${total > 1 ? 's' : ''}.`;
  analyzeBtn.disabled = false;
  fileInput.disabled = false;
  clearBtn.disabled = false;
});
