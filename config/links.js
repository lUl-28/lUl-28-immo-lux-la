// ============================================================
// GÉNÉRATEUR DE LIENS FILTRÉS — Projet Immo Lux L&A
// Une ligne par commune × une colonne par site
// ============================================================

const { CRITERES } = require('./settings');

const P = CRITERES.prixMax;
const S = CRITERES.surfaceMin;

// ------------------------------------------------------------
// Toutes les communes par ring
// { nom, cp, dept, selogerSlug }
// ------------------------------------------------------------
const COMMUNES = {
  ring1: {
    label: 'Ring 1 — 0 à 15 km',
    description: 'Communes directement frontalières',
    badge: '🔴',
    communes: [
      // Meurthe-et-Moselle (54)
      { nom: 'Longwy',               cp: '54400', dept: '54', slug: 'immo-longwy-54' },
      { nom: 'Mont-Saint-Martin',    cp: '54350', dept: '54', slug: 'immo-mont-saint-martin-54' },
      { nom: 'Longlaville',          cp: '54810', dept: '54', slug: 'immo-longlaville-54' },
      { nom: 'Hussigny-Godbrange',   cp: '54590', dept: '54', slug: 'immo-hussigny-godbrange-54' },
      { nom: 'Réhon',                cp: '54430', dept: '54', slug: 'immo-rehon-54' },
      { nom: 'Herserange',           cp: '54440', dept: '54', slug: 'immo-herserange-54' },
      // Moselle (57)
      { nom: 'Audun-le-Tiche',       cp: '57390', dept: '57', slug: 'immo-audun-le-tiche-57' },
      { nom: 'Ottange',              cp: '57840', dept: '57', slug: 'immo-ottange-57' },
      { nom: 'Volmerange-les-Mines', cp: '57330', dept: '57', slug: 'immo-volmerange-les-mines-57' },
      { nom: 'Cattenom',             cp: '57570', dept: '57', slug: 'immo-cattenom-57' },
      { nom: 'Sierck-les-Bains',     cp: '57480', dept: '57', slug: 'immo-sierck-les-bains-57' },
      { nom: 'Yutz',                 cp: '57970', dept: '57', slug: 'immo-yutz-57' },
      { nom: 'Thionville',           cp: '57100', dept: '57', slug: 'immo-thionville-57' },
      { nom: 'Terville',             cp: '57180', dept: '57', slug: 'immo-terville-57' },
    ],
  },

  ring2: {
    label: 'Ring 2 — 15 à 30 km',
    description: 'Zone frontalière élargie',
    badge: '🟠',
    communes: [
      // Meurthe-et-Moselle (54)
      { nom: 'Villerupt',            cp: '54190', dept: '54', slug: 'immo-villerupt-54' },
      { nom: 'Trieux',               cp: '54750', dept: '54', slug: 'immo-trieux-54' },
      { nom: 'Jœuf',                 cp: '54240', dept: '54', slug: 'immo-joeuf-54' },
      { nom: 'Homécourt',            cp: '54310', dept: '54', slug: 'immo-homecourt-54' },
      { nom: 'Briey',                cp: '54150', dept: '54', slug: 'immo-briey-54' },
      { nom: 'Piennes',              cp: '54490', dept: '54', slug: 'immo-piennes-54' },
      // Moselle (57)
      { nom: 'Clouange',             cp: '57185', dept: '57', slug: 'immo-clouange-57' },
      { nom: 'Uckange',              cp: '57270', dept: '57', slug: 'immo-uckange-57' },
      { nom: 'Fameck',               cp: '57290', dept: '57', slug: 'immo-fameck-57' },
      { nom: 'Guénange',             cp: '57310', dept: '57', slug: 'immo-guenange-57' },
      { nom: 'Amnéville',            cp: '57360', dept: '57', slug: 'immo-amneville-57' },
      { nom: 'Hayange',              cp: '57700', dept: '57', slug: 'immo-hayange-57' },
      { nom: 'Talange',              cp: '57525', dept: '57', slug: 'immo-talange-57' },
      { nom: 'Ennery',               cp: '57110', dept: '57', slug: 'immo-ennery-57' },
    ],
  },

  ring3: {
    label: 'Ring 3 — 30 à 45 km',
    description: 'Zone intermédiaire',
    badge: '🟡',
    communes: [
      // Meurthe-et-Moselle (54)
      { nom: 'Conflans-en-Jarnisy',  cp: '54800', dept: '54', slug: 'immo-conflans-en-jarnisy-54' },
      { nom: 'Jarny',                cp: '54800', dept: '54', slug: 'immo-jarny-54' },
      { nom: 'Audun-le-Roman',       cp: '54560', dept: '54', slug: 'immo-audun-le-roman-54' },
      { nom: 'Dieulouard',           cp: '54380', dept: '54', slug: 'immo-dieulouard-54' },
      { nom: 'Champigneulles',       cp: '54250', dept: '54', slug: 'immo-champigneulles-54' },
      // Moselle (57)
      { nom: 'Florange',             cp: '57190', dept: '57', slug: 'immo-florange-57' },
      { nom: 'Maizières-lès-Metz',   cp: '57280', dept: '57', slug: 'immo-maizieres-les-metz-57' },
      { nom: 'Hagondange',           cp: '57300', dept: '57', slug: 'immo-hagondange-57' },
      { nom: 'Marange-Silvange',     cp: '57210', dept: '57', slug: 'immo-marange-silvange-57' },
      { nom: 'Moulins-lès-Metz',     cp: '57160', dept: '57', slug: 'immo-moulins-les-metz-57' },
      { nom: 'Bouzonville',          cp: '57220', dept: '57', slug: 'immo-bouzonville-57' },
      { nom: 'Knutange',             cp: '57240', dept: '57', slug: 'immo-knutange-57' },
      { nom: 'Moyeuvre-Grande',      cp: '57250', dept: '57', slug: 'immo-moyeuvre-grande-57' },
    ],
  },
};

// ------------------------------------------------------------
// Sites & générateurs d'URL
// ------------------------------------------------------------
const SITES = [
  {
    id: 'leboncoin',
    nom: 'Leboncoin',
    couleur: '#FF6E14',
    url: ({ cp }) =>
      `https://www.leboncoin.fr/recherche?category=9&locations=${cp}&real_estate_type=1,2&price=0-${P}&square=${S}-max`,
  },
  {
    id: 'seloger',
    nom: 'SeLoger',
    couleur: '#0077cc',
    url: ({ slug }) =>
      `https://www.seloger.com/immobilier/achat/${slug}/bien-maison,bien-immeuble/?PRIX_MAX=${P}&SUR_MIN=${S}`,
  },
  {
    id: 'pap',
    nom: 'PAP',
    couleur: '#e63946',
    url: ({ dept }) => {
      const loc = dept === '54' ? 'meurthe-et-moselle-g439' : 'moselle-g469';
      return `https://www.pap.fr/annonce/ventes-maison-${loc}-max_prix-${P}-min_surf-${S}`;
    },
  },
  {
    id: 'logicimmo',
    nom: 'Logic-Immo',
    couleur: '#00b04f',
    url: ({ nom, cp }) => {
      const s = nom.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `https://www.logic-immo.com/recherche-immo/vente/maison-immeuble/grand-est/${s}-${cp}/`;
    },
  },
  {
    id: 'figaro',
    nom: 'Figaro Immo',
    couleur: '#c0392b',
    url: ({ cp }) =>
      `https://immobilier.lefigaro.fr/annonces/vente/maison/?cp=${cp}&prix_max=${P}&surface_min=${S}`,
  },
  {
    id: 'entreparticuliers',
    nom: 'EntrePart.',
    couleur: '#8e44ad',
    url: ({ nom, cp }) => {
      const s = nom.toLowerCase()
        .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
      return `https://www.entreparticuliers.com/annonces-immobilieres/vente/maison/${s}-${cp}`;
    },
  },
];

// ------------------------------------------------------------
// Export
// ------------------------------------------------------------
function genererTousLesLiens() {
  return Object.values(COMMUNES).map((ring) => ({
    label: ring.label,
    description: ring.description,
    badge: ring.badge,
    communes: ring.communes.map((c) => ({
      ...c,
      liens: SITES.map((site) => ({
        id: site.id,
        nom: site.nom,
        couleur: site.couleur,
        url: site.url(c),
      })),
    })),
  }));
}

module.exports = { genererTousLesLiens, SITES, COMMUNES, CRITERES };
