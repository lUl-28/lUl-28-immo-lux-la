// ============================================================
// Business Plan SCI L&A — Générateur Excel
// Lucas Lamquet & Adrien Fleuriot — 50/50
// SCI à l'IS — Zone frontalière luxembourgeoise
//
// npm run bp  →  data/Business_Plan_SCI_LA.xlsx
// ============================================================

const ExcelJS = require('exceljs');
const path    = require('path');
const fs      = require('fs');

const OUTPUT = path.join(__dirname, '../../exports/Business_Plan_SCI_LA.xlsx');

// ── Palette ──────────────────────────────────────────────────
const C = {
  navy:      '1E3A5F',
  navyMid:   '2D5282',
  blue:      '2563EB',
  bluePale:  'DBEAFE',
  green:     '166534',
  greenPale: 'DCFCE7',
  red:       'B91C1C',
  redPale:   'FEE2E2',
  orange:    'C2410C',
  orangePale:'FFF7ED',
  yellow:    'FEFCE8',
  yellowBd:  'CA8A04',
  gray1:     'F8FAFC',
  gray2:     'F1F5F9',
  gray3:     'E2E8F0',
  border:    'CBD5E1',
  text:      '0F172A',
  textMid:   '475569',
  textLight: '94A3B8',
  white:     'FFFFFF',
};

// ── Helpers ───────────────────────────────────────────────────
const fill = (argb) => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });

const font = ({ size = 10, bold = false, italic = false, color = C.text } = {}) => ({
  name: 'Calibri', size, bold, italic, color: { argb: color },
});

const bd = (style = 'thin', argb = C.border) => {
  const s = { style, color: { argb } };
  return { top: s, left: s, bottom: s, right: s };
};

const aln = (h = 'left', v = 'middle', wrap = false) =>
  ({ horizontal: h, vertical: v, wrapText: wrap });

function applyCell(cell, { value, formula, numFmt, fillColor, fnt, align, border } = {}) {
  if (formula !== undefined)  cell.value = { formula };
  else if (value !== undefined) cell.value = value;
  if (numFmt)    cell.numFmt    = numFmt;
  if (fillColor) cell.fill      = fill(fillColor);
  if (fnt)       cell.font      = font(fnt);
  if (align)     cell.alignment = Array.isArray(align) ? aln(...align) : aln(align);
  if (border)    cell.border    = border === true ? bd() : bd(border);
  return cell;
}

// Titre de section (fond navy)
function sectionHeader(ws, row, label, nbCols = 3) {
  ws.mergeCells(row, 1, row, nbCols);
  const c = ws.getCell(row, 1);
  c.value = label;
  c.fill  = fill(C.navyMid);
  c.font  = font({ bold: true, color: C.white, size: 10 });
  c.alignment = aln('left', 'middle');
  c.border = bd('thin', C.navy);
  ws.getRow(row).height = 22;
}

// Ligne label / valeur / unité
function paramRow(ws, row, label, { value, formula, numFmt } = {}, unit = '', editable = false) {
  ws.getRow(row).height = 19;

  const cA = ws.getCell(row, 1);
  cA.value = label;
  cA.fill  = fill(C.gray1);
  cA.font  = font({ size: 10 });
  cA.alignment = aln('left', 'middle');
  cA.border = bd();

  const cB = ws.getCell(row, 2);
  if (formula) cB.value = { formula };
  else          cB.value = (value !== undefined ? value : null);
  if (numFmt) cB.numFmt = numFmt;
  cB.fill = fill(editable ? C.yellow : C.gray2);
  cB.font = font({ bold: editable, size: 10, color: editable ? C.text : C.textMid });
  cB.alignment = aln('right', 'middle');
  cB.border = editable
    ? { top: bd().top, bottom: bd().bottom, left: { style: 'medium', color: { argb: C.yellowBd } }, right: { style: 'medium', color: { argb: C.yellowBd } } }
    : bd();

  const cC = ws.getCell(row, 3);
  cC.value = unit;
  cC.fill  = fill(C.gray1);
  cC.font  = font({ size: 9, italic: true, color: C.textLight });
  cC.alignment = aln('left', 'middle');
  cC.border = bd();
}

// Ligne total (fond bleu pâle)
function totalRow(ws, row, label, formula, numFmt, fillBg = C.bluePale) {
  ws.getRow(row).height = 21;
  ['A','B','C'].forEach(col => ws.getCell(`${col}${row}`).fill = fill(fillBg));

  const cA = ws.getCell(row, 1);
  cA.value = label;
  cA.font  = font({ bold: true, size: 10, color: C.navy });
  cA.alignment = aln('left', 'middle');
  cA.border = bd('medium', C.blue);

  const cB = ws.getCell(row, 2);
  cB.value  = { formula };
  cB.numFmt = numFmt || '#,##0 "€"';
  cB.font   = font({ bold: true, size: 10, color: C.navy });
  cB.alignment = aln('right', 'middle');
  cB.border = bd('medium', C.blue);

  const cC = ws.getCell(row, 3);
  cC.border = bd('medium', C.blue);
}

// ──────────────────────────────────────────────────────────────
// ONGLET 1 — PRÉSENTATION
// ──────────────────────────────────────────────────────────────
function buildPresentation(wb) {
  const ws = wb.addWorksheet('Présentation', { tabColor: { argb: C.navy } });
  ws.getColumn(1).width = 2;
  ws.getColumn(2).width = 36;
  ws.getColumn(3).width = 36;
  ws.getColumn(4).width = 2;

  // Bandeau titre
  ws.getRow(1).height = 8;
  ws.mergeCells('B2:C2'); ws.getRow(2).height = 52;
  const t1 = ws.getCell('B2');
  t1.value = 'BUSINESS PLAN — SCI L&A';
  t1.fill = fill(C.navy);
  t1.font = font({ bold: true, size: 22, color: C.white });
  t1.alignment = aln('center', 'middle');

  ws.mergeCells('B3:C3'); ws.getRow(3).height = 28;
  const t2 = ws.getCell('B3');
  t2.value = 'Investissement immobilier locatif — Zone frontalière luxembourgeoise';
  t2.fill = fill(C.navyMid);
  t2.font = font({ size: 13, italic: true, color: C.white });
  t2.alignment = aln('center', 'middle');

  ws.mergeCells('B4:C4'); ws.getRow(4).height = 8;
  ws.getCell('B4').fill = fill(C.navy);

  ws.getRow(5).height = 14;

  // Fiche identité
  const infos = [
    ['Associés',              'Lucas Lamquet & Adrien Fleuriot'],
    ['Structure juridique',   'SCI à l\'IS (Société Civile Immobilière)'],
    ['Répartition des parts', '50 % Lucas Lamquet  /  50 % Adrien Fleuriot'],
    ['Statut SCI',            'À constituer'],
    ['Zone d\'investissement','Rayon 60 km — Frontière luxembourgeoise (54 / 57 / 55)'],
    ['Bien ciblé',            'Maison ou immeuble ≥ 100 m² — Division en 2 lots T2'],
    ['Stratégie',             'Revenus locatifs + plus-value à la revente'],
    ['Date du document',      new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })],
  ];

  let r = 6;
  infos.forEach(([lbl, val]) => {
    ws.getRow(r).height = 21;
    const cL = ws.getCell(r, 2);
    cL.value = lbl;
    cL.fill  = fill(C.gray2);
    cL.font  = font({ bold: true, size: 10, color: C.navy });
    cL.alignment = aln('left', 'middle');
    cL.border = bd();

    const cV = ws.getCell(r, 3);
    cV.value = val;
    cV.fill  = fill(C.white);
    cV.font  = font({ size: 10 });
    cV.alignment = aln('left', 'middle');
    cV.border = bd();
    r++;
  });

  ws.getRow(r).height = 14; r++;

  // Description projet
  ws.mergeCells(r, 2, r, 3); ws.getRow(r).height = 23;
  const dTitle = ws.getCell(r, 2);
  dTitle.value = 'DESCRIPTION DU PROJET';
  dTitle.fill  = fill(C.navy);
  dTitle.font  = font({ bold: true, size: 11, color: C.white });
  dTitle.alignment = aln('left', 'middle');
  r++;

  const desc = [
    'La SCI L&A a pour objet l\'acquisition d\'un bien immobilier situé dans le rayon 60 km',
    'de la frontière luxembourgeoise (Meurthe-et-Moselle 54, Moselle 57, Meuse 55).',
    '',
    'Le bien ciblé est une maison ou un immeuble d\'une surface minimale de 100 m², à',
    'rénover, sans copropriété existante, avec parking. L\'objectif est de le diviser en',
    '2 appartements T2 de ~50 m² chacun destinés à la location.',
    '',
    'La zone frontalière bénéficie d\'une demande locative structurelle forte, portée par',
    'les +60 000 emplois attendus au Luxembourg d\'ici 2030 et l\'afflux de travailleurs',
    'frontaliers cherchant à se loger côté français à des loyers bien inférieurs.',
  ];

  desc.forEach(line => {
    ws.mergeCells(r, 2, r, 3);
    ws.getRow(r).height = 16;
    const c = ws.getCell(r, 2);
    c.value = line;
    c.fill  = fill(C.gray1);
    c.font  = font({ size: 10 });
    c.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
    r++;
  });

  ws.getRow(r).height = 10; r++;
  ws.mergeCells(r, 2, r, 3); ws.getRow(r).height = 32;
  const warn = ws.getCell(r, 2);
  warn.value = '🟡  Les cellules surlignées en jaune dans l\'onglet "Paramètres" sont librement modifiables. Tous les calculs (synthèse, prévisionnel, amortissement, revente) se mettent à jour automatiquement.';
  warn.fill  = fill(C.orangePale);
  warn.font  = font({ size: 9, italic: true, color: C.orange });
  warn.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  warn.border = { left: { style: 'medium', color: { argb: C.orange } }, right: bd().right, top: bd().top, bottom: bd().bottom };
}

// ──────────────────────────────────────────────────────────────
// ONGLET 2 — PARAMÈTRES
// Cellules jaunes = saisie libre  |  Grises = calculées
//
// Mapping des cellules B (référencées dans tous les autres onglets) :
//  B5  = Prix d'achat
//  B6  = Frais de notaire %
//  B7  = Frais de notaire montant (calculé)
//  B8  = Budget travaux (VIDE — à compléter)
//  B9  = Frais de dossier / garantie
//  B10 = TOTAL INVESTISSEMENT
//  B13 = Apport personnel
//  B14 = Montant à emprunter
//  B15 = Taux d'intérêt annuel
//  B16 = Durée prêt (ans)
//  B17 = Mensualité (PMT)
//  B18 = Coût total du crédit
//  B21 = Loyer lot 1
//  B22 = Loyer lot 2
//  B23 = Taux d'occupation
//  B24 = Revenu brut mensuel
//  B25 = Revenu brut annuel
//  B28 = Taxe foncière
//  B29 = Assurance PNO
//  B30 = Entretien / provisions
//  B31 = Comptabilité SCI
//  B32 = TOTAL CHARGES
//  B35 = Revalorisation loyers / an
//  B36 = Plus-value immobilière / an
//  B37 = Durée amortissement comptable
//  B38 = Taux IS réduit
//  B39 = Plafond IS réduit
//  B40 = Taux IS normal
//  B41 = Flat tax PFU
//  B42 = Amortissement comptable annuel
// ──────────────────────────────────────────────────────────────
function buildParametres(wb) {
  const ws = wb.addWorksheet('Paramètres', { tabColor: { argb: C.yellowBd } });
  ws.getColumn(1).width = 40;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 22;

  ws.mergeCells('A1:C1'); ws.getRow(1).height = 32;
  const t = ws.getCell('A1');
  t.value = 'PARAMÈTRES DU PROJET — SCI L&A';
  t.fill  = fill(C.navy);
  t.font  = font({ bold: true, size: 14, color: C.white });
  t.alignment = aln('center', 'middle');

  ws.mergeCells('A2:C2'); ws.getRow(2).height = 18;
  const note = ws.getCell('A2');
  note.value = '🟡  Cellules jaunes = saisie libre    |    ⬜ Cellules grises = calculées automatiquement';
  note.fill  = fill(C.yellow);
  note.font  = font({ size: 9, italic: true, color: C.textMid });
  note.alignment = aln('center', 'middle');

  ws.getRow(3).height = 8;

  // ── ACQUISITION ──
  sectionHeader(ws, 4, '  ACQUISITION');
  paramRow(ws, 5,  'Prix d\'achat estimé',          { value: 165000, numFmt: '#,##0 "€"' }, '€', true);
  paramRow(ws, 6,  'Frais de notaire',               { value: 0.08,   numFmt: '0.0%' },      '%', true);
  paramRow(ws, 7,  'Montant frais de notaire',       { formula: 'ROUND(B5*B6,0)', numFmt: '#,##0 "€"' }, '€ — calculé');
  paramRow(ws, 8,  'Budget travaux',                 { value: null,   numFmt: '#,##0 "€"' }, '€ — à compléter (laisser vide si inconnu)', true);
  paramRow(ws, 9,  'Frais de dossier / garantie',    { value: 3000,   numFmt: '#,##0 "€"' }, '€', true);
  totalRow(ws, 10, 'TOTAL INVESTISSEMENT', 'B5+IFERROR(B8,0)+B7+B9', '#,##0 "€"');

  ws.getRow(11).height = 8;

  // ── FINANCEMENT ──
  sectionHeader(ws, 12, '  FINANCEMENT');
  paramRow(ws, 13, 'Apport personnel',               { value: 0,     numFmt: '#,##0 "€"' },  '€  (0 = financement total)', true);
  paramRow(ws, 14, 'Montant à emprunter',             { formula: 'B10-B13', numFmt: '#,##0 "€"' }, '€ — calculé');
  paramRow(ws, 15, 'Taux d\'intérêt annuel',          { value: 0.035, numFmt: '0.00%' },      '%', true);
  paramRow(ws, 16, 'Durée du prêt',                   { value: 20,    numFmt: '0' },           'ans', true);
  paramRow(ws, 17, 'Mensualité estimée',              { formula: 'IFERROR(PMT(B15/12,B16*12,-B14),0)', numFmt: '#,##0.00 "€"' }, '€/mois — calculé');
  paramRow(ws, 18, 'Coût total du crédit',            { formula: 'IFERROR(B17*B16*12-B14,0)', numFmt: '#,##0 "€"' }, '€ — calculé');

  ws.getRow(19).height = 8;

  // ── REVENUS LOCATIFS ──
  sectionHeader(ws, 20, '  REVENUS LOCATIFS');
  paramRow(ws, 21, 'Loyer mensuel — Lot 1 (T2 ~50 m²)', { value: 550, numFmt: '#,##0 "€"' }, '€/mois', true);
  paramRow(ws, 22, 'Loyer mensuel — Lot 2 (T2 ~50 m²)', { value: 550, numFmt: '#,##0 "€"' }, '€/mois', true);
  paramRow(ws, 23, 'Taux d\'occupation annuel',          { value: 0.92, numFmt: '0%' },        '%', true);
  paramRow(ws, 24, 'Revenu brut mensuel (net occupation)', { formula: '(B21+B22)*B23', numFmt: '#,##0.00 "€"' }, '€/mois — calculé');
  paramRow(ws, 25, 'Revenu brut annuel',                 { formula: 'ROUND(B24*12,0)', numFmt: '#,##0 "€"' }, '€/an — calculé');

  ws.getRow(26).height = 8;

  // ── CHARGES ANNUELLES ──
  sectionHeader(ws, 27, '  CHARGES ANNUELLES ESTIMÉES');
  paramRow(ws, 28, 'Taxe foncière',             { value: 1200, numFmt: '#,##0 "€"' }, '€/an', true);
  paramRow(ws, 29, 'Assurance PNO (2 lots)',    { value: 600,  numFmt: '#,##0 "€"' }, '€/an', true);
  paramRow(ws, 30, 'Entretien / provisions',    { value: 800,  numFmt: '#,##0 "€"' }, '€/an', true);
  paramRow(ws, 31, 'Comptabilité SCI',          { value: 600,  numFmt: '#,##0 "€"' }, '€/an', true);
  totalRow(ws, 32, 'TOTAL CHARGES ANNUELLES', 'SUM(B28:B31)', '#,##0 "€/an"');

  ws.getRow(33).height = 8;

  // ── HYPOTHÈSES & FISCALITÉ ──
  sectionHeader(ws, 34, '  HYPOTHÈSES & FISCALITÉ — SCI À L\'IS');
  paramRow(ws, 35, 'Revalorisation des loyers / an',          { value: 0.015, numFmt: '0.0%' }, '%', true);
  paramRow(ws, 36, 'Plus-value immobilière estimée / an',     { value: 0.02,  numFmt: '0.0%' }, '%', true);
  paramRow(ws, 37, 'Durée d\'amortissement comptable du bien',{ value: 30,    numFmt: '0' },    'ans', true);
  paramRow(ws, 38, 'Taux IS réduit (PME)',                    { value: 0.15,  numFmt: '0%' },   '%', true);
  paramRow(ws, 39, 'Plafond bénéfice IS réduit',              { value: 42500, numFmt: '#,##0 "€"' }, '€', true);
  paramRow(ws, 40, 'Taux IS normal',                          { value: 0.25,  numFmt: '0%' },   '%', true);
  paramRow(ws, 41, 'Flat tax dividendes (PFU)',               { value: 0.30,  numFmt: '0%' },   '%', true);
  paramRow(ws, 42, 'Amortissement comptable annuel',
    { formula: 'IFERROR((B5*0.8+IFERROR(B8,0))/B37,0)', numFmt: '#,##0 "€/an"' },
    '€/an — calculé  (terrain = 20% non amortissable)');

  ws.getRow(43).height = 8;
  ws.mergeCells('A44:C44'); ws.getRow(44).height = 30;
  const noteIS = ws.getCell('A44');
  noteIS.value = 'ℹ️  SCI à l\'IS : le terrain (~20% du prix d\'achat) n\'est pas amortissable. Les travaux sont amortis sur la même durée que le bien. Ces paramètres fiscaux doivent être validés par un expert-comptable.';
  noteIS.fill  = fill(C.gray1);
  noteIS.font  = font({ size: 9, italic: true, color: C.textMid });
  noteIS.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
}

// ──────────────────────────────────────────────────────────────
// ONGLET 3 — SYNTHÈSE
// ──────────────────────────────────────────────────────────────
function buildSynthese(wb) {
  const ws = wb.addWorksheet('Synthèse', { tabColor: { argb: C.blue } });
  ws.getColumn(1).width = 36;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 4;
  ws.getColumn(4).width = 36;
  ws.getColumn(5).width = 22;

  ws.mergeCells('A1:E1'); ws.getRow(1).height = 30;
  const t = ws.getCell('A1');
  t.value = 'SYNTHÈSE FINANCIÈRE — SCI L&A';
  t.fill  = fill(C.navy);
  t.font  = font({ bold: true, size: 13, color: C.white });
  t.alignment = aln('center', 'middle');

  ws.getRow(2).height = 10;

  // KPI double-colonne
  function kpi(row, colL, colR, lLbl, lFormula, lFmt, lBg, rLbl, rFormula, rFmt, rBg) {
    ws.getRow(row).height = 17;
    ws.getRow(row + 1).height = 28;

    function writeKpi(r, col, lbl, formula, fmt, bg) {
      const cL = ws.getCell(r, col);
      cL.value = lbl;
      cL.fill  = fill(bg);
      cL.font  = font({ bold: true, size: 9, color: bg === C.navy ? C.white : C.navy });
      cL.alignment = aln('left', 'middle');
      cL.border = bd('thin', C.gray3);

      const cV = ws.getCell(r + 1, col);
      cV.value  = { formula };
      cV.numFmt = fmt;
      cV.fill   = fill(C.white);
      cV.font   = font({ bold: true, size: 14, color: C.navy });
      cV.alignment = aln('right', 'middle');
      cV.border = bd('thin', C.gray3);
    }

    writeKpi(row, colL, lLbl, lFormula, lFmt, lBg);
    writeKpi(row, colR, rLbl, rFormula, rFmt, rBg);
  }

  kpi(3,  1, 4, 'Budget total investissement',     "Paramètres!B10",           '#,##0 "€"',      C.bluePale,
                 'Montant à emprunter',              "Paramètres!B14",           '#,##0 "€"',      C.redPale);
  ws.getRow(5).height = 8;

  kpi(6,  1, 4, 'Apport personnel',                "Paramètres!B13",           '#,##0 "€"',      C.gray2,
                 'Mensualité emprunt',               "Paramètres!B17",           '#,##0.00 "€/mois"', C.redPale);
  ws.getRow(8).height = 8;

  kpi(9,  1, 4, 'Revenus locatifs bruts / an',     "Paramètres!B25",           '#,##0 "€/an"',   C.greenPale,
                 'Charges exploitation / an',        "Paramètres!B32",           '#,##0 "€/an"',   C.gray2);
  ws.getRow(11).height = 8;

  kpi(12, 1, 4, 'Excédent brut d\'exploitation / an', "Paramètres!B25-Paramètres!B32", '#,##0 "€/an"', C.bluePale,
                 'Cashflow net mensuel (avant IS)',  "(Paramètres!B25-Paramètres!B32)/12-Paramètres!B17", '#,##0.00 "€/mois"', C.bluePale);
  ws.getRow(14).height = 8;

  kpi(15, 1, 4, 'Rendement brut',                  "Paramètres!B25/Paramètres!B10",            '0.00%', C.greenPale,
                 'Rendement net (après charges)',    "(Paramètres!B25-Paramètres!B32)/Paramètres!B10", '0.00%', C.greenPale);
  ws.getRow(17).height = 8;

  // Table synthèse plan de financement
  ws.mergeCells('A18:E18'); ws.getRow(18).height = 23;
  const planT = ws.getCell('A18');
  planT.value = 'RÉCAPITULATIF DU PLAN DE FINANCEMENT';
  planT.fill  = fill(C.navy);
  planT.font  = font({ bold: true, size: 11, color: C.white });
  planT.alignment = aln('center', 'middle');

  const planRows = [
    { lbl: 'Prix d\'achat',              formula: 'Paramètres!B5',              fmt: '#,##0 "€"',     total: false },
    { lbl: 'Frais de notaire (8%)',      formula: 'Paramètres!B7',              fmt: '#,##0 "€"',     total: false },
    { lbl: 'Budget travaux',             formula: 'IFERROR(Paramètres!B8,0)',   fmt: '#,##0 "€"',     total: false },
    { lbl: 'Frais de dossier / garantie',formula: 'Paramètres!B9',              fmt: '#,##0 "€"',     total: false },
    { lbl: 'TOTAL COÛT DU PROJET',       formula: 'Paramètres!B10',             fmt: '#,##0 "€"',     total: true  },
    { lbl: 'dont Apport',                formula: 'Paramètres!B13',             fmt: '#,##0 "€"',     total: false },
    { lbl: 'dont Emprunt bancaire',      formula: 'Paramètres!B14',             fmt: '#,##0 "€"',     total: false },
    { lbl: 'Durée / Taux',               value:   '',                           fmt: '',              total: false, note: true },
    { lbl: 'Mensualité',                 formula: 'Paramètres!B17',             fmt: '#,##0.00 "€/mois"', total: false },
    { lbl: 'Coût total du crédit',       formula: 'Paramètres!B18',             fmt: '#,##0 "€"',     total: false },
  ];

  let r = 19;
  planRows.forEach(({ lbl, formula, value, fmt, total, note }, i) => {
    ws.getRow(r).height = 18;
    if (note) {
      ws.mergeCells(r, 1, r, 5);
      const c = ws.getCell(r, 1);
      c.value = 'Taux d\'intérêt et durée modifiables dans l\'onglet Paramètres (cellules jaunes)';
      c.fill  = fill(C.yellow);
      c.font  = font({ size: 9, italic: true, color: C.textMid });
      c.alignment = aln('center', 'middle');
      r++; return;
    }
    const bg = total ? C.bluePale : (i % 2 === 0 ? C.white : C.gray1);
    ws.mergeCells(r, 1, r, 4);
    const cA = ws.getCell(r, 1);
    cA.value = lbl;
    cA.fill  = fill(bg);
    cA.font  = font({ bold: total, size: 10, color: total ? C.navy : C.text });
    cA.alignment = aln('left', 'middle');
    cA.border = bd(total ? 'medium' : 'thin', total ? C.blue : C.border);

    const cB = ws.getCell(r, 5);
    if (formula) cB.value = { formula };
    else cB.value = value || '';
    if (fmt) cB.numFmt = fmt;
    cB.fill = fill(bg);
    cB.font = font({ bold: total, size: 10, color: total ? C.navy : C.text });
    cB.alignment = aln('right', 'middle');
    cB.border = bd(total ? 'medium' : 'thin', total ? C.blue : C.border);
    r++;
  });

  // Note
  ws.getRow(r).height = 10; r++;
  ws.mergeCells(r, 1, r, 5); ws.getRow(r).height = 24;
  const noteW = ws.getCell(r, 1);
  noteW.value = '⚠️  Le budget travaux est intentionnellement laissé vide — à compléter après estimation. Tous les calculs s\'adaptent automatiquement.';
  noteW.fill  = fill(C.orangePale);
  noteW.font  = font({ size: 9, italic: true, color: C.orange });
  noteW.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  noteW.border = { left: { style: 'medium', color: { argb: C.orange } }, right: bd().right, top: bd().top, bottom: bd().bottom };
}

// ──────────────────────────────────────────────────────────────
// ONGLET 4 — PRÉVISIONNEL 20 ANS
// ──────────────────────────────────────────────────────────────
function buildPrevisionnel(wb) {
  const ws = wb.addWorksheet('Prévisionnel 20 ans', { tabColor: { argb: C.green } });

  const cols = [
    { header: 'Année',                   width: 8  },
    { header: 'Revenus\nlocatifs (€)',   width: 14 },
    { header: 'Charges\nexploit. (€)',   width: 14 },
    { header: 'EBE (€)',                 width: 13 },
    { header: 'Intérêts\nemprunt (€)',   width: 14 },
    { header: 'Amort.\ncomptable (€)',   width: 14 },
    { header: 'Résultat\nfiscal (€)',    width: 14 },
    { header: 'IS dû (€)',               width: 12 },
    { header: 'Résultat\nnet IS (€)',    width: 14 },
    { header: 'Annuité\nemprunt (€)',    width: 14 },
    { header: 'Cashflow\nnet (€)',       width: 13 },
    { header: 'Capital\nrestant dû (€)',  width: 15 },
    { header: 'Valeur\nestimée (€)',     width: 14 },
    { header: 'Patrimoine\nnet (€)',     width: 14 },
  ];
  cols.forEach((c, i) => { ws.getColumn(i + 1).width = c.width; });

  ws.mergeCells(1, 1, 1, cols.length); ws.getRow(1).height = 28;
  const t = ws.getCell(1, 1);
  t.value = 'PRÉVISIONNEL D\'EXPLOITATION — 20 ANS — SCI L&A (IS)';
  t.fill  = fill(C.navy);
  t.font  = font({ bold: true, size: 12, color: C.white });
  t.alignment = aln('center', 'middle');

  ws.mergeCells(2, 1, 2, cols.length); ws.getRow(2).height = 16;
  const noteRow = ws.getCell(2, 1);
  noteRow.value = 'SCI à l\'IS — Amortissement comptable & intérêts déduits du résultat imposable | Résultats indicatifs — à valider avec un expert-comptable';
  noteRow.fill  = fill(C.orangePale);
  noteRow.font  = font({ size: 9, italic: true, color: C.orange });
  noteRow.alignment = aln('center', 'middle');

  ws.getRow(3).height = 8;

  // En-têtes
  cols.forEach((c, i) => {
    const cell = ws.getCell(4, i + 1);
    cell.value = c.header;
    cell.fill  = fill(C.navyMid);
    cell.font  = font({ bold: true, size: 9, color: C.white });
    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    cell.border = bd('thin', C.navy);
  });
  ws.getRow(4).height = 34;

  const mFmt = '#,##0';
  const YEAR_START = 2026;

  for (let yr = 1; yr <= 20; yr++) {
    const row  = 4 + yr;
    const bg   = yr % 2 === 0 ? C.gray1 : C.white;
    const sM   = (yr - 1) * 12 + 1;
    const eM   = yr * 12;
    const prev = row - 1;

    ws.getRow(row).height = 18;

    const P = 'Paramètres!';  // shorthand

    // Col 1 — Année
    const c1 = ws.getCell(row, 1);
    c1.value = YEAR_START + yr - 1;
    c1.fill  = fill(C.gray2);
    c1.font  = font({ bold: true, size: 10, color: C.navy });
    c1.alignment = aln('center', 'middle');
    c1.border = bd();

    // Col 2 — Revenus locatifs (compounding)
    const c2 = ws.getCell(row, 2);
    c2.value  = yr === 1
      ? { formula: `${P}B25` }
      : { formula: `ROUND(B${prev}*(1+${P}B35),0)` };
    c2.numFmt = mFmt;
    c2.fill   = fill(C.greenPale);
    c2.font   = font({ size: 10, color: C.green });
    c2.alignment = aln('right', 'middle');
    c2.border = bd();

    // Col 3 — Charges exploitation
    const c3 = ws.getCell(row, 3);
    c3.value  = { formula: `${P}B32` };
    c3.numFmt = mFmt;
    c3.fill   = fill(bg);
    c3.font   = font({ size: 10 });
    c3.alignment = aln('right', 'middle');
    c3.border = bd();

    // Col 4 — EBE
    const c4 = ws.getCell(row, 4);
    c4.value  = { formula: `B${row}-C${row}` };
    c4.numFmt = mFmt;
    c4.fill   = fill(bg);
    c4.font   = font({ size: 10 });
    c4.alignment = aln('right', 'middle');
    c4.border = bd();

    // Col 5 — Intérêts emprunt (CUMIPMT)
    const c5 = ws.getCell(row, 5);
    c5.value  = { formula: `IFERROR(-CUMIPMT(${P}B15/12,${P}B16*12,${P}B14,${sM},${eM},0),0)` };
    c5.numFmt = mFmt;
    c5.fill   = fill(bg);
    c5.font   = font({ size: 10, color: C.textMid });
    c5.alignment = aln('right', 'middle');
    c5.border = bd();

    // Col 6 — Amortissement comptable
    const c6 = ws.getCell(row, 6);
    c6.value  = { formula: `${P}B42` };
    c6.numFmt = mFmt;
    c6.fill   = fill(bg);
    c6.font   = font({ size: 10, color: C.textMid });
    c6.alignment = aln('right', 'middle');
    c6.border = bd();

    // Col 7 — Résultat fiscal (EBE - Intérêts - Amort)
    const c7 = ws.getCell(row, 7);
    c7.value  = { formula: `D${row}-E${row}-F${row}` };
    c7.numFmt = mFmt;
    c7.fill   = fill(bg);
    c7.font   = font({ size: 10 });
    c7.alignment = aln('right', 'middle');
    c7.border = bd();

    // Col 8 — IS dû (15% / 25%)
    const c8 = ws.getCell(row, 8);
    c8.value  = { formula: `IF(G${row}>0,MIN(G${row},${P}B39)*${P}B38+MAX(0,G${row}-${P}B39)*${P}B40,0)` };
    c8.numFmt = mFmt;
    c8.fill   = fill(C.redPale);
    c8.font   = font({ size: 10, color: C.red });
    c8.alignment = aln('right', 'middle');
    c8.border = bd();

    // Col 9 — Résultat net après IS
    const c9 = ws.getCell(row, 9);
    c9.value  = { formula: `G${row}-H${row}` };
    c9.numFmt = mFmt;
    c9.fill   = fill(bg);
    c9.font   = font({ size: 10 });
    c9.alignment = aln('right', 'middle');
    c9.border = bd();

    // Col 10 — Annuité emprunt
    const c10 = ws.getCell(row, 10);
    c10.value  = { formula: `${P}B17*12` };
    c10.numFmt = mFmt;
    c10.fill   = fill(bg);
    c10.font   = font({ size: 10, color: C.textMid });
    c10.alignment = aln('right', 'middle');
    c10.border = bd();

    // Col 11 — Cashflow net (EBE - IS - Annuité)
    const c11 = ws.getCell(row, 11);
    c11.value  = { formula: `D${row}-H${row}-J${row}` };
    c11.numFmt = mFmt;
    c11.fill   = fill(C.bluePale);
    c11.font   = font({ bold: true, size: 10 });
    c11.alignment = aln('right', 'middle');
    c11.border = bd('thin', C.blue);

    // Col 12 — Capital restant dû
    const c12 = ws.getCell(row, 12);
    c12.value  = { formula: `IFERROR(${P}B14+CUMPRINC(${P}B15/12,${P}B16*12,${P}B14,1,${eM},0),0)` };
    c12.numFmt = mFmt;
    c12.fill   = fill(bg);
    c12.font   = font({ size: 10, color: C.textMid });
    c12.alignment = aln('right', 'middle');
    c12.border = bd();

    // Col 13 — Valeur estimée du bien (compounding PV)
    const c13 = ws.getCell(row, 13);
    c13.value  = yr === 1
      ? { formula: `ROUND((${P}B5+IFERROR(${P}B8,0))*(1+${P}B36),0)` }
      : { formula: `ROUND(M${prev}*(1+${P}B36),0)` };
    c13.numFmt = mFmt;
    c13.fill   = fill(C.greenPale);
    c13.font   = font({ size: 10, color: C.green });
    c13.alignment = aln('right', 'middle');
    c13.border = bd();

    // Col 14 — Patrimoine net (Valeur - Capital restant)
    const c14 = ws.getCell(row, 14);
    c14.value  = { formula: `M${row}-L${row}` };
    c14.numFmt = mFmt;
    c14.fill   = fill(C.greenPale);
    c14.font   = font({ bold: true, size: 10, color: C.green });
    c14.alignment = aln('right', 'middle');
    c14.border = bd('thin', C.green);
  }

  // Ligne cumul
  const totRow = 25;
  ws.getRow(totRow).height = 21;
  const sumCols = { 2:'B', 3:'C', 4:'D', 8:'H', 10:'J', 11:'K' };
  const lastCols = { 12:'L', 13:'M', 14:'N' };

  for (let c = 1; c <= cols.length; c++) {
    const cell = ws.getCell(totRow, c);
    cell.fill   = fill(C.navy);
    cell.font   = font({ bold: true, size: 10, color: C.white });
    cell.alignment = aln(c === 1 ? 'center' : 'right', 'middle');
    cell.border = bd('medium', C.navy);
    if (c === 1) cell.value = 'CUMUL 20 ANS';
  }
  Object.entries(sumCols).forEach(([c, l]) => {
    const cell = ws.getCell(totRow, parseInt(c));
    cell.value  = { formula: `SUM(${l}5:${l}24)` };
    cell.numFmt = mFmt;
  });
  Object.entries(lastCols).forEach(([c, l]) => {
    const cell = ws.getCell(totRow, parseInt(c));
    cell.value  = { formula: `${l}24` };
    cell.numFmt = mFmt;
  });

  // Légende
  ws.getRow(26).height = 10;
  ws.mergeCells(27, 1, 27, cols.length); ws.getRow(27).height = 20;
  const leg = ws.getCell(27, 1);
  leg.value = 'EBE = Revenus − Charges  |  Résultat fiscal = EBE − Intérêts − Amortissement comptable  |  IS = 15% ≤ 42 500 € puis 25%  |  Cashflow net = EBE − IS − Annuité';
  leg.fill  = fill(C.gray2);
  leg.font  = font({ size: 8, italic: true, color: C.textMid });
  leg.alignment = aln('center', 'middle');
}

// ──────────────────────────────────────────────────────────────
// ONGLET 5 — TABLEAU D'AMORTISSEMENT
// ──────────────────────────────────────────────────────────────
function buildAmortissement(wb) {
  const ws = wb.addWorksheet('Amortissement', { tabColor: { argb: C.textMid } });
  ws.getColumn(1).width = 8;
  ws.getColumn(2).width = 20;
  ws.getColumn(3).width = 20;
  ws.getColumn(4).width = 20;
  ws.getColumn(5).width = 22;
  ws.getColumn(6).width = 20;
  ws.getColumn(7).width = 14;

  ws.mergeCells('A1:G1'); ws.getRow(1).height = 28;
  const t = ws.getCell('A1');
  t.value = 'TABLEAU D\'AMORTISSEMENT — RÉSUMÉ ANNUEL SUR 20 ANS';
  t.fill  = fill(C.navy);
  t.font  = font({ bold: true, size: 12, color: C.white });
  t.alignment = aln('center', 'middle');

  ws.mergeCells('A2:G2'); ws.getRow(2).height = 16;
  const note = ws.getCell('A2');
  note.value = 'Calculé automatiquement depuis l\'onglet Paramètres — Fonctions financières CUMIPMT / CUMPRINC';
  note.fill  = fill(C.gray2);
  note.font  = font({ size: 9, italic: true, color: C.textMid });
  note.alignment = aln('center', 'middle');

  ws.getRow(3).height = 8;

  const headers = [
    'Année', 'Capital début (€)', 'Annuité annuelle (€)',
    'dont Intérêts (€)', 'dont Capital remb. (€)', 'Capital restant dû (€)', '% Remboursé',
  ];
  headers.forEach((h, i) => {
    const c = ws.getCell(4, i + 1);
    c.value = h;
    c.fill  = fill(C.navyMid);
    c.font  = font({ bold: true, size: 10, color: C.white });
    c.alignment = aln('center', 'middle');
    c.border = bd();
  });
  ws.getRow(4).height = 21;

  const mFmt = '#,##0 "€"';
  const P    = 'Paramètres!';

  for (let yr = 1; yr <= 20; yr++) {
    const row = 4 + yr;
    const bg  = yr % 2 === 0 ? C.gray1 : C.white;
    const sM  = (yr - 1) * 12 + 1;
    const eM  = yr * 12;
    ws.getRow(row).height = 18;

    // Col 1 — Année
    const cA = ws.getCell(row, 1);
    cA.value = yr;
    cA.fill  = fill(C.gray2);
    cA.font  = font({ bold: true, size: 10, color: C.navy });
    cA.alignment = aln('center', 'middle');
    cA.border = bd();

    // Col 2 — Capital début
    const cB = ws.getCell(row, 2);
    cB.value  = yr === 1 ? { formula: `${P}B14` } : { formula: `F${row - 1}` };
    cB.numFmt = mFmt;
    cB.fill   = fill(bg);
    cB.font   = font({ size: 10 });
    cB.alignment = aln('right', 'middle');
    cB.border = bd();

    // Col 3 — Annuité annuelle
    const cC = ws.getCell(row, 3);
    cC.value  = { formula: `${P}B17*12` };
    cC.numFmt = mFmt;
    cC.fill   = fill(bg);
    cC.font   = font({ size: 10 });
    cC.alignment = aln('right', 'middle');
    cC.border = bd();

    // Col 4 — Intérêts (rouge)
    const cD = ws.getCell(row, 4);
    cD.value  = { formula: `IFERROR(-CUMIPMT(${P}B15/12,${P}B16*12,${P}B14,${sM},${eM},0),0)` };
    cD.numFmt = mFmt;
    cD.fill   = fill(C.redPale);
    cD.font   = font({ size: 10, color: C.red });
    cD.alignment = aln('right', 'middle');
    cD.border = bd();

    // Col 5 — Capital remboursé (vert)
    const cE = ws.getCell(row, 5);
    cE.value  = { formula: `IFERROR(-CUMPRINC(${P}B15/12,${P}B16*12,${P}B14,${sM},${eM},0),0)` };
    cE.numFmt = mFmt;
    cE.fill   = fill(C.greenPale);
    cE.font   = font({ size: 10, color: C.green });
    cE.alignment = aln('right', 'middle');
    cE.border = bd();

    // Col 6 — Capital restant dû
    const cF = ws.getCell(row, 6);
    cF.value  = { formula: `B${row}-E${row}` };
    cF.numFmt = mFmt;
    cF.fill   = fill(bg);
    cF.font   = font({ bold: true, size: 10 });
    cF.alignment = aln('right', 'middle');
    cF.border = bd('thin', C.navy);

    // Col 7 — % remboursé
    const cG = ws.getCell(row, 7);
    cG.value  = { formula: `IFERROR(1-F${row}/${P}B14,0)` };
    cG.numFmt = '0.0%';
    cG.fill   = fill(C.bluePale);
    cG.font   = font({ size: 10, color: C.navy });
    cG.alignment = aln('center', 'middle');
    cG.border = bd();
  }

  // Total
  const totR = 25;
  ws.getRow(totR).height = 21;
  for (let c = 1; c <= 7; c++) {
    const cell = ws.getCell(totR, c);
    cell.fill   = fill(C.navy);
    cell.font   = font({ bold: true, color: C.white });
    cell.alignment = aln(c === 1 ? 'center' : 'right', 'middle');
    cell.border = bd('medium', C.navy);
    if (c === 1) cell.value = 'TOTAL';
  }
  ws.getCell(totR, 3).value  = { formula: 'SUM(C5:C24)' };
  ws.getCell(totR, 3).numFmt = mFmt;
  ws.getCell(totR, 4).value  = { formula: 'SUM(D5:D24)' };
  ws.getCell(totR, 4).numFmt = mFmt;
  ws.getCell(totR, 5).value  = { formula: 'SUM(E5:E24)' };
  ws.getCell(totR, 5).numFmt = mFmt;
}

// ──────────────────────────────────────────────────────────────
// ONGLET 6 — REVENTE & PLUS-VALUE
// ──────────────────────────────────────────────────────────────
function buildRevente(wb) {
  const ws = wb.addWorksheet('Revente & Plus-value', { tabColor: { argb: C.orange } });
  ws.getColumn(1).width = 50;
  ws.getColumn(2).width = 22;
  ws.getColumn(3).width = 18;

  ws.mergeCells('A1:C1'); ws.getRow(1).height = 28;
  const t = ws.getCell('A1');
  t.value = 'SIMULATION DE REVENTE — PLUS-VALUE & FISCALITÉ SCI À L\'IS';
  t.fill  = fill(C.navy);
  t.font  = font({ bold: true, size: 12, color: C.white });
  t.alignment = aln('center', 'middle');

  ws.mergeCells('A2:C2'); ws.getRow(2).height = 20;
  const note = ws.getCell('A2');
  note.value = 'SCI à l\'IS : plus-value imposée à l\'IS sur VNC, puis flat tax 30% (PFU) sur dividendes distribués aux associés';
  note.fill  = fill(C.orangePale);
  note.font  = font({ size: 9, italic: true, color: C.orange });
  note.alignment = aln('center', 'middle');

  ws.getRow(3).height = 8;

  // Cellule horizon : B5 dans cet onglet = horizon de revente
  // ATTENTION : toutes les formules ci-dessous utilisent B5 pour l'horizon
  // et Paramètres!Bxx pour les paramètres globaux

  function rRow(row, label, valOrFormula, numFmt, editable = false, total = false, bg = null) {
    ws.getRow(row).height = 20;
    const isFormula = typeof valOrFormula === 'string' &&
      (valOrFormula.includes('!') || valOrFormula.includes('(') ||
       valOrFormula.includes('+') || valOrFormula.includes('-') ||
       valOrFormula.includes('*'));

    const rowBg = bg || (total ? C.bluePale : editable ? C.yellow : (row % 2 === 0 ? C.gray1 : C.white));

    const cA = ws.getCell(row, 1);
    cA.value = label;
    cA.fill  = fill(rowBg);
    cA.font  = font({ bold: total, size: 10, color: total ? C.navy : C.text });
    cA.alignment = aln('left', 'middle');
    cA.border = bd(total ? 'medium' : 'thin', total ? C.blue : C.border);

    const cB = ws.getCell(row, 2);
    if (isFormula)            cB.value = { formula: valOrFormula };
    else if (valOrFormula !== null) cB.value = valOrFormula;
    if (numFmt) cB.numFmt = numFmt;
    cB.fill = fill(rowBg);
    cB.font = font({ bold: total || editable, size: 10, color: total ? C.navy : C.text });
    cB.alignment = aln('right', 'middle');
    cB.border = editable
      ? { top: bd().top, bottom: bd().bottom, left: { style: 'medium', color: { argb: C.yellowBd } }, right: { style: 'medium', color: { argb: C.yellowBd } } }
      : bd(total ? 'medium' : 'thin', total ? C.blue : C.border);

    const cC = ws.getCell(row, 3);
    cC.fill  = fill(rowBg);
    cC.border = bd(total ? 'medium' : 'thin', total ? C.blue : C.border);
  }

  const P = 'Paramètres!';

  // Horizon (B5 = cellule horizon)
  sectionHeader(ws, 4, '  HORIZON DE REVENTE', 3);
  rRow(5, 'Horizon de revente (années depuis acquisition)', 10, '0 "ans"', true);
  ws.getCell(5, 3).value = 'ans — modifiable';
  ws.getCell(5, 3).font  = font({ size: 9, italic: true, color: C.textLight });

  ws.getRow(6).height = 8;

  // Prix de revente
  sectionHeader(ws, 7, '  PRIX DE REVENTE ESTIMÉ', 3);
  rRow(8,  'Valeur d\'acquisition (achat + travaux)',
       `${P}B5+IFERROR(${P}B8,0)`, '#,##0 "€"');
  rRow(9,  'Taux de revalorisation annuelle (Paramètres!B36)',
       `${P}B36`, '0.0%');
  rRow(10, 'Prix de revente estimé',
       `ROUND((${P}B5+IFERROR(${P}B8,0))*(1+${P}B36)^B5,0)`, '#,##0 "€"', false, true);

  ws.getRow(11).height = 8;

  // Plus-value comptable
  sectionHeader(ws, 12, '  PLUS-VALUE COMPTABLE (SCI IS)', 3);
  rRow(13, 'Amortissements cumulés sur la période',
       `ROUND(${P}B42*B5,0)`, '#,##0 "€"');
  rRow(14, 'Valeur nette comptable (VNC = Acquisition − Amortissements)',
       `${P}B5+IFERROR(${P}B8,0)-B13`, '#,##0 "€"');
  rRow(15, 'Plus-value comptable (Prix revente − VNC)',
       `B10-B14`, '#,##0 "€"', false, true);

  ws.getRow(16).height = 8;

  // IS sur plus-value
  sectionHeader(ws, 17, '  IMPÔT SUR LES SOCIÉTÉS (IS) SUR LA PLUS-VALUE', 3);
  rRow(18, 'IS sur plus-value  [15% ≤ 42 500 € — 25% au-delà]',
       `IF(B15>0,MIN(B15,${P}B39)*${P}B38+MAX(0,B15-${P}B39)*${P}B40,0)`,
       '#,##0 "€"', false, false, C.redPale);
  rRow(19, 'Capital net SCI après IS',
       `B10-B18`, '#,##0 "€"', false, true);

  ws.getRow(20).height = 8;

  // Distribution
  sectionHeader(ws, 21, '  DISTRIBUTION AUX ASSOCIÉS', 3);
  rRow(22, 'Capital restant dû à l\'horizon (emprunt)',
       `IFERROR(${P}B14+CUMPRINC(${P}B15/12,${P}B16*12,${P}B14,1,B5*12,0),0)`,
       '#,##0 "€"');
  rRow(23, 'Disponible après remboursement de l\'emprunt',
       `B19-B22`, '#,##0 "€"', false, true);
  rRow(24, 'Flat tax PFU (30%) sur dividendes distribués',
       `ROUND(MAX(0,B23-${P}B13)*${P}B41,0)`, '#,##0 "€"', false, false, C.redPale);
  rRow(25, 'Gain net total (2 associés)',
       `B23-B24`, '#,##0 "€"', false, true, C.greenPale);
  rRow(26, 'Gain net par associé (50 % — Lucas Lamquet)',
       `ROUND((B23-B24)/2,0)`, '#,##0 "€"', false, true, C.greenPale);
  rRow(27, 'Gain net par associé (50 % — Adrien Fleuriot)',
       `ROUND((B23-B24)/2,0)`, '#,##0 "€"', false, true, C.greenPale);

  ws.getRow(28).height = 8;

  // Indicateur de performance
  sectionHeader(ws, 29, '  INDICATEUR DE PERFORMANCE', 3);
  rRow(30, 'Loyers perçus cumulés sur la période (estimé)',
       `ROUND(${P}B25*B5,0)`, '#,##0 "€"');
  rRow(31, 'Gain net total (loyers + revente)',
       `B23-B24+B30`, '#,##0 "€"', false, true, C.greenPale);

  ws.getRow(32).height = 8;

  // Avertissement
  ws.mergeCells('A33:C33'); ws.getRow(33).height = 40;
  const w = ws.getCell('A33');
  w.value = '⚠️  Simulation indicative. L\'IS réel dépend des amortissements effectivement constatés, des déficits reportables et de la situation fiscale de la SCI. La flat tax s\'applique sur la plus-value de cession de parts ou sur dividendes. Consultez un expert-comptable avant toute décision.';
  w.fill  = fill(C.orangePale);
  w.font  = font({ size: 9, italic: true, color: C.orange });
  w.alignment = { horizontal: 'left', vertical: 'middle', wrapText: true };
  w.border = { left: { style: 'medium', color: { argb: C.orange } }, right: bd().right, top: bd().top, bottom: bd().bottom };
}

// ──────────────────────────────────────────────────────────────
// MAIN
// ──────────────────────────────────────────────────────────────
async function generate() {
  const wb = new ExcelJS.Workbook();
  wb.creator       = 'SCI L&A';
  wb.lastModifiedBy = 'SCI L&A';
  wb.created       = new Date();
  wb.modified      = new Date();

  buildPresentation(wb);
  buildParametres(wb);
  buildSynthese(wb);
  buildPrevisionnel(wb);
  buildAmortissement(wb);
  buildRevente(wb);

  // Ouvrir sur Paramètres (index 1)
  wb.views = [{ activeTab: 1 }];

  fs.mkdirSync(path.dirname(OUTPUT), { recursive: true });
  await wb.xlsx.writeFile(OUTPUT);

  console.log('\n✅  Business Plan généré avec succès');
  console.log(`📄  ${OUTPUT}\n`);
  console.log('Onglets créés :');
  console.log('  1. Présentation       — Page de garde SCI L&A');
  console.log('  2. Paramètres         — 🟡 Cellules jaunes à compléter');
  console.log('  3. Synthèse           — KPIs & plan de financement');
  console.log('  4. Prévisionnel 20 ans — Exploitation, IS, cashflow année par année');
  console.log('  5. Amortissement      — Résumé annuel 20 ans (CUMIPMT / CUMPRINC)');
  console.log('  6. Revente & Plus-value — Fiscalité IS + flat tax PFU\n');
}

generate().catch(err => {
  console.error('❌  Erreur :', err.message);
  process.exit(1);
});
