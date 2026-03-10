// ============================================================
// DASHBOARD SERVER — Projet Immo Lux L&A
// Express — port 3001
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const { spawn } = require('child_process');
const { genererTousLesLiens, CRITERES } = require('../config/links');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ------------------------------------------------------------
// SCRAPER — lancement automatique
// ------------------------------------------------------------
let scraperRunning = false;
let derniereScrape = null;
let prochaineScrape = null;

const SCRAPER_PATH = path.join(__dirname, '../agents/scraper/scraper.js');
const SCRAPE_INTERVAL = 30 * 60 * 1000; // 30 minutes

function runScraper() {
  if (scraperRunning) return false;
  scraperRunning = true;
  derniereScrape = new Date().toISOString();
  prochaineScrape = new Date(Date.now() + SCRAPE_INTERVAL).toISOString();
  console.log('🔄 Scraper lancé...');
  const proc = spawn('node', [SCRAPER_PATH], { stdio: 'inherit' });
  proc.on('close', (code) => {
    scraperRunning = false;
    console.log(`✅ Scraper terminé (code ${code})`);
  });
  proc.on('error', (err) => {
    scraperRunning = false;
    console.error('❌ Erreur scraper:', err.message);
  });
  return true;
}

// Lancement au démarrage (après 3s)
setTimeout(runScraper, 3000);

// Lancement toutes les 30 minutes
setInterval(runScraper, SCRAPE_INTERVAL);

// ------------------------------------------------------------
// API
// ------------------------------------------------------------

// Annonces scrappées
app.get('/api/annonces', (_, res) => {
  const file = path.join(__dirname, '../data/biens/annonces.json');
  if (fs.existsSync(file)) {
    res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } else {
    res.json([]);
  }
});

// Statut du scraper
app.get('/api/status', (_, res) => {
  res.json({ running: scraperRunning, derniereScrape, prochaineScrape });
});

// Déclenchement manuel du scraper
app.post('/api/refresh', (_, res) => {
  const launched = runScraper();
  res.json({ launched, running: scraperRunning, derniereScrape });
});

// Liens filtrés par ring et site
app.get('/api/liens', (_, res) => {
  res.json(genererTousLesLiens());
});

// Critères de recherche
app.get('/api/criteres', (_, res) => {
  res.json(CRITERES);
});

// Données marché DVF
app.get('/api/marche', (_, res) => {
  const file = path.join(__dirname, '../data/rapport_dvf.json');
  if (fs.existsSync(file)) {
    res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } else {
    res.json([]);
  }
});

// Page marché
app.get('/marche', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marche.html'));
});

app.listen(PORT, () => {
  console.log(`\n🏠 Dashboard Immo Lux L&A`);
  console.log(`🌐 http://localhost:${PORT}\n`);
});
