// ============================================================
// SCRAPER — Projet Immo Lux L&A
// Source : entreparticuliers.com (axios + cheerio)
// Leboncoin / SeLoger : nécessitent Playwright (voir scraper-playwright.js)
// ============================================================

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { CRITERES, TOUS_CODES_POSTAUX } = require('../../config/settings');

const OUTPUT_FILE = path.join(__dirname, '../../data/biens/annonces.json');
const IS_TEST = process.argv.includes('--test');
const DELAI_MS = 1500; // pause entre requêtes

const CODES_A_SCRAPER = IS_TEST
  ? ['54400', '54190', '54800', '57700', '57290']
  : TOUS_CODES_POSTAUX;

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
};

// ------------------------------------------------------------
// Construction des URLs par plateforme + code postal
// ------------------------------------------------------------
function buildUrls(codePostal) {
  return [
    {
      plateforme: 'entreparticuliers',
      url: `https://www.entreparticuliers.com/annonces-immobilieres/vente/maison/${codePostal}`,
    },
    {
      plateforme: 'entreparticuliers_immeuble',
      url: `https://www.entreparticuliers.com/annonces-immobilieres/vente/immeuble/${codePostal}`,
    },
  ];
}

// ------------------------------------------------------------
// Scraper entreparticuliers.com
// ------------------------------------------------------------
async function scrapeEntreparticuliers(url, codePostal, plateforme) {
  const annonces = [];
  try {
    const r = await axios.get(url, { headers: HEADERS, timeout: 15000 });
    const $ = cheerio.load(r.data);

    $('.resultat').each((_, el) => {
      const lien = $(el).find('a[href*="/ref-"]').first().attr('href') || '';
      if (!lien.includes('/ref-')) return;
      const fullLien = lien.startsWith('http') ? lien : `https://www.entreparticuliers.com${lien}`;

      const $footer = $(el).find('.resultat-footer');
      // Normaliser les espaces insécables
      const texte = $footer.text().replace(/\u00a0/g, ' ').trim();

      // Extraire ville (premier .fw-bold)
      const ville = $footer.find('.fw-bold').first().text().replace(/\u00a0/g, ' ').trim();

      // Extraire prix via regex (ex: "184 000 €")
      const prixMatch = texte.match(/(\d[\d\s]{2,8})\s*€/);
      const prixNum = prixMatch ? parseInt(prixMatch[1].replace(/\s/g, ''), 10) : 0;

      // Extraire surface (ex: "110 m²")
      const surfaceMatch = texte.match(/(\d+)\s*m²/);
      const surfaceNum = surfaceMatch ? parseInt(surfaceMatch[1], 10) : 0;

      // Extraire pièces (ex: "5 pièces")
      const piecesMatch = texte.match(/(\d+)\s*pièces?/i);
      const pieces = piecesMatch ? parseInt(piecesMatch[1], 10) : 0;

      // Type
      const type = texte.toLowerCase().includes('immeuble') ? 'immeuble' : 'maison';

      // Filtres
      if (prixNum > 0 && prixNum > CRITERES.prixMax) return;
      if (surfaceNum > 0 && surfaceNum < CRITERES.surfaceMin) return;
      if (!fullLien.includes('/ref-')) return;

      // ID unique basé sur le lien
      const id = fullLien.match(/ref-(\d+)/)?.[1] || fullLien;

      annonces.push({
        id,
        plateforme,
        codePostal,
        type,
        titre: `${type.charAt(0).toUpperCase() + type.slice(1)} ${pieces} pièces ${surfaceNum} m² — ${ville}`,
        prix: prixNum,
        surface: surfaceNum,
        pieces,
        ville,
        lien: fullLien,
        dateScrap: new Date().toISOString(),
      });
    });
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error(`  ⚠️  ${codePostal} (${plateforme}): ${err.response?.status || err.message}`);
    }
  }

  return annonces;
}

// ------------------------------------------------------------
// Pause entre requêtes
// ------------------------------------------------------------
const pause = (ms) => new Promise((res) => setTimeout(res, ms));

// ------------------------------------------------------------
// Sauvegarde (déduplication par ID)
// ------------------------------------------------------------
function sauvegarder(nouvelles, existantes) {
  const idsExistants = new Set(existantes.map((a) => a.id));
  const uniques = nouvelles.filter((a) => !idsExistants.has(a.id));
  const total = [...existantes, ...uniques];
  fs.mkdirSync(path.dirname(OUTPUT_FILE), { recursive: true });
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(total, null, 2));
  return { nbNouveaux: uniques.length, total: total.length };
}

// ------------------------------------------------------------
// MAIN
// ------------------------------------------------------------
async function main() {
  console.log('\n🏠 Scraper Immo Lux L&A');
  console.log(`📍 ${CODES_A_SCRAPER.length} codes postaux | Source: entreparticuliers.com`);
  console.log(`💶 Filtre : ≤ ${CRITERES.prixMax.toLocaleString('fr-FR')} € | ≥ ${CRITERES.surfaceMin} m²`);
  if (IS_TEST) console.log('🧪 MODE TEST — 5 codes postaux\n');
  else console.log('');

  // Charger existantes
  let existantes = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    existantes = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`📂 ${existantes.length} annonces déjà en base\n`);
  }

  const toutesNouveaux = [];
  let reqCount = 0;

  for (let i = 0; i < CODES_A_SCRAPER.length; i++) {
    const cp = CODES_A_SCRAPER[i];
    const urls = buildUrls(cp);
    let totalCP = 0;

    for (const { url, plateforme } of urls) {
      const annonces = await scrapeEntreparticuliers(url, cp, plateforme);
      toutesNouveaux.push(...annonces);
      totalCP += annonces.length;
      reqCount++;
      if (reqCount % 5 === 0) await pause(DELAI_MS);
    }

    process.stdout.write(`[${i + 1}/${CODES_A_SCRAPER.length}] ${cp} → ${totalCP} annonce(s)\n`);
    await pause(800);
  }

  // Sauvegarder
  const { nbNouveaux, total } = sauvegarder(toutesNouveaux, existantes);

  console.log('\n✅ Scraping terminé');
  console.log(`📊 ${toutesNouveaux.length} annonces trouvées | 🆕 ${nbNouveaux} nouvelles | 💾 Total base : ${total}`);

  // Aperçu
  if (toutesNouveaux.length > 0) {
    console.log('\n--- Annonces trouvées ---');
    toutesNouveaux.forEach((a, i) => {
      console.log(`\n#${i + 1} ${a.titre}`);
      console.log(`   💶 ${a.prix.toLocaleString('fr-FR')} € | 📐 ${a.surface} m² | 📍 ${a.ville} (${a.codePostal})`);
      console.log(`   🔗 ${a.lien}`);
    });
  } else {
    console.log('\nAucune annonce trouvée correspondant aux critères.');
  }
}

main().catch(console.error);
