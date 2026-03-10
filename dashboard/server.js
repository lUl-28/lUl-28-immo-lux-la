// ============================================================
// DASHBOARD SERVER — Projet Immo Lux L&A
// Express — port 3001
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const { genererTousLesLiens, CRITERES } = require('../config/links');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.static(path.join(__dirname, 'public')));

// API — liens filtrés par ring et par site
app.get('/api/liens', (_, res) => {
  res.json(genererTousLesLiens());
});

// API — critères de recherche
app.get('/api/criteres', (_, res) => {
  res.json(CRITERES);
});

// API — annonces déjà trouvées (si le scraper a tourné)
app.get('/api/annonces', (_, res) => {
  const file = path.join(__dirname, '../data/biens/annonces.json');
  if (fs.existsSync(file)) {
    res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } else {
    res.json([]);
  }
});

// API — données marché DVF par commune
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
