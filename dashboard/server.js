// ============================================================
// DASHBOARD SERVER — Projet Immo Lux L&A
// Express — port 3001
// ============================================================

const express = require('express');
const path = require('path');
const fs = require('fs');
const { genererTousLesLiens, CRITERES } = require('../config/links');
const { PIECES, GAMMES, MODES, UNITE_LABELS, MARGE_IMPREVUS } = require('../config/renovation_prices');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const BIENS_FILE = path.join(__dirname, '../data/annonces/prospection.json');
function loadBiens() {
  if (!fs.existsSync(BIENS_FILE)) return [];
  return JSON.parse(fs.readFileSync(BIENS_FILE, 'utf-8'));
}
function saveBiens(data) {
  fs.writeFileSync(BIENS_FILE, JSON.stringify(data, null, 2));
}

// API — données marché DVF
app.get('/api/marche', (_, res) => {
  const file = path.join(__dirname, '../data/marche/rapport_dvf.json');
  if (fs.existsSync(file)) {
    res.json(JSON.parse(fs.readFileSync(file, 'utf-8')));
  } else {
    res.json([]);
  }
});

// API — liens filtrés par ring et site
app.get('/api/liens', (_, res) => {
  res.json(genererTousLesLiens());
});

// API — critères de recherche
app.get('/api/criteres', (_, res) => {
  res.json(CRITERES);
});

// API — biens prospection
app.get('/api/biens', (_, res) => res.json(loadBiens()));

app.post('/api/biens', (req, res) => {
  const biens = loadBiens();
  const bien = { ...req.body, id: Date.now().toString(), createdAt: new Date().toISOString() };
  biens.push(bien);
  saveBiens(biens);
  res.json(bien);
});

app.put('/api/biens/:id', (req, res) => {
  const biens = loadBiens();
  const idx = biens.findIndex(b => b.id === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'not found' });
  biens[idx] = { ...biens[idx], ...req.body, updatedAt: new Date().toISOString() };
  saveBiens(biens);
  res.json(biens[idx]);
});

app.delete('/api/biens/:id', (req, res) => {
  const biens = loadBiens().filter(b => b.id !== req.params.id);
  saveBiens(biens);
  res.json({ ok: true });
});

// Import complet (remplace tout)
app.post('/api/biens/import', (req, res) => {
  if (!Array.isArray(req.body)) return res.status(400).json({ error: 'Array expected' });
  saveBiens(req.body);
  res.json({ ok: true, count: req.body.length });
});

// API — base de prix rénovation
app.get('/api/renovation/prices', (_, res) => {
  res.json({ pieces: PIECES, gammes: GAMMES, modes: MODES, uniteLabels: UNITE_LABELS, margeImprevus: MARGE_IMPREVUS });
});

// Page marché
app.get('/marche', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'marche.html'));
});

// Page prospection
app.get('/prospection', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'prospection.html'));
});

// Page rénovation
app.get('/renovation', (_, res) => {
  res.sendFile(path.join(__dirname, 'public', 'renovation.html'));
});

// Redirection racine → prospection
app.get('/', (_, res) => {
  res.redirect('/prospection');
});

app.listen(PORT, () => {
  console.log(`\n🏠 Dashboard Immo Lux L&A`);
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🔧 diyCoef check: ${PIECES[0].travaux[0].id} → ${PIECES[0].travaux[0].diyCoef ?? 'ABSENT ❌'}\n`);
});
