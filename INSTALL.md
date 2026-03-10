# INSTALL — Projet Immo Lux L&A

## Prérequis

- **Node.js** v18+ installé sur ta machine → https://nodejs.org
- **Git** (optionnel)

---

## Installation (1 seule fois)

```bash
# 1. Aller dans le dossier du projet
cd "Projet Immo Lux L&A"

# 2. Installer les dépendances Node.js
npm install

# 3. Installer Chromium pour Playwright (télécharge ~110 Mo)
npx playwright install chromium
```

---

## Lancer le scraper

### Mode test (5 codes postaux, rapide)
```bash
npm test
```

### Mode complet (tous les codes postaux)
```bash
npm run scrape
```

---

## Résultats

Les annonces sont sauvegardées dans :
```
data/biens/annonces.json
```

---

## Ajouter d'autres sources

Le scraper utilise actuellement **entreparticuliers.com** (accessible sans navigateur).

Pour activer **Leboncoin / SeLoger** (nécessitent Playwright) :
- Le fichier `agents/scraper/scraper.js` est déjà préparé
- Il suffit d'ajouter les fonctions de scraping Playwright pour chaque site

---

## Structure du projet

```
Projet Immo Lux L&A/
├── config/
│   └── settings.js        ← Modifier ici les critères et codes postaux
├── agents/
│   └── scraper/
│       └── scraper.js     ← Le scraper principal
├── data/
│   └── biens/
│       └── annonces.json  ← Résultats (créé automatiquement)
├── CONTEXTE.md
└── INSTALL.md
```
