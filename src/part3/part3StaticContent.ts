/**
 * Copie éditoriale fixe relevée dans le modèle Partie 3 fourni.
 *
 * Ce module est volontairement indépendant du contrat de saisie, des
 * diagnostics et de pptxgenjs. Il permet au générateur de réemployer
 * les titres, textes et structures de tableaux du modèle sans réécrire ou
 * actualiser automatiquement les formulations réglementaires.
 *
 * Les exemples propres à la copropriété de référence ne sont pas stockés ici.
 * Les zones variables sont listées dans PART3_BESOINS_DE_DONNEES_VARIABLES
 * afin que le générateur puisse les alimenter, les laisser vides ou afficher
 * « À confirmer » selon leur état réel.
 */

export const PART3_VALEUR_A_CONFIRMER = 'À confirmer';

export type SourceContenuPartie3 =
  | 'texte_fixe_modele'
  | 'saisie_utilisateur'
  | 'derive_partie2'
  | 'hors_contrat_actuel';

export interface BesoinDeDonneePartie3 {
  source: SourceContenuPartie3;
  affichageSansDonnee: string;
  note: string;
}

/**
 * Contrat de présentation des données qui ne font pas partie de la copie fixe.
 * Aucune valeur illustrative du PPT de référence ne doit être injectée à leur
 * place dans un rapport réel.
 */
export const PART3_BESOINS_DE_DONNEES_VARIABLES: Record<string, BesoinDeDonneePartie3> = {
  nomCoproprieteEtPiedDePage: {
    source: 'saisie_utilisateur',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Le nom de copropriété et le numéro de page proviennent de la Partie 1 et de l’assembleur.',
  },
  statutsEtCommentairesDocumentaires: {
    source: 'saisie_utilisateur',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Les 17 statuts et leurs commentaires facultatifs proviennent de Part3ReportData.',
  },
  contratsEtTravauxHistoriques: {
    source: 'hors_contrat_actuel',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Les exemples de contrats, travaux recensés, dates et montants du modèle ne sont pas des données saisies.',
  },
  visuelsEtInformationsDpe: {
    source: 'saisie_utilisateur',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Seules les deux images DPE sont actuellement facultatives. La date, le numéro et les scénarios détaillés restent hors contrat.',
  },
  tableauCuratif: {
    source: 'derive_partie2',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Les lignes, montants uniques et totaux sont dérivés des diagnostics Partie 2 éligibles, sans mutation.',
  },
  travauxEnergetiquesEtScenarios: {
    source: 'hors_contrat_actuel',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Les scénarios énergétiques et leurs travaux détaillés ne sont pas encore des entrées utilisateur.',
  },
  statistiquesConclusion: {
    source: 'derive_partie2',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'Les nombres, pourcentages et niveaux de curatifs sont calculés à partir des diagnostics réellement retenus.',
  },
  annexeGeorisques: {
    source: 'hors_contrat_actuel',
    affichageSansDonnee: PART3_VALEUR_A_CONFIRMER,
    note: 'L’annexe Géorisques nécessite une source et des règles de génération avant toute insertion.',
  },
};

export interface LigneTableauDocumentaireModelePartie3 {
  id: string;
  designation: string;
  references: string;
  obligation: string;
}

export interface TableauDocumentaireModelePartie3 {
  titre: string;
  enTetes: readonly ['DESIGNATION', 'STATUT', 'COMMENTAIRE'];
  lignes: readonly LigneTableauDocumentaireModelePartie3[];
}

/** Textes fixes des quatre tableaux documentaires des diapositives 5, 6, 7 et 9. */
export const PART3_TABLEAUX_DOCUMENTAIRES_MODELE: Record<string, TableauDocumentaireModelePartie3> = {
  documentsReglementairesAdministratifs: {
    titre: '5.1 Documents réglementaires et administratifs',
    enTetes: ['DESIGNATION', 'STATUT', 'COMMENTAIRE'],
    lignes: [
      {
        id: 'assuranceCopropriete',
        designation: 'Assurance de la copropriété',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 9-1\nLoi n° 2014-366 du 24/03/2014 (ALUR)',
        obligation: 'Obligation de souscrire une assurance responsabilité civile pour le compte de la copropriété.',
      },
      {
        id: 'immatriculationCopropriete',
        designation: 'Immatriculation de la copropriété',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 8-2\nLoi n° 2014-366 du 24/03/2014 (ALUR)',
        obligation: 'Obligation d’immatriculer la copropriété au registre national des copropriétés.',
      },
      {
        id: 'ficheSynthetique',
        designation: 'Fiche synthétique',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 8-2-1\nDécret n° 2016-1822 du 21/12/2016',
        obligation: 'Obligation d’établir et de mettre à jour annuellement une fiche synthétique de la copropriété.',
      },
      {
        id: 'reglementCopropriete',
        designation: 'Règlement de copropriété',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 8',
        obligation: 'Obligation de disposer d’un règlement de copropriété définissant l’organisation, les parties communes et privatives, ainsi que les droits et obligations des copropriétaires.',
      },
      {
        id: 'compteBancaireSepare',
        designation: 'Compte bancaire séparé',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 18\nLoi n° 2014-366 du 24/03/2014 (ALUR)',
        obligation: 'Obligation d’ouvrir et de tenir un compte bancaire séparé au nom du syndicat des copropriétaires.',
      },
      {
        id: 'procesVerbauxAg',
        designation: 'Procès-verbaux des assemblées générales',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 17, 17-1 et 42\nDécret n° 67-223 du 17/03/1967',
        obligation: 'Les procès-verbaux des assemblées générales retracent les décisions votées par les copropriétaires.',
      },
    ],
  },
  diagnosticsTechniquesObligatoires: {
    titre: '5.2 Diagnostics techniques obligatoires',
    enTetes: ['DESIGNATION', 'STATUT', 'COMMENTAIRE'],
    lignes: [
      {
        id: 'dta',
        designation: 'Dossier Technique Amiante (DTA)',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 18\nLoi n° 2014-366 du 24/03/2014 (ALUR)',
        obligation: 'Obligation d’établir et de tenir à jour un dossier technique amiante pour les immeubles dont le permis de construire est antérieur au 1er juillet 1997.',
      },
      {
        id: 'crepPartiesCommunes',
        designation: 'Diagnostic plomb – Parties communes (CREP)',
        references: 'Code de la santé publique : art. L1334-5 à L1334-12\nDécret n° 2006-474 du 25/04/2006',
        obligation: 'Obligation de réaliser un diagnostic plomb des parties communes pour les immeubles construits avant 1949, en cas de situation à risque ou avant travaux.',
      },
      {
        id: 'dtg',
        designation: 'Diagnostic Technique Global (DTG)',
        references: 'Loi n° 65-557 du 10/07/1965 : art. L731-1 et L731-2 du CCH\nLoi n° 2014-366 du 24/03/2014 (ALUR)',
        obligation: 'Obligation de réaliser un diagnostic technique global pour les copropriétés de plus de 10 ans, en cas de mise en copropriété ou sur décision de l’assemblée générale.',
      },
      {
        id: 'termites',
        designation: 'Diagnostic termites',
        references: 'Code de la construction et de l’habitation : art. L133-1 à L133-6\nArrêté préfectoral de classement en zone termites',
        obligation: 'Obligation de réaliser un diagnostic termites pour les immeubles situés dans une zone déclarée infestée par arrêté préfectoral, notamment en cas de vente ou de travaux.',
      },
      {
        id: 'merules',
        designation: 'Diagnostic mérules',
        references: 'Code de la construction et de l’habitation : art. L133-7 à L133-9\nCode de la santé publique : art. L1331-1',
        obligation: 'Obligation de déclarer en mairie la présence de mérules et d’informer les occupants en cas de contamination du bâtiment.',
      },
    ],
  },
  contratsEntretien: {
    titre: '5.3 Contrat d’entretien',
    enTetes: ['DESIGNATION', 'STATUT', 'COMMENTAIRE'],
    lignes: [
      {
        id: 'maintenanceChaudiereMoins400Kw',
        designation: 'Maintenance des chaudières collectives < 400 kW',
        references: 'Arrêté du 15 septembre 2009 modifié relatif à l’entretien des chaudières',
        obligation: 'Obligation de faire réaliser un entretien annuel des chaudières collectives dont la puissance est comprise entre 4 et 400 kW.',
      },
      {
        id: 'maintenanceChaudierePlus400Kw',
        designation: 'Maintenance des chaudières collectives > 400 kW',
        references: 'Arrêté du 2 octobre 2009 relatif à l’inspection des chaudières',
        obligation: 'Inspection périodique obligatoire tous les 2 ans pour les chaudières collectives de puissance supérieure à 400 kW.',
      },
      {
        id: 'carnetEntretienImmeuble',
        designation: 'Carnet d’entretien de l’immeuble',
        references: 'Loi n° 65-557 du 10/07/1965 : art. 18',
        obligation: 'Obligation de tenir à jour le carnet d’entretien de la copropriété.',
      },
    ],
  },
  securiteIncendie: {
    titre: '5.4 Sécurité incendie',
    enTetes: ['DESIGNATION', 'STATUT', 'COMMENTAIRE'],
    lignes: [
      {
        id: 'registreSecurite',
        designation: 'Registre de sécurité',
        references: 'Arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation\nCode de la construction et de l’habitation : art. R*111-13 et suivants',
        obligation: 'Obligation de tenir à jour un registre de sécurité recensant les contrôles, vérifications et opérations d’entretien liés à la sécurité incendie de l’immeuble.',
      },
      {
        id: 'affichageConsignesPartiesCommunes',
        designation: 'Affichage des consignes de sécurité – Parties communes',
        references: 'Arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation\nCode de la construction et de l’habitation : art. R*111-13 et suivants',
        obligation: 'Obligation d’afficher dans les parties communes les consignes de sécurité incendie et d’évacuation à destination des occupants.',
      },
      {
        id: 'verificationsPeriodiquesInstallations',
        designation: 'Vérifications périodiques des installations incendie',
        references: 'Arrêté du 31 janvier 1986 relatif à la protection contre l’incendie des bâtiments d’habitation\nCode de la construction et de l’habitation : art. R*111-13 et suivants',
        obligation: 'Obligation de faire réaliser des vérifications périodiques des équipements de sécurité incendie et d’en assurer la traçabilité.',
      },
    ],
  },
};

export const PART3_SECTION_3_EVOLUTIONS_REGLEMENTAIRES = {
  titreSection: '3. ÉVOLUTIONS RÉGLEMENTAIRES ET NORMATIVES',
  diapositives: [
    {
      numero: 1,
      titre: '3.1 Décret thermostat et calorifugeage',
      sousTitre: 'Installation des systèmes de régulation de la température – Chauffage et refroidissement',
      blocs: [
        'Tous les logements possédant une installation de chauffage et/ou de refroidissement sont concernés par cette obligation.',
        'Depuis 2018, toute installation d’un système de chauffage en France doit obligatoirement être équipée d’un système de régulation automatique de la température. Cette régulation permet d’adapter la température intérieure en fonction des besoins, de réduire les consommations énergétiques et d’améliorer le confort des occupants.',
        'Dans le cadre du plan de sobriété énergétique lancé par le Gouvernement, ces exigences ont été renforcées. Le décret n°2023-444 du 7 juin 2023 impose désormais que tous les bâtiments résidentiels et tertiaires, neufs comme existants, soient équipés, d’ici 2027, d’un dispositif permettant :',
      ],
      puces: [
        'Une régulation par pièce ou par zone de chauffage,',
        'Avec un pas de temps horaire (programmation et commande au minimum à l’heure).',
      ],
      aidesDisponibles: 'Aides disponibles : Avec les primes des certificats d’économies d’énergie (CEE), l’Etat offre un accompagnement jusqu’à 60 euros par ménage pour l’installation par un professionnel d’un système de régulation de la température et de robinets thermostatiques.',
      secondSousTitre: 'Calorifugeage des réseaux de distribution de chaleur et de froid',
      secondBlocs: [
        'Tous les logements présents en bâtiments d’habitation collectif et possédant une installation de chauffage et/ou de refroidissement collective sont concernés par cette obligation.',
        'Les réseaux de chauffage et de production d’eau chaude sanitaire peuvent générer des pertes thermiques importantes, notamment lorsqu’ils traversent des parties non chauffées : caves, garages, locaux techniques, combles, etc.',
        'Lors du transport, l’eau chaude peut perdre jusqu’à 20 % de son énergie en raison de la distance parcourue et du manque d’isolation des tuyauteries. Dans le cadre du plan de sobriété énergétique, cette obligation a été étendue.',
        'Le décret n°2023-444 du 7 juin 2023 prévoit que, d’ici 2027, dans tous les bâtiments résidentiels collectifs et tertiaires : les réseaux de distribution de chaleur (chauffage et eau chaude sanitaire) situés hors du volume chauffé, ainsi que les réseaux de distribution de froid situés hors du volume refroidi, doivent être isolés afin de limiter les pertes d’énergie et d’améliorer la performance globale du bâtiment.',
      ],
      secondAidesDisponibles: 'Aides disponibles : La prime relative à l’isolation des points singuliers d’un réseau permet également une subvention de 60 euros par points singuliers par un professionnel.',
    },
    {
      numero: 2,
      titre: '3.2 Evolution des normes de contrôle d’accès en copropriété',
      sousTitre: 'Passage au système VIGIK+ échéance au 1 er janvier 2030',
      rubriques: [
        {
          titre: 'Contexte',
          texte: 'Le système VIGIK, actuellement utilisé pour permettre l’accès des prestataires autorisés aux parties communes des immeubles collectifs, tels que La Poste, les services de secours ou les entreprises de maintenance, fera l’objet d’un remplacement progressif par le dispositif VIGIK+.\n\nÀ compter du 1 er janvier 2030 le VIGIK classique ne constituera plus le standard de référence en matière de contrôle d’accès pour les copropriétés.',
        },
        {
          titre: 'Qu’est ce que le VIGIK+',
          texte: 'Le VIGIK+ est une évolution technologique du système existant visant à renforcer la sécurité et la maîtrise des accès aux parties communes des immeubles. Ce dispositif est exclusivement destiné aux prestataires autorisés et ne concerne pas les moyens d’accès des résidents Il répond à la nécessité de moderniser un système devenu vulnérable face aux enjeux actuels de sécurité et de gestion des accès.',
        },
        {
          titre: 'Principales évolutions',
          texte: 'Le passage au VIGIK+ repose sur l’utilisation de moyens d’authentification plus sécurisés, intégrant des technologies de cryptage avancées afin de limiter les risques de copie ou d’usurpation de badges. Il permet également une gestion centralisée des droits d’accès, offrant au gestionnaire la possibilité de définir des autorisations spécifiques selon les prestataires, les plages horaires et les durées de validité. Les accès ne sont ainsi plus permanents mais strictement encadrés dans le temps et selon les usages.',
        },
        {
          titre: 'Impacts pour les copropriétés',
          texte: 'Dans la perspective de l’échéance de 2030 les copropriétés devront engager une mise en conformité de leurs équipements de contrôle d’accès. Cela implique notamment le remplacement ou la mise à niveau des platines VIGIK non compatibles avec le standard VIGIK+. Cette évolution nécessitera également une adaptation de la gestion des accès des prestataires, une information claire des copropriétaires ainsi qu’une anticipation des coûts.',
        },
        {
          titre: 'Pourquoi anticiper ?',
          texte: 'la transition vers le VIGIK+ permet d’éviter une mise en conformité réalisée dans l’urgence à l’approche de 2030 de garantir la continuité des services essentiels, et de renforcer dès à présent la sécurité des accès aux parties communes. Cette anticipation offre également la possibilité de lisser les investissements dans le temps et de coordonner cette évolution avec d’autres travaux ou opérations de modernisation de l’immeuble.',
        },
      ],
    },
    {
      numero: 3,
      titre: '3.3 Extinction des réseaux 2G et 3G',
      sousTitre: 'Mise à niveau des systèmes de communication des ascenseurs',
      rubriques: [
        {
          titre: 'Contexte',
          texte: 'Les opérateurs de télécommunications ont engagé l’arrêt progressif des réseaux mobiles 2G et 3G au profit des technologies 4G et 5G. Cette extinction progressive des anciens réseaux interviendra entre 2026 et 2029 selon les opérateurs. Cette évolution impacte directement les ascenseurs équipés de systèmes de téléalarme ou de communication utilisant encore les réseaux 2G et 3G. La réglementation impose en effet à chaque ascenseur de disposer d’un dispositif d’alerte et de communication permanent avec un service d’intervention. En cas de défaillance de ce système, l’ascenseur peut être mis à l’arrêt pour des raisons de sécurité.\n\nÀ compter du 31 mars 2026, le démarrage de l’extinction des réseaux 2G pourra rendre certains systèmes de téléalarme d’ascenseurs inopérants.',
        },
        {
          titre: 'Impacts pour les copropriétés',
          texte: 'Une partie importante du parc d’ascenseurs français utilise encore des systèmes de communication reposant sur les réseaux 2G ou 3G. Ces équipements devront être modernisés afin de garantir :',
          puces: [
            'le maintien du système de téléalarme réglementaire ;',
            'la continuité des communications avec les services d’intervention ;',
            'le maintien en fonctionnement des appareils ;',
            'la conformité réglementaire des installations.',
          ],
        },
        {
          titre: 'Cette évolution peut nécessiter :',
          puces: [
            'le remplacement des modules GSM ;',
            'une mise à niveau des systèmes de télécommunication ;',
            'le remplacement de certains équipements anciens incompatibles avec la 4G/5G.',
          ],
        },
        {
          titre: 'Mesures réglementaires et obligations à venir',
          texte: 'Des évolutions réglementaires sont en cours afin de renforcer l’information et la mise à niveau des équipements concernés. Il est notamment prévu :',
          puces: [
            'une obligation d’information du propriétaire par l’ascensoriste lors des visites de maintenance si l’équipement fonctionne encore en 2G ou 3G ;',
            'une vérification de la mise à niveau des dispositifs de communication lors du contrôle technique quinquennal des ascenseurs.',
          ],
        },
        {
          titre: 'Pourquoi anticiper ?',
          texte: 'L’anticipation de ces travaux permet :',
          puces: [
            'd’éviter une interruption de service des ascenseurs ;',
            'de prévenir les mises à l’arrêt pour non-conformité ;',
            'de limiter les interventions en urgence ;',
            'de planifier les coûts de modernisation des équipements ;',
            'de coordonner ces adaptations avec d’autres travaux techniques de la copropriété.',
          ],
        },
      ],
    },
  ],
} as const;

export const PART3_SECTION_4_RECOMMANDATIONS_COMPLEMENTAIRES = {
  titreSection: '4. RECOMMANDATIONS COMPLÉMENTAIRES',
  numeroDiapositive: 4,
  titre: '4.1 Défibrillateurs en copropriété',
  introduction: 'Le défibrillateur automatisé externe (DAE) est un équipement de secours permettant de prendre en charge rapidement une personne victime d’un arrêt cardiaque. Grâce à une assistance vocale intégrée, son utilisation est accessible à toute personne, même sans formation médicale spécifique.',
  blocs: [
    'Contrairement aux établissements recevant du public (ERP), l’installation d’un défibrillateur n’est actuellement pas obligatoire dans les copropriétés. Toutefois, cet équipement est fortement recommandé, notamment au regard des enjeux de sécurité des occupants.',
    'Chaque année en France, environ 80 000 personnes sont victimes d’un arrêt cardiaque, dont près de 75 % surviennent au domicile. Une intervention rapide dans les premières minutes, associée à l’utilisation d’un défibrillateur et à la réalisation d’un massage cardiaque, permet d’augmenter considérablement les chances de survie.',
    'L’installation d’un défibrillateur au sein d’une copropriété présente plusieurs avantages :',
  ],
  avantages: [
    'amélioration de la sécurité des résidents ;',
    'intervention rapide en cas d’urgence cardiaque ;',
    'équipement accessible et simple d’utilisation ;',
    'valorisation des équipements de sécurité de l’immeuble.',
  ],
  suite: [
    'Le défibrillateur peut être installé dans un espace commun facilement accessible (hall d’entrée, loge gardien, parking ou local commun). Il est recommandé de prévoir :',
  ],
  recommandations: [
    'une maintenance régulière de l’appareil ;',
    'le remplacement périodique des consommables (batteries et électrodes) ;',
    'une assurance contre les dégradations ou le vol.',
  ],
  conclusion: 'La mise en place d’un défibrillateur doit faire l’objet d’un vote en assemblée générale des copropriétaires. De nombreuses offres « tout compris » existent aujourd’hui, incluant la fourniture, l’installation et la maintenance de l’équipement.\n\nCette démarche constitue une amélioration préventive des équipements de sécurité de la copropriété et participe à la protection des occupants.',
} as const;

export const PART3_SECTION_5_ANALYSE_DOCUMENTAIRE = {
  titreSection: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ',
  diapositives: {
    documentsReglementairesAdministratifs: {
      numero: 5,
      introduction: [
        'Dans le cadre de l’élaboration du présent Projet de Plan Pluriannuel de Travaux (PPPT), une analyse des documents administratifs, réglementaires et techniques mis à disposition par le syndicat des copropriétaires et son représentant a été réalisée. Cette analyse permet de vérifier la conformité de certaines obligations réglementaires de la copropriété et de compléter les observations effectuées lors de la visite de l’immeuble.',
        'Le tableau ci-après récapitule les principaux documents examinés ainsi que leur statut de transmission au moment de la réalisation de l’étude.',
      ],
      tableau: 'documentsReglementairesAdministratifs',
    },
    diagnosticsTechniquesObligatoires: {
      numero: 6,
      tableau: 'diagnosticsTechniquesObligatoires',
    },
    contratsEntretien: {
      numero: 7,
      tableau: 'contratsEntretien',
      introduction: 'Dans le cadre de l’élaboration du Plan Pluriannuel de Travaux, une analyse des documents mis à disposition par la copropriété a été réalisée, notamment du carnet d’entretien et des procès-verbaux d’assemblées générales. Cette étude a permis d’identifier les contrats d’entretien en vigueur, les travaux réalisés au cours des dernières années ainsi que les opérations déjà votées ou envisagées. Ces informations constituent une base essentielle pour comprendre l’historique de l’immeuble, prendre en compte les engagements existants et assurer la cohérence des préconisations formulées dans le présent PPPT.',
      contenuComplementaire: 'contratsEtTravauxHistoriques',
    },
    travauxRecenses: {
      numero: 8,
      titres: [
        'Travaux recensés dans le carnet d’entretien',
        'Travaux votés en assemblée générale',
      ],
      contenu: 'contratsEtTravauxHistoriques',
    },
    securiteIncendie: {
      numero: 9,
      tableau: 'securiteIncendie',
    },
  },
} as const;

export const PART3_SECTION_6_SYNTHESE_PPPT = {
  titreSection: '6. SYNTHÈSE DU PPPT',
  loiClimatEtResilience: {
    numero: 10,
    titre: '6.1 La loi « Climat et Résilience »',
    blocs: [
      'Promulguée le 22 août 2021, la loi « Climat et Résilience » vise à accélérer la transition énergétique du parc immobilier français et à réduire les consommations d’énergie des bâtiments les plus énergivores. Elle introduit progressivement de nouvelles obligations pour les propriétaires, tant en matière de vente que de location des logements.',
      'L’un des principaux objectifs de cette loi est de lutter contre les « passoires énergétiques », c’est-à-dire les logements présentant de faibles performances énergétiques. À cette fin, plusieurs mesures ont été mises en place, notamment l’interdiction progressive de mise en location des logements les plus énergivores, l’obligation de réaliser des audits énergétiques lors de certaines ventes et l’encadrement des loyers pour les logements les moins performants.',
      'En France métropolitaine, un logement est considéré comme décent s’il respecte des niveaux minimaux de performance énergétique définis par la réglementation. Depuis le 1er janvier 2023, les logements dont la consommation énergétique finale excède 450 kWhEF/m²/an ne peuvent plus être proposés à la location. Cette exigence se renforcera progressivement avec l’interdiction de louer les logements classés G à compter de 2025, les logements classés F à compter de 2028, puis les logements classés E à compter de 2034.',
      'Le tableau ci-dessous présente les principales échéances réglementaires applicables aux logements en fonction de leur étiquette énergétique. Ces informations sont fournies à titre informatif afin de permettre aux copropriétaires d’anticiper les futures obligations réglementaires et d’intégrer, lorsque cela est pertinent, une réflexion sur la rénovation énergétique du patrimoine immobilier.',
    ],
  },
  dpeCollectif: {
    numero: 11,
    titre: '6.2 Le diagnostic de performance énergétiques (DPE Collectif)',
    blocs: [
      'Le Diagnostic de Performance Énergétique (DPE) collectif évalue la performance énergétique du bâtiment en analysant les caractéristiques de son enveloppe (isolation, menuiseries, ventilation, etc.) ainsi que ses équipements techniques. Il permet d’attribuer une étiquette énergie et une étiquette climat représentatives de la performance énergétique conventionnelle de l’immeuble.',
      'Le DPE collectif est réalisé selon la méthode réglementaire 3CL-DPE (Calcul de la Consommation Conventionnelle des Logements), définie par les pouvoirs publics. Cette méthode repose sur une modélisation conventionnelle du bâtiment et sur des hypothèses standardisées d’occupation, de chauffage, de production d’eau chaude sanitaire et de conditions climatiques.',
      'Les comportements réels des occupants (température de chauffage, durée d’occupation, consommation d’eau chaude, habitudes de ventilation, etc.) ne sont donc pas pris en compte. Des écarts peuvent ainsi être constatés entre les consommations conventionnelles calculées par le DPE et les consommations réelles observées sur les factures énergétiques. Malgré cette limite, la méthode 3CL constitue aujourd’hui la référence réglementaire pour comparer objectivement les performances énergétiques des bâtiments.',
      'Le DPE collectif a été réalisé par la société France Verte dans le cadre du PPPT.',
      'Pour bénéficier d’aides financières (CEE, MaPrimeRénov’), un audit énergétique doit être réalisé.',
    ],
    libellesDynamiques: [
      'Date de réalisation du DPE collectif',
      'N° du DPE collectif',
    ],
    legende: 'EP : énergie non transformée utilisée comme référence de calcul.\nGES : gaz contribuant à l’effet de serre en absorbant le rayonnement infrarouge.',
    visuels: [
      'État initial',
      'Scénario de rénovation le plus ambitieux',
      '(Scénario n° 1)',
    ],
    contenu: 'visuelsEtInformationsDpe',
  },
  tableauxDpeEtScenarios: {
    numero: 12,
    entetesComparatif: [
      'Travaux énergétiques',
      'Scénario 1',
      'Scénario 2',
      'Scénario 3',
    ],
    lignesComparatif: [
      'Étiquette énergétique',
      'Consommation en énergie primaire (kWhEP/m²/an)',
      'Gaz à effet de serre (kgCO2/m²/an)',
      'Gain énergétique',
      'Investissement en TTC (sans les aides)',
      'Estimatif de l’aide MaPrimeRénov ’Copropriétés',
      'Estimatif de l’aide des CEE (Certificats d’Economies d’Energie)',
    ],
    contenu: 'travauxEnergetiquesEtScenarios',
  },
  syntheseCuratifs: {
    numero: 13,
    titre: '6.3 Synthèse des curatifs',
    blocs: [
      'Le présent Projet de Plan Pluriannuel de Travaux (PPPT) constitue une synthèse des désordres, défauts d’entretien et besoins de travaux identifiés lors de l’inspection visuelle des parties communes et des équipements collectifs de la copropriété. Il a pour objectif d’accompagner le syndicat des copropriétaires dans la planification des interventions nécessaires à la conservation du patrimoine, à la sécurité des occupants et au maintien du bon fonctionnement des équipements communs.',
      'Les travaux recensés ont été analysés et hiérarchisés en fonction de leur niveau de priorité, de leur impact sur le bâtiment et des risques associés à leur absence de réalisation. Cette hiérarchisation permet d’établir une programmation cohérente des interventions sur les dix prochaines années et d’anticiper les investissements nécessaires.',
      'Afin de distinguer les travaux relevant de la conservation du bâtiment de ceux visant à améliorer sa performance énergétique, les préconisations ont été réparties en deux tableaux récapitulatifs distincts :',
    ],
    tableaux: [
      {
        titre: 'Tableau 1 : Travaux curatifs',
        description: 'Ce tableau regroupe l’ensemble des travaux de réparation, de remise en état, de sécurisation, de remplacement d’équipements vétustes et de conservation du patrimoine. Les interventions sont classées selon trois niveaux de priorité (Niveaux 1 à 3) en fonction de leur degré d’urgence et de leur impact sur le bâti et ses occupants.',
      },
      {
        titre: 'Tableau 2 : Travaux d’amélioration énergétique',
        description: 'Ce tableau présente les travaux susceptibles d’améliorer la performance énergétique de l’immeuble, de réduire les consommations d’énergie et d’accroître le confort thermique des occupants. Ces préconisations sont issues de l’analyse énergétique réalisée dans le cadre du PPPT et constituent des pistes d’amélioration indépendantes des travaux curatifs précédemment identifiés.',
      },
    ],
  },
  tableauRecapitulatifCuratifs: {
    numero: 14,
    titre: 'Tableau 1 – Tableau récapitulatif des travaux curatifs',
    enTetes: [
      'Niveau du curatif',
      'Numéro du curatif',
      'Nature de travaux',
      'Chiffrage (TTC)',
    ],
    niveaux: [
      'Curatif niveau 1 (Impact fort)',
      'Curatif niveau 2 (Impact modéré)',
      'Curatif niveau 3 (Impact faible)',
    ],
    totaux: [
      {
        titre: 'Montant des travaux curatif niveau 1',
        calendrierModele: 'Travaux à effectuer sous 2 ans (Année 2027-2028)',
      },
      {
        titre: 'Montant des travaux curatif niveau 2',
        calendrierModele: 'Travaux à effectuer entre 3 et 5 ans (Année 2029 à 2031)',
      },
      {
        titre: 'Montant des travaux curatif niveau 3',
        calendrierModele: 'Travaux à effectuer entre 6 et 10 ans (Année 2032 à 2036)',
      },
    ],
    totalGeneral: 'Montant total de l’investissement des travaux curatifs (TTC)',
    contenu: 'tableauCuratif',
  },
  tableauRecapitulatifTravauxEnergetiques: {
    numero: 15,
    titre: 'Tableau 2 – Tableau récapitulatif des travaux énergétiques',
    enTetes: [
      'Niveau du curatif',
      'Numéro du curatif',
      'Nature de travaux',
      'Chiffrage (TTC)',
    ],
    niveau: 'Travaux énergétiques',
    total: 'Scénario x  - Montant total de l’investissement des travaux énergétiques (TTC)',
    programmation: {
      titre: 'Programmation des travaux énergétiques',
      blocs: [
        'Les travaux d’amélioration énergétique sont présentés dans un tableau distinct des travaux curatifs afin de différencier les interventions nécessaires à la conservation du patrimoine de celles visant à améliorer durablement la performance énergétique du bâtiment.',
        'Les scénarios proposés ont été élaborés dans une logique de rénovation énergétique globale. La réalisation de l’ensemble des travaux composant un scénario permet d’atteindre les performances énergétiques visées et de répondre, sous réserve d’éligibilité, aux conditions d’obtention de certaines aides financières.',
        'En revanche, aucun échéancier prévisionnel n’a été défini pour ces travaux. Leur programmation relève des décisions du syndicat des copropriétaires, qui pourra déterminer le moment le plus opportun pour engager une opération de rénovation globale, en fonction de ses priorités, de ses capacités financières, des aides mobilisables et des décisions prises en assemblée générale.',
      ],
    },
    contenu: 'travauxEnergetiquesEtScenarios',
  },
} as const;

export const PART3_SECTION_7_CONCLUSION = {
  titreSection: '7. CONCLUSION',
  numeroDiapositive: 16,
  titre: '7.1 Conclusion générale',
  paragraphesFixes: [
    'Le présent Projet de Plan Pluriannuel de Travaux (PPPT) a permis d’établir une vision globale de l’état de conservation de la copropriété et d’identifier les interventions nécessaires au maintien de sa pérennité, de sa sécurité et de sa valeur patrimoniale.',
    'La mise en œuvre progressive de ces interventions permettra de limiter les risques de dégradations futures, d’optimiser la gestion patrimoniale de la copropriété et d’améliorer les conditions d’usage et de confort des occupants. Le PPPT constitue ainsi un outil d’aide à la décision permettant aux copropriétaires de planifier les investissements nécessaires sur les dix prochaines années dans une logique d’entretien préventif et de maîtrise des coûts.',
    'Il convient de rappeler que l’ensemble des préconisations formulées dans le présent document repose sur les constatations réalisées lors de la visite des parties communes et des éléments accessibles au moment de l’audit. Les travaux proposés ont pour objectif d’anticiper les besoins futurs du bâtiment, de préserver sa durabilité et de réduire le risque d’apparition de désordres plus importants et plus coûteux à traiter à long terme.',
    'Le maintien d’une politique d’entretien régulière, associé à la réalisation progressive des actions préconisées, contribuera à conserver un niveau satisfaisant de sécurité, de fonctionnalité et de confort pour les occupants. Cette démarche permettra également de préserver la valeur patrimoniale de l’immeuble tout en facilitant la maîtrise des dépenses futures de la copropriété.',
    'Le présent PPPT constitue ainsi un document évolutif d’aide à la décision, destiné à accompagner la copropriété dans la programmation de ses investissements et dans la définition d’une stratégie cohérente de gestion technique du patrimoine sur les prochaines années.',
  ],
  paragraphesDerives: [
    'L’analyse réalisée a conduit à l’identification de {{nombre_fiches_curatives}} fiches curatives, réparties selon différents niveaux de priorité. Parmi celles-ci, {{nombre_curatifs_niveau_1}} curatifs de niveau 1, représentant {{pourcentage_curatifs_niveau_1}} % du total des actions préconisées, concernent des interventions à engager à court terme afin de traiter les désordres les plus sensibles ou d’éviter une dégradation accélérée des ouvrages et équipements.',
    'Les curatifs de niveau 2, représentant {{pourcentage_curatifs_niveau_2}} % des actions identifiées, regroupent les travaux à prévoir à moyen terme afin d’assurer le maintien en bon état du patrimoine et d’anticiper le vieillissement naturel des différents composants du bâtiment.',
    'Enfin, {{nombre_curatifs_niveau_3}} curatifs de niveau 3, représentant {{pourcentage_curatifs_niveau_3}} % des préconisations, correspondent principalement à des travaux d’entretien, d’amélioration ou de renouvellement à plus long terme destinés à préserver durablement les performances et l’aspect général de l’immeuble.',
  ],
  contenu: 'statistiquesConclusion',
} as const;

export const PART3_SECTION_8_FINANCEMENTS_RENOVATION_ENERGETIQUE = {
  titreSection: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE',
  diapositives: [
    {
      numero: 17,
      titre: '8.1 Ma Prime Rénov’Copropriétés',
      intro: 'Cette prime peut également être versée au syndicat de copropriété lorsque le raccordement s’inscrit dans le cadre d’une opération plus large de rénovation énergétique globale.\n\nElle dépend du coût des travaux, de la situation de la copropriété et du nombre de logements. Un audit énergétique réglementaire et une assistance à maîtrise d’ouvrage est obligatoire.',
      rubriques: [
        {
          titre: 'Conditions d’éligibilité :',
          puces: [
            'Travaux de rénovation globale, qui garantissent une amélioration significative du confort et de la performance énergétique de la copropriété (35 % minimum de gain énergétique après travaux).',
            'Être composée d’au moins 65 % de résidences principales (pour les copropriétés de 20 lots ou moins) ou d’au moins 75 % pour les copropriétés de plus de 20 lots.',
            'Copropriété immatriculée au registre national des copropriétés.',
          ],
        },
        {
          titre: 'Les principales étapes sont les suivantes :',
          puces: [
            'Vérifier que la copropriété est immatriculée au registre national des copropriétés.',
            'Faire voter les travaux en assemblée générale à la majorité requise.',
            'Désigner un Assistant à Maîtrise d’Ouvrage (AMO), dont l’accompagnement est obligatoire dans le cadre du dispositif.',
            'Constituer et déposer le dossier de demande d’aide comprenant notamment l’audit énergétique, les devis et les pièces administratives demandées.',
            'Attendre la notification d’accord de l’Anah avant d’engager les travaux.',
            'Une fois les travaux réalisés et les aides versées, le syndic répartit les montants obtenus entre les copropriétaires selon les règles de répartition applicables dans la copropriété.',
          ],
        },
      ],
      lien: 'MaPrimeRénov’ Copropriété : tout savoir sur l’aide à la rénovation des parties communes | economie.gouv.fr',
    },
    {
      numero: 18,
      titre: '8.2 Les Certificats d’Économies d’Énergie',
      introduction: 'Les Certificats d’Économies d’Énergie (CEE) constituent un dispositif national destiné à encourager la réalisation de travaux d’amélioration énergétique.\n\nCe mécanisme repose sur le principe du « pollueur-payeur » : les fournisseurs d’énergie (électricité, gaz, fioul, carburants, etc.), appelés « obligés », sont tenus par l’État de financer des actions permettant de réduire les consommations énergétiques.',
      rubriques: [
        {
          titre: 'Les CEE poste par poste',
          texte: 'Les CEE peuvent être obtenus pour des travaux réalisés individuellement, dès lors qu’ils respectent les critères de performance définis par la réglementation.\n\nLes opérations les plus couramment éligibles sont notamment :',
          puces: [
            'L’isolation des murs, toitures, combles et planchers bas ;',
            'Le remplacement des menuiseries extérieures ;',
            'L’amélioration des systèmes de chauffage ;',
            'L’installation de systèmes de ventilation performants ;',
            'Le raccordement à un réseau de chaleur.',
          ],
          suite: 'Chaque poste de travaux dispose de sa propre fiche d’opération standardisée et peut bénéficier d’une aide spécifique. Le montant accordé dépend de la nature des travaux, de leur niveau de performance énergétique et des conditions du marché des CEE au moment du dépôt du dossier.',
        },
        {
          titre: 'Les CEE « Rénovation globale » (BAR-TH-177)',
          texte: 'La fiche BAR-TH-177 – Rénovation globale d’un bâtiment résidentiel collectif concerne les projets de rénovation énergétique portant sur plusieurs postes de travaux simultanément.\n\nPour être éligible, le programme de travaux doit permettre d’atteindre un gain énergétique conventionnel d’au moins 35 % par rapport à la situation initiale du bâtiment, sur la base d’une étude énergétique réglementaire.\n\nCe dispositif est généralement mobilisé dans le cadre de rénovations ambitieuses combinant plusieurs actions telles que l’isolation thermique, l’amélioration du système de production de chaleur, la ventilation ou encore la régulation des installations.\n\nLorsque les conditions sont réunies, la fiche BAR-TH-177 permet souvent d’obtenir un niveau d’aide plus important qu’une approche reposant uniquement sur des CEE attribués poste par poste.',
        },
      ],
      lien: 'Certificats d’économie d’énergie (CEE) | Service Public',
    },
    {
      numero: 19,
      titre: '8.3 L’Éco-Prêt à Taux Zéro Copropriété',
      introduction: 'L’Éco-Prêt à Taux Zéro Copropriété est un dispositif de financement permettant au syndicat des copropriétaires de réaliser des travaux de rénovation énergétique sans supporter de frais d’intérêts. Ce prêt collectif est accordé par certains établissements bancaires partenaires de l’État et constitue un levier complémentaire aux aides financières telles que MaPrimeRénov’ Copropriété et les Certificats d’Économies d’Énergie (CEE).\n\nL’objectif de ce dispositif est de faciliter la réalisation de projets de rénovation énergétique ambitieux en réduisant le reste à charge des copropriétaires et en étalant le financement des travaux sur plusieurs années.',
      rubriques: [
        {
          titre: 'Conditions d’éligibilité',
          texte: 'Pour bénéficier de l’Éco-PTZ Copropriété dans le cadre d’une rénovation globale :',
          puces: [
            'Le bâtiment doit être achevé depuis plus de 2 ans à la date de début des travaux ;',
            'Les logements doivent être utilisés ou destinés à être utilisés en tant que résidences principales ;',
            'Les travaux doivent être votés en assemblée générale des copropriétaires ;',
            'Une étude ou un audit énergétique préalable doit être réalisé afin de démontrer les gains énergétiques attendus.',
          ],
          suite: 'Les travaux engagés doivent permettre :',
          suitePuces: [
            'D’atteindre une consommation conventionnelle annuelle inférieure à 331 kWhEP/m².an pour les usages réglementaires ;',
            'Ou de justifier un gain énergétique conventionnel d’au moins 35 % par rapport à la situation initiale.',
          ],
        },
        {
          titre: 'Montant et durée du prêt',
          texte: 'Dans le cadre d’une rénovation globale, l’Éco-PTZ peut atteindre jusqu’à 50 000 € par logement. La durée de remboursement peut être étalée jusqu’à 20 ans, permettant ainsi de lisser l’investissement dans le temps.\n\nLe montant de l’Éco-PTZ individuel éventuellement souscrit par un copropriétaire et sa quote-part dans l’Éco-PTZ Copropriété ne peuvent pas dépasser ce plafond global.',
        },
        {
          titre: 'Fonctionnement en copropriété',
          texte: 'La souscription de l’Éco-PTZ Copropriété doit être approuvée en assemblée générale. Le prêt est contracté par le syndicat des copropriétaires puis réparti entre les copropriétaires selon leurs tantièmes ou les règles de répartition applicables.\n\nCe dispositif permet ainsi de financer le reste à charge après déduction des subventions obtenues, tout en limitant l’effort financier immédiat demandé aux copropriétaires.',
        },
        {
          titre: 'À retenir',
          texte: 'L’Éco-PTZ Copropriété n’est pas une aide financière directe mais une solution de financement avantageuse permettant d’accompagner les projets de rénovation énergétique globale. Associé aux aides existantes, il constitue un outil particulièrement intéressant pour faciliter la mise en œuvre des travaux de rénovation énergétique.',
        },
      ],
      lien: 'Éco-prêt à taux zéro (éco-PTZ) Copropriétés | Service Public',
    },
    {
      numero: 20,
      titre: '8.4 La TVA à taux réduite à 5,5%',
      introduction: 'Afin d’encourager la rénovation énergétique des logements, l’État permet de bénéficier d’un taux de TVA réduit à 5,5 %, au lieu du taux normal de 20 %. Cette réduction s’applique directement sur les factures des entreprises réalisant les travaux et permet ainsi de diminuer immédiatement le coût du projet.',
      rubriques: [
        {
          titre: 'Conditions d’éligibilité',
          texte: 'Pour bénéficier de la TVA à 5,5 %, les principales conditions sont les suivantes :',
          puces: [
            'Le bâtiment doit être achevé depuis plus de 2 ans ;',
            'Le logement doit être affecté à un usage d’habitation ;',
            'Les travaux doivent être réalisés et facturés par une entreprise ;',
            'Les travaux doivent avoir pour objectif l’amélioration de la performance énergétique du bâtiment.',
          ],
        },
        {
          titre: 'Travaux concernés',
          texte: 'Le taux réduit de TVA s’applique notamment aux travaux suivants :',
          puces: [
            'Isolation thermique des murs, toitures, combles et planchers bas ;',
            'Remplacement de certaines menuiseries performantes ;',
            'Installation de pompes à chaleur ;',
            'Mise en place de systèmes de ventilation performants ;',
            'Raccordement à un réseau de chaleur ;',
            'Installation de certains équipements utilisant des énergies renouvelables ;',
            'Travaux induits directement liés à ces opérations.',
          ],
        },
        {
          titre: 'Dans le cadre d’une copropriété',
          texte: 'Les travaux de rénovation énergétique réalisés sur les parties communes ou les équipements collectifs peuvent bénéficier du taux réduit de TVA lorsque les conditions réglementaires sont respectées. Cet avantage fiscal est cumulable avec les autres dispositifs d’aides tels que MaPrimeRénov’ Copropriété, les Certificats d’Économies d’Énergie (CEE) et l’Éco-Prêt à Taux Zéro Copropriété.',
        },
        {
          titre: 'À retenir',
          texte: 'La TVA à 5,5 % ne constitue pas une subvention mais une réduction fiscale directement appliquée sur le montant des travaux. Elle représente souvent une économie significative et participe à la diminution du reste à charge des copropriétaires dans le cadre d’un projet de rénovation énergétique.',
        },
      ],
      lien: 'TVA à taux réduit : pour quels travaux ? | economie.gouv.fr',
    },
    {
      numero: 21,
      titre: '8.5 Précision sur le cumul des aides financières',
      aides: [
        'Ma Prime Rénov Copropriété',
        'Aides des collectivités locales',
        'Aides des fournisseurs d’énergie (CEE)',
        'Eco Prêt à taux zéro',
      ],
      note: 'Sauf en cas de copropriétés en difficultés ou fragiles',
    },
    {
      numero: 22,
      titre: '8.6 Les étapes d’un projet de rénovation énergétique globale',
      etapes: [
        ['1 - Réalisation du PPPT et du DPE collectif', 'Le PPPT permet d’identifier les besoins de travaux de la copropriété et de hiérarchiser les interventions. Le DPE collectif évalue la performance énergétique initiale du bâtiment et met en évidence les principaux postes de consommation et de déperdition.'],
        ['2 - Réalisation de l’audit énergétique', 'L’audit énergétique approfondit l’analyse du bâtiment et définit plusieurs scénarios de rénovation. Il précise les travaux à réaliser, les gains énergétiques attendus, les coûts estimatifs et les objectifs de performance pouvant ouvrir droit à certaines aides financières.'],
        ['3 - Choix d’un scénario de rénovation', 'Le conseil syndical et le syndic étudient les différents scénarios proposés afin d’identifier celui qui correspond le mieux aux objectifs techniques, énergétiques et financiers de la copropriété.'],
        ['4 - Désignation d’un Assistant à Maîtrise d’Ouvrage (AMO)', 'L’AMO accompagne la copropriété dans le montage administratif, financier et organisationnel du projet. Il contribue notamment à l’analyse des aides mobilisables, à l’élaboration du plan de financement et à la constitution des dossiers de subventions.'],
        ['5 - Désignation d’un Maître d’Œuvre (MOE)', 'Le maître d’œuvre assure la conception technique du projet. Il réalise ou coordonne les études complémentaires nécessaires, précise le programme de travaux, établit les pièces de consultation et accompagne la copropriété dans le choix des entreprises.'],
        ['6 - Consultation des entreprises', 'Les entreprises sont consultées sur la base du programme défini par la maîtrise d’œuvre. Les offres reçues sont analysées afin de vérifier leur conformité technique, leur coût et leur adéquation avec les objectifs du projet.'],
        ['7 - Finalisation du plan de financement', 'Les devis définitifs permettent à l’AMO et au syndic de préciser les aides financières, les prêts mobilisables et le reste à charge prévisionnel pour la copropriété et les copropriétaires.'],
        ['8 - Vote des travaux en assemblée générale', 'L’assemblée générale se prononce sur le scénario retenu, les entreprises sélectionnées, les honoraires des intervenants, le plan de financement et les modalités d’appel de fonds.'],
        ['9 - Dépôt et validation des demandes d’aides', 'Les dossiers de demande d’aides sont déposés auprès des organismes concernés. Lorsque le dispositif l’exige, les travaux ne doivent pas commencer avant l’obtention de l’accord ou de l’accusé de réception autorisant leur engagement.'],
        ['10 - Réalisation et suivi des travaux', 'La maîtrise d’œuvre organise et suit le chantier, contrôle la conformité des travaux et coordonne les différents intervenants jusqu’à leur achèvement.'],
        ['11 - Réception des travaux et versement des aides', 'À l’issue du chantier, les travaux sont réceptionnés. Les éventuelles réserves sont levées, les justificatifs sont transmis et les demandes de versement des aides financières sont finalisées.'],
        ['12 - Suivi des performances', 'Après les travaux, le suivi des consommations permet d’évaluer les économies obtenues et de vérifier le bon fonctionnement des nouveaux équipements. Le DPE collectif pourra également être actualisé afin de valoriser la nouvelle performance énergétique du bâtiment.'],
      ],
    },
  ],
} as const;

export const PART3_SECTION_9_LEXIQUE = {
  titreSection: '9. LEXIQUE',
  diapositives: [
    {
      numero: 23,
      introduction: 'Afin de faciliter la compréhension du présent rapport, les principaux termes techniques et réglementaires utilisés sont définis ci-dessous.',
      definitions: [
        ['AMO (Assistant à Maîtrise d’Ouvrage)', 'Professionnel chargé d’accompagner la copropriété dans la préparation, le montage administratif, technique et financier d’un projet de travaux.'],
        ['CEE (Certificats d’Économies d’Énergie)', 'Dispositif d’aide financière reposant sur l’obligation faite aux fournisseurs d’énergie de financer des travaux permettant de réduire les consommations énergétiques.'],
        ['DPE Collectif (Diagnostic de Performance Énergétique)', 'Étude réglementaire évaluant la performance énergétique d’un immeuble. Il attribue une étiquette énergie (de A à G) et une étiquette climat en fonction des consommations conventionnelles et des émissions de gaz à effet de serre.'],
        ['DTG (Diagnostic Technique Global)', 'Étude globale permettant d’évaluer l’état général d’une copropriété, ses besoins de travaux et sa situation énergétique.'],
        ['Éco-PTZ', 'Éco-Prêt à Taux Zéro permettant de financer des travaux de rénovation énergétique sans payer d’intérêts.'],
        ['GES (Gaz à Effet de Serre)', 'Gaz participant au réchauffement climatique, principalement émis lors de la combustion d’énergies fossiles.'],
        ['ITE (Isolation Thermique par l’Extérieur)', 'Technique consistant à isoler les murs du bâtiment depuis l’extérieur afin de réduire les déperditions thermiques et améliorer le confort des occupants.'],
        ['Parties communes', 'Éléments du bâtiment appartenant à l’ensemble des copropriétaires (façades, toiture, halls, escaliers, réseaux communs, chaufferie, etc.).'],
        ['Parties privatives', 'Éléments appartenant exclusivement à chaque copropriétaire (logement, cave privative, garage privatif, etc.).'],
        ['PPPT (Projet de Plan Pluriannuel de Travaux)', 'Document prévisionnel identifiant les travaux à envisager sur une période de 10 ans. Il est présenté à l’assemblée générale avant son éventuelle adoption.'],
        ['PPT (Plan Pluriannuel de Travaux)', 'Version adoptée du PPPT par les copropriétaires. Il constitue la feuille de route des travaux programmés par la copropriété.'],
        ['Pompe à chaleur (PAC)', 'Équipement utilisant les calories naturellement présentes dans l’air, l’eau ou le sol afin de produire de la chaleur avec une consommation énergétique réduite.'],
        ['Réseau de chaleur urbain', 'Système collectif de production et de distribution de chaleur alimentant plusieurs bâtiments à partir d’une centrale de production, souvent alimentée en énergies renouvelables ou de récupération.'],
        ['SCOP (Coefficient de Performance Saisonnier)', 'Indicateur de performance d’une pompe à chaleur. Il représente le rapport entre l’énergie produite et l’énergie consommée sur une saison de chauffage.'],
      ],
    },
    {
      numero: 24,
      definitions: [
        ['VMC (Ventilation Mécanique Contrôlée)', 'Système assurant le renouvellement de l’air à l’intérieur des logements afin de garantir une bonne qualité de l’air et de limiter l’humidité.'],
        ['VMC Autoréglable', 'Système de ventilation fonctionnant avec des débits d’air constants indépendamment du taux d’humidité des logements.'],
        ['VMC Hygroréglable Type A', 'Système dont les bouches d’extraction adaptent automatiquement leur débit en fonction du taux d’humidité.'],
        ['VMC Hygroréglable Type B', 'Système dont les bouches d’extraction et les entrées d’air adaptent automatiquement leurs débits en fonction de l’humidité, permettant des économies d’énergie supplémentaires.'],
        ['Uw', 'Coefficient de transmission thermique d’une fenêtre. Plus sa valeur est faible, plus la menuiserie est performante.'],
        ['kWhEP/m².an', 'Unité utilisée dans les études énergétiques pour exprimer la consommation annuelle d’énergie primaire rapportée à la surface du bâtiment.'],
        ['Résistance thermique (R)', 'Indicateur de performance d’un isolant. Plus sa valeur est élevée, plus l’isolation est performante.'],
        ['Conductivité thermique (λ)', 'Capacité d’un matériau à transmettre la chaleur. Plus la valeur λ est faible, plus le matériau est isolant.'],
        ['Pont thermique', 'Zone localisée de l’enveloppe du bâtiment où l’isolation est moins performante, entraînant des pertes de chaleur supplémentaires et parfois des phénomènes de condensation.'],
        ['Déperditions thermiques', 'Quantité de chaleur perdue par le bâtiment à travers les murs, la toiture, les fenêtres, le plancher bas ou le renouvellement d’air.'],
        ['Énergie primaire (EP)', 'Énergie nécessaire pour produire et acheminer l’énergie consommée dans le bâtiment. C’est l’unité utilisée dans le DPE.'],
        ['Énergie finale (EF)', 'Énergie effectivement consommée par l’utilisateur et figurant sur les factures (gaz, électricité, réseau de chaleur, etc.).'],
        ['Rendement', 'Rapport entre l’énergie utile produite par un équipement et l’énergie consommée pour la produire. Plus le rendement est élevé, plus l’installation est performante.'],
        ['Calorifugeage', 'Isolation thermique des canalisations, vannes et accessoires de chauffage ou d’eau chaude sanitaire afin de limiter les pertes d’énergie.'],
        ['Audit énergétique', 'Étude approfondie visant à identifier les déperditions énergétiques du bâtiment et à proposer différents scénarios de travaux d’amélioration.'],
        ['Gain énergétique', 'Réduction des consommations conventionnelles d’énergie obtenue après réalisation des travaux, exprimée en pourcentage.'],
      ],
    },
  ],
} as const;

export const PART3_SECTIONS_10_ET_11 = {
  declarationSurHonneur: {
    numeroDiapositive: 25,
    titreSection: '10. DÉCLARATION SUR L’HONNEUR',
    texteIntroductif: 'Pour réaliser le Plan de Projet Pluriannuel de Travaux, la société France Verte ou son représentant:',
    attestations: [
      'Atteste que les employés, les membres du groupement ou lui-même possèdent les compétences requises pour mener à bien cette mission.',
      'Atteste qu’il a souscrit une assurance responsabilité civile professionnelle lui permettant de couvrir les conséquences d’un engagement de sa responsabilité en raison de ses interventions au titre du diagnostic technique global.',
      'Atteste sur l’honneur de son impartialité et de son indépendance à l’égard du syndic sauf si ce dernier a obtenu l’autorisation mentionnée à l’article 18 de la loi du 10 juillet 1965 fixant le statut de la copropriété des immeubles bâtis.',
      'Atteste sur l’honneur de son impartialité et de son indépendance à l’égard des fournisseurs d’énergie et des entreprises intervenant sur l’immeuble et les équipements sur lesquels porte le diagnostic technique global.',
    ],
    texteReference: 'TEXTE DE REFERENCE : Décret n°2022-663 du 25 avril 2022 relatif aux modalités de réalisation du Plan de Projet Pluriannuel de Travaux des immeubles à destination partielle ou totale d’habitation.',
  },
  annexeGeorisques: {
    numeroDiapositive: 25,
    titreSection: '11. ANNEXE',
    titre: '11.1 Etat des risques et informations Géorisques',
    blocs: [
      'Vous trouverez aux pages suivantes le rapport Géorisques correspondant à l’adresse de la copropriété, établi à partir des données publiques mises à disposition par l’État.',
      'Ce document présente les principaux risques naturels, miniers, technologiques, sismiques, radon, retrait-gonflement des argiles et autres aléas susceptibles de concerner le secteur géographique de l’immeuble.',
      'Les informations présentées proviennent du portail officiel Géorisques et sont fournies à titre informatif :',
      'www.georisques.gouv.fr',
      'Ce document est couramment utilisé dans le cadre des transactions immobilières et peut notamment servir de base à l’établissement de l’État des Risques et Pollutions (ERP) requis lors de certaines ventes ou locations.',
      'Le rapport Géorisques est annexé au présent PPPT afin d’apporter un éclairage complémentaire sur l’environnement de l’immeuble. Il ne constitue toutefois ni une étude géotechnique, ni une expertise des risques, ni une analyse structurelle du bâtiment.',
    ],
    contenu: 'annexeGeorisques',
  },
} as const;

/**
 * Ordre réel du modèle Partie 3. Les identifiants de contenu permettent au
 * générateur de conserver les pages fixes, d’ajouter des continuations si
 * nécessaire et de ne jamais introduire les valeurs d’exemple.
 */
export const PART3_PLAN_DE_DIAPOSITIVES_MODELE = [
  { numero: 1, section: '3. ÉVOLUTIONS RÉGLEMENTAIRES ET NORMATIVES', contenu: 'decretThermostatEtCalorifugeage' },
  { numero: 2, section: '3. ÉVOLUTIONS RÉGLEMENTAIRES ET NORMATIVES', contenu: 'vigikPlus' },
  { numero: 3, section: '3. ÉVOLUTIONS RÉGLEMENTAIRES ET NORMATIVES', contenu: 'extinction2g3g' },
  { numero: 4, section: '4. RECOMMANDATIONS COMPLÉMENTAIRES', contenu: 'defibrillateurs' },
  { numero: 5, section: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ', contenu: 'documentsReglementairesAdministratifs' },
  { numero: 6, section: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ', contenu: 'diagnosticsTechniquesObligatoires' },
  { numero: 7, section: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ', contenu: 'contratsEntretien' },
  { numero: 8, section: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ', contenu: 'travauxRecenses' },
  { numero: 9, section: '5. ANALYSE DOCUMENTAIRE DE LA COPROPRIÉTÉ', contenu: 'securiteIncendie' },
  { numero: 10, section: '6. SYNTHÈSE DU PPPT', contenu: 'loiClimatEtResilience' },
  { numero: 11, section: '6. SYNTHÈSE DU PPPT', contenu: 'dpeCollectif' },
  { numero: 12, section: '6. SYNTHÈSE DU PPPT', contenu: 'tableauxDpeEtScenarios' },
  { numero: 13, section: '6. SYNTHÈSE DU PPPT', contenu: 'syntheseCuratifs' },
  { numero: 14, section: '6. SYNTHÈSE DU PPPT', contenu: 'tableauRecapitulatifCuratifs' },
  { numero: 15, section: '6. SYNTHÈSE DU PPPT', contenu: 'tableauRecapitulatifTravauxEnergetiques' },
  { numero: 16, section: '7. CONCLUSION', contenu: 'conclusionGenerale' },
  { numero: 17, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'maPrimeRenovCoproprietes' },
  { numero: 18, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'cee' },
  { numero: 19, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'ecoPtzCopropriete' },
  { numero: 20, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'tvaReduite' },
  { numero: 21, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'cumulAides' },
  { numero: 22, section: '8. FINANCEMENTS À LA RÉNOVATION ÉNERGÉTIQUE', contenu: 'etapesRenovation' },
  { numero: 23, section: '9. LEXIQUE', contenu: 'lexiqueA' },
  { numero: 24, section: '9. LEXIQUE', contenu: 'lexiqueB' },
  { numero: 25, section: '10. DÉCLARATION SUR L’HONNEUR / 11. ANNEXE', contenu: 'declarationEtAnnexeGeorisques' },
] as const;
