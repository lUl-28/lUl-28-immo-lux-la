// ============================================================
// CONFIG — Projet Immo Lux L&A
// Rayon 60 km autour de la frontière luxembourgeoise (côté FR)
// ============================================================

// ------------------------------------------------------------
// CRITÈRES DE RECHERCHE
// ------------------------------------------------------------
const CRITERES = {
  prixMax: 200000,         // Prix d'achat max en €
  budgetTotal: 250000,     // Budget tout compris (achat + travaux)
  surfaceMin: 100,         // Surface habitable minimale en m²
  nbLotsVisés: 2,          // Nombre d'appartements après division
  typeBiens: ['maison', 'immeuble'],
  état: 'à rénover',
  parking: true,           // Parking obligatoire
  copropriétéSeule: true,  // Seuls propriétaires du bâtiment
};

// ------------------------------------------------------------
// ZONES GÉOGRAPHIQUES — Rayon 60 km frontière Luxembourg (FR)
// Organisées par distance croissante depuis la frontière
// ------------------------------------------------------------
const ZONES = {

  // 0–15 km : Communes directement frontalières
  ring1_0_15km: {
    label: 'Communes frontalières (0-15 km)',
    codesPostaux: [
      // Meurthe-et-Moselle (54)
      '54350', // Mont-Saint-Martin, Longlaville
      '54400', // Longwy
      '54180', // Longlaville
      '54590', // Hussigny-Godbrange, Saulnes
      '54430', // Réhon, Beuvillers
      '54440', // Herserange

      // Moselle (57)
      '57390', // Audun-le-Tiche, Rédange, Russange
      '57840', // Ottange, Nilvange
      '57330', // Volmerange-les-Mines, Zoufftgen
      '57570', // Cattenom, Hagen, Évrange, Basse-Rentgen, Mondorff
      '57480', // Sierck-les-Bains, Contz-les-Bains, Haute-Kontz, Apach
      '57970', // Yutz
      '57100', // Thionville, Manom
      '57180', // Terville
    ]
  },

  // 15–30 km : Zone frontalière élargie
  ring2_15_30km: {
    label: 'Zone frontalière élargie (15-30 km)',
    codesPostaux: [
      // Meurthe-et-Moselle (54)
      '54190', // Villerupt
      '54750', // Trieux, Jœuf
      '54240', // Jœuf
      '54310', // Homécourt
      '54150', // Briey, Val de Briey
      '54490', // Piennes

      // Moselle (57)
      '57185', // Clouange
      '57270', // Uckange
      '57290', // Fameck
      '57310', // Guénange, Bertrange
      '57360', // Amnéville
      '57700', // Hayange
      '57525', // Talange
      '57730', // Volmerange-les-Mines
      '57110', // Ennery, Ay-sur-Moselle
    ]
  },

  // 30–45 km : Zone intermédiaire
  ring3_30_45km: {
    label: 'Zone intermédiaire (30-45 km)',
    codesPostaux: [
      // Meurthe-et-Moselle (54)
      '54800', // Conflans-en-Jarnisy, Jarny
      '54560', // Audun-le-Roman
      '54111', // Domèvre-en-Haye
      '54380', // Dieulouard
      '54250', // Champigneulles (limite)

      // Moselle (57)
      '57190', // Florange
      '57280', // Maizières-lès-Metz
      '57300', // Hagondange
      '57210', // Marange-Silvange
      '57160', // Moulins-lès-Metz
      '57130', // Jouy-aux-Arches
      '57450', // Peltre
      '57220', // Bouzonville
      '57240', // Knutange, Nilvange
      '57250', // Moyeuvre-Grande
    ]
  },

};

// ------------------------------------------------------------
// TOUS LES CODES POSTAUX (à plat — pour les requêtes)
// ------------------------------------------------------------
const TOUS_CODES_POSTAUX = [
  ...ZONES.ring1_0_15km.codesPostaux,
  ...ZONES.ring2_15_30km.codesPostaux,
  ...ZONES.ring3_30_45km.codesPostaux,
];

// ------------------------------------------------------------
// PLATEFORMES À SCRAPER
// ------------------------------------------------------------
const PLATEFORMES = {
  leboncoin: {
    nom: 'Leboncoin',
    actif: true,
    baseUrl: 'https://www.leboncoin.fr/recherche',
    params: (codePostal) => ({
      category: '9',             // Ventes immobilières
      locations: codePostal,
      real_estate_type: '1,2',  // Maison + Immeuble
      price: `0-${CRITERES.prixMax}`,
      square: `${CRITERES.surfaceMin}-max`,
      ad_type: 'offer',
    })
  },
  seloger: {
    nom: 'SeLoger',
    actif: true,
    baseUrl: 'https://www.seloger.com/immobilier/achat',
    // URL construite dynamiquement par le scraper
  },
  pap: {
    nom: 'PAP',
    actif: true,
    baseUrl: 'https://www.pap.fr/annonce/ventes-maison',
    // URL construite dynamiquement par le scraper
  },
  logicimmo: {
    nom: 'Logic-Immo',
    actif: true,
    baseUrl: 'https://www.logic-immo.com',
  }
};

// ------------------------------------------------------------
// MOTS-CLÉS POSITIFS (scoring +)
// Présence dans le titre/description = potentiel élevé
// ------------------------------------------------------------
const MOTS_CLES_POSITIFS = [
  'divisible', 'division', 'plusieurs logements', 'investisseur',
  'immeuble', 'rapport', 'deux appartements', 'deux logements',
  'indépendant', 'entrées séparées', 'rénovation', 'rénover',
  'à rénover', 'travaux', 'potentiel', 'parking', 'garage',
  'terrain', 'plain-pied', 'sans copropriété', 'libre',
];

// ------------------------------------------------------------
// MOTS-CLÉS NÉGATIFS (scoring -)
// Présence = bien non adapté
// ------------------------------------------------------------
const MOTS_CLES_NEGATIFS = [
  'copropriété', 'syndic', 'charges', 'appartement uniquement',
  'studio', 'étage sans ascenseur', 'pas de parking',
];

// ------------------------------------------------------------
// SCORING — Pondération
// ------------------------------------------------------------
const SCORING = {
  prixParM2Max: 1800,       // €/m² max pour être considéré rentable
  rendementMin: 5.0,        // Rendement brut minimum visé en %
  loyerEstiméParM2: 10,     // €/m²/mois estimé pour la zone LU
  pointsParMotCléPositif: 5,
  pointsParMotCléNégatif: -10,
  bonusParking: 10,
  malusHorsZone: -20,
};

module.exports = {
  CRITERES,
  ZONES,
  TOUS_CODES_POSTAUX,
  PLATEFORMES,
  MOTS_CLES_POSITIFS,
  MOTS_CLES_NEGATIFS,
  SCORING,
};
