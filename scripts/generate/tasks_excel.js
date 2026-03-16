const ExcelJS = require('exceljs');
const path = require('path');

async function generateTasksExcel() {
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SCI L&A';
  wb.created = new Date();

  // ── Feuille cachée pour les listes de valeurs ─────────────
  const wsLists = wb.addWorksheet('_Listes', { state: 'veryHidden' });
  const lists = {
    assigne:   ['Lucas', 'Adrien', 'Lucas & Adrien'],
    categorie: ['Juridique', 'Finance', 'Prospection', 'Réglementation', 'Travaux', 'Location', 'Comptabilité', 'Autre'],
    priorite:  ['Urgent', 'Important', 'Normal', 'Faible'],
    statut:    ['A faire', 'En cours', 'Fait', 'Annule', 'Bloque'],
  };
  // Écrire les listes dans la feuille cachée (1 colonne par liste)
  const listKeys = Object.keys(lists);
  listKeys.forEach((key, col) => {
    lists[key].forEach((val, row) => {
      wsLists.getCell(row + 1, col + 1).value = val;
    });
  });
  // Nommer les plages
  const namedRanges = {
    assigne:   `_Listes!$A$1:$A$${lists.assigne.length}`,
    categorie: `_Listes!$B$1:$B$${lists.categorie.length}`,
    priorite:  `_Listes!$C$1:$C$${lists.priorite.length}`,
    statut:    `_Listes!$D$1:$D$${lists.statut.length}`,
  };

  // ── Feuille principale ────────────────────────────────────
  const ws = wb.addWorksheet('Tâches', {
    views: [{ state: 'frozen', ySplit: 1 }],
  });

  ws.columns = [
    { key: 'num',      width: 5  },
    { key: 'tache',    width: 45 },
    { key: 'assigne',  width: 18 },
    { key: 'categorie',width: 18 },
    { key: 'priorite', width: 14 },
    { key: 'statut',   width: 14 },
    { key: 'echeance', width: 14 },
    { key: 'notes',    width: 38 },
  ];

  // ── En-tête ───────────────────────────────────────────────
  const headerRow = ws.addRow(['#', 'Tâche', 'Assigné à', 'Catégorie', 'Priorité', 'Statut', 'Échéance', 'Notes']);
  headerRow.height = 28;
  headerRow.eachCell(cell => {
    cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1a1a2e' } };
    cell.font      = { color: { argb: 'FFFFFFFF' }, bold: true, size: 11 };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border    = { bottom: { style: 'medium', color: { argb: 'FF4a4e8f' } } };
  });

  // ── Données d'exemple ─────────────────────────────────────
  const exemples = [
    [1, 'Créer la SCI chez le notaire',             'Lucas',          'Juridique',      'Urgent',    'En cours', '', 'Contacter Me. Dupont'],
    [2, 'Ouvrir le compte bancaire SCI',             'Adrien',         'Finance',        'Urgent',    'A faire',  '', 'CIC ou Boursorama Pro'],
    [3, 'Vérifier PLU Longwy (division 2 lots)',     'Lucas',          'Réglementation', 'Important', 'A faire',  '', 'geoportail-urbanisme.gouv.fr'],
    [4, 'Visiter bien rue des Acacias, Longwy',      'Lucas & Adrien', 'Prospection',    'Important', 'A faire',  '', 'Checklist division à emporter'],
    [5, 'Simuler crédit 200k€ (3 banques minimum)',  'Adrien',         'Finance',        'Normal',    'A faire',  '', ''],
  ];

  const TOTAL_ROWS = 55;

  // Couleurs par statut
  const statutColors = {
    'A faire':  { bg: 'FFFFFFFF', font: '22222' },
    'En cours': { bg: 'FFFFF3CD', font: '856404' },
    'Fait':     { bg: 'FFD4EDDA', font: '155724' },
    'Annule':   { bg: 'FFFFE0E0', font: 'A00000' },
    'Bloque':   { bg: 'FFFFE5CC', font: '7A3B00' },
  };

  const addRow = (rowData, rowIndex) => {
    const row = ws.addRow(rowData);
    row.height = 22;
    const isEven = rowIndex % 2 === 0;
    const defaultBg = isEven ? 'FFF0F4FF' : 'FFFFFFFF';
    const statutVal = rowData[5];
    const statutStyle = statutColors[statutVal];

    row.eachCell({ includeEmpty: true }, (cell, colNum) => {
      const bg = (colNum === 6 && statutStyle) ? statutStyle.bg : defaultBg;
      cell.fill      = { type: 'pattern', pattern: 'solid', fgColor: { argb: bg } };
      cell.alignment = { vertical: 'middle', wrapText: true };
      cell.border    = { bottom: { style: 'thin', color: { argb: 'FFdde3f0' } } };
      if (colNum === 6 && statutStyle) {
        cell.font = { color: { argb: 'FF' + statutStyle.font }, bold: true };
      }
    });
    row.getCell(1).alignment = { vertical: 'middle', horizontal: 'center' };
  };

  exemples.forEach((data, i) => addRow(data, i));

  for (let i = exemples.length; i < TOTAL_ROWS; i++) {
    addRow([i + 1, '', '', '', '', '', '', ''], i);
  }

  // ── Dropdowns (validation par liste nommée) ───────────────
  // ExcelJS : on passe la formule de plage directement en string
  for (let row = 2; row <= TOTAL_ROWS + 1; row++) {
    // Assigné à (col C = 3)
    ws.getCell(row, 3).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [namedRanges.assigne],
      showErrorMessage: true,
      errorTitle: 'Valeur invalide',
      error: 'Choisir dans la liste',
    };
    // Catégorie (col D = 4)
    ws.getCell(row, 4).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [namedRanges.categorie],
      showErrorMessage: true,
      errorTitle: 'Valeur invalide',
      error: 'Choisir dans la liste',
    };
    // Priorité (col E = 5)
    ws.getCell(row, 5).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [namedRanges.priorite],
      showErrorMessage: true,
      errorTitle: 'Valeur invalide',
      error: 'Choisir dans la liste',
    };
    // Statut (col F = 6)
    ws.getCell(row, 6).dataValidation = {
      type: 'list',
      allowBlank: true,
      formulae: [namedRanges.statut],
      showErrorMessage: true,
      errorTitle: 'Valeur invalide',
      error: 'Choisir dans la liste',
    };
  }

  // ── Enregistrement ────────────────────────────────────────
  const outPath = path.join(__dirname, '../../exports/Taches_SCI_LA.xlsx');
  await wb.xlsx.writeFile(outPath);
  console.log(`✅ Excel créé : ${outPath}`);
}

generateTasksExcel().catch(console.error);
