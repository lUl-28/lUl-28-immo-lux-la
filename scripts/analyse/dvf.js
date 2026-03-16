/**
 * Analyse DVF (Demandes de Valeurs Foncières)
 * Rapport prix au m² par commune — Ring 1 & Ring 2 frontière Luxembourg
 * Source : files.data.gouv.fr/geo-dvf
 */

const https = require('https');
const zlib = require('zlib');
const fs = require('fs');
const path = require('path');

// ── Codes postaux Ring 1 et Ring 2 ──────────────────────────────────────────
// ⚠️  Moselle (57) exclue : non disponible dans les DVF (droit local Alsace-Moselle)
//     Pour les communes de Thionville, Yutz, Florange, Hayange, Fameck, Uckange
//     → utiliser Meilleurs Agents ou DVF+ via https://dvf.etalab.gouv.fr/

const RING1 = {
  label: 'Ring 1 (0-15 km frontière)',
  codesPostaux: [
    // Meurthe-et-Moselle (54) — proches frontière LU
    '54350', // Mont-Saint-Martin
    '54400', // Longwy
    '54590', // Hussigny-Godbrange
    '54430', // Réhon
    '54440', // Herserange
  ]
};

const RING2 = {
  label: 'Ring 2 (15-30 km frontière)',
  codesPostaux: [
    // Meurthe-et-Moselle (54)
    '54190', // Villerupt
    '54750', // Trieux
    '54240', // Jœuf
    '54310', // Homécourt
    '54150', // Avril / Briey
    '54490', // Joudreville
    // Meuse (55)
    '55700', // Stenay
    '55600', // Montmédy
  ]
};

const ALL_CODES = new Set([...RING1.codesPostaux, ...RING2.codesPostaux]);
const DEPTS = ['54', '55'];

// Mapping code postal → label ring
const CP_TO_RING = {};
RING1.codesPostaux.forEach(cp => CP_TO_RING[cp] = 'Ring 1 (0-15 km)');
RING2.codesPostaux.forEach(cp => CP_TO_RING[cp] = 'Ring 2 (15-30 km)');

// ── Utilitaires ──────────────────────────────────────────────────────────────
function median(arr) {
  if (!arr.length) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
    : Math.round(sorted[mid]);
}

function downloadAndDecompress(url) {
  return new Promise((resolve, reject) => {
    process.stdout.write(`  Téléchargement ${url} ... `);
    const chunks = [];
    https.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } }, (res) => {
      if (res.statusCode !== 200) {
        reject(new Error(`HTTP ${res.statusCode} pour ${url}`));
        return;
      }
      const gunzip = zlib.createGunzip();
      res.pipe(gunzip);
      gunzip.on('data', chunk => chunks.push(chunk));
      gunzip.on('end', () => {
        console.log('OK');
        resolve(Buffer.concat(chunks).toString('utf8'));
      });
      gunzip.on('error', reject);
      res.on('error', reject);
    }).on('error', reject);
  });
}

function parseCSV(csvText) {
  const lines = csvText.split('\n');
  if (!lines.length) return [];
  const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    // Parse CSV basique (pas de virgules dans les champs pour DVF)
    const values = line.split(',');
    const row = {};
    headers.forEach((h, idx) => {
      row[h] = (values[idx] || '').replace(/"/g, '').trim();
    });
    rows.push(row);
  }
  return rows;
}

// ── Analyse principale ────────────────────────────────────────────────────────
async function analyser() {
  // Accumulateur : { codePostal: { commune: string, prixM2: [] } }
  const stats = {};

  for (const dept of DEPTS) {
    const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/2024/departements/${dept}.csv.gz`;
    let csvText;
    try {
      csvText = await downloadAndDecompress(url);
    } catch (err) {
      console.error(`Erreur téléchargement dept ${dept}:`, err.message);
      continue;
    }

    const rows = parseCSV(csvText);
    console.log(`  Analyse département ${dept}... ${rows.length} lignes lues`);
    if (rows.length > 0) console.log(`  Colonnes disponibles: ${Object.keys(rows[0]).join(', ')}`);
    let count = 0;

    for (const row of rows) {
      const cp = row['code_postal'];
      if (!cp || !ALL_CODES.has(cp)) continue;

      // Filtrer : ventes uniquement, biens bâtis (maison ou immeuble)
      const nature = (row['nature_mutation'] || '').toLowerCase();
      const typeLocal = (row['type_local'] || '').toLowerCase();
      if (!nature.includes('vente')) continue;
      if (!['maison', 'appartement', 'immeuble'].some(t => typeLocal.includes(t))) continue;

      const valeur = parseFloat(row['valeur_fonciere']);
      const surface = parseFloat(row['surface_reelle_bati']);
      if (!valeur || !surface || surface < 10) continue;

      const prixM2 = Math.round(valeur / surface);
      // Exclure valeurs aberrantes (< 200 ou > 10000 €/m²)
      if (prixM2 < 200 || prixM2 > 10000) continue;

      const commune = row['nom_commune'] || cp;

      if (!stats[cp]) {
        stats[cp] = { commune, cp, ring: CP_TO_RING[cp], prixM2: [] };
      }
      stats[cp].prixM2.push(prixM2);
      count++;
    }

    console.log(`  → ${count} transactions retenues pour dept ${dept}`);
  }

  return stats;
}

// ── Génération du rapport ─────────────────────────────────────────────────────
function genererRapport(stats) {
  const outputDir = path.join(__dirname, '..', '..', 'data', 'marche');
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  // Trier par ring puis par commune
  const entries = Object.values(stats).sort((a, b) => {
    if (a.ring < b.ring) return -1;
    if (a.ring > b.ring) return 1;
    return a.commune.localeCompare(b.commune);
  });

  // ── Rapport JSON ──
  const reportJson = entries.map(e => ({
    ring: e.ring,
    codePostal: e.cp,
    commune: e.commune,
    nbVentes: e.prixM2.length,
    prixM2_min: Math.min(...e.prixM2),
    prixM2_max: Math.max(...e.prixM2),
    prixM2_median: median(e.prixM2),
  }));

  fs.writeFileSync(
    path.join(outputDir, 'rapport_dvf.json'),
    JSON.stringify(reportJson, null, 2)
  );

  // ── Rapport Markdown ──
  let md = `# Rapport DVF — Prix au m² par commune\n`;
  md += `> Source : data.gouv.fr / DVF 2024 | Généré le ${new Date().toLocaleDateString('fr-FR')}\n\n`;
  md += `> Biens : maisons, appartements | Ventes uniquement | Filtres aberrants : <200 et >10 000 €/m²\n\n`;

  let currentRing = '';
  for (const e of reportJson) {
    if (e.ring !== currentRing) {
      currentRing = e.ring;
      md += `\n## ${currentRing}\n\n`;
      md += `| Commune | CP | Nb ventes | Min €/m² | Médiane €/m² | Max €/m² | Appréciation |\n`;
      md += `|---|---|---|---|---|---|---|\n`;
    }
    if (e.nbVentes === 0) {
      md += `| ${e.commune} | ${e.codePostal} | 0 | — | — | — | Pas de données |\n`;
      continue;
    }
    // Appréciation relative à la médiane
    let note = '';
    if (e.prixM2_median <= 800) note = '🟢 Très accessible';
    else if (e.prixM2_median <= 1200) note = '🟡 Accessible';
    else if (e.prixM2_median <= 1600) note = '🟠 Moyen';
    else note = '🔴 Élevé';

    md += `| ${e.commune} | ${e.codePostal} | ${e.nbVentes} | ${e.prixM2_min} | **${e.prixM2_median}** | ${e.prixM2_max} | ${note} |\n`;
  }

  // Ajouter communes sans données (CP dans les rings mais pas dans stats)
  const cpAvecDonnees = new Set(entries.map(e => e.cp));
  md += `\n## Communes sans transactions en 2024\n\n`;
  [...RING1.codesPostaux, ...RING2.codesPostaux].forEach(cp => {
    if (!cpAvecDonnees.has(cp)) {
      const ring = CP_TO_RING[cp];
      md += `- ${cp} (${ring}) — aucune vente enregistrée\n`;
    }
  });

  const mdPath = path.join(outputDir, 'rapport_dvf.md');
  fs.writeFileSync(mdPath, md);

  return { reportJson, mdPath, outputDir };
}

// ── Main ──────────────────────────────────────────────────────────────────────
(async () => {
  console.log('\n=== Analyse DVF — Ring 1 & Ring 2 frontière Luxembourg ===\n');
  console.log('Téléchargement des données DVF 2024 (départements 54 et 57)...\n');

  const stats = await analyser();

  const nbCommunes = Object.keys(stats).length;
  const nbTotal = Object.values(stats).reduce((s, e) => s + e.prixM2.length, 0);
  console.log(`\n${nbCommunes} communes trouvées, ${nbTotal} transactions analysées.`);

  console.log('\nGénération du rapport...');
  const { reportJson, mdPath } = genererRapport(stats);

  console.log(`\nRapport sauvegardé :\n  - data/marche/rapport_dvf.json\n  - data/marche/rapport_dvf.md`);

  // Affichage console du tableau
  console.log('\n' + '─'.repeat(90));
  console.log('RAPPORT PRIX AU M² PAR COMMUNE');
  console.log('─'.repeat(90));

  let lastRing = '';
  for (const e of reportJson) {
    if (e.ring !== lastRing) {
      lastRing = e.ring;
      console.log(`\n  ▶ ${e.ring}\n`);
      console.log(`  ${'Commune'.padEnd(30)} ${'CP'.padEnd(8)} ${'Ventes'.padEnd(8)} ${'Min'.padEnd(8)} ${'Médiane'.padEnd(10)} ${'Max'.padEnd(8)}`);
      console.log('  ' + '─'.repeat(80));
    }
    if (e.nbVentes === 0) {
      console.log(`  ${e.commune.padEnd(30)} ${e.codePostal.padEnd(8)} ${'0'.padEnd(8)} ${'—'.padEnd(8)} ${'—'.padEnd(10)} ${'—'.padEnd(8)}`);
    } else {
      console.log(`  ${e.commune.padEnd(30)} ${e.codePostal.padEnd(8)} ${String(e.nbVentes).padEnd(8)} ${String(e.prixM2_min).padEnd(8)} ${String(e.prixM2_median).padEnd(10)} ${String(e.prixM2_max).padEnd(8)}`);
    }
  }
  console.log('\n' + '─'.repeat(90));
})();
