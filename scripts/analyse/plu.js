// ============================================================
// ANALYSE PLU v2 — Projet Immo Lux L&A
// Interroge le Géoportail de l'Urbanisme pour chaque commune.
// Fallback EPCI automatique quand aucun PLU communal trouvé.
//
// npm run plu          → toutes les communes (force refresh)
// npm run plu:test     → 3 communes seulement
// npm run plu -- --force → re-télécharge même si déjà fait
// ============================================================
'use strict';

const axios    = require('axios');
const fs       = require('fs');
const path     = require('path');
const AdmZip   = require('adm-zip');
const pdfParse = require('pdf-parse');

const GPU_BASE = 'https://www.geoportail-urbanisme.gouv.fr/api';
const GEO_BASE = 'https://geo.api.gouv.fr';
const OUT_DIR  = path.join(__dirname, '../../data/plu');
const IS_TEST  = process.argv.includes('--test');
const IS_FORCE = process.argv.includes('--force');
const PAUSE_MS = 2500;
const TYPES_PLU = ['PLU', 'PLUi', 'PLUm', 'POS', 'CC'];

// ── Communes cibles ──────────────────────────────────────────
const COMMUNES = [
  // Ring 1 — 0-15 km — Meurthe-et-Moselle (54)
  { nom: 'Longwy',             cp: '54400', dept: '54', ring: 1, insee: '54323' },
  { nom: 'Mont-Saint-Martin',  cp: '54350', dept: '54', ring: 1, insee: '54382' },
  { nom: 'Hussigny-Godbrange', cp: '54590', dept: '54', ring: 1, insee: '54270' },
  { nom: 'Réhon',              cp: '54430', dept: '54', ring: 1, insee: '54451' },
  { nom: 'Herserange',         cp: '54440', dept: '54', ring: 1, insee: '54261' },
  // Ring 1 — 0-15 km — Moselle (57)
  { nom: 'Audun-le-Tiche',     cp: '57390', dept: '57', ring: 1, insee: '57038' },
  { nom: 'Thionville',         cp: '57100', dept: '57', ring: 1, insee: '57672' },
  { nom: 'Yutz',               cp: '57970', dept: '57', ring: 1, insee: '57757' },
  { nom: 'Cattenom',           cp: '57570', dept: '57', ring: 1, insee: '57124' },
  { nom: 'Sierck-les-Bains',   cp: '57480', dept: '57', ring: 1, insee: '57650' },
  // Ring 2 — 15-30 km — Meurthe-et-Moselle (54)
  { nom: 'Villerupt',          cp: '54190', dept: '54', ring: 2, insee: '54580' },
  { nom: 'Trieux',             cp: '54750', dept: '54', ring: 2, insee: '54533' },
  { nom: 'Jœuf',               cp: '54240', dept: '54', ring: 2, insee: '54280' },
  { nom: 'Homécourt',          cp: '54310', dept: '54', ring: 2, insee: '54263' },
  { nom: 'Briey',              cp: '54150', dept: '54', ring: 2, insee: '54099' },
  { nom: 'Piennes',            cp: '54490', dept: '54', ring: 2, insee: '54425' },
  // Ring 2 — 15-30 km — Moselle (57)
  { nom: 'Fameck',             cp: '57290', dept: '57', ring: 2, insee: '57206' },
  { nom: 'Hayange',            cp: '57700', dept: '57', ring: 2, insee: '57306' },
  { nom: 'Amnéville',          cp: '57360', dept: '57', ring: 2, insee: '57019' },
  { nom: 'Uckange',            cp: '57270', dept: '57', ring: 2, insee: '57683' },
  { nom: 'Clouange',           cp: '57185', dept: '57', ring: 2, insee: '57143' },
  { nom: 'Guénange',           cp: '57310', dept: '57', ring: 2, insee: '57269' },
];

// ── Helpers ──────────────────────────────────────────────────
const pause = ms => new Promise(r => setTimeout(r, ms));
const log   = (emoji, label, msg) => console.log(`  ${emoji}  ${label.padEnd(20)} ${msg}`);

// ── Geo API — récupère le code EPCI ─────────────────────────
async function getEpci(insee) {
  try {
    const r = await axios.get(`${GEO_BASE}/communes/${insee}?fields=nom,epci`, { timeout: 8000 });
    return r.data.epci || null;
  } catch (_) { return null; }
}

// ── GPU — cherche le document PLU ───────────────────────────
async function findDoc(grid) {
  const r = await axios.get(`${GPU_BASE}/document`, { params: { grid }, timeout: 15000 });
  return r.data.find(d => d.status !== 'document.deleted' && TYPES_PLU.includes(d.type)) || null;
}

async function getDocumentGPU(commune) {
  // 1. Cherche par code INSEE commune
  let doc = await findDoc(commune.insee);
  if (doc) return { doc, source: 'commune' };

  // 2. Fallback EPCI
  const epci = await getEpci(commune.insee);
  if (epci) {
    doc = await findDoc(epci.code);
    if (doc) return { doc, source: `PLUi intercommunal — ${epci.nom}` };
  }

  return { doc: null, source: null };
}

// ── GPU — liste des fichiers du document ─────────────────────
async function getFilesList(docId) {
  const r = await axios.get(`${GPU_BASE}/document/${docId}/files`, { timeout: 15000 });
  return (r.data || []).map(f => typeof f === 'string' ? f : f.name).filter(Boolean);
}

// ── GPU — télécharge le PDF (méthode directe puis ZIP) ───────
async function downloadPdfDirect(docId, filename) {
  const url = `${GPU_BASE}/document/${docId}/file?name=${encodeURIComponent(filename)}`;
  const r = await axios.get(url, {
    responseType: 'arraybuffer',
    timeout: 90000,
    maxContentLength: 100 * 1024 * 1024,
  });
  const ct = r.headers['content-type'] || '';
  if (ct.includes('pdf') || ct.includes('octet')) return Buffer.from(r.data);
  return null;
}

async function downloadViaZip(docId, reglementFilename) {
  const r = await axios.get(`${GPU_BASE}/document/${docId}/download`, {
    responseType: 'arraybuffer',
    timeout: 300000,
    maxContentLength: 500 * 1024 * 1024,
    maxRedirects: 10,
    headers: {
      'Referer':    'https://www.geoportail-urbanisme.gouv.fr/',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    },
  });
  const zip   = new AdmZip(Buffer.from(r.data));
  const entry = zip.getEntries().find(e =>
    e.name === reglementFilename ||
    (e.name.toLowerCase().includes('reglement') && e.name.endsWith('.pdf'))
  ) || zip.getEntries().find(e => e.name.endsWith('.pdf'));
  return entry ? entry.getData() : null;
}

async function getPdfBuffer(docId, files) {
  // Priorité : fichier qui contient 'reglement' (pas 'graphique')
  const reglementFile =
    files.find(f => f.toLowerCase().includes('reglement') && !f.toLowerCase().includes('graphique') && f.endsWith('.pdf')) ||
    files.find(f => f.endsWith('.pdf'));

  if (!reglementFile) return { buffer: null, filename: null };

  try {
    const buf = await downloadPdfDirect(docId, reglementFile);
    if (buf && buf.length > 1000) return { buffer: buf, filename: reglementFile };
  } catch (_) {}

  try {
    const buf = await downloadViaZip(docId, reglementFile);
    if (buf && buf.length > 1000) return { buffer: buf, filename: reglementFile };
  } catch (_) {}

  return { buffer: null, filename: reglementFile };
}

// ── Analyse PDF ──────────────────────────────────────────────
function detectZones(texte) {
  const zones = new Set();
  const re = /\b(U[A-Z]{1,2}|[0-9]+\s*AU|AU[0-9a-z]*|N[A-Z]?|A[A-Z]?)\b/g;
  let m;
  while ((m = re.exec(texte)) !== null) zones.add(m[1].replace(/\s+/g, ''));
  return [...zones].sort();
}

function extraireParking(texte) {
  const pats = [
    /([0-9]+(?:[,.][0-9]+)?)\s*place[s]?\s*(?:de\s+)?(?:stationnement|parking)[^.]{0,80}(?:par|pour)\s*logement/i,
    /logement[^.]{0,60}([0-9]+(?:[,.][0-9]+)?)\s*place[s]?\s*(?:de\s+)?(?:stationnement|parking)/i,
    /(?:au\s+moins|minimum|obligatoire)[^.]{0,40}([0-9]+(?:[,.][0-9]+)?)\s*place[s]?/i,
    /([0-9]+(?:[,.][0-9]+)?)\s*place[s]?\s*(?:de\s+)?(?:stationnement|parking)\s*(?:par|minimum|au\s+moins)/i,
  ];
  for (const p of pats) {
    const m = texte.match(p);
    if (m) return m[1] + ' place(s) par logement';
  }
  return null;
}

function extraireHauteur(texte) {
  const pats = [
    /hauteur\s+(?:maximale?|limite|plafond)[^.]{0,80}(\d+[,.]?\d*)\s*m(?:ètres?)?/i,
    /H\s*(?:max|≤)\s*[=:]?\s*(\d+[,.]?\d*)\s*m/i,
    /(R\+[0-9]+(?:\s*\+\s*[A-Z]+)?)/,
  ];
  for (const p of pats) {
    const m = texte.match(p);
    if (m) return m[1];
  }
  return null;
}

function extraireEmprise(texte) {
  const m = texte.match(/(?:emprise\s+au\s+sol|CES)[^.]{0,60}([0-9]+)\s*%/i);
  return m ? m[1] + '%' : null;
}

function extraireDivision(texte) {
  // Cherche mentions division logement
  const pats = [
    /division[^.]{0,200}/gi,
    /plusieurs\s+logements?[^.]{0,200}/gi,
    /(?:sous.division|lot[s]?\s+(?:de|à\s+créer))[^.]{0,200}/gi,
  ];
  const extraits = [];
  for (const p of pats) {
    const matches = texte.matchAll(p);
    for (const m of matches) {
      const s = m[0].replace(/\s+/g, ' ').trim().slice(0, 300);
      if (!extraits.some(e => e.includes(s.slice(0, 40)))) extraits.push(s);
      if (extraits.length >= 2) break;
    }
    if (extraits.length >= 2) break;
  }
  return extraits;
}

function extraireContexte(texte, patterns, maxExtraits = 2) {
  const extraits = [];
  for (const pat of patterns) {
    const re = new RegExp(pat.source, 'gi');
    for (const m of texte.matchAll(re)) {
      const start = Math.max(0, m.index - 150);
      const end   = Math.min(texte.length, m.index + 450);
      const s = texte.slice(start, end).replace(/\s+/g, ' ').trim();
      if (!extraits.some(e => e.slice(0, 40) === s.slice(0, 40))) extraits.push(s);
      if (extraits.length >= maxExtraits) return extraits;
    }
  }
  return extraits;
}

async function analyserPDF(pdfBuffer) {
  let data;
  try { data = await pdfParse(pdfBuffer); }
  catch (e) { return { succes: false, erreur: e.message, pages: 0 }; }

  const texte = data.text || '';
  if (texte.trim().length < 200) {
    return { succes: false, erreur: 'PDF scanné (image) — texte non extractible', pages: data.numpages };
  }

  return {
    succes:           true,
    pages:            data.numpages,
    zones:            detectZones(texte),
    parking:          extraireParking(texte),
    hauteur:          extraireHauteur(texte),
    emprise_sol:      extraireEmprise(texte),
    division:         extraireDivision(texte),
    extraits_parking: extraireContexte(texte, [/stationnement/i, /parking/i]),
    extraits_division:extraireContexte(texte, [/division/i, /logements?\s+multiples?/i]),
    extraits_hauteur: extraireContexte(texte, [/hauteur\s+max/i, /R\+[0-9]/i]),
  };
}

// ── Affichage fiche terminal ─────────────────────────────────
function afficherFiche(fiche) {
  const SEP = '─'.repeat(60);
  const a = fiche.analyse;
  const p = fiche.plu;

  console.log('\n' + '═'.repeat(60));
  console.log(`  📍 ${fiche.commune.toUpperCase()} (${fiche.cp}) — Ring ${fiche.ring} — INSEE ${fiche.insee}`);
  console.log('═'.repeat(60));

  if (!p.found) {
    console.log(`  ❌  Aucun PLU trouvé sur le Géoportail de l'Urbanisme`);
    if (p.note) console.log(`  ℹ️   ${p.note}`);
    console.log(`  🔗  ${fiche.url_gpu}`);
    return;
  }

  console.log(`  📄  Type         : ${p.type}${p.source !== 'commune' ? ' (' + p.source + ')' : ''}`);
  console.log(`  📅  Date PLU     : ${p.date_pub || 'N/D'}`);
  console.log(`  🆔  ID document  : ${p.id}`);
  console.log(`  🔗  GPU          : ${fiche.url_gpu}`);
  console.log(SEP);

  if (!a) {
    console.log('  ⚠️   PDF non téléchargeable — consulter le GPU manuellement');
    return;
  }
  if (!a.succes) {
    console.log(`  ⚠️   PDF non lisible : ${a.erreur}`);
    console.log(`  📄  ${a.pages} pages`);
    return;
  }

  console.log(`  📊  PDF          : ${a.pages} pages`);
  console.log(`  🗺️   Zones        : ${a.zones.length ? a.zones.join(', ') : 'non détectées'}`);
  console.log(SEP);

  // Critères SCI L&A
  const ok  = '  ✅ ';
  const nok = '  ❌ ';
  const nd  = '  ❓ ';

  const parking = a.parking;
  const hauteur = a.hauteur;
  const emprise = a.emprise_sol;

  console.log(`${parking ? ok : nd} PARKING     : ${parking || 'Non trouvé dans le règlement'}`);
  console.log(`${hauteur ? ok : nd} HAUTEUR MAX : ${hauteur || 'Non trouvé'}`);
  console.log(`${emprise ? ok : nd} EMPRISE SOL : ${emprise || 'Non trouvé'}`);

  // Division logement
  const divOk = a.division && a.division.length > 0;
  console.log(`${divOk ? ok : nd} DIVISION    : ${divOk ? 'Mentions trouvées (voir extraits)' : 'Aucune mention explicite'}`);

  if (a.division && a.division.length) {
    a.division.slice(0, 2).forEach(e => {
      console.log(`              → "${e.slice(0, 120)}..."`);
    });
  }

  if (a.extraits_parking.length) {
    console.log(`\n  📌 Extrait stationnement :`);
    console.log(`     "${a.extraits_parking[0].slice(0, 200)}..."`);
  }
}

// ── Traitement d'une commune ─────────────────────────────────
async function traiterCommune(commune) {
  const dir      = path.join(OUT_DIR, commune.insee);
  const ficheFile = path.join(dir, 'fiche.json');
  fs.mkdirSync(dir, { recursive: true });

  // Cache (sauf --force)
  if (!IS_FORCE && fs.existsSync(ficheFile)) {
    const cached = JSON.parse(fs.readFileSync(ficheFile, 'utf8'));
    if (cached.plu?.traite) {
      console.log(`  ↩️   ${commune.nom} — déjà traité (cache) — utiliser --force pour relancer`);
      afficherFiche(cached);
      return cached;
    }
  }

  const fiche = {
    commune:     commune.nom,
    insee:       commune.insee,
    cp:          commune.cp,
    dept:        commune.dept,
    ring:        commune.ring,
    url_gpu:     `https://www.geoportail-urbanisme.gouv.fr/#${commune.insee}`,
    plu:         { traite: false, found: false },
    analyse:     null,
    date_analyse: new Date().toISOString(),
  };

  // 1. Trouver document PLU (commune → EPCI)
  let doc, source;
  try {
    ({ doc, source } = await getDocumentGPU(commune));
  } catch (e) {
    fiche.plu.erreur = `API GPU inaccessible : ${e.message}`;
    fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
    afficherFiche(fiche);
    return fiche;
  }

  if (!doc) {
    fiche.plu = { traite: true, found: false, note: 'Aucun PLU/PLUi trouvé sur GPU (ni commune ni EPCI)' };
    fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
    afficherFiche(fiche);
    return fiche;
  }

  fiche.plu = {
    traite:   true,
    found:    true,
    type:     doc.type,
    id:       doc.id,
    nom:      doc.name || doc.originalName,
    statut:   doc.legalStatus,
    date_pub: doc.publicationDate,
    date_maj: doc.updateDate,
    source,
  };

  // 2. Lister fichiers
  let files = [];
  try {
    files = await getFilesList(doc.id);
    fiche.plu.fichiers = files;
    log('📋', commune.nom, `${files.length} fichiers listés`);
  } catch (e) {
    fiche.plu.erreur_fichiers = e.message;
    log('⚠️ ', commune.nom, `Listing fichiers échoué : ${e.message}`);
  }

  await pause(500);

  // 3. Télécharger règlement PDF
  if (files.length > 0) {
    log('📥', commune.nom, 'téléchargement règlement PDF...');
    const { buffer, filename } = await getPdfBuffer(doc.id, files);

    if (buffer) {
      const pdfPath = path.join(dir, filename || 'reglement.pdf');
      fs.writeFileSync(pdfPath, buffer);
      fiche.plu.pdf_local = path.relative(process.cwd(), pdfPath);
      log('✅', commune.nom, `PDF OK (${Math.round(buffer.length / 1024)} Ko — ${filename})`);

      // 4. Analyser PDF
      log('🔍', commune.nom, 'analyse du règlement...');
      fiche.analyse = await analyserPDF(buffer);
    } else {
      fiche.plu.pdf_note = 'PDF non téléchargeable — consulter GPU manuellement';
      log('⚠️ ', commune.nom, 'PDF non téléchargeable');
    }
  } else {
    fiche.plu.pdf_note = 'Aucun fichier listé par l\'API GPU';
    log('⚠️ ', commune.nom, 'Aucun fichier disponible via API');
  }

  fs.writeFileSync(ficheFile, JSON.stringify(fiche, null, 2));
  afficherFiche(fiche);
  return fiche;
}

// ── Rapport Markdown ─────────────────────────────────────────
function genererMarkdown(fiches) {
  const date = new Date().toLocaleDateString('fr-FR');
  let md = `# Rapport PLU — SCI L&A\n> Généré le ${date} — Zone frontalière luxembourgeoise\n\n`;
  md += `> **Critères :** Bien ≥ 100 m² | Division en 2 lots T2 | Parking obligatoire | Budget ≤ 250 000 €\n\n`;
  md += `---\n\n## Synthèse rapide\n\n`;

  const found  = fiches.filter(f => f.plu?.found);
  const pdfOk  = fiches.filter(f => f.plu?.pdf_local);
  const noData = fiches.filter(f => !f.plu?.found);

  md += `| | |\n|---|---|\n`;
  md += `| Communes analysées | ${fiches.length} |\n`;
  md += `| PLU/PLUi trouvés | ${found.length} |\n`;
  md += `| PDFs téléchargés | ${pdfOk.length} |\n`;
  md += `| Sans document GPU | ${noData.length} |\n\n---\n\n`;

  for (const ring of [1, 2]) {
    md += `## Ring ${ring} — ${ring === 1 ? '0 à 15 km (frontalières)' : '15 à 30 km (élargie)'}\n\n`;
    for (const f of fiches.filter(f => f.ring === ring)) {
      const a = f.analyse;
      const p = f.plu;
      const titre = p?.found ? `✅ ${p.type}${p.source !== 'commune' ? ' — ' + p.source : ''}` : '❌ Non disponible GPU';
      md += `### ${f.commune} (${f.cp}) — ${titre}\n\n`;
      md += `🔗 [Voir sur GPU](${f.url_gpu})\n\n`;

      if (!p?.found) {
        md += `> ${p?.note || 'Aucun document trouvé.'}\n\n`;
      } else {
        md += `| Critère SCI L&A | Valeur |\n|---|---|\n`;
        md += `| Type document | ${p.type} |\n`;
        md += `| Date PLU | ${p.date_pub || 'N/D'} |\n`;
        md += `| Zones identifiées | ${a?.zones?.join(', ') || 'N/D'} |\n`;
        md += `| 🅿️ Parking requis | **${a?.parking || '❓ À vérifier'}** |\n`;
        md += `| 📐 Hauteur max | ${a?.hauteur || '❓ À vérifier'} |\n`;
        md += `| 📏 Emprise au sol | ${a?.emprise_sol || '❓ À vérifier'} |\n`;
        md += `| 🏗️ Division logement | ${a?.division?.length ? '⚠️ Mentions trouvées' : '✅ Non mentionné'} |\n`;
        md += `| PDF règlement | ${p.pdf_local ? '✅ Téléchargé' : (p.pdf_note || 'Non dispo')} |\n\n`;

        if (a?.succes) {
          if (a.extraits_parking?.length) {
            md += `**Extrait stationnement :**\n\n`;
            md += `> ${a.extraits_parking[0].replace(/\n/g, ' ').slice(0, 500)}\n\n`;
          }
          if (a.division?.length) {
            md += `**Extrait division logement :**\n\n`;
            md += `> ⚠️ ${a.division[0].replace(/\n/g, ' ').slice(0, 500)}\n\n`;
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

// ── Rapport Excel ────────────────────────────────────────────
async function genererExcel(fiches) {
  const ExcelJS = require('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = 'SCI L&A';
  const ws = wb.addWorksheet('Synthèse PLU');

  const headers = ['Ring','Commune','CP','Dept','INSEE','PLU trouvé','Type','Source','Date PLU',
                   'Zones','🅿️ Parking','📐 Hauteur','📏 Emprise sol','PDF dispo','🔗 GPU'];
  const C = { navy:'1E3A5F', white:'FFFFFF', green:'DCFCE7', red:'FEE2E2', gray:'F1F5F9', blue:'DBEAFE', orange:'FEF3C7' };

  ws.getRow(1).height = 25;
  headers.forEach((h, i) => {
    const c = ws.getCell(1, i + 1);
    c.value = h;
    c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: C.navy } };
    c.font  = { bold:true, color:{ argb: C.white }, name:'Calibri', size:10 };
    c.alignment = { horizontal:'center', vertical:'middle', wrapText:true };
    c.border = { top:{style:'thin'}, left:{style:'thin'}, bottom:{style:'thin'}, right:{style:'thin'} };
  });
  [6,22,8,6,8,10,8,30,16,35,30,14,14,10,40].forEach((w,i) => { ws.getColumn(i+1).width = w; });

  fiches.forEach((f, idx) => {
    const row = idx + 2;
    const a = f.analyse;
    const p = f.plu;
    ws.getRow(row).height = 18;

    const vals = [
      `Ring ${f.ring}`, f.commune, f.cp, f.dept, f.insee,
      p?.found ? 'OUI' : 'NON', p?.type || '—', p?.source || '—', p?.date_pub || '—',
      a?.zones?.join(', ') || '—', a?.parking || '—', a?.hauteur || '—',
      a?.emprise_sol || '—', p?.pdf_local ? 'OUI' : 'NON', f.url_gpu,
    ];

    const bg = !p?.found ? C.red : (!a?.succes ? C.orange : C.green);
    vals.forEach((v, i) => {
      const c = ws.getCell(row, i + 1);
      c.value = (i === 14) ? { text:'Voir GPU', hyperlink: v } : v;
      c.fill  = { type:'pattern', pattern:'solid', fgColor:{ argb: i < 5 ? C.gray : bg } };
      c.font  = { name:'Calibri', size:10, color: i === 14 ? { argb:'2563EB' } : { argb:'0F172A' } };
      c.alignment = { vertical:'middle', horizontal: i===14?'center':'left', wrapText:true };
      c.border = { top:{style:'thin',color:{argb:'CBD5E1'}}, left:{style:'thin',color:{argb:'CBD5E1'}},
                   bottom:{style:'thin',color:{argb:'CBD5E1'}}, right:{style:'thin',color:{argb:'CBD5E1'}} };
    });
  });

  const xlsxPath = path.join(OUT_DIR, 'rapport_plu.xlsx');
  await wb.xlsx.writeFile(xlsxPath);
  return xlsxPath;
}

// ── MAIN ─────────────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const communes = IS_TEST ? COMMUNES.slice(0, 3) : COMMUNES;
  const mode = IS_TEST ? 'TEST (3 communes)' : `${communes.length} communes`;
  const force = IS_FORCE ? ' — FORCE REFRESH' : '';

  console.log('\n🏘️  Analyse PLU v2 — SCI L&A');
  console.log(`📍  ${mode}${force}`);
  console.log(`📂  Sortie : ${OUT_DIR}\n`);

  const fiches = [];
  for (let i = 0; i < communes.length; i++) {
    const c = communes[i];
    console.log(`\n[${i+1}/${communes.length}] ${c.nom} (${c.insee}) — Ring ${c.ring}`);
    const fiche = await traiterCommune(c);
    fiches.push(fiche);
    if (i < communes.length - 1) await pause(PAUSE_MS);
  }

  // Rapports
  const mdPath = path.join(OUT_DIR, 'rapport_plu.md');
  fs.writeFileSync(mdPath, genererMarkdown(fiches));

  let xlsxPath;
  try { xlsxPath = await genererExcel(fiches); } catch (e) { console.error('⚠️  Excel:', e.message); }

  const found = fiches.filter(f => f.plu?.found).length;
  const pdfOk = fiches.filter(f => f.plu?.pdf_local).length;
  const noDoc = fiches.filter(f => !f.plu?.found).length;

  console.log('\n' + '═'.repeat(60));
  console.log('✅  Analyse terminée');
  console.log(`📄  PLU/PLUi trouvés    : ${found}/${communes.length}`);
  console.log(`📥  PDFs téléchargés    : ${pdfOk}/${found}`);
  console.log(`❌  Sans document GPU   : ${noDoc} (${fiches.filter(f=>!f.plu?.found).map(f=>f.commune).join(', ')})`);
  console.log(`📋  Rapport MD  : ${mdPath}`);
  if (xlsxPath) console.log(`📊  Rapport XLSX: ${xlsxPath}`);
  console.log('═'.repeat(60) + '\n');
}

main().catch(err => {
  console.error('❌  Erreur fatale :', err.message);
  process.exit(1);
});
