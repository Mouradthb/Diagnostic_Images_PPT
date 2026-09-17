import express from "express";
import path from "path";
import dotenv from "dotenv";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";

dotenv.config();

const PORT = 3000;

// Lazy initialization of Gemini SDK
let aiClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI {
  if (!aiClient) {
    const apiKey = process.env.GEMINI_API_KEY || process.env.API_KEY;
    if (!apiKey) {
      throw new Error("GEMINI_API_KEY n'est pas configuré dans l'environnement.");
    }
    aiClient = new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

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

async function startServer() {
  const app = express();

  // Allow larger payloads for base64 inspection photos
  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      hasApiKey: Boolean(process.env.GEMINI_API_KEY || process.env.API_KEY),
    });
  });

  // Dedicated single image analysis endpoint with retry & fallback
  app.post("/api/analyze", async (req, res) => {
    try {
      const { imageBase64, mimeType } = req.body;
      if (!imageBase64 || !mimeType) {
        return res.status(400).json({
          error: "Paramètres manquants: imageBase64 et mimeType sont requis.",
        });
      }

      // Clean base64 data prefix if present
      const cleanBase64 = imageBase64.replace(/^data:[^;]+;base64,/, "");

      const ai = getGenAI();

      // Models to try in order of resilience and performance
      const candidateModels = [
        "gemini-3.1-flash-lite",
        "gemini-3.6-flash",
        "gemini-flash-latest",
        "gemini-3.8-flash",
      ];
      const maxAttemptsPerModel = 2;
      let lastError: any = null;
      let parsedResult: any = null;

      for (const model of candidateModels) {
        for (let attempt = 1; attempt <= maxAttemptsPerModel; attempt++) {
          try {
            const response = await ai.models.generateContent({
              model,
              contents: [
                {
                  inlineData: {
                    mimeType: mimeType,
                    data: cleanBase64,
                  },
                },
                "Analyse cette photo de visite technique conformément aux instructions système strictes et renvoie le diagnostic au format JSON.",
              ],
              config: {
                systemInstruction: SYSTEM_INSTRUCTION,
                temperature: 0.15,
                responseMimeType: "application/json",
                responseSchema: {
                  type: Type.OBJECT,
                  properties: {
                    niveau: {
                      type: Type.STRING,
                      enum: [
                        "Entretien",
                        "Signalement",
                        "Curatif Niveau 1",
                        "Curatif Niveau 2",
                        "Curatif Niveau 3",
                        "Travaux énergétiques",
                      ],
                    },
                    description_probleme: { type: Type.STRING },
                    remediation_proposee: { type: Type.STRING },
                  },
                  required: ["niveau", "description_probleme", "remediation_proposee"],
                },
              },
            });

            const rawText = response.text;
            if (!rawText) {
              throw new Error("Réponse vide retournée par le modèle Gemini.");
            }

            parsedResult = JSON.parse(rawText);
            break; // Success with this attempt
          } catch (err: any) {
            lastError = err;
            const errMsg = String(err?.message || "");
            const isTransient =
              err?.status === 503 ||
              err?.status === 429 ||
              errMsg.includes("503") ||
              errMsg.includes("429") ||
              errMsg.includes("high demand") ||
              errMsg.includes("UNAVAILABLE") ||
              errMsg.includes("RESOURCE_EXHAUSTED");

            console.warn(
              `[api/analyze] Tentative ${attempt}/${maxAttemptsPerModel} sur ${model} échouée: ${errMsg}`
            );

            if (isTransient && attempt < maxAttemptsPerModel) {
              // Exponential backoff with jitter
              const delay = attempt * 1500 + Math.floor(Math.random() * 500);
              await new Promise((r) => setTimeout(r, delay));
              continue;
            }

            // Move to next candidate model
            break;
          }
        }

        if (parsedResult) {
          break; // Succeeded!
        }
      }

      if (!parsedResult) {
        throw lastError || new Error("Échec de l'analyse après plusieurs tentatives.");
      }

      return res.json(parsedResult);
    } catch (err: any) {
      console.error("Erreur API /api/analyze:", err);
      let userFriendlyMsg = err?.message || "Erreur interne lors de l'analyse de l'image.";
      if (
        userFriendlyMsg.includes("high demand") ||
        userFriendlyMsg.includes("503") ||
        userFriendlyMsg.includes("UNAVAILABLE")
      ) {
        userFriendlyMsg =
          "Les serveurs de l'API connaissent une forte affluence temporaire (503). Veuillez cliquer sur 'Réessayer' sur cette photo.";
      }
      return res.status(500).json({
        error: userFriendlyMsg,
      });
    }
  });

  // Vite middleware in development, static files in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
