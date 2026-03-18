/**
 * Étude de marché — Tendances prix m² par commune (Ring 1 & Ring 2)
 * Source : DVF (Demandes de Valeurs Foncières) — data.gouv.fr
 * Années : 2020 à 2024 | Depts : 54 (Meurthe-et-Moselle) + 57 (Moselle)
 */

const https  = require('https');
const zlib   = require('zlib');
const fs     = require('fs');
const path   = require('path');
const { COMMUNES } = require('../../config/links');

// ── Communes cibles ───────────────────────────────────────────────────────────
// Construit une map nom normalisé → { ring, nom, cp, dept }
function normalize(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const COMMUNES_CIBLES = {};
for (const [ringId, ring] of Object.entries(COMMUNES)) {
  if (ringId === 'ring3') continue; // on se concentre sur ring1 + ring2
  for (const c of ring.communes) {
    COMMUNES_CIBLES[normalize(c.nom)] = { ring: ringId, nom: c.nom, cp: c.cp, dept: c.dept };
  }
}

// Variantes de noms DVF connus
const ALIASES = {
  'joeuf':           'jouf',
  'jouf':            'jouf',
  'homecourt':       'homecourt',
  'yutz':            'yutz',
  'mont saint martin': 'mont saint martin',
};

function matchCommune(nomDvf) {
  const n = normalize(nomDvf);
  if (COMMUNES_CIBLES[n]) return COMMUNES_CIBLES[n];
  // Essai avec alias
  const alias = ALIASES[n];
  if (alias && COMMUNES_CIBLES[alias]) return COMMUNES_CIBLES[alias];
  // Essai partiel (le nom DVF peut être "LONGWY" vs "Longwy")
  for (const [key, val] of Object.entries(COMMUNES_CIBLES)) {
    if (n === key || n.startsWith(key) || key.startsWith(n)) return val;
  }
  return null;
}

// ── Téléchargement ───────────────────────────────────────────────────────────
const CACHE_DIR = path.join(__dirname, '..', '..', 'data', 'marche', 'cache');
if (!fs.existsSync(CACHE_DIR)) fs.mkdirSync(CACHE_DIR, { recursive: true });

function downloadGz(url, cacheFile) {
  if (fs.existsSync(cacheFile)) {
    process.stdout.write(`  [cache] ${path.basename(cacheFile)}\n`);
    return Promise.resolve(fs.readFileSync(cacheFile, 'utf8'));
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(`  Téléchargement ${path.basename(cacheFile)} ... `);
    const chunks = [];
    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      const gunzip = zlib.createGunzip();
      res.pipe(gunzip);
      gunzip.on('data', c => chunks.push(c));
      gunzip.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        fs.writeFileSync(cacheFile, text, 'utf8');
        console.log(`OK (${Math.round(text.length / 1024)} KB)`);
        resolve(text);
      });
      gunzip.on('error', reject);
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

// Télécharge le fichier national DVF (ZIP pipe-séparé) et extrait seulement dept 57
function downloadNationalDvfDept57(url, annee) {
  const cacheFile = path.join(CACHE_DIR, `dvf_${annee}_57.csv`);
  if (fs.existsSync(cacheFile)) {
    process.stdout.write(`  [cache] dvf_${annee}_57.csv\n`);
    return Promise.resolve(fs.readFileSync(cacheFile, 'utf8'));
  }

  return new Promise((resolve, reject) => {
    process.stdout.write(`  Téléchargement national DVF ${annee} (filtrage Moselle) ... `);
    const AdmZip = require('adm-zip');
    const zipChunks = [];

    const req = https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) { reject(new Error(`HTTP ${res.statusCode}`)); return; }
      res.on('data', c => zipChunks.push(c));
      res.on('end', () => {
        try {
          const buf  = Buffer.concat(zipChunks);
          const zip  = new AdmZip(buf);
          const entry = zip.getEntries().find(e => e.entryName.endsWith('.txt'));
          if (!entry) { reject(new Error('Pas de fichier .txt dans le ZIP')); return; }

          const fullText = entry.getData().toString('utf8');
          const lines    = fullText.split('\n');
          const header   = lines[0];
          const headers  = header.split('|');
          const deptIdx  = headers.indexOf('code_departement');
          if (deptIdx === -1) { reject(new Error('Colonne code_departement introuvable')); return; }

          // Filtre les lignes Moselle (57)
          const filtered = [header];
          for (let i = 1; i < lines.length; i++) {
            const line = lines[i];
            if (!line.trim()) continue;
            const vals = line.split('|');
            if ((vals[deptIdx] || '').trim() === '57') filtered.push(line);
          }

          const text = filtered.join('\n');
          fs.writeFileSync(cacheFile, text, 'utf8');
          console.log(`OK (${filtered.length - 1} lignes dept 57)`);
          resolve(text);
        } catch (e) { reject(e); }
      });
      res.on('error', reject);
    });
    req.on('error', reject);
  });
}

// ── Parsing CSV DVF ───────────────────────────────────────────────────────────
function* iterCSV(csvText, sep = ',') {
  const lines = csvText.split('\n');
  if (lines.length < 2) return;
  const headers = lines[0].split(sep).map(h => h.trim().replace(/"/g, ''));
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const values = line.split(sep);
    const row = {};
    headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
    yield row;
  }
}

function* iterCSVPipe(csvText) { yield* iterCSV(csvText, '|'); }

function median(arr) {
  if (!arr.length) return null;
  const s = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 === 0 ? Math.round((s[mid - 1] + s[mid]) / 2) : s[mid];
}

// ── Analyse ───────────────────────────────────────────────────────────────────
const ANNEES  = [2020, 2021, 2022, 2023, 2024];

// URLs pour les fichiers nationaux DVF (fallback pour Moselle 57)
const NATIONAL_URLS = {
  2020: 'https://static.data.gouv.fr/resources/demandes-de-valeurs-foncieres/20251018-234831/valeursfoncieres-2020-s2.txt.zip',
  2021: 'https://static.data.gouv.fr/resources/demandes-de-valeurs-foncieres/20251018-234836/valeursfoncieres-2021.txt.zip',
  2022: 'https://static.data.gouv.fr/resources/demandes-de-valeurs-foncieres/20251018-234844/valeursfoncieres-2022.txt.zip',
  2023: 'https://static.data.gouv.fr/resources/demandes-de-valeurs-foncieres/20251018-234851/valeursfoncieres-2023.txt.zip',
  2024: 'https://static.data.gouv.fr/resources/demandes-de-valeurs-foncieres/20251018-234857/valeursfoncieres-2024.txt.zip',
};

async function analyser() {
  const stats = {};

  for (const annee of ANNEES) {
    // Dept 54 via geo-dvf (CSV comma)
    for (const dept of ['54']) {
      const url       = `https://files.data.gouv.fr/geo-dvf/latest/csv/${annee}/departements/${dept}.csv.gz`;
      const cacheFile = path.join(CACHE_DIR, `dvf_${annee}_${dept}.csv`);

      let csvText;
      try {
        csvText = await downloadGz(url, cacheFile);
      } catch (err) {
        console.warn(`  SKIP ${annee}/${dept}: ${err.message}`);
        continue;
      }

      let count = 0;
      for (const row of iterCSV(csvText)) {
        const nature = (row['Nature mutation'] || row['nature_mutation'] || '').toLowerCase();
        if (!nature.includes('vente')) continue;

        const typeLocal = (row['Type local'] || row['type_local'] || '').toLowerCase();
        if (!['maison', 'appartement'].some(t => typeLocal.includes(t))) continue;

        const valeur  = parseFloat((row['Valeur fonciere'] || row['valeur_fonciere'] || '').replace(',', '.'));
        const surface = parseFloat((row['Surface reelle bati'] || row['surface_reelle_bati'] || '').replace(',', '.'));
        if (!valeur || !surface || surface < 10 || isNaN(valeur) || isNaN(surface)) continue;

        const prixM2 = Math.round(valeur / surface);
        if (prixM2 < 200 || prixM2 > 8000) continue;

        const nomDvf  = row['Commune'] || row['nom_commune'] || '';
        const commune = matchCommune(nomDvf);
        if (!commune) continue;

        const key  = commune.nom;
        const type = typeLocal.includes('maison') ? 'maison' : 'appart';

        if (!stats[key]) stats[key] = { ring: commune.ring, nom: commune.nom, cp: commune.cp, annees: {} };
        if (!stats[key].annees[annee]) stats[key].annees[annee] = { maison: [], appart: [] };
        stats[key].annees[annee][type].push(prixM2);
        count++;
      }

      console.log(`  → ${count} transactions retenues (${annee}, dept ${dept})`);
    }

    // Dept 57 (Moselle) via fichier national DVF (pipe-séparé)
    let csv57;
    try {
      csv57 = await downloadNationalDvfDept57(NATIONAL_URLS[annee], annee);
    } catch (err) {
      console.warn(`  SKIP ${annee}/57: ${err.message}`);
      continue;
    }

    let count57 = 0;
    for (const row of iterCSVPipe(csv57)) {
      const nature = (row['nature_mutation'] || '').toLowerCase();
      if (!nature.includes('vente')) continue;

      const typeLocal = (row['type_local'] || '').toLowerCase();
      if (!['maison', 'appartement'].some(t => typeLocal.includes(t))) continue;

      const valeur  = parseFloat((row['valeur_fonciere'] || '').replace(',', '.'));
      const surface = parseFloat((row['surface_reelle_bati'] || '').replace(',', '.'));
      if (!valeur || !surface || surface < 10 || isNaN(valeur) || isNaN(surface)) continue;

      const prixM2 = Math.round(valeur / surface);
      if (prixM2 < 200 || prixM2 > 8000) continue;

      const nomDvf  = row['nom_commune'] || '';
      const commune = matchCommune(nomDvf);
      if (!commune) continue;

      const key  = commune.nom;
      const type = typeLocal.includes('maison') ? 'maison' : 'appart';

      if (!stats[key]) stats[key] = { ring: commune.ring, nom: commune.nom, cp: commune.cp, annees: {} };
      if (!stats[key].annees[annee]) stats[key].annees[annee] = { maison: [], appart: [] };
      stats[key].annees[annee][type].push(prixM2);
      count57++;
    }

    console.log(`  → ${count57} transactions retenues (${annee}, dept 57)`);
  }

  return stats;
}

// ── Calcul tendances ──────────────────────────────────────────────────────────
function calculerTendances(stats) {
  const result = [];

  for (const [nom, data] of Object.entries(stats)) {
    const entry = {
      ring: data.ring,
      nom,
      cp: data.cp,
      series: {},
    };

    for (const type of ['maison', 'appart']) {
      const serie = {};
      for (const annee of ANNEES) {
        const arr = data.annees[annee]?.[type] || [];
        if (arr.length >= 3) {
          serie[annee] = { median: median(arr), nb: arr.length };
        }
      }
      if (Object.keys(serie).length >= 2) {
        // Calcul tendance : évolution entre 1ère et dernière année dispo
        const anneesDispo = Object.keys(serie).map(Number).sort();
        const debut = serie[anneesDispo[0]].median;
        const fin   = serie[anneesDispo[anneesDispo.length - 1]].median;
        const evol  = Math.round(((fin - debut) / debut) * 100 * 10) / 10;
        serie._evol = evol;
        serie._debut = anneesDispo[0];
        serie._fin   = anneesDispo[anneesDispo.length - 1];
      }
      entry.series[type] = serie;
    }

    result.push(entry);
  }

  // Trier : Ring 1 d'abord, puis par évolution décroissante
  result.sort((a, b) => {
    if (a.ring !== b.ring) return a.ring < b.ring ? -1 : 1;
    const evolA = a.series.maison?._evol ?? a.series.appart?._evol ?? 0;
    const evolB = b.series.maison?._evol ?? b.series.appart?._evol ?? 0;
    return evolB - evolA;
  });

  return result;
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n=== Étude de marché — Tendances prix m² Ring 1 & Ring 2 ===\n');

  const stats = await analyser();
  const tendances = calculerTendances(stats);

  const outDir = path.join(__dirname, '..', '..', 'data', 'marche');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const outFile = path.join(outDir, 'tendances.json');
  fs.writeFileSync(outFile, JSON.stringify({ annees: ANNEES, communes: tendances }, null, 2));

  console.log(`\n✅ ${tendances.length} communes analysées`);
  console.log(`📁 Données sauvegardées : data/marche/tendances.json`);

  // Résumé console
  console.log('\n' + '─'.repeat(80));
  console.log('TENDANCES PRIX M² (maison)');
  console.log('─'.repeat(80));
  for (const c of tendances) {
    const s = c.series.maison;
    if (!s || !s._evol) continue;
    const evol = s._evol > 0 ? `+${s._evol}%` : `${s._evol}%`;
    const icon = s._evol > 5 ? '↑↑' : s._evol > 0 ? '↑' : s._evol < -5 ? '↓↓' : '↓';
    const last = s[s._fin]?.median ?? '—';
    console.log(`  ${icon} ${c.nom.padEnd(25)} ${evol.padStart(8)}   (${last} €/m² en ${s._fin})`);
  }
  console.log('\n→ Ouvrir le dashboard : npm run dashboard → /marche');
})();
