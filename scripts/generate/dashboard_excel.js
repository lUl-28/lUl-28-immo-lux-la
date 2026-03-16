/**
 * Génère le tableau de bord Excel de suivi des annonces immobilières
 * Projet Immo Lux L&A — Lucas & Adrien
 *
 * Usage : node scripts/generate_dashboard_excel.js
 * Output : data/biens/Suivi_Annonces_ImmoLux.xlsx
 */

const ExcelJS = require('exceljs');
const path = require('path');
const fs = require('fs');

const OUTPUT_DIR = path.join(__dirname, '../../exports');
const OUTPUT_FILE = path.join(OUTPUT_DIR, 'Suivi_Annonces_ImmoLux.xlsx');

// Palette de couleurs
const COLORS = {
  headerBg: '1F3864',       // Bleu marine foncé
  headerFont: 'FFFFFF',     // Blanc
  subHeaderBg: '2E75B6',    // Bleu moyen
  subHeaderFont: 'FFFFFF',
  titleBg: 'D6E4F0',        // Bleu très clair
  evenRow: 'F2F7FB',        // Bleu pâle alterné
  oddRow: 'FFFFFF',
  borderColor: 'BDD7EE',    // Bleu gris
  // Statuts
  aVisiter: 'FFF2CC',       // Jaune doux
  visite: 'E2EFDA',         // Vert doux
  elimine: 'FCE4D6',        // Rouge doux
  offreFaite: 'DDEBF7',     // Bleu doux
  enNego: 'EDD9FF',         // Violet doux
  // Scores
  scoreA: 'C6EFCE',
  scoreB: 'FFEB9C',
  scoreC: 'FCE4D6',
};

// Colonnes du tableau
const COLUMNS = [
  // Identification
  { key: 'id',         header: 'ID',                   width: 6,   group: 'id' },
  { key: 'date',       header: 'Date ajout',            width: 13,  group: 'id' },
  { key: 'statut',     header: 'Statut',                width: 14,  group: 'id' },
  { key: 'score',      header: 'Score',                 width: 8,   group: 'id' },

  // Annonce
  { key: 'titre',      header: 'Titre de l\'annonce',   width: 40,  group: 'annonce' },
  { key: 'lien',       header: 'Lien annonce',          width: 35,  group: 'annonce' },
  { key: 'source',     header: 'Source',                width: 16,  group: 'annonce' },

  // Bien
  { key: 'commune',    header: 'Commune',               width: 20,  group: 'bien' },
  { key: 'departement',header: 'Dépt.',                 width: 8,   group: 'bien' },
  { key: 'prix',       header: 'Prix (€)',              width: 14,  group: 'bien' },
  { key: 'surface',    header: 'Surface (m²)',          width: 13,  group: 'bien' },
  { key: 'prix_m2',    header: 'Prix/m²',               width: 10,  group: 'bien' },
  { key: 'pieces',     header: 'Pièces',                width: 8,   group: 'bien' },
  { key: 'type',       header: 'Type',                  width: 14,  group: 'bien' },
  { key: 'parking',    header: 'Parking',               width: 10,  group: 'bien' },

  // Contact agence
  { key: 'agence',     header: 'Agence',                width: 25,  group: 'contact' },
  { key: 'agent',      header: 'Agent (Prénom Nom)',     width: 25,  group: 'contact' },
  { key: 'telephone',  header: 'Téléphone',             width: 18,  group: 'contact' },
  { key: 'email',      header: 'Email',                 width: 28,  group: 'contact' },

  // Analyse
  { key: 'travaux_est',header: 'Travaux estimés (€)',   width: 18,  group: 'analyse' },
  { key: 'total_est',  header: 'Total estimé (€)',      width: 16,  group: 'analyse' },
  { key: 'rendement',  header: 'Rendement brut',        width: 15,  group: 'analyse' },
  { key: 'division',   header: 'Divisible ?',           width: 12,  group: 'analyse' },

  // Notes
  { key: 'notes',      header: 'Notes / Observations',  width: 50,  group: 'notes' },
];

// Groupes de colonnes avec leur libellé et couleur d'en-tête
const GROUPS = {
  id:      { label: 'SUIVI',              bg: '1F3864', font: 'FFFFFF' },
  annonce: { label: 'ANNONCE',            bg: '2E75B6', font: 'FFFFFF' },
  bien:    { label: 'BIEN',               bg: '1F6B3D', font: 'FFFFFF' },
  contact: { label: 'CONTACT',            bg: '7B2D8B', font: 'FFFFFF' },
  analyse: { label: 'ANALYSE FINANCIÈRE', bg: 'C55A11', font: 'FFFFFF' },
  notes:   { label: 'NOTES',              bg: '404040', font: 'FFFFFF' },
};

// Données exemples
const EXEMPLE_ANNONCES = [
  {
    id: 1,
    date: '14/03/2026',
    statut: '🟡 À visiter',
    score: 'A',
    titre: 'Maison 130m² à rénover - Longwy',
    lien: 'https://www.leboncoin.fr/...',
    source: 'leboncoin',
    commune: 'Longwy',
    departement: '54',
    prix: 145000,
    surface: 130,
    prix_m2: '',
    pieces: 6,
    type: 'Maison',
    parking: 'Oui',
    agence: '',
    agent: '',
    telephone: '',
    email: '',
    travaux_est: 60000,
    total_est: '',
    rendement: '',
    division: 'Oui',
    notes: 'Exemple — À supprimer. Bien avec jardin, possible division en 2 T2.',
  },
];

async function buildExcel() {
  if (!fs.existsSync(OUTPUT_DIR)) fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const wb = new ExcelJS.Workbook();
  wb.creator = 'Projet Immo Lux L&A';
  wb.created = new Date();

  // ── FEUILLE 1 : TABLEAU DE SUIVI ────────────────────────────────────────────
  const ws = wb.addWorksheet('📋 Suivi Annonces', {
    views: [{ state: 'frozen', xSplit: 0, ySplit: 3 }],
  });

  // Définir les colonnes
  ws.columns = COLUMNS.map(c => ({ key: c.key, width: c.width }));

  // ── Ligne 1 : titre du tableau ──────────────────────────────────────────────
  ws.mergeCells(1, 1, 1, COLUMNS.length);
  const titleCell = ws.getCell(1, 1);
  titleCell.value = '🏠  PROJET IMMO LUX L&A — Tableau de Suivi des Annonces';
  titleCell.font = { name: 'Calibri', bold: true, size: 14, color: { argb: 'FF' + COLORS.headerFont } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  ws.getRow(1).height = 30;

  // ── Ligne 2 : en-têtes groupés ──────────────────────────────────────────────
  const groupRow = ws.getRow(2);
  groupRow.height = 20;

  // Calculer les plages de colonnes par groupe
  const groupRanges = {};
  COLUMNS.forEach((col, idx) => {
    const g = col.group;
    if (!groupRanges[g]) groupRanges[g] = { start: idx + 1, end: idx + 1 };
    else groupRanges[g].end = idx + 1;
  });

  Object.entries(groupRanges).forEach(([group, range]) => {
    const g = GROUPS[group];
    if (range.start !== range.end) {
      ws.mergeCells(2, range.start, 2, range.end);
    }
    const cell = ws.getCell(2, range.start);
    cell.value = g.label;
    cell.font = { name: 'Calibri', bold: true, size: 10, color: { argb: 'FF' + g.font } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + g.bg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle' };
    // Bordure droite pour séparer les groupes
    if (range.end < COLUMNS.length) {
      ws.getCell(2, range.end).border = {
        ...ws.getCell(2, range.end).border,
        right: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      };
    }
  });

  // ── Ligne 3 : en-têtes colonnes ─────────────────────────────────────────────
  const headerRow = ws.getRow(3);
  headerRow.height = 22;
  COLUMNS.forEach((col, idx) => {
    const cell = ws.getCell(3, idx + 1);
    cell.value = col.header;
    cell.font = { name: 'Calibri', bold: true, size: 9, color: { argb: 'FF' + COLORS.headerFont } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeaderBg } };
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
      bottom: { style: 'medium', color: { argb: 'FFFFFFFF' } },
      left: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
      right: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
    };
  });

  // ── Lignes de données (exemple) ─────────────────────────────────────────────
  EXEMPLE_ANNONCES.forEach((ann, rowIdx) => {
    const row = ws.addRow({});
    const isEven = rowIdx % 2 === 0;
    const rowBg = isEven ? COLORS.evenRow : COLORS.oddRow;

    COLUMNS.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      let val = ann[col.key] !== undefined ? ann[col.key] : '';

      // Formatage spécifique
      if (col.key === 'prix' && val) {
        cell.numFmt = '#,##0 "€"';
        cell.value = Number(val);
      } else if (col.key === 'surface' && val) {
        cell.numFmt = '#,##0 "m²"';
        cell.value = Number(val);
      } else if (col.key === 'prix_m2' && ann.prix && ann.surface) {
        cell.value = Math.round(ann.prix / ann.surface);
        cell.numFmt = '#,##0 "€/m²"';
      } else if (col.key === 'total_est' && ann.prix && ann.travaux_est) {
        cell.value = ann.prix + ann.travaux_est;
        cell.numFmt = '#,##0 "€"';
      } else if (col.key === 'rendement' && ann.prix && ann.travaux_est) {
        const total = ann.prix + ann.travaux_est;
        const loyerBrut = 1100 * 12; // 2 T2 × 550€
        cell.value = loyerBrut / total;
        cell.numFmt = '0.0%';
      } else if (col.key === 'travaux_est' && val) {
        cell.numFmt = '#,##0 "€"';
        cell.value = Number(val);
      } else if (col.key === 'lien' && val) {
        cell.value = { text: 'Voir annonce', hyperlink: val };
        cell.font = { color: { argb: 'FF0563C1' }, underline: true, name: 'Calibri', size: 9 };
      } else {
        cell.value = val;
      }

      // Style commun
      if (col.key !== 'lien') {
        cell.font = { name: 'Calibri', size: 9 };
      }
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + rowBg } };
      cell.alignment = { vertical: 'middle', wrapText: col.key === 'notes' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        left: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        right: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
      };

      // Couleur statut
      if (col.key === 'statut') {
        const s = String(val);
        let bg = rowBg;
        if (s.includes('À visiter')) bg = COLORS.aVisiter;
        else if (s.includes('Visité')) bg = COLORS.visite;
        else if (s.includes('Éliminé')) bg = COLORS.elimine;
        else if (s.includes('Offre')) bg = COLORS.offreFaite;
        else if (s.includes('Négo')) bg = COLORS.enNego;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }

      // Couleur score
      if (col.key === 'score') {
        let bg = rowBg;
        if (val === 'A') bg = COLORS.scoreA;
        else if (val === 'B') bg = COLORS.scoreB;
        else if (val === 'C') bg = COLORS.scoreC;
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bg } };
        cell.font = { name: 'Calibri', size: 9, bold: true };
        cell.alignment = { horizontal: 'center', vertical: 'middle' };
      }
    });

    row.height = 20;
  });

  // ── 20 lignes vides prêtes à remplir ─────────────────────────────────────────
  for (let i = 0; i < 20; i++) {
    const row = ws.addRow({});
    const isEven = i % 2 === 0;
    const rowBg = isEven ? COLORS.evenRow : COLORS.oddRow;
    COLUMNS.forEach((col, colIdx) => {
      const cell = row.getCell(colIdx + 1);
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + rowBg } };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        bottom: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        left: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
        right: { style: 'thin', color: { argb: 'FF' + COLORS.borderColor } },
      };
      cell.font = { name: 'Calibri', size: 9 };
      cell.alignment = { vertical: 'middle' };

      // Formats numériques
      if (col.key === 'prix') cell.numFmt = '#,##0 "€"';
      if (col.key === 'surface') cell.numFmt = '#,##0 "m²"';
      if (col.key === 'prix_m2') cell.numFmt = '#,##0 "€/m²"';
      if (col.key === 'travaux_est') cell.numFmt = '#,##0 "€"';
      if (col.key === 'total_est') cell.numFmt = '#,##0 "€"';
      if (col.key === 'rendement') cell.numFmt = '0.0%';
    });
    row.height = 20;
  }

  // ── FEUILLE 2 : LÉGENDE & GUIDE ─────────────────────────────────────────────
  const ws2 = wb.addWorksheet('📖 Légende & Guide');
  ws2.columns = [
    { key: 'a', width: 22 },
    { key: 'b', width: 45 },
    { key: 'c', width: 10 },
    { key: 'd', width: 22 },
    { key: 'e', width: 45 },
  ];

  const addSection = (title, bgHex, items, startRow) => {
    let r = startRow;
    // Titre section
    ws2.mergeCells(r, 1, r, 2);
    const titleC = ws2.getCell(r, 1);
    titleC.value = title;
    titleC.font = { bold: true, size: 11, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
    titleC.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + bgHex } };
    titleC.alignment = { horizontal: 'center' };
    ws2.getRow(r).height = 20;
    r++;
    items.forEach(([k, v, color]) => {
      ws2.getRow(r).height = 18;
      const c1 = ws2.getCell(r, 1);
      const c2 = ws2.getCell(r, 2);
      c1.value = k;
      c2.value = v;
      c1.font = { bold: true, size: 9, name: 'Calibri' };
      c2.font = { size: 9, name: 'Calibri' };
      if (color) {
        c1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + color } };
      }
      r++;
    });
    return r + 1;
  };

  let row = 1;
  ws2.mergeCells(row, 1, row, 5);
  const legendTitle = ws2.getCell(row, 1);
  legendTitle.value = 'LÉGENDE & GUIDE — Projet Immo Lux L&A';
  legendTitle.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  legendTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } };
  legendTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws2.getRow(row).height = 32;
  row += 2;

  row = addSection('STATUTS', '2E75B6', [
    ['🟡 À visiter',  'Annonce repérée, visite pas encore planifiée', COLORS.aVisiter],
    ['🟢 Visité',     'Visite réalisée, bien inspecté', COLORS.visite],
    ['🔴 Éliminé',   'Bien écarté (hors critères, rédhibitoire)', COLORS.elimine],
    ['🔵 Offre faite','Offre d\'achat soumise', COLORS.offreFaite],
    ['🟣 Négo',       'Négociation en cours', COLORS.enNego],
  ], row);

  row = addSection('SCORES', '1F6B3D', [
    ['A', 'Excellent — à prioriser absolument', COLORS.scoreA],
    ['B', 'Bon potentiel — à visiter', COLORS.scoreB],
    ['C', 'Mitigé — à creuser avant visite', COLORS.scoreC],
  ], row);

  row = addSection('SOURCES', '7B2D8B', [
    ['leboncoin', 'leboncoin.fr'],
    ['seloger', 'seloger.com'],
    ['pap', 'pap.fr — particulier à particulier'],
    ['logic-immo', 'logic-immo.com'],
    ['bienici', 'bienici.com'],
    ['autre', 'Autre source (préciser dans notes)'],
  ], row);

  row = addSection('COLONNES CALCULÉES', 'C55A11', [
    ['Prix/m²', 'Calculer manuellement : Prix ÷ Surface'],
    ['Total estimé', 'Prix d\'achat + Travaux estimés'],
    ['Rendement brut', '(2 × loyer mensuel × 12) ÷ Total estimé'],
  ], row);

  // ── FEUILLE 3 : STATS ────────────────────────────────────────────────────────
  const ws3 = wb.addWorksheet('📊 Stats');
  ws3.columns = [{ key: 'a', width: 30 }, { key: 'b', width: 20 }];

  ws3.mergeCells(1, 1, 1, 2);
  const statsTitle = ws3.getCell(1, 1);
  statsTitle.value = 'STATISTIQUES — Synthèse du suivi';
  statsTitle.font = { bold: true, size: 13, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
  statsTitle.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.headerBg } };
  statsTitle.alignment = { horizontal: 'center', vertical: 'middle' };
  ws3.getRow(1).height = 28;

  const stats = [
    ['', ''],
    ['INDICATEUR', 'VALEUR'],
    ['Total annonces suivies', "=COUNTA('📋 Suivi Annonces'!A4:A1000)"],
    ['À visiter', "=COUNTIF('📋 Suivi Annonces'!C4:C1000,\"*À visiter*\")"],
    ['Visités', "=COUNTIF('📋 Suivi Annonces'!C4:C1000,\"*Visité*\")"],
    ['Éliminés', "=COUNTIF('📋 Suivi Annonces'!C4:C1000,\"*Éliminé*\")"],
    ['Offres faites', "=COUNTIF('📋 Suivi Annonces'!C4:C1000,\"*Offre*\")"],
    ['Score A', "=COUNTIF('📋 Suivi Annonces'!D4:D1000,\"A\")"],
    ['Score B', "=COUNTIF('📋 Suivi Annonces'!D4:D1000,\"B\")"],
    ['Score C', "=COUNTIF('📋 Suivi Annonces'!D4:D1000,\"C\")"],
    ['', ''],
    ['Prix moyen', "=IFERROR(AVERAGE('📋 Suivi Annonces'!J4:J1000),\"-\")"],
    ['Surface moyenne (m²)', "=IFERROR(AVERAGE('📋 Suivi Annonces'!K4:K1000),\"-\")"],
    ['Prix/m² moyen', "=IFERROR(AVERAGE('📋 Suivi Annonces'!L4:L1000),\"-\")"],
    ['Budget total engagé', "=IFERROR(SUM('📋 Suivi Annonces'!T4:T1000),\"-\")"],
  ];

  stats.forEach((row, idx) => {
    const r = ws3.addRow({ a: row[0], b: row[1] });
    r.height = 20;
    if (idx === 1) {
      r.getCell(1).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
      r.getCell(2).font = { bold: true, size: 10, color: { argb: 'FFFFFFFF' }, name: 'Calibri' };
      r.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeaderBg } };
      r.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF' + COLORS.subHeaderBg } };
    }
    if ([12, 13, 14].includes(idx)) {
      r.getCell(2).numFmt = '#,##0 "€"';
    }
  });

  await wb.xlsx.writeFile(OUTPUT_FILE);
  console.log(`\n✅ Fichier Excel généré :\n   ${OUTPUT_FILE}\n`);
}

buildExcel().catch(err => {
  console.error('Erreur :', err.message);
  process.exit(1);
});
