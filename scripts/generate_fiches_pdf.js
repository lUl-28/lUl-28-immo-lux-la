// ============================================================
// GÉNÉRATION DES FICHES PLU — SCI L&A
// Lit les fiche.json de data/plu/ et génère un PDF multi-pages
// ============================================================
'use strict';

const fs   = require('fs');
const path = require('path');
const PDFDocument = require('pdfkit');

// ── Couleurs & styles ──────────────────────────────────────
const C = {
  marine:    '#1a3a5c',
  bleu:      '#2563eb',
  bleuClair: '#dbeafe',
  vert:      '#16a34a',
  vertClair: '#dcfce7',
  orange:    '#ea580c',
  orangeClair: '#ffedd5',
  rouge:     '#dc2626',
  rougeClair: '#fee2e2',
  gris:      '#6b7280',
  grisClair: '#f3f4f6',
  blanc:     '#ffffff',
  noir:      '#111827',
  bordure:   '#e5e7eb',
};

// ── Chemins ────────────────────────────────────────────────
const DATA_DIR   = path.join(__dirname, '..', 'data', 'plu');
const OUTPUT_PDF = path.join(DATA_DIR, 'Fiches_PLU_SCI_LA.pdf');

// ── Labels lisibles ────────────────────────────────────────
const LABELS = {
  stationnement: 'Stationnement',
  division:      'Division parcellaire',
  hauteur:       'Hauteur des constructions',
  emprise_sol:   'Emprise au sol',
  surface_min:   'Surface minimale',
  interdictions: 'Interdictions',
};

// ── Utilitaires ────────────────────────────────────────────
function truncate(text, maxLen = 600) {
  if (!text) return '';
  const t = text.replace(/\s+/g, ' ').trim();
  return t.length > maxLen ? t.slice(0, maxLen) + '…' : t;
}

function loadFiches() {
  const dirs = fs.readdirSync(DATA_DIR).filter(d => /^\d{5}$/.test(d));
  const fiches = [];
  for (const insee of dirs) {
    const fichierJson = path.join(DATA_DIR, insee, 'fiche.json');
    if (!fs.existsSync(fichierJson)) continue;
    try {
      fiches.push(JSON.parse(fs.readFileSync(fichierJson, 'utf8')));
    } catch (e) {
      console.warn(`⚠️  Erreur lecture ${fichierJson}: ${e.message}`);
    }
  }
  // Tri : Ring 1 d'abord, puis alphabétique
  fiches.sort((a, b) => {
    if (a.ring !== b.ring) return a.ring - b.ring;
    return a.commune.localeCompare(b.commune, 'fr');
  });
  return fiches;
}

// ── Dessin ─────────────────────────────────────────────────
function drawRect(doc, x, y, w, h, fillColor, strokeColor) {
  doc.save()
    .rect(x, y, w, h)
    .fillAndStroke(fillColor, strokeColor || fillColor)
    .restore();
}

function drawRoundRect(doc, x, y, w, h, r, fillColor) {
  doc.save()
    .roundedRect(x, y, w, h, r)
    .fill(fillColor)
    .restore();
}

// ── PAGE DE GARDE ──────────────────────────────────────────
function pageCouverture(doc, fiches) {
  const W = doc.page.width;
  const H = doc.page.height;

  // Fond marine
  drawRect(doc, 0, 0, W, H, C.marine);

  // Bandeau déco haut
  drawRect(doc, 0, 0, W, 8, C.bleu);

  // Bloc blanc central
  const bx = 60, by = 140, bw = W - 120, bh = 380;
  doc.save().roundedRect(bx, by, bw, bh, 12).fill(C.blanc).restore();

  // Logo / titre
  doc.font('Helvetica-Bold').fontSize(11).fillColor(C.bleu)
    .text('SCI L&A', bx + 36, by + 36);

  doc.font('Helvetica-Bold').fontSize(28).fillColor(C.marine)
    .text('Fiches PLU', bx + 36, by + 64, { width: bw - 72 });

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.bleu)
    .text('Analyse réglementaire — Rayon 60 km Frontière Luxembourg', bx + 36, by + 106, { width: bw - 72 });

  // Ligne déco
  drawRect(doc, bx + 36, by + 150, 60, 4, C.bleu);

  // Stats
  const withAnalyse = fiches.filter(f => f.analyse?.succes).length;
  const ring1 = fiches.filter(f => f.ring === 1).length;
  const ring2 = fiches.filter(f => f.ring === 2).length;

  const stats = [
    { label: 'Communes analysées', val: `${fiches.length}` },
    { label: 'Avec règlement PDF', val: `${withAnalyse}` },
    { label: 'Ring 1 (0-15 km)', val: `${ring1}` },
    { label: 'Ring 2 (15-30 km)', val: `${ring2}` },
  ];

  const colW = (bw - 72) / 4;
  stats.forEach((s, i) => {
    const sx = bx + 36 + i * colW;
    doc.font('Helvetica-Bold').fontSize(26).fillColor(C.bleu)
      .text(s.val, sx, by + 180, { width: colW, align: 'center' });
    doc.font('Helvetica').fontSize(9).fillColor(C.gris)
      .text(s.label, sx, by + 214, { width: colW, align: 'center' });
  });

  // Infos projet
  doc.font('Helvetica').fontSize(10).fillColor(C.gris)
    .text('Projet d\'investissement immobilier — Division en 2 lots · Financement bancaire · SCI à l\'IS', bx + 36, by + 268, { width: bw - 72, align: 'center' });

  doc.font('Helvetica').fontSize(10).fillColor(C.gris)
    .text(`Document généré le ${new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}`, bx + 36, by + 292, { width: bw - 72, align: 'center' });

  // Liste des communes — partie basse
  doc.font('Helvetica-Bold').fontSize(10).fillColor(C.blanc)
    .text('Communes couvertes', 60, by + bh + 36, { width: W - 120 });

  const col1 = fiches.filter(f => f.ring === 1);
  const col2 = fiches.filter(f => f.ring === 2);

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.bleuClair)
    .text('Ring 1 — Zone frontalière (0-15 km)', 60, by + bh + 58);
  doc.font('Helvetica').fontSize(9).fillColor(C.blanc)
    .text(col1.map(f => f.commune).join(' · '), 60, by + bh + 74, { width: W - 120 });

  doc.font('Helvetica-Bold').fontSize(9).fillColor(C.bleuClair)
    .text('Ring 2 — Zone élargie (15-30 km)', 60, by + bh + 104);
  doc.font('Helvetica').fontSize(9).fillColor(C.blanc)
    .text(col2.map(f => f.commune).join(' · '), 60, by + bh + 120, { width: W - 120 });

  // Bas de page
  doc.font('Helvetica').fontSize(8).fillColor(C.gris)
    .text('Source : Géoportail de l\'Urbanisme (GPU) — geoportail-urbanisme.gouv.fr · Données publiques', 0, H - 28, { width: W, align: 'center' });
}

// ── FICHE COMMUNE ──────────────────────────────────────────
function ficheCommune(doc, fiche) {
  const W    = doc.page.width;
  const ML   = 48, MR = 48;
  const CW   = W - ML - MR;
  let y      = 48;

  // ── En-tête ──
  drawRect(doc, 0, 0, W, 110, C.marine);
  drawRect(doc, 0, 0, W, 5, C.bleu);

  // Badge ring
  const ringColor = fiche.ring === 1 ? C.vert : C.bleu;
  const ringLabel = fiche.ring === 1 ? 'RING 1 · 0-15 km' : 'RING 2 · 15-30 km';
  drawRoundRect(doc, ML, 18, 110, 20, 4, ringColor);
  doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanc)
    .text(ringLabel, ML, 22, { width: 110, align: 'center' });

  // Nom commune
  doc.font('Helvetica-Bold').fontSize(22).fillColor(C.blanc)
    .text(fiche.commune, ML, 44, { width: CW * 0.65 });

  // Code postal / département / INSEE
  doc.font('Helvetica').fontSize(10).fillColor(C.bleuClair)
    .text(`${fiche.cp} · Dép. ${fiche.dept} · INSEE ${fiche.insee}`, ML, 74);

  // Statut PLU (coin droit)
  const plu = fiche.plu;
  const analyseOk = fiche.analyse?.succes;
  const statutColor  = analyseOk ? C.vert : C.orange;
  const statutLabel  = analyseOk ? '✓ Règlement analysé' : '⚠ PDF non disponible';
  const typeLabel    = plu?.type || 'Inconnu';

  drawRoundRect(doc, W - MR - 160, 20, 160, 40, 6, 'rgba(255,255,255,0.12)');
  doc.font('Helvetica-Bold').fontSize(14).fillColor(C.blanc)
    .text(typeLabel, W - MR - 156, 24, { width: 156, align: 'center' });
  doc.font('Helvetica').fontSize(9).fillColor(statutColor === C.vert ? '#86efac' : '#fcd34d')
    .text(statutLabel, W - MR - 156, 44, { width: 156, align: 'center' });

  // GPU link
  doc.font('Helvetica').fontSize(8).fillColor(C.bleuClair)
    .text(fiche.url_gpu, W - MR - 156, 60, { width: 156, align: 'center' });

  y = 126;

  // ── Bloc infos PLU (ligne horizontale) ──────────────────
  const infoItems = [
    { label: 'Type', value: plu?.type || '—' },
    { label: 'Statut', value: plu?.statut === 'APPROVED' ? 'Approuvé' : (plu?.statut || '—') },
    { label: 'Publié le', value: plu?.date_pub ? plu.date_pub.split(' ')[0] : '—' },
    { label: 'Mis à jour', value: plu?.date_maj ? plu.date_maj.split(' ')[0] : '—' },
    { label: 'Fichiers', value: plu?.fichiers ? `${plu.fichiers.length} docs` : '—' },
    { label: 'Pages règlt', value: fiche.analyse?.pages ? `${fiche.analyse.pages} p.` : '—' },
  ];

  drawRect(doc, ML, y, CW, 52, C.grisClair, C.bordure);
  const cellW = CW / infoItems.length;
  infoItems.forEach((item, i) => {
    const cx = ML + i * cellW;
    if (i > 0) {
      doc.save().moveTo(cx, y + 8).lineTo(cx, y + 44).strokeColor(C.bordure).lineWidth(1).stroke().restore();
    }
    doc.font('Helvetica').fontSize(8).fillColor(C.gris)
      .text(item.label, cx + 4, y + 10, { width: cellW - 8, align: 'center' });
    doc.font('Helvetica-Bold').fontSize(10).fillColor(C.marine)
      .text(item.value, cx + 4, y + 24, { width: cellW - 8, align: 'center' });
  });

  y += 66;

  // ── Zones ────────────────────────────────────────────────
  if (fiche.analyse?.zones?.length > 0) {
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.marine)
      .text('Zones PLU', ML, y);
    y += 18;

    let zx = ML;
    const zy = y;
    for (const zone of fiche.analyse.zones) {
      const tw = doc.widthOfString(zone, { font: 'Helvetica-Bold', size: 9 }) + 16;
      const isU = zone.startsWith('U');
      const isAU = zone.startsWith('AU') || zone.startsWith('1AU') || zone.startsWith('2AU');
      const bgColor = isU ? C.bleuClair : (isAU ? C.vertClair : C.grisClair);
      const txColor = isU ? C.bleu : (isAU ? C.vert : C.gris);

      if (zx + tw > W - MR) { y += 26; zx = ML; }

      drawRoundRect(doc, zx, y, tw, 20, 4, bgColor);
      doc.font('Helvetica-Bold').fontSize(9).fillColor(txColor)
        .text(zone, zx + 1, y + 5, { width: tw - 2, align: 'center' });
      zx += tw + 6;
    }
    y += 32;
  }

  // ── Synthèse extraits ────────────────────────────────────
  if (!analyseOk) {
    // Pas de règlement analysé
    drawRoundRect(doc, ML, y, CW, 80, 8, C.orangeClair);
    doc.font('Helvetica-Bold').fontSize(11).fillColor(C.orange)
      .text('Règlement non disponible via GPU', ML + 20, y + 14, { width: CW - 40 });
    doc.font('Helvetica').fontSize(9).fillColor(C.orange)
      .text(
        'Le téléchargement automatique du règlement écrit a échoué. Ce PLU est probablement un PLUi intercommunal ' +
        'ou ses fichiers ne sont pas encore référencés dans la base GPU.\n\n' +
        `Consultez directement : ${fiche.url_gpu}`,
        ML + 20, y + 34, { width: CW - 40 }
      );
    y += 94;
  } else {
    // Sections d'extraits
    const sections = Object.entries(LABELS);
    for (const [key, label] of sections) {
      const extraits = fiche.analyse?.extraits?.[key] || [];
      if (extraits.length === 0) continue;

      // Vérifier espace page
      if (y > doc.page.height - 80) {
        doc.addPage();
        y = 48;
        // Mini en-tête de suite
        drawRect(doc, 0, 0, W, 32, C.marine);
        doc.font('Helvetica-Bold').fontSize(10).fillColor(C.blanc)
          .text(`${fiche.commune} (suite)`, ML, 10, { width: CW });
        y = 48;
      }

      // Titre section
      drawRect(doc, ML, y, CW, 26, C.marine);
      doc.font('Helvetica-Bold').fontSize(10).fillColor(C.blanc)
        .text(label, ML + 10, y + 7, { width: CW - 20 });
      y += 30;

      for (let i = 0; i < Math.min(extraits.length, 2); i++) {
        const txt = truncate(extraits[i], 500);
        const blockH = estimateTextHeight(doc, txt, CW - 32, 8.5) + 20;

        if (y + blockH > doc.page.height - 48) {
          doc.addPage();
          y = 48;
          drawRect(doc, 0, 0, W, 32, C.marine);
          doc.font('Helvetica-Bold').fontSize(10).fillColor(C.blanc)
            .text(`${fiche.commune} — ${label} (suite)`, ML, 10, { width: CW });
          y = 48;
        }

        const bgColor = i % 2 === 0 ? C.blanc : C.grisClair;
        const bh = blockH;
        drawRect(doc, ML, y, CW, bh, bgColor, C.bordure);

        // Numéro
        drawRoundRect(doc, ML + 8, y + 8, 18, 18, 9, C.bleuClair);
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.bleu)
          .text(`${i + 1}`, ML + 8, y + 11, { width: 18, align: 'center' });

        // Texte
        doc.font('Helvetica').fontSize(8.5).fillColor(C.noir)
          .text(txt, ML + 32, y + 10, { width: CW - 48, lineGap: 2 });

        y += bh + 4;
      }

      if (extraits.length > 2) {
        doc.font('Helvetica').fontSize(8).fillColor(C.gris)
          .text(`+ ${extraits.length - 2} extrait(s) supplémentaire(s) dans le règlement PDF`, ML, y);
        y += 16;
      }

      y += 8;
    }
  }

  // ── Note recommandation ──────────────────────────────────
  if (y > doc.page.height - 100) {
    doc.addPage();
    y = 48;
  }

  const recColor = analyseOk ? C.vertClair : C.orangeClair;
  const recBorderColor = analyseOk ? C.vert : C.orange;
  const recH = 56;

  doc.save().rect(ML, y, CW, recH).fill(recColor).restore();
  doc.save().moveTo(ML, y).lineTo(ML, y + recH).strokeColor(recBorderColor).lineWidth(4).stroke().restore();

  doc.font('Helvetica-Bold').fontSize(9).fillColor(analyseOk ? C.vert : C.orange)
    .text('Note investisseur', ML + 14, y + 8);
  doc.font('Helvetica').fontSize(8.5).fillColor(C.noir)
    .text(
      analyseOk
        ? `Règlement disponible et analysé (${fiche.analyse.pages} pages). ` +
          `Zones identifiées : ${fiche.analyse.zones?.slice(0, 6).join(', ')}${fiche.analyse.zones?.length > 6 ? '…' : ''}. ` +
          `Vérifier les articles sur la division parcellaire et le stationnement avant toute offre.`
        : `Pas de règlement téléchargeable via GPU. Consulter la mairie ou le service urbanisme intercommunal. ` +
          `Vérifier si la commune est couverte par un PLUi avant toute offre.`,
      ML + 14, y + 22, { width: CW - 24 }
    );

  y += recH + 16;

  // Pied de page
  doc.font('Helvetica').fontSize(7).fillColor(C.gris)
    .text(`Source : Géoportail de l'Urbanisme · ${fiche.url_gpu} · Analyse automatisée — à vérifier en mairie`, 0, doc.page.height - 20, { width: W, align: 'center' });
}

// ── Estimation hauteur texte ─────────────────────────────
function estimateTextHeight(doc, text, width, fontSize) {
  // Approximation : ~1.4 * fontSize par ligne, ~70 chars/ligne
  const charsPerLine = Math.max(1, Math.floor(width / (fontSize * 0.55)));
  const lines = Math.ceil(text.length / charsPerLine);
  return lines * fontSize * 1.5 + 10;
}

// ── PAGE SYNTHÈSE ─────────────────────────────────────────
function pageSynthese(doc, fiches) {
  const W  = doc.page.width;
  const ML = 48, MR = 48;
  const CW = W - ML - MR;

  drawRect(doc, 0, 0, W, 72, C.marine);
  drawRect(doc, 0, 0, W, 5, C.bleu);

  doc.font('Helvetica-Bold').fontSize(18).fillColor(C.blanc)
    .text('Tableau de synthèse — Toutes communes', ML, 20, { width: CW });
  doc.font('Helvetica').fontSize(10).fillColor(C.bleuClair)
    .text('Vue d\'ensemble des données PLU collectées', ML, 48, { width: CW });

  let y = 90;

  // En-têtes tableau
  const cols = [
    { label: 'Commune', w: 100 },
    { label: 'Ring', w: 44 },
    { label: 'CP', w: 50 },
    { label: 'Type PLU', w: 60 },
    { label: 'Zones', w: 140 },
    { label: 'Règlt', w: 44 },
    { label: 'Pages', w: 44 },
    { label: 'Stationnement', w: 100 },
    { label: 'Hauteur (m)', w: 80 },
  ];
  const totalW = cols.reduce((s, c) => s + c.w, 0);
  const scale  = CW / totalW;

  // Header row
  drawRect(doc, ML, y, CW, 22, C.marine);
  let cx = ML;
  for (const col of cols) {
    const cw = col.w * scale;
    doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanc)
      .text(col.label, cx + 4, y + 6, { width: cw - 8 });
    cx += cw;
  }
  y += 22;

  fiches.forEach((f, idx) => {
    const rowH = 22;
    if (y + rowH > doc.page.height - 36) {
      doc.addPage();
      y = 48;
      drawRect(doc, ML, y, CW, 22, C.marine);
      cx = ML;
      for (const col of cols) {
        const cw = col.w * scale;
        doc.font('Helvetica-Bold').fontSize(8).fillColor(C.blanc)
          .text(col.label, cx + 4, y + 6, { width: cw - 8 });
        cx += cw;
      }
      y += 22;
    }

    const bg = idx % 2 === 0 ? C.blanc : C.grisClair;
    drawRect(doc, ML, y, CW, rowH, bg, C.bordure);

    const analyse = f.analyse;
    const vals = [
      f.commune,
      `Ring ${f.ring}`,
      f.cp,
      f.plu?.type || '—',
      analyse?.zones?.slice(0, 5).join(' ') || '—',
      analyse?.succes ? '✓' : '✗',
      analyse?.pages ? `${analyse.pages}` : '—',
      analyse?.stationnement_detecte ? truncate(analyse.stationnement_detecte, 60) : '—',
      analyse?.hauteur_detectee && analyse.hauteur_detectee !== '0' ? analyse.hauteur_detectee : '—',
    ];

    cx = ML;
    vals.forEach((val, i) => {
      const cw = cols[i].w * scale;
      const color = i === 5 ? (val === '✓' ? C.vert : C.rouge) : C.noir;
      const font  = i === 5 ? 'Helvetica-Bold' : 'Helvetica';
      doc.font(font).fontSize(8).fillColor(color)
        .text(val, cx + 4, y + 6, { width: cw - 8, lineBreak: false });
      cx += cw;
    });

    y += rowH;
  });
}

// ── MAIN ──────────────────────────────────────────────────
async function main() {
  console.log('📄 Chargement des fiches JSON…');
  const fiches = loadFiches();
  console.log(`   → ${fiches.length} communes trouvées`);

  const doc = new PDFDocument({
    size: 'A4',
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    info: {
      Title:   'Fiches PLU — SCI L&A',
      Author:  'Projet Immo Lux L&A',
      Subject: 'Analyse réglementaire PLU — Rayon 60 km frontière Luxembourg',
      Creator: 'generate_fiches_pdf.js',
    },
  });

  const stream = fs.createWriteStream(OUTPUT_PDF);
  doc.pipe(stream);

  // Page de garde
  console.log('   → Page de garde…');
  pageCouverture(doc, fiches);

  // Page synthèse
  console.log('   → Page synthèse…');
  doc.addPage();
  pageSynthese(doc, fiches);

  // Fiche par commune
  for (const fiche of fiches) {
    console.log(`   → Fiche : ${fiche.commune} (${fiche.insee})`);
    doc.addPage();
    ficheCommuneSafe(doc, fiche);
  }

  doc.end();

  await new Promise((resolve, reject) => {
    stream.on('finish', resolve);
    stream.on('error', reject);
  });

  const size = (fs.statSync(OUTPUT_PDF).size / 1024).toFixed(0);
  console.log(`\n✅ PDF généré : ${OUTPUT_PDF}`);
  console.log(`   Taille : ${size} Ko`);
  console.log(`   Pages  : ${1 + 1 + fiches.length} (couverture + synthèse + ${fiches.length} fiches)`);
}

function ficheCommuneSafe(doc, fiche) {
  try {
    ficheCommune(doc, fiche);
  } catch (err) {
    console.warn(`⚠️  Erreur fiche ${fiche.commune}: ${err.message}`);
    const W = doc.page.width;
    doc.font('Helvetica-Bold').fontSize(16).fillColor(C.rouge)
      .text(`${fiche.commune} — Erreur de génération`, 48, 80, { width: W - 96 });
    doc.font('Helvetica').fontSize(10).fillColor(C.gris)
      .text(err.message, 48, 110, { width: W - 96 });
  }
}

main().catch(err => {
  console.error('❌ Erreur fatale :', err.message);
  process.exit(1);
});
