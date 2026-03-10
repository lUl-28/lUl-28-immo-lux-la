// ============================================================
// SCRAPER — Projet Immo Lux L&A
// Sources : entreparticuliers.com + pap.fr (axios + cheerio)
// Leboncoin / SeLoger / Figaro : JS rendu → liens rapides uniquement
// ============================================================

const axios = require('axios');
const cheerio = require('cheerio');
const fs = require('fs');
const path = require('path');
const { CRITERES, TOUS_CODES_POSTAUX, ZONES } = require('../../config/settings');

const OUTPUT_FILE = path.join(__dirname, '../../data/biens/annonces.json');
const IS_TEST = process.argv.includes('--test');
const DELAI_MS = 1500;

const CODES_A_SCRAPER = IS_TEST
  ? ['54400', '54190', '54800', '57700', '57290']
  : TOUS_CODES_POSTAUX;

// Ensemble de tous les codes postaux ciblés (pour filtrage PAP)
const TOUS_CP_SET = new Set(TOUS_CODES_POSTAUX);

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
  'Accept-Encoding': 'gzip, deflate, br',
};

const pause = (ms) => new Promise((res) => setTimeout(res, ms));

// ------------------------------------------------------------
// EntrePart — URLs par code postal
// ------------------------------------------------------------
function buildUrlsEP(codePostal) {
  return [
    { plateforme: 'entreparticuliers', url: `https://www.entreparticuliers.com/annonces-immobilieres/vente/maison/${codePostal}` },
    { plateforme: 'entreparticuliers_immeuble', url: `https://www.entreparticuliers.com/annonces-immobilieres/vente/immeuble/${codePostal}` },
  ];
}

// ------------------------------------------------------------
// Scraper EntrePart
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
      const texte = $footer.text().replace(/\u00a0/g, ' ').trim();
      const ville = $footer.find('.fw-bold').first().text().replace(/\u00a0/g, ' ').trim();

      const prixMatch = texte.match(/(\d[\d\s]{2,8})\s*€/);
      const prixNum = prixMatch ? parseInt(prixMatch[1].replace(/\s/g, ''), 10) : 0;

      const surfaceMatch = texte.match(/(\d+)\s*m²/);
      const surfaceNum = surfaceMatch ? parseInt(surfaceMatch[1], 10) : 0;

      const piecesMatch = texte.match(/(\d+)\s*pièces?/i);
      const pieces = piecesMatch ? parseInt(piecesMatch[1], 10) : 0;

      const type = texte.toLowerCase().includes('immeuble') ? 'immeuble' : 'maison';

      if (prixNum > 0 && prixNum > CRITERES.prixMax) return;
      if (surfaceNum > 0 && surfaceNum < CRITERES.surfaceMin) return;

      const id = `ep_${fullLien.match(/ref-(\d+)/)?.[1] || Date.now()}`;

      annonces.push({
        id,
        source: 'EntrePart.',
        sourceColor: '#8e44ad',
        plateforme,
        codePostal,
        type,
        titre: `${type.charAt(0).toUpperCase() + type.slice(1)} ${pieces ? pieces + ' pièces ' : ''}${surfaceNum ? surfaceNum + ' m² ' : ''}— ${ville}`,
        prix: prixNum || null,
        surface: surfaceNum || null,
        pieces: pieces || null,
        ville,
        lien: fullLien,
        dateScrap: new Date().toISOString(),
      });
    });
  } catch (err) {
    if (err.response?.status !== 404) {
      console.error(`  ⚠️  EP ${codePostal}: ${err.response?.status || err.message}`);
    }
  }
  return annonces;
}

// ------------------------------------------------------------
// Scraper PAP.fr — niveau département (54 et 57)
// Filtre ensuite par CP de nos zones
// ------------------------------------------------------------
const PAP_DEPTS = [
  {
    dept: '54',
    url: `https://www.pap.fr/annonce/ventes-maisons-meurthe-et-moselle-g439-max_prix-${CRITERES.prixMax}-min_surf-${CRITERES.surfaceMin}`,
  },
  {
    dept: '54b',
    url: `https://www.pap.fr/annonce/ventes-immeubles-meurthe-et-moselle-g439-max_prix-${CRITERES.prixMax}-min_surf-${CRITERES.surfaceMin}`,
  },
  {
    dept: '57',
    url: `https://www.pap.fr/annonce/ventes-maisons-moselle-g469-max_prix-${CRITERES.prixMax}-min_surf-${CRITERES.surfaceMin}`,
  },
  {
    dept: '57b',
    url: `https://www.pap.fr/annonce/ventes-immeubles-moselle-g469-max_prix-${CRITERES.prixMax}-min_surf-${CRITERES.surfaceMin}`,
  },
];

async function scrapePAP() {
  const annonces = [];

  for (const { dept, url } of PAP_DEPTS) {
    try {
      const r = await axios.get(url, {
        headers: { ...HEADERS, 'Referer': 'https://www.pap.fr/' },
        timeout: 20000,
      });
      const $ = cheerio.load(r.data);

      // Essayer d'extraire les données JSON embarquées (Next.js __NEXT_DATA__)
      const nextDataScript = $('script#__NEXT_DATA__').html();
      if (nextDataScript) {
        try {
          const nextData = JSON.parse(nextDataScript);
          const items = nextData?.props?.pageProps?.searchResults?.items
            || nextData?.props?.pageProps?.ads
            || nextData?.props?.pageProps?.results
            || [];

          for (const item of items) {
            const cp = item.zipCode || item.zip_code || item.postalCode || '';
            const prix = item.price || item.prix || 0;
            const surface = item.surface || item.superficie || 0;
            const ville = item.city || item.ville || item.commune || '';
            const id = `pap_${item.id || item.slug || Math.random()}`;
            const lien = item.url ? (item.url.startsWith('http') ? item.url : `https://www.pap.fr${item.url}`) : '';
            const type = (item.type || item.propertyType || '').toLowerCase().includes('immeuble') ? 'immeuble' : 'maison';
            const pieces = item.rooms || item.pieces || item.nb_rooms || 0;
            const titre = item.title || item.titre || `${type.charAt(0).toUpperCase() + type.slice(1)}${surface ? ' ' + surface + ' m²' : ''} — ${ville}`;

            if (!TOUS_CP_SET.has(cp)) continue;
            if (prix > 0 && prix > CRITERES.prixMax) continue;
            if (surface > 0 && surface < CRITERES.surfaceMin) continue;
            if (!lien) continue;

            annonces.push({
              id,
              source: 'PAP',
              sourceColor: '#e63946',
              plateforme: 'pap',
              codePostal: cp,
              type,
              titre,
              prix: prix || null,
              surface: surface || null,
              pieces: pieces || null,
              ville,
              lien,
              dateScrap: new Date().toISOString(),
            });
          }
          await pause(1000);
          continue;
        } catch (parseErr) {
          // Fallback vers CSS selectors
        }
      }

      // Fallback CSS selectors si pas de NEXT_DATA
      const selectors = ['.annonce', '.vignette', '[class*="annonce-"]', 'article[data-type]'];
      let $items = $([]);
      for (const sel of selectors) {
        $items = $(sel);
        if ($items.length > 0) break;
      }

      $items.each((_, el) => {
        const $el = $(el);
        const lienHref = $el.find('a[href*="/annonce/"]').first().attr('href') || '';
        if (!lienHref) return;
        const fullLien = lienHref.startsWith('http') ? lienHref : `https://www.pap.fr${lienHref}`;

        const texte = $el.text().replace(/\u00a0/g, ' ');
        const prixMatch = texte.match(/(\d[\d\s]{2,8})\s*€/);
        const prix = prixMatch ? parseInt(prixMatch[1].replace(/\s/g, ''), 10) : 0;
        const surfMatch = texte.match(/(\d+)\s*m²/);
        const surface = surfMatch ? parseInt(surfMatch[1], 10) : 0;
        const cpMatch = texte.match(/\b(54|57)\d{3}\b/);
        const cp = cpMatch ? cpMatch[0] : '';
        const villeEl = $el.find('[class*="city"],[class*="ville"],[class*="town"]').first().text().trim();

        if (!TOUS_CP_SET.has(cp)) return;
        if (prix > 0 && prix > CRITERES.prixMax) return;
        if (surface > 0 && surface < CRITERES.surfaceMin) return;

        const id = `pap_${lienHref.match(/(\d+)/)?.[1] || Math.random()}`;
        const type = texte.toLowerCase().includes('immeuble') ? 'immeuble' : 'maison';
        const piecesMatch = texte.match(/(\d+)\s*pièces?/i);

        annonces.push({
          id,
          source: 'PAP',
          sourceColor: '#e63946',
          plateforme: 'pap',
          codePostal: cp,
          type,
          titre: `${type.charAt(0).toUpperCase() + type.slice(1)}${surface ? ' ' + surface + ' m²' : ''} — ${villeEl || cp}`,
          prix: prix || null,
          surface: surface || null,
          pieces: piecesMatch ? parseInt(piecesMatch[1], 10) : null,
          ville: villeEl || '',
          lien: fullLien,
          dateScrap: new Date().toISOString(),
        });
      });

      await pause(1000);
    } catch (err) {
      if (err.response?.status !== 404) {
        console.error(`  ⚠️  PAP dept ${dept}: ${err.response?.status || err.message}`);
      }
    }
  }

  return annonces;
}

// ------------------------------------------------------------
// Déduplication et sauvegarde
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
  console.log(`📍 ${CODES_A_SCRAPER.length} codes postaux | Sources: entreparticuliers.com + pap.fr`);
  console.log(`💶 Filtre : ≤ ${CRITERES.prixMax.toLocaleString('fr-FR')} € | ≥ ${CRITERES.surfaceMin} m²`);
  if (IS_TEST) console.log('🧪 MODE TEST\n');
  else console.log('');

  let existantes = [];
  if (fs.existsSync(OUTPUT_FILE)) {
    existantes = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf-8'));
    console.log(`📂 ${existantes.length} annonces déjà en base\n`);
  }

  const toutesNouveaux = [];

  // --- EntrePart ---
  console.log('🔍 EntrePart — scan par code postal...');
  let reqCount = 0;
  for (let i = 0; i < CODES_A_SCRAPER.length; i++) {
    const cp = CODES_A_SCRAPER[i];
    let totalCP = 0;
    for (const { url, plateforme } of buildUrlsEP(cp)) {
      const found = await scrapeEntreparticuliers(url, cp, plateforme);
      toutesNouveaux.push(...found);
      totalCP += found.length;
      reqCount++;
      if (reqCount % 5 === 0) await pause(DELAI_MS);
    }
    if (totalCP > 0) process.stdout.write(`   [${cp}] → ${totalCP} annonce(s)\n`);
    await pause(800);
  }

  // --- PAP ---
  console.log('\n🔍 PAP — scan départements 54 + 57...');
  const papAnnonces = await scrapePAP();
  toutesNouveaux.push(...papAnnonces);
  console.log(`   PAP → ${papAnnonces.length} annonce(s) trouvée(s) dans nos zones\n`);

  // Sauvegarder
  const { nbNouveaux, total } = sauvegarder(toutesNouveaux, existantes);

  console.log('✅ Scraping terminé');
  console.log(`📊 ${toutesNouveaux.length} trouvées | 🆕 ${nbNouveaux} nouvelles | 💾 Total : ${total}`);
}

main().catch(console.error);
