# CONTEXTE — Projet Immo Lux L&A

> Document de cadrage — mis à jour le 2026-02-25

---

## 1. IDENTITÉ DU PROJET

| Champ | Valeur |
|---|---|
| Nom du projet | Projet Immo Lux — L&A |
| Porteurs | Lucas Lamquet (L) + Adrien (A) |
| Objectif court terme | Revenus passifs (location) |
| Objectif moyen terme | Revente avec plus-value |
| Structure juridique | SCI (Société Civile Immobilière) |
| Statut | ✅ Cadrage validé — phase recherche |

---

## 2. STRATÉGIE D'INVESTISSEMENT

### Pourquoi cette zone ?
- **+60 000 emplois au Luxembourg d'ici 2030**
- Fort afflux de travailleurs frontaliers cherchant à se loger côté français (loyers bien inférieurs au Luxembourg)
- Dynamique de demande locative structurelle et durable

### Modèle visé
- Acheter un bien à rénover (pas de gros œuvre dans un premier temps)
- Le diviser en **2 appartements T2 de ~50 m² chacun** (seule copropriété)
- Louer les 2 lots pour générer des revenus passifs
- Option revente à moyen terme

---

## 3. CRITÈRES DE SÉLECTION

### Géographie
| Critère | Valeur |
|---|---|
| Pays | France |
| Zone cible | Rayon 60 km autour de la frontière luxembourgeoise |
| Départements concernés | Meurthe-et-Moselle (54), Moselle (57), Meuse (55) |
| Commune de référence | Trieux (54) — déjà identifiée |
| Communes pertinentes | Longwy, Briey, Homécourt, Jœuf, Mont-Saint-Martin, Villerupt, Thionville, Hayange, Florange, Yutz |

### Bien immobilier
| Critère | Valeur |
|---|---|
| Type | Maison, immeuble — tout bien divisible |
| Condition | Bien à rénover (pas de gros œuvre dans un premier temps) |
| Surface minimale | 100 m² |
| Division visée | 2 lots de ~50 m² chacun |
| Type de lots | T2 (1 chambre séparée) |
| Copropriété | Aucune — seuls propriétaires |
| Parking | Obligatoire (existant ou à créer selon PLU) |

### Budget
| Poste | Montant |
|---|---|
| **Budget tout compris (achat + travaux)** | **250 000 € max** |
| Prix d'achat estimé max | ~180 000 à 200 000 € |
| Budget travaux estimé | ~50 000 à 70 000 € |

---

## 4. RENTABILITÉ ESTIMÉE

| Indicateur | Valeur |
|---|---|
| Loyer estimé par T2 (50 m²) | ~500 à 600 €/mois |
| Revenu brut mensuel (2 lots) | ~1 000 à 1 200 €/mois |
| Revenu brut annuel | ~12 000 à 14 400 € |
| Rendement brut estimé | **5,2 % à 6,3 %** |
| Rendement net (après charges) | ~4 à 5 % |

> Acceptable pour cette stratégie — la plus-value à la revente est le levier principal à moyen terme, le rendement locatif couvre les charges et génère un flux positif.

---

## 5. PLU & ASPECTS RÉGLEMENTAIRES

- Vérifier la faisabilité de division dans chaque commune (PLU)
- Places de parking : à intégrer dans le projet (souvent exigé par PLU)
- Statut SCI : permet de partager les parts entre associés et d'optimiser la fiscalité
- Division en 2 lots = pas de règles de copropriété complexes si bien isolé

---

## 6. SITES À SCRAPER

| Site | Type |
|---|---|
| leboncoin.fr | Particuliers + agences |
| seloger.com | Agences |
| pap.fr | Particuliers |
| logic-immo.com | Agences |
| bienici.com | Agrégateur |

---

## 7. FONCTIONNALITÉS ATTENDUES DE L'OUTIL

- [x] Scraping quotidien automatique des annonces
- [x] Filtrage selon critères (prix ≤ 180K, surface ≥ 100m², zone 60km LU)
- [x] Scoring automatique du potentiel de division
- [x] Vérification parking (mention dans annonce)
- [ ] Dashboard de visualisation (phase 2)
- [ ] Alertes email (phase 2)
- [ ] Accès multi-utilisateurs Lucas + Adrien (phase 2)

---

## 8. ARCHITECTURE TECHNIQUE CIBLE

```
Projet Immo Lux L&A/
├── config/
│   └── settings.js          # Critères, zones géo, budget, seuils
├── agents/
│   ├── scraper/             # Scraping multi-plateformes
│   ├── scorer/              # Scoring potentiel de division
│   └── notifier/            # Alertes email (phase 2)
├── data/
│   └── biens/
│       └── annonces.json    # Base de données des annonces filtrées
├── dashboard/               # Interface web (phase 2)
│   ├── server.js
│   └── public/
├── scripts/
│   └── cron.js              # Tâche quotidienne automatique
├── package.json
└── CONTEXTE.md
```

### Stack technique
| Composant | Technologie |
|---|---|
| Langage | Node.js |
| Scraping | Axios + Cheerio / Playwright (selon protection) |
| Base de données | JSON (évolutif vers SQLite) |
| Planification | node-cron |
| Dashboard | Express + HTML (phase 2) |
| Alertes | Microsoft Graph API / Outlook (phase 2) |

---

## 9. ZONES GÉOGRAPHIQUES (rayon 60 km frontière LU)

### Meurthe-et-Moselle (54)
Longwy, Trieux, Briey, Homécourt, Jœuf, Herserange, Mont-Saint-Martin, Villerupt

### Moselle (57)
Thionville, Yutz, Florange, Hayange, Fameck, Uckange, Metz (limite 60km)

### Meuse (55)
Stenay, Montmédy

---

*Document vivant — mis à jour à chaque session de travail.*
