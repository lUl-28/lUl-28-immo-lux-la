// ============================================================
// ANALYSE PLU — Projet Immo Lux L&A
// Interroge le Géoportail de l'Urbanisme pour chaque commune
// Ring 1 + Ring 2, télécharge les règlements PLU et en extrait
// les informations clés pour l'investissement immobilier.
//
// npm run plu          → traite toutes les communes
// npm run plu -- --test → traite 3 communes seulement
// ============================================================

const axios   = require('axios');
const fs      = require('fs');
const path    = require('path');
const AdmZip  = require('adm-zip');
const pdfParse = require('pdf-parse');

const GPU_BASE  = 'https://www.geoportail-urbanisme.gouv.fr/api';
const OUT_DIR   = path.join(__dirname, '../data/plu');
const IS_TEST   = process.argv.includes('--test');
const PAUSE_MS  = 2000;

// ── Communes Ring 1 + Ring 2 ──────────────────────────────────
const COMMUNES = [
  // Ring 1 — 0 à 15 km — Meurthe-et-Moselle (54)
  { nom: 'Longwy',              cp: '54400', dept: '54', ring: 1, insee: '54323' },
  { nom: 'Mont-Saint-Martin',   cp: '54350', dept: '54', ring: 1, insee: '54382' },
  { nom: 'Hussigny-Godbrange',  cp: '54590', dept: '54', ring: 1, insee: '54270' },
  { nom: 'Réhon',               cp: '54430', dept: '54', ring: 1, insee: '54451' },
  { nom: 'Herserange',          cp: '54440', dept: '54', ring: 1, insee: '54261' },
  // Ring 1 — 0 à 15 km — Moselle (57)
  { nom: 'Audun-le-Tiche',      cp: '57390', dept: '57', ring: 1, insee: '57038' },
  { nom: 'Thionville',          cp: '57100', dept: '57', ring: 1, insee: '57672' },
  { nom: 'Yutz',                cp: '57970', dept: '57', ring: 1, insee: '57757' },
  { nom: 'Cattenom',            cp: '57570', dept: '57', ring: 1, insee: '57124' },
  { nom: 'Sierck-les-Bains',   cp: '57480', dept: '57', ring: 1, insee: '57650' },
  // Ring 2 — 15 à 30 km — Meurthe-et-Moselle (54)
  { nom: 'Villerupt',           cp: '54190', dept: '54', ring: 2, insee: '54580' },
  { nom: 'Trieux',              cp: '54750', dept: '54', ring: 2, insee: '54533' },
  { nom: 'Jœuf',               cp: '54240', dept: '54', ring: 2, insee: '54280' },
  { nom: 'Homécourt',          cp: '54310', dept: '54', ring: 2, insee: '54263' },
  { nom: 'Briey',               cp: '54150', dept: '54', ring: 2, insee: '54099' },
  { nom: 'Piennes',             cp: '54490', dept: '54', ring: 2, insee: '54425' },
  // Ring 2 — 15 à 30 km — Moselle (57)
  { nom: 'Fameck',              cp: '57290', dept: '57', ring: 2, insee: '57206' },
  { nom: 'Hayange',             cp: '57700', dept: '57', ring: 2, insee: '57306' },
  { nom: 'Amnéville',          cp: '57360', dept: '57', ring: 2, insee: '57019' },
  { nom: 'Uckange',             cp: '57270', dept: '57', ring: 2, insee: '57683' },
  { nom: 'Clouange',            cp: '57185', dept: '57', ring: 2, insee: '57143' },
  { nom: 'Guénange',           cp: '57310', dept: '57', ring: 2, insee: '57269' },
];

// ── Mots-clés à extraire du règlement ─────────────────────────
const MOTS_CLES = {
  stationnement: {
    label: 'Stationnement',
    patterns: [/stationnement/i, /parking/i, /place[s]? de stationnement/i, /garage/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*12/i,
  },
  division: {
    label: 'Division / logements multiples',
    patterns: [/division/i, /plusieurs logements/i, /logements multiples/i, /nombre de logements/i, /habitat collect/i, /sous.division/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*1\b/i,
  },
  hauteur: {
    label: 'Hauteur maximale',
    patterns: [/hauteur\s+(?:max|limit|plafond)/i, /H\s*(?:max|≤|=)/i, /rez.de.chauss/i, /R\+[0-9]/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*10\b/i,
  },
  emprise_sol: {
    label: 'Emprise au sol',
    patterns: [/emprise au sol/i, /CES\b/i, /coefficient d.emprise/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*9\b/i,
  },
  surface_min: {
    label: 'Surface minimale de terrain',
    patterns: [/superficie minimale/i, /surface minimale/i, /parcelle\s+(?:minimale|minimum)/i, /terrain\s+(?:d.une\s+)?surface/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*5\b/i,
  },
  interdictions: {
    label: 'Interdictions & usages autorisés',
    patterns: [/sont interdits/i, /ne sont pas admis/i, /interdits|interdit[e]?\b/i, /autoris/i],
    article: /article\s+[A-Z0-9]+[.\-–]?\s*1\b/i,
  },
};

// ── Helpers ───────────────────────────────────────────────────
const pause = (ms) => new Promise(r => setTimeout(r, ms));

function extrait(texte, patterns, contextChars = 600) {
  const extraits = [];
  const vus = new Set();

  for (const pat of patterns) {
    let match;
    const re = new RegExp(pat.source, pat.flags.includes('g') ? pat.flags : pat.flags + 'g');
    while ((match = re.exec(texte)) !== null) {
      const start = Math.max(0, match.index - 200);
      const end   = Math.min(texte.length, match.index + contextChars);
      const key   = `${start}-${end}`;
      if (!vus.has(key)) {
        vus.add(key);
        extraits.push(texte.slice(start, end).replace(/\s+/g, ' ').trim());
      }
      if (extraits.length >= 3) break;
    }
    if (extraits.length >= 3) break;
  }
  return extraits;
}

function detecterZones(texte) {
  const zones = new Set();
  const re = /\b(U[A-Z]{1,2}|[0-9]+\s*AU|AU[0-9]*|N[A-Z]?|A[A-Z]?)\b/g;
  let m;
  while ((m = re.exec(texte)) !== null) {
    zones.add(m[1].replace(/\s+/g, ''));
  }
  return [...zones].sort();
}

function analyserStationnement(texte) {
  // Cherche le nombre de places requis
  const patterns = [
    /([0-9]+(?:[,.][0-9]+)?)\s*place[s]?\s*(?:de\s+stationnement|de\s+parking)?\s*(?:par|pour|minimum|au\s+moins)?.*?logement/i,
    /logement.*?([0-9]+(?:[,.][0-9]+)?)\s*place[s]?\s*(?:de\s+stationnement|de\s+parking)/i,
    /(?:au\s+moins|minimum|obligatoire[s]?)[^.]{0,30}([0-9]+(?:[,.][0-9]+)?)\s*place[s]?/i,
  ];
  for (const p of patterns) {
    const m = texte.match(p);
    if (m) return `${m[1]} place(s) de stationnement détectée(s)`;
  }
  return null;
}

function analyserHauteur(texte) {
  const patterns = [
    /hauteur\s+(?:maximale?|limite|plafond)[^.]{0,60}(\d+[,.]?\d*)\s*m(?:ètres?)?/i,
    /H\s*(?:max|≤)\s*[=:]?\s*(\d+[,.]?\d*)\s*m/i,
    /(R\+[0-9]+(?:\s*\+\s*[A-Z]+)?)/,
  ];
  for (const p of patterns) {
    const m = texte.match(p);
    if (m) return m[1];
  }
  return null;
}

function analyserEmpriseSol(texte) {
  const m = texte.match(/(?:emprise\s+au\s+sol|CES)[^.]{0,40}([0-9]+)\s*%/i);
  return m ? `${m[1]}%` : null;
}

// ── GPU API ───────────────────────────────────────────────────
async function getDocumentGPU(insee) {
  const r = await axios.get(`${GPU_BASE}/document`, {
    params: { grid: insee },
    timeout: 15000,
  });
  // Filtre sur statut actif (pas deleted)
  const docs = r.data.filter(d =>
    d.status === 'document.production' &&
    ['PLU', 'PLUi', 'POS', 'CC', 'PLUm'].includes(d.type)
  );
  return docs[0] || null;
}

async function getFilesList(docId) {
  const r = await axios.get(`${GPU_BASE}/document/${docId}/files`, { timeout: 15000 });
  // L'API retourne des objets { name, title, path } — on extrait les noms
  return (r.data || []).map(f => (typeof f === 'string' ? f : f.name)).filter(Boolean);
}

async function downloadPdfDirect(docId, filename) {
  // Tentative 1 : endpoint fichier direct
  const url = `${GPU_BASE}/document/${docId}/file?name=${encodeURIComponent(filename)}`;
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 60000,
    maxContentLength: 50 * 1024 * 1024,
  });
  if (r.headers['content-type']?.includes('pdf')) return Buffer.from(r.data);
  return null;
}

async function downloadViaZip(docId, reglementFilename) {
  // Télécharge le ZIP via le redirect GPU et extrait le règlement
  const r = await axios.get(`${GPU_BASE}/document/${docId}/download`, {
    responseType: 'arraybuffer',
    timeout: 180000,
    maxContentLength: 250 * 1024 * 1024,
    maxRedirects: 5,
    headers: {
      'Referer': 'https://www.geoportail-urbanisme.gouv.fr/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const zip = new AdmZip(Buffer.from(r.data));
  const entry = zip.getEntries().find(e =>
    e.name === reglementFilename ||
    e.name.toLowerCase().includes('reglement') && e.name.endsWith('.pdf')
  );
  if (!entry) return null;
  return entry.getData();
}

async function getPdfBuffer(docId, files) {
  // Cherche le fichier règlement
  const reglementFile = files.find(f =>
    f.toLowerCase().includes('reglement') &&
    !f.toLowerCase().includes('graphique') &&
    f.endsWith('.pdf')
  ) || files.find(f => f.endsWith('.pdf'));

  if (!reglementFile) return { buffer: null, filename: null };

  // Tentative 1 — téléchargement direct
  try {
    const buf = await downloadPdfDirect(docId, reglementFile);
    if (buf) return { buffer: buf, filename: reglementFile };
  } catch (_) {}

  // Tentative 2 — via ZIP
  try {
    const buf = await downloadViaZip(docId, reglementFile);
    if (buf) return { buffer: buf, filename: reglementFile };
  } catch (_) {}

  return { buffer: null, filename: reglementFile };
}

// ── Analyse PDF ───────────────────────────────────────────────
async function analyserPDF(pdfBuffer) {
  let data;
  try {
    data = await pdfParse(pdfBuffer);
  } catch (e) {
    return { succes: false, erreur: e.message, pages: 0, texte: '' };
  }

  const texte = data.text || '';
  if (texte.trim().length < 100) {
    return { succes: false, erreur: 'PDF scanné — extraction texte impossible', pages: data.numpages, texte: '' };
  }

  const analyse = {
    succes: true,
    pages: data.numpages,
    zones: detecterZones(texte),
    stationnement_detecte: analyserStationnement(texte),
    hauteur_detectee: analyserHauteur(texte),
    emprise_sol_detectee: analyserEmpriseSol(texte),
    extraits: {},
  };

  for (const [cle, config] of Object.entries(MOTS_CLES)) {
    analyse.extraits[cle] = extrait(texte, config.patterns);
  }

  return analyse;
}

// ── Traitement d'une commune ──────────────────────────────────
async function traiterCommune(commune) {
  const dir = path.join(OUT_DIR, commune.insee);
  fs.mkdirSync(dir, { recursive: true });

  const ficheFile = path.join(dir, 'fiche.json');

  // Déjà traité ?
  if (fs.existsSync(ficheFile)) {
    const existing = JSON.parse(fs.readFileSync(ficheFile, 'utf-8'));
    if (existing.plu?.traite) {
      console.log(`  ↩️  ${commune.nom} — déjà traité (cache)`);
      return existing;
    }
  }

  const fiche = {
    commune: commune.nom,
    insee: commune.insee,
    cp: commune.cp,
    dept: commune.dept,
    ring: commune.ring,
    url_gpu: `https://www.geoportail-urbanisme.gouv.fr/#${commune.insee}`,
    plu: { traite: false, found: false },
    analyse: null,
    date_analyse: new Date().toISOString(),
  };

  // 1. Chercher document PLU
  let doc;
  try {
    doc = await getDocumentGPU(commune.insee);
  } catch (e) {
    fiche.plu.erreur = `API GPU inaccessible : ${e.message}`;
    fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
    return fiche;
  }

  if (!doc) {
    fiche.plu.traite = true;
    fiche.plu.found  = false;
    fiche.plu.note   = 'Aucun PLU/PLUi trouvé sur GPU — peut être sous PLUi intercommunal ou RNU';
    console.log(`  ❌  ${commune.nom} — aucun document GPU`);
    fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
    return fiche;
  }

  fiche.plu = {
    traite:       true,
    found:        true,
    type:         doc.type,
    id:           doc.id,
    nom:          doc.name || doc.originalName,
    statut:       doc.legalStatus,
    date_pub:     doc.publicationDate,
    date_maj:     doc.updateDate,
  };

  console.log(`  📄  ${commune.nom} — ${doc.type} trouvé [${doc.legalStatus}]`);

  // 2. Lister fichiers
  let files = [];
  try {
    files = await getFilesList(doc.id);
    fiche.plu.fichiers = files;
  } catch (e) {
    fiche.plu.erreur_fichiers = e.message;
  }

  await pause(500);

  // 3. Télécharger règlement PDF
  if (files.length > 0) {
    console.log(`  📥  ${commune.nom} — téléchargement règlement...`);
    const { buffer, filename } = await getPdfBuffer(doc.id, files);

    if (buffer) {
      const pdfPath = path.join(dir, filename || 'reglement.pdf');
      fs.writeFileSync(pdfPath, buffer);
      fiche.plu.pdf_local = pdfPath;
      console.log(`  ✅  ${commune.nom} — PDF téléchargé (${Math.round(buffer.length / 1024)} Ko)`);

      // 4. Analyser PDF
      console.log(`  🔍  ${commune.nom} — analyse du règlement...`);
      fiche.analyse = await analyserPDF(buffer);

      if (fiche.analyse.succes) {
        console.log(`  📊  ${commune.nom} — ${fiche.analyse.pages} pages | ${fiche.analyse.zones.length} zones | parking: ${fiche.analyse.stationnement_detecte || 'N/D'}`);
      } else {
        console.log(`  ⚠️   ${commune.nom} — ${fiche.analyse.erreur}`);
      }
    } else {
      fiche.plu.note_pdf = 'Téléchargement PDF échoué — consulter GPU manuellement';
      console.log(`  ⚠️   ${commune.nom} — PDF non téléchargeable`);
    }
  }

  fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
  return fiche;
}

// ── Rapport Markdown ──────────────────────────────────────────
function genererMarkdown(fiches) {
  const rings = { 1: fiches.filter(f => f.ring === 1), 2: fiches.filter(f => f.ring === 2) };
  let md = `# Rapport PLU — SCI L&A\n> Généré le ${new Date().toLocaleDateString('fr-FR')} — Zone frontalière luxembourgeoise\n\n`;
  md += `> **Critères SCI L&A :** Maison ou immeuble ≥ 100 m² — Division en 2 lots T2 — Parking obligatoire\n\n---\n\n`;

  for (const [ring, communes] of Object.entries(rings)) {
    md += `## Ring ${ring} — ${ring == 1 ? '0 à 15 km (frontalières)' : '15 à 30 km (élargie)'}\n\n`;

    for (const f of communes) {
      const pluFound = f.plu?.found;
      const a = f.analyse;

      md += `### ${f.commune} (${f.cp}) — ${pluFound ? `✅ ${f.plu.type}` : '❌ Non disponible GPU'}\n\n`;
      md += `🔗 [Voir sur GPU](${f.url_gpu})\n\n`;

      if (!pluFound) {
        md += `> ${f.plu?.note || 'Aucun document PLU/PLUi trouvé.'}\n\n`;
      } else {
        md += `| Champ | Valeur |\n|---|---|\n`;
        md += `| Type document | ${f.plu.type} |\n`;
        md += `| Statut légal | ${f.plu.statut || 'N/D'} |\n`;
        md += `| Date publication | ${f.plu.date_pub || 'N/D'} |\n`;
        md += `| Zones identifiées | ${a?.zones?.join(', ') || 'N/D'} |\n`;
        md += `| Parking requis | ${a?.stationnement_detecte || 'À vérifier dans le règlement'} |\n`;
        md += `| Hauteur max | ${a?.hauteur_detectee || 'À vérifier'} |\n`;
        md += `| Emprise au sol | ${a?.emprise_sol_detectee || 'À vérifier'} |\n`;
        md += `| PDF règlement | ${f.plu.pdf_local ? '✅ Téléchargé' : (f.plu.note_pdf || 'Non disponible')} |\n\n`;

        if (a?.succes) {
          for (const [cle, config] of Object.entries(MOTS_CLES)) {
            const extraits = a.extraits?.[cle] || [];
            if (extraits.length > 0) {
              md += `**${config.label} :**\n\n`;
              extraits.forEach(e => {
                md += `> ${e.replace(/\n/g, ' ').slice(0, 500)}\n\n`;
              });
            }
          }
        } else if (a) {
          md += `> ⚠️ ${a.erreur}\n\n`;
        }
      }
      md += `---\n\n`;
    }
  }
  return md;
}

// ── Rapport Excel ─────────────────────────────────────────────
async function genererExcel(fiches) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SCI L&A';
  const ws = wb.addWorksheet('Synthèse PLU');

  const headers = [
    'Ring', 'Commune', 'CP', 'Dept', 'INSEE',
    'PLU trouvé', 'Type', 'Statut', 'Date PLU',
    'Zones', 'Parking requis', 'Hauteur max', 'Emprise sol',
    'PDF dispo', 'Lien GPU',
  ];

  const C = { navy: '1E3A5F', white: 'FFFFFF', green: 'DCFCE7', red: 'FEE2E2', gray: 'F1F5F9', blue: 'DBEAFE' };

  ws.getRow(1).height = 25;
  headers.forEach((h, i) => {
    const c = ws.getCell(1, i + 1);
    c.value = h;
    c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: C.navy } };
    c.font  = { bold: true, color: { argb: C.white }, name: 'Calibri', size: 10 };
    c.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
    c.border = { top: { style: 'thin' }, left: { style: 'thin' }, bottom: { style: 'thin' }, right: { style: 'thin' } };
  });

  const colWidths = [6, 22, 8, 6, 8, 12, 8, 14, 16, 30, 30, 14, 14, 12, 40];
  colWidths.forEach((w, i) => { ws.getColumn(i + 1).width = w; });

  fiches.forEach((f, idx) => {
    const row = idx + 2;
    const a   = f.analyse;
    const plu = f.plu;
    ws.getRow(row).height = 18;

    const vals = [
      `Ring ${f.ring}`,
      f.commune,
      f.cp,
      f.dept,
      f.insee,
      plu?.found ? 'OUI' : 'NON',
      plu?.type || '—',
      plu?.statut || '—',
      plu?.date_pub || '—',
      a?.zones?.join(', ') || '—',
      a?.stationnement_detecte || '—',
      a?.hauteur_detectee || '—',
      a?.emprise_sol_detectee || '—',
      plu?.pdf_local ? 'OUI' : 'NON',
      f.url_gpu,
    ];

    const bg = plu?.found ? (a?.succes ? C.green : C.blue) : C.red;

    vals.forEach((v, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = (i === 14) ? { text: 'Voir GPU', hyperlink: v } : v;
      c.fill  = { type: 'pattern', pattern: 'solid', fgColor: { argb: i < 5 ? C.gray : bg } };
      c.font  = { name: 'Calibri', size: 10, color: i === 14 ? { argb: '2563EB' } : { argb: '0F172A' } };
      c.alignment = { vertical: 'middle', horizontal: i === 14 ? 'center' : 'left', wrapText: true };
      c.border = { top: { style: 'thin', color: { argb: 'CBD5E1' } }, left: { style: 'thin', color: { argb: 'CBD5E1' } }, bottom: { style: 'thin', color: { argb: 'CBD5E1' } }, right: { style: 'thin', color: { argb: 'CBD5E1' } } };
    });
  });

  const xlsxPath = path.join(OUT_DIR, 'rapport_plu.xlsx');
  await wb.xlsx.writeFile(xlsxPath);
  return xlsxPath;
}

// ── MAIN ──────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const communes = IS_TEST ? COMMUNES.slice(0, 3) : COMMUNES;

  console.log('\n🏘️  Analyse PLU — SCI L&A');
  console.log(`📍  ${communes.length} communes | ${IS_TEST ? 'MODE TEST' : 'TOUTES LES COMMUNES'}`);
  console.log(`📂  Sortie : ${OUT_DIR}\n`);

  const fiches = [];
  let found = 0, pdfOk = 0;

  for (let i = 0; i < communes.length; i++) {
    const c = communes[i];
    console.log(`\n[${i + 1}/${communes.length}] ${c.nom} (${c.insee}) — Ring ${c.ring}`);

    const fiche = await traiterCommune(c);
    fiches.push(fiche);

    if (fiche.plu?.found) found++;
    if (fiche.plu?.pdf_local) pdfOk++;

    if (i < communes.length - 1) await pause(PAUSE_MS);
  }

  // Rapport Markdown
  const mdPath  = path.join(OUT_DIR, 'rapport_plu.md');
  fs.writeFileSync(mdPath, genererMarkdown(fiches));

  // Rapport Excel
  let xlsxPath;
  try {
    xlsxPath = await genererExcel(fiches);
  } catch (e) {
    console.error('⚠️  Excel non généré :', e.message);
  }

  console.log('\n─────────────────────────────────────────');
  console.log(`✅  Terminé — ${communes.length} communes traitées`);
  console.log(`📄  PLU trouvés sur GPU : ${found}/${communes.length}`);
  console.log(`📥  PDFs téléchargés    : ${pdfOk}/${found}`);
  console.log(`📋  Rapport MD  : ${mdPath}`);
  if (xlsxPath) console.log(`📊  Rapport XLSX: ${xlsxPath}`);
  console.log('');
}

main().catch(err => {
  console.error('❌  Erreur fatale :', err.message);
  process.exit(1);
});
