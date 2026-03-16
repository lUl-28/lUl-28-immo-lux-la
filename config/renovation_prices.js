// ============================================================
// BASE DE PRIX — Module Estimation Rénovation
// Projet Immo Lux L&A
//
// Structure par entrée :
//   id        : identifiant unique du type de travaux
//   label     : libellé affiché
//   unite     : 'm2' (€/m²) | 'forfait' (prix fixe) | 'ml' (€/mètre linéaire) | 'unite' (€/unité)
//   gammes    : { entree, milieu, haut } → { min, max } en €
//
// Prix moyens constatés France — zone Est (Lorraine) — 2024-2025
// ============================================================

'use strict';

// ── Marge d'imprévus (%) ────────────────────────────────────
// Appliquée sur le total général — modifiable ici ou via le dashboard
const MARGE_IMPREVUS = 10; // % par défaut

// ── Libellés des gammes ──────────────────────────────────────
const GAMMES = {
  entree: { id: 'entree', label: 'Entrée de gamme', description: 'Matériaux standards, main d\'œuvre économique' },
  milieu: { id: 'milieu', label: 'Milieu de gamme', description: 'Bon rapport qualité/prix, matériaux courants' },
  haut:   { id: 'haut',   label: 'Haut de gamme',   description: 'Matériaux premium, finitions soignées' },
};

// ── Pièces et leurs travaux ──────────────────────────────────
const PIECES = [
  // ── CHAMBRE ───────────────────────────────────────────────
  {
    id: 'chambre',
    label: 'Chambre',
    icon: '🛏️',
    multiple: true,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 150, max: 200 },
          milieu: { min: 250, max: 350 },
          haut:   { min: 400, max: 600 },
        },
      },
      {
        id: 'peinture',
        label: 'Peinture / revêtements muraux',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'sol',
        label: 'Sol (parquet, stratifié, moquette)',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 200 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 25, max: 40 },
          milieu: { min: 50, max: 70 },
          haut:   { min: 80, max: 120 },
        },
      },
      {
        id: 'menuiseries',
        label: 'Menuiseries (fenêtres)',
        unite: 'unite',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1800 },
        },
      },
      {
        id: 'isolation',
        label: 'Isolation (murs, sol, plafond)',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 160 },
        },
      },
      {
        id: 'plafond',
        label: 'Plafond (placoplatre, peinture)',
        unite: 'm2',
        gammes: {
          entree: { min: 10, max: 20 },
          milieu: { min: 25, max: 40 },
          haut:   { min: 50, max: 80 },
        },
      },
    ],
  },

  // ── SALON / SÉJOUR ────────────────────────────────────────
  {
    id: 'salon',
    label: 'Salon / Séjour',
    icon: '🛋️',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 150, max: 200 },
          milieu: { min: 250, max: 350 },
          haut:   { min: 400, max: 600 },
        },
      },
      {
        id: 'peinture',
        label: 'Peinture / revêtements muraux',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'sol',
        label: 'Sol (parquet, carrelage, stratifié)',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 50 },
          milieu: { min: 60, max: 100 },
          haut:   { min: 120, max: 250 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 25, max: 40 },
          milieu: { min: 50, max: 70 },
          haut:   { min: 80, max: 120 },
        },
      },
      {
        id: 'menuiseries',
        label: 'Menuiseries (fenêtres, portes)',
        unite: 'unite',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1800 },
        },
      },
      {
        id: 'isolation',
        label: 'Isolation',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 160 },
        },
      },
      {
        id: 'plafond',
        label: 'Plafond',
        unite: 'm2',
        gammes: {
          entree: { min: 10, max: 20 },
          milieu: { min: 25, max: 40 },
          haut:   { min: 50, max: 80 },
        },
      },
    ],
  },

  // ── CUISINE ───────────────────────────────────────────────
  {
    id: 'cuisine',
    label: 'Cuisine',
    icon: '🍳',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 400, max: 600 },
          milieu: { min: 700, max: 1000 },
          haut:   { min: 1200, max: 2000 },
        },
      },
      {
        id: 'cuisine_equipee',
        label: 'Cuisine équipée (meubles + électroménager)',
        unite: 'm2',
        gammes: {
          entree: { min: 150, max: 250 },
          milieu: { min: 300, max: 600 },
          haut:   { min: 700, max: 1500 },
        },
      },
      {
        id: 'plan_travail',
        label: 'Plan de travail + crédence',
        unite: 'm2',
        gammes: {
          entree: { min: 80, max: 150 },
          milieu: { min: 200, max: 350 },
          haut:   { min: 400, max: 800 },
        },
      },
      {
        id: 'plomberie',
        label: 'Plomberie (évier, robinetterie)',
        unite: 'forfait',
        gammes: {
          entree: { min: 800, max: 1200 },
          milieu: { min: 1500, max: 2500 },
          haut:   { min: 3000, max: 5000 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 150 },
        },
      },
      {
        id: 'sol',
        label: 'Sol',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 200 },
        },
      },
      {
        id: 'peinture',
        label: 'Peinture / revêtements muraux',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'ventilation',
        label: 'Ventilation (VMC / hotte)',
        unite: 'forfait',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1800 },
        },
      },
      {
        id: 'menuiseries',
        label: 'Menuiseries',
        unite: 'unite',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1800 },
        },
      },
    ],
  },

  // ── SALLE DE BAIN ─────────────────────────────────────────
  {
    id: 'salle_de_bain',
    label: 'Salle de bain',
    icon: '🚿',
    multiple: true,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 600, max: 900 },
          milieu: { min: 1000, max: 1500 },
          haut:   { min: 1800, max: 3000 },
        },
      },
      {
        id: 'plomberie',
        label: 'Plomberie (douche/baignoire, lavabo, robinetterie)',
        unite: 'forfait',
        gammes: {
          entree: { min: 1500, max: 2500 },
          milieu: { min: 3000, max: 4500 },
          haut:   { min: 5000, max: 9000 },
        },
      },
      {
        id: 'carrelage_mural',
        label: 'Carrelage mural',
        unite: 'm2',
        gammes: {
          entree: { min: 40, max: 70 },
          milieu: { min: 80, max: 120 },
          haut:   { min: 150, max: 300 },
        },
      },
      {
        id: 'carrelage_sol',
        label: 'Carrelage sol',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 60 },
          milieu: { min: 70, max: 110 },
          haut:   { min: 130, max: 250 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité (normes pièce humide)',
        unite: 'm2',
        gammes: {
          entree: { min: 40, max: 60 },
          milieu: { min: 70, max: 100 },
          haut:   { min: 120, max: 180 },
        },
      },
      {
        id: 'meuble_vasque',
        label: 'Meuble vasque',
        unite: 'forfait',
        gammes: {
          entree: { min: 200, max: 400 },
          milieu: { min: 500, max: 900 },
          haut:   { min: 1000, max: 2500 },
        },
      },
      {
        id: 'douche_italienne',
        label: 'Douche à l\'italienne',
        unite: 'forfait',
        gammes: {
          entree: { min: 1000, max: 1800 },
          milieu: { min: 2000, max: 3500 },
          haut:   { min: 4000, max: 8000 },
        },
      },
      {
        id: 'ventilation',
        label: 'Ventilation VMC',
        unite: 'forfait',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1500 },
        },
      },
    ],
  },

  // ── WC / TOILETTES ────────────────────────────────────────
  {
    id: 'wc',
    label: 'WC / Toilettes',
    icon: '🚽',
    multiple: true,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'forfait',
        gammes: {
          entree: { min: 400, max: 700 },
          milieu: { min: 800, max: 1200 },
          haut:   { min: 1500, max: 2500 },
        },
      },
      {
        id: 'plomberie',
        label: 'Plomberie (WC, chasse d\'eau)',
        unite: 'forfait',
        gammes: {
          entree: { min: 500, max: 800 },
          milieu: { min: 900, max: 1400 },
          haut:   { min: 1500, max: 2500 },
        },
      },
      {
        id: 'carrelage_sol',
        label: 'Carrelage sol',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 60 },
          milieu: { min: 70, max: 110 },
          haut:   { min: 130, max: 250 },
        },
      },
      {
        id: 'peinture',
        label: 'Peinture / revêtements muraux',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'forfait',
        gammes: {
          entree: { min: 150, max: 250 },
          milieu: { min: 300, max: 500 },
          haut:   { min: 600, max: 1000 },
        },
      },
      {
        id: 'wc_suspendu',
        label: 'WC suspendu (bâti-support inclus)',
        unite: 'forfait',
        gammes: {
          entree: { min: 400, max: 700 },
          milieu: { min: 800, max: 1200 },
          haut:   { min: 1500, max: 2500 },
        },
      },
    ],
  },

  // ── COULOIR / ENTRÉE ──────────────────────────────────────
  {
    id: 'couloir',
    label: 'Couloir / Entrée',
    icon: '🚪',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 100, max: 160 },
          milieu: { min: 180, max: 260 },
          haut:   { min: 300, max: 500 },
        },
      },
      {
        id: 'sol',
        label: 'Sol',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 200 },
        },
      },
      {
        id: 'peinture',
        label: 'Peinture / revêtements muraux',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 35 },
          milieu: { min: 40, max: 60 },
          haut:   { min: 70, max: 110 },
        },
      },
      {
        id: 'portes_interieures',
        label: 'Portes intérieures',
        unite: 'unite',
        gammes: {
          entree: { min: 200, max: 400 },
          milieu: { min: 500, max: 800 },
          haut:   { min: 900, max: 2000 },
        },
      },
    ],
  },

  // ── GARAGE ────────────────────────────────────────────────
  {
    id: 'garage',
    label: 'Garage',
    icon: '🚗',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 80, max: 150 },
          milieu: { min: 180, max: 280 },
          haut:   { min: 320, max: 500 },
        },
      },
      {
        id: 'sol',
        label: 'Sol (béton, résine, carrelage)',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 180 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 25, max: 40 },
          milieu: { min: 50, max: 70 },
          haut:   { min: 80, max: 130 },
        },
      },
      {
        id: 'porte_garage',
        label: 'Porte de garage',
        unite: 'forfait',
        gammes: {
          entree: { min: 800, max: 1200 },
          milieu: { min: 1500, max: 2500 },
          haut:   { min: 3000, max: 5000 },
        },
      },
      {
        id: 'isolation',
        label: 'Isolation',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 160 },
        },
      },
    ],
  },

  // ── CAVE ──────────────────────────────────────────────────
  {
    id: 'cave',
    label: 'Cave',
    icon: '🏚️',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète',
        unite: 'm2',
        gammes: {
          entree: { min: 100, max: 180 },
          milieu: { min: 200, max: 320 },
          haut:   { min: 380, max: 600 },
        },
      },
      {
        id: 'traitement_humidite',
        label: 'Traitement humidité / étanchéité',
        unite: 'm2',
        gammes: {
          entree: { min: 50, max: 100 },
          milieu: { min: 120, max: 200 },
          haut:   { min: 250, max: 500 },
        },
      },
      {
        id: 'sol',
        label: 'Sol',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 180 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 35 },
          milieu: { min: 40, max: 60 },
          haut:   { min: 70, max: 110 },
        },
      },
      {
        id: 'isolation',
        label: 'Isolation',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 160 },
        },
      },
    ],
  },

  // ── COMBLES ───────────────────────────────────────────────
  {
    id: 'combles',
    label: 'Combles',
    icon: '🏠',
    multiple: false,
    travaux: [
      {
        id: 'renovation_complete',
        label: 'Rénovation complète (aménagement)',
        unite: 'm2',
        gammes: {
          entree: { min: 300, max: 500 },
          milieu: { min: 600, max: 900 },
          haut:   { min: 1000, max: 1600 },
        },
      },
      {
        id: 'isolation_perdus',
        label: 'Isolation combles perdus',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 45, max: 70 },
          haut:   { min: 80, max: 130 },
        },
      },
      {
        id: 'isolation_amenagement',
        label: 'Isolation + aménagement',
        unite: 'm2',
        gammes: {
          entree: { min: 60, max: 100 },
          milieu: { min: 120, max: 180 },
          haut:   { min: 220, max: 350 },
        },
      },
      {
        id: 'velux',
        label: 'Velux / fenêtre de toit',
        unite: 'unite',
        gammes: {
          entree: { min: 800, max: 1200 },
          milieu: { min: 1500, max: 2200 },
          haut:   { min: 2500, max: 4000 },
        },
      },
      {
        id: 'electricite',
        label: 'Électricité',
        unite: 'm2',
        gammes: {
          entree: { min: 25, max: 40 },
          milieu: { min: 50, max: 70 },
          haut:   { min: 80, max: 120 },
        },
      },
      {
        id: 'sol',
        label: 'Sol',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 35 },
          milieu: { min: 40, max: 65 },
          haut:   { min: 80, max: 150 },
        },
      },
      {
        id: 'cloisons',
        label: 'Cloisons (placoplatre)',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 160 },
        },
      },
    ],
  },

  // ── FAÇADE ────────────────────────────────────────────────
  {
    id: 'facade',
    label: 'Façade',
    icon: '🏗️',
    multiple: false,
    travaux: [
      {
        id: 'ravalement_complet',
        label: 'Ravalement complet',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 50 },
          milieu: { min: 60, max: 90 },
          haut:   { min: 100, max: 180 },
        },
      },
      {
        id: 'peinture_facade',
        label: 'Peinture façade',
        unite: 'm2',
        gammes: {
          entree: { min: 15, max: 25 },
          milieu: { min: 30, max: 50 },
          haut:   { min: 60, max: 100 },
        },
      },
      {
        id: 'ite',
        label: 'Isolation thermique extérieure (ITE)',
        unite: 'm2',
        gammes: {
          entree: { min: 100, max: 150 },
          milieu: { min: 160, max: 220 },
          haut:   { min: 250, max: 400 },
        },
      },
      {
        id: 'enduit',
        label: 'Enduit',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 35 },
          milieu: { min: 40, max: 65 },
          haut:   { min: 80, max: 140 },
        },
      },
      {
        id: 'nettoyage',
        label: 'Nettoyage / hydrofuge',
        unite: 'm2',
        gammes: {
          entree: { min: 8, max: 15 },
          milieu: { min: 18, max: 30 },
          haut:   { min: 35, max: 60 },
        },
      },
    ],
  },

  // ── TOITURE ───────────────────────────────────────────────
  {
    id: 'toiture',
    label: 'Toiture',
    icon: '🏚️',
    multiple: false,
    travaux: [
      {
        id: 'refection_complete',
        label: 'Réfection complète',
        unite: 'm2',
        gammes: {
          entree: { min: 80, max: 130 },
          milieu: { min: 150, max: 220 },
          haut:   { min: 250, max: 400 },
        },
      },
      {
        id: 'reparations',
        label: 'Réparations ponctuelles (tuiles)',
        unite: 'm2',
        gammes: {
          entree: { min: 20, max: 40 },
          milieu: { min: 50, max: 80 },
          haut:   { min: 100, max: 180 },
        },
      },
      {
        id: 'isolation_toiture',
        label: 'Isolation toiture',
        unite: 'm2',
        gammes: {
          entree: { min: 30, max: 60 },
          milieu: { min: 70, max: 110 },
          haut:   { min: 130, max: 220 },
        },
      },
      {
        id: 'charpente',
        label: 'Charpente',
        unite: 'm2',
        gammes: {
          entree: { min: 50, max: 90 },
          milieu: { min: 100, max: 160 },
          haut:   { min: 180, max: 300 },
        },
      },
      {
        id: 'gouttieres',
        label: 'Gouttières / zinguerie',
        unite: 'ml',
        gammes: {
          entree: { min: 20, max: 35 },
          milieu: { min: 40, max: 65 },
          haut:   { min: 70, max: 120 },
        },
      },
    ],
  },
];

// ── Libellés des unités ──────────────────────────────────────
const UNITE_LABELS = {
  m2:      { court: '/m²',   long: 'par m²' },
  forfait: { court: '/forf.', long: 'forfait' },
  unite:   { court: '/u',    long: 'par unité' },
  ml:      { court: '/ml',   long: 'par mètre linéaire' },
};

// ── Exports ─────────────────────────────────────────────────
module.exports = { PIECES, GAMMES, UNITE_LABELS, MARGE_IMPREVUS };
