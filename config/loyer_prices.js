// ============================================================
// BASE DE PRIX LOYERS — Module Estimation Rentabilité
// Projet Immo Lux L&A
//
// Sources : SeLoger, PAP, annonces locales 2024-2026
// Zone : frontaliers Luxembourg — Moselle / Meurthe-et-Moselle
//
// Formule prix/m² effectif :
//   prix_m2 = base[ring][type][typo] × coefCommune × coefSurface × coefDemande
//   coefSurface = (surfaceRef[typo] / surface) ^ elasticite[typo]
//   Loyer min/max = prix_m2 × surface × (1 ± margeIncertitude/100)
// ============================================================

'use strict';

// ── Rings ────────────────────────────────────────────────────
const RINGS = {
  ring1: { label: 'Ring 1', description: '0–15 km de Luxembourg-Ville', badge: '🔴' },
  ring2: { label: 'Ring 2', description: '15–30 km de Luxembourg-Ville', badge: '🟠' },
  ring3: { label: 'Ring 3', description: '30–45 km de Luxembourg-Ville', badge: '🟡' },
};

// ── Types de biens ───────────────────────────────────────────
const TYPES = {
  appart: { label: 'Appartement', icon: '🏢' },
  maison: { label: 'Maison',      icon: '🏡' },
};

// ── Typologies ───────────────────────────────────────────────
const TYPOLOGIES = {
  t1: { label: 'T1 / Studio', surfaceRef: 28, icon: '1' },
  t2: { label: 'T2',          surfaceRef: 45, icon: '2' },
  t3: { label: 'T3',          surfaceRef: 65, icon: '3' },
};

// ── Loyers de base (€/m²/mois) ───────────────────────────────
// Prix moyens AVANT application du coefficient communal.
// Ring 1 : Moselle frontalière (Thionville, Yutz, Longwy)
// Ring 2 : zone élargie (Villerupt, Hayange, Fameck…)
// Ring 3 : bassin Metz / Fensch lointaine
const LOYER_BASE = {
  ring1: {
    appart: { t1: 15.5, t2: 13.5, t3: 11.0 },
    maison: { t1: null, t2: 12.0, t3: 10.0 },
  },
  ring2: {
    appart: { t1: 12.5, t2: 10.5, t3:  9.0 },
    maison: { t1: null, t2:  9.5, t3:  8.0 },
  },
  ring3: {
    appart: { t1: 11.0, t2:  9.5, t3:  8.0 },
    maison: { t1: null, t2:  8.5, t3:  7.0 },
  },
};

// ── Élasticité surface (dégressivité) ────────────────────────
const ELASTICITE = {
  t1: 0.20,
  t2: 0.15,
  t3: 0.12,
};

// ── Coefficients de demande locale ───────────────────────────
// T2 Ring 1 élevé : très recherchés par frontaliers célibataires/couples
const DEMANDE = {
  ring1: { t1: 1.05, t2: 1.10, t3: 1.00 },
  ring2: { t1: 1.00, t2: 1.05, t3: 0.95 },
  ring3: { t1: 0.95, t2: 1.00, t3: 0.92 },
};

// ── Coefficients communaux ───────────────────────────────────
// Multiplicateur appliqué sur le loyer de base du ring.
// 1.00 = valeur moyenne du ring
// Sources : SeLoger, PAP, annonces — données 2024-2026
// Communes classées du plus cher au moins cher dans chaque ring.
const COMMUNES_COEF = {
  // ── Ring 1 ─────────────────────────────────────────────────
  'Terville':             { coef: 1.07, note: 'Premium banlieue Thionville Nord' },
  'Thionville':           { coef: 1.04, note: '14 €/m² — SeLoger fév.2026' },
  'Yutz':                 { coef: 0.93, note: '12.5 €/m² (660 €/53m², annonces 2025)' },
  'Sierck-les-Bains':     { coef: 0.93, note: 'Tourisme + frontaliers ; demande soutenue' },
  'Longwy':               { coef: 0.89, note: '12 €/m² — SeLoger 2025' },
  'Audun-le-Tiche':       { coef: 0.89, note: 'Frontalière directe, T3 65m²=1 250 €CC' },
  'Volmerange-les-Mines': { coef: 0.89, note: '1 055 €/104m² (annonces 2025)' },
  'Cattenom':             { coef: 0.85, note: 'Stable ; centrale nucléaire, emploi stable' },
  'Longlaville':          { coef: 0.85, note: 'Satellite Longwy, offre réduite' },
  'Herserange':           { coef: 0.81, note: 'Petit tissu locatif ; annexe Longwy' },
  'Hussigny-Godbrange':   { coef: 0.81, note: 'Résidentiel calme, faible rotation' },
  'Ottange':              { coef: 0.81, note: 'Village, peu d\'annonces' },
  'Mont-Saint-Martin':    { coef: 0.78, note: 'Secteur défavorisé de l\'agglo Longwy' },
  'Réhon':                { coef: 0.74, note: 'Très petit, rural, peu d\'annonces' },

  // ── Ring 2 ─────────────────────────────────────────────────
  'Villerupt':            { coef: 1.35, note: '14.2 €/m² appart — SeLoger mai 2025 (très proche Esch-LU)' },
  'Fameck':               { coef: 1.13, note: '11.9 €/m² (680 €/57m²)' },
  'Guénange':             { coef: 1.05, note: 'Calme, bien desservi Thionville' },
  'Clouange':             { coef: 1.02, note: '10.7 €/m² (750 €/70m², annonces 2025)' },
  'Talange':              { coef: 1.00, note: 'Moyenne ring — bonne desserte' },
  'Hayange':              { coef: 0.95, note: 'Vallée Fensch, offre abondante (annonces 2025)' },
  'Briey':                { coef: 0.95, note: 'Sous-préfecture, demande modérée' },
  'Jœuf':                 { coef: 0.90, note: 'Ancienne cité minière, marché détenu' },
  'Uckange':              { coef: 0.90, note: 'Marché calme, peu de stock locatif neuf' },
  'Amnéville':            { coef: 0.90, note: '9.5 €/m² (annonces 2025, T3 95m²=890 €CC)' },
  'Ennery':               { coef: 0.86, note: 'Village péri-urbain, offre limitée' },
  'Trieux':               { coef: 0.86, note: 'Village, peu d\'annonces' },
  'Homécourt':            { coef: 0.81, note: 'Cité industrielle, faible pression locative' },
  'Piennes':              { coef: 0.76, note: 'Rural, très peu de biens à la location' },

  // ── Ring 3 ─────────────────────────────────────────────────
  'Maizières-lès-Metz':   { coef: 1.26, note: '12 €/m² — SeLoger déc.2025 (bassin Metz)' },
  'Hagondange':           { coef: 1.16, note: '11 €/m² — SeLoger sept.2025' },
  'Moulins-lès-Metz':     { coef: 1.11, note: 'Proche Metz, bonne desserte' },
  'Florange':             { coef: 1.05, note: 'Bassin Fensch ; ArcelorMittal, emplois stables' },
  'Marange-Silvange':     { coef: 1.00, note: 'Résidentiel calme, valeur médiane ring 3' },
  'Champigneulles':       { coef: 1.05, note: 'Banlieue Nancy, marché Nancy pas LU' },
  'Jarny':                { coef: 0.89, note: 'Marché modeste, faible pression' },
  'Conflans-en-Jarnisy':  { coef: 0.84, note: 'Rural, petite ville industrielle' },
  'Knutange':             { coef: 0.84, note: 'Petit, cité ouvrière' },
  'Moyeuvre-Grande':      { coef: 0.84, note: 'Offre limitée, marché calme' },
  'Dieulouard':           { coef: 0.84, note: 'Rural 54, peu de stock locatif' },
  'Audun-le-Roman':       { coef: 0.79, note: 'Rural, très peu d\'annonces' },
  'Bouzonville':          { coef: 0.74, note: 'Éloigné, marché très calme' },
};

// ── Marge d'incertitude sur le loyer estimé (%) ──────────────
const MARGE_INCERTITUDE = 10;

// ── Charges locatives nettes estimées (% du loyer annuel) ────
const CHARGES_NETTES_PCT = 20;

module.exports = {
  RINGS, TYPES, TYPOLOGIES,
  LOYER_BASE, ELASTICITE, DEMANDE, COMMUNES_COEF,
  MARGE_INCERTITUDE, CHARGES_NETTES_PCT,
};
