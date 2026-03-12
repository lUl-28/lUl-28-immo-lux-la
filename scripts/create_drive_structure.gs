function createSCIStructure() {
  const root = DriveApp.createFolder("📁 SCI L&A — Investissement Immo");

  // 00 — Admin & Juridique
  const f00 = root.createFolder("00 — Admin & Juridique");
  f00.createFolder("Statuts SCI (versions + signé final)");
  f00.createFolder("Procurations - mandats");
  f00.createFolder("Assurances (PNO, RC, multirisque)");
  f00.createFolder("Compte bancaire SCI (RIB, conventions)");

  // 01 — Financement
  const f01 = root.createFolder("01 — Financement");
  f01.createFolder("Apports personnels (justificatifs)");
  f01.createFolder("Dossier banque (revenus, avis imposition)");
  f01.createFolder("Simulations crédit (comparateur)");
  f01.createFolder("Offres de prêt (reçues - acceptée)");

  // 02 — Recherche & Sourcing
  const f02 = root.createFolder("02 — Recherche & Sourcing");
  f02.createFolder("Critères de recherche");
  const biensAnalyses = f02.createFolder("Biens analysés");
  const exemple = biensAnalyses.createFolder("[Adresse bien] — Maison Longwy 54400");
  exemple.createFolder("Annonce (capture - PDF)");
  exemple.createFolder("Photos");
  exemple.createFolder("Fiche analyse (prix, surface, rentabilité)");
  exemple.createFolder("Compte-rendu visite");
  f02.createFolder("Tableau de suivi");

  // 03 — Acquisition
  const f03 = root.createFolder("03 — Acquisition");
  f03.createFolder("Compromis de vente");
  f03.createFolder("Diagnostics (DPE, amiante, plomb)");
  f03.createFolder("Acte authentique");
  f03.createFolder("Correspondance notaire");

  // 04 — Travaux & Rénovation
  const f04 = root.createFolder("04 — Travaux & Rénovation");
  f04.createFolder("Devis (par entreprise)");
  f04.createFolder("Devis retenu + bon de commande");
  f04.createFolder("Factures travaux");
  f04.createFolder("Photos avant - pendant - après");
  f04.createFolder("Réception chantier");

  // 05 — Location
  const f05 = root.createFolder("05 — Location");
  f05.createFolder("Bail(s) locataire(s)");
  f05.createFolder("États des lieux (entrée - sortie)");
  f05.createFolder("Quittances loyers");
  f05.createFolder("Assurances locataires (attestations)");

  // 06 — Comptabilité & Fiscalité
  const f06 = root.createFolder("06 — Comptabilité & Fiscalité");
  f06.createFolder("Relevés bancaires SCI (par année)");
  f06.createFolder("Déclarations fiscales (2072)");
  f06.createFolder("Liasse comptable");
  f06.createFolder("Tableau recettes-dépenses");

  // 07 — Tableau de bord
  const f07 = root.createFolder("07 — Tableau de bord");
  f07.createFolder("(Colle ici le lien vers ton Google Sheet partagé)");

  Logger.log("✅ Structure créée ! Dossier racine : " + root.getUrl());
  SpreadsheetApp.getUi && Browser.msgBox("✅ Structure SCI L&A créée dans ton Drive !");
}
