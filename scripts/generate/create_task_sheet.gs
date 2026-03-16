// ============================================================
// GOOGLE SHEET — Suivi des tâches SCI L&A
// Coller dans Google Apps Script (script.google.com)
// Exécuter : createTaskSheet()
// ============================================================

function createTaskSheet() {
  const ss = SpreadsheetApp.create("✅ Tâches SCI L&A — Lucas & Adrien");
  const sheet = ss.getActiveSheet();
  sheet.setName("Tâches");

  // ── En-têtes ──────────────────────────────────────────────
  const headers = ["#", "Tâche", "Assigné à", "Catégorie", "Priorité", "Statut", "Échéance", "Notes"];
  sheet.getRange(1, 1, 1, headers.length).setValues([headers]);

  // Style en-tête
  const headerRange = sheet.getRange(1, 1, 1, headers.length);
  headerRange
    .setBackground("#1a1a2e")
    .setFontColor("#ffffff")
    .setFontWeight("bold")
    .setFontSize(11)
    .setHorizontalAlignment("center");
  sheet.setFrozenRows(1);

  // ── Lignes d'exemple (à supprimer) ───────────────────────
  const exemples = [
    [1, "Créer la SCI chez le notaire", "Lucas", "Juridique", "🔴 Urgent", "⏳ En cours", "", "Contacter Me. Dupont"],
    [2, "Ouvrir le compte bancaire SCI", "Adrien", "Finance", "🔴 Urgent", "📋 À faire", "", "CIC ou Boursorama Pro"],
    [3, "Vérifier PLU Longwy (division 2 lots)", "Lucas", "Réglementation", "🟠 Important", "📋 À faire", "", "geoportail-urbanisme.gouv.fr"],
    [4, "Visiter bien rue des Acacias, Longwy", "Lucas & Adrien", "Prospection", "🟠 Important", "📋 À faire", "", "Checklist division à emporter"],
    [5, "Simuler crédit 200k€ (3 banques min)", "Adrien", "Finance", "🟡 Normal", "📋 À faire", "", ""],
  ];
  sheet.getRange(2, 1, exemples.length, headers.length).setValues(exemples);

  // Alternance de couleurs sur les lignes
  for (let i = 2; i <= 51; i++) {
    const bg = i % 2 === 0 ? "#f0f4ff" : "#ffffff";
    sheet.getRange(i, 1, 1, headers.length).setBackground(bg);
  }

  // ── Dropdowns ─────────────────────────────────────────────

  // Assigné à (col 3)
  const assigneRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Lucas", "Adrien", "Lucas & Adrien", "—"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 3, 50).setDataValidation(assigneRule);

  // Catégorie (col 4)
  const catRule = SpreadsheetApp.newDataValidation()
    .requireValueInList([
      "Juridique", "Finance", "Prospection", "Réglementation",
      "Travaux", "Location", "Comptabilité", "Autre"
    ], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 4, 50).setDataValidation(catRule);

  // Priorité (col 5)
  const prioRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["🔴 Urgent", "🟠 Important", "🟡 Normal", "⚪ Faible"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 5, 50).setDataValidation(prioRule);

  // Statut (col 6)
  const statutRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(["📋 À faire", "⏳ En cours", "✅ Fait", "❌ Annulé", "🔄 Bloqué"], true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, 6, 50).setDataValidation(statutRule);

  // ── Mise en forme conditionnelle ──────────────────────────

  // Vert si "✅ Fait"
  const faitRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("✅ Fait")
    .setBackground("#d4edda")
    .setFontColor("#155724")
    .setRanges([sheet.getRange("A2:H51")])
    .build();

  // Rouge si "🔴 Urgent"
  const urgentRule = SpreadsheetApp.newConditionalFormatRule()
    .whenTextContains("🔴 Urgent")
    .setBackground("#fff3cd")
    .setRanges([sheet.getRange("E2:E51")])
    .build();

  sheet.setConditionalFormatRules([faitRule, urgentRule]);

  // ── Largeurs des colonnes ─────────────────────────────────
  sheet.setColumnWidth(1, 40);   // #
  sheet.setColumnWidth(2, 320);  // Tâche
  sheet.setColumnWidth(3, 130);  // Assigné à
  sheet.setColumnWidth(4, 130);  // Catégorie
  sheet.setColumnWidth(5, 120);  // Priorité
  sheet.setColumnWidth(6, 120);  // Statut
  sheet.setColumnWidth(7, 100);  // Échéance
  sheet.setColumnWidth(8, 280);  // Notes

  // ── Onglet "Vue Lucas" ────────────────────────────────────
  const sheetLucas = ss.insertSheet("Vue Lucas");
  sheetLucas.getRange("A1").setValue("⚡ Filtre automatique — utilise la feuille principale et filtre sur 'Lucas'");
  sheetLucas.getRange("A1").setFontStyle("italic").setFontColor("#888888");

  // ── Onglet "Vue Adrien" ───────────────────────────────────
  const sheetAdrien = ss.insertSheet("Vue Adrien");
  sheetAdrien.getRange("A1").setValue("⚡ Filtre automatique — utilise la feuille principale et filtre sur 'Adrien'");
  sheetAdrien.getRange("A1").setFontStyle("italic").setFontColor("#888888");

  // ── Partage & URL ─────────────────────────────────────────
  // Décommenter pour partager automatiquement avec Adrien :
  // ss.addEditor("adrien@email.com");

  ss.setActiveSheet(sheet);

  const url = ss.getUrl();
  Logger.log("✅ Google Sheet créé : " + url);
  Browser.msgBox("✅ Sheet créé !\n\nURL :\n" + url + "\n\nPense à le partager avec Adrien.");
}
