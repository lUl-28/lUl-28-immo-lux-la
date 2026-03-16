# Contexte — Module Estimation Rénovation
> Document de cadrage — créé le 2026-03-16 | Mis à jour : 2026-03-16

---

## 1. OBJECTIF

Ajouter un module de **calcul d'estimation de coût de rénovation** au dashboard Immo Lux L&A existant (port 3001).
Ce module permet à Lucas et Adrien d'estimer le coût des travaux d'un bien identifié, pièce par pièce, avant de faire une offre.

---

## 2. DÉCISIONS DE CONCEPTION

| Paramètre | Décision |
|---|---|
| Intégration | Même dashboard Immo Lux L&A — nouvelle page `/renovation` |
| Utilisateurs | Lucas + Adrien |
| Tech stack | Node.js + Express + HTML vanilla (cohérent avec l'existant) |
| Base de prix | Recherchée et proposée — fixe dans le code pour l'instant |
| Édition des prix | Prévue dans une version future |
| Export | Affichage interactif uniquement (pas de PDF/Excel en phase 1) |
| Résultats | Ventilation détaillée par pièce + total général |
| Multi-pièces | Oui — plusieurs pièces du même type autorisées |

---

## 3. PIÈCES COUVERTES

| Pièce | Notes |
|---|---|
| Chambre | Multiple possible |
| Salon / Séjour | |
| Cuisine | |
| Salle de bain | Multiple possible |
| WC / Toilettes | Multiple possible |
| Couloir / Entrée | |
| Garage | |
| Cave | |
| Combles | |
| Façade | Travaux extérieurs |
| Toiture | |

---

## 4. TYPES DE TRAVAUX PAR PIÈCE

### Chambre
- Rénovation complète
- Peinture / revêtements muraux
- Sol (parquet, stratifié, moquette)
- Électricité
- Menuiseries intérieures (portes, fenêtres)
- Isolation (murs, sol, plafond)
- Plafond (placoplatre, peinture)

### Salon / Séjour
- Rénovation complète
- Peinture / revêtements muraux
- Sol (parquet, carrelage, stratifié)
- Électricité
- Menuiseries (fenêtres, portes)
- Isolation
- Plafond

### Cuisine
- Rénovation complète
- Cuisine équipée (meubles + électroménager)
- Plan de travail + crédence
- Plomberie (évier, robinetterie)
- Électricité
- Sol
- Peinture / revêtements muraux
- Ventilation (VMC / hotte)
- Menuiseries

### Salle de bain
- Rénovation complète
- Plomberie (douche/baignoire, lavabo, robinetterie)
- Carrelage mural
- Carrelage sol
- Électricité (normes pièce humide)
- Meuble vasque / WC suspendu
- Douche à l'italienne
- Ventilation (VMC)

### WC / Toilettes
- Rénovation complète
- Plomberie (WC, chasse d'eau)
- Carrelage sol
- Peinture / revêtements muraux
- Électricité
- WC suspendu

### Couloir / Entrée
- Rénovation complète
- Sol
- Peinture / revêtements muraux
- Électricité
- Portes intérieures

### Garage
- Rénovation complète
- Sol (béton, résine, carrelage)
- Électricité
- Porte de garage
- Isolation

### Cave
- Rénovation complète
- Traitement humidité / étanchéité
- Sol
- Électricité
- Isolation

### Combles
- Rénovation complète (aménagement)
- Isolation combles perdus
- Isolation + aménagement
- Velux / fenêtres de toit
- Électricité
- Sol
- Cloisons (placoplatre)

### Façade
- Ravalement complet
- Peinture façade
- Isolation thermique extérieure (ITE)
- Enduit
- Nettoyage / hydrofuge

### Toiture
- Réfection complète
- Réparations ponctuelles (tuiles)
- Isolation toiture
- Charpente
- Gouttières / zinguerie

---

## 5. NIVEAUX DE GAMME

| Niveau | Description |
|---|---|
| Entrée de gamme | Matériaux standards, main d'œuvre économique |
| Milieu de gamme | Bon rapport qualité/prix, matériaux courants |
| Haut de gamme | Matériaux premium, finitions soignées |

---

## 6. STRUCTURE DE PRIX (€/m² — fourchette min/max)

> Prix moyens constatés en France (2024-2025), zone Est (Lorraine)
> Unité : €/m² sauf mentions forfait (€/unité)

### Chambre

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 150–200 | 250–350 | 400–600 |
| Peinture / murs | 15–25 | 30–50 | 60–100 |
| Sol (parquet/stratifié) | 20–40 | 50–80 | 100–200 |
| Électricité | 25–40 | 50–70 | 80–120 |
| Menuiseries (fenêtres) | 300–500/u | 600–900/u | 1000–1800/u |
| Isolation | 30–50 | 60–90 | 100–160 |
| Plafond | 10–20 | 25–40 | 50–80 |

### Salon / Séjour

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 150–200 | 250–350 | 400–600 |
| Peinture / murs | 15–25 | 30–50 | 60–100 |
| Sol | 20–50 | 60–100 | 120–250 |
| Électricité | 25–40 | 50–70 | 80–120 |
| Menuiseries | 300–500/u | 600–900/u | 1000–1800/u |
| Isolation | 30–50 | 60–90 | 100–160 |
| Plafond | 10–20 | 25–40 | 50–80 |

### Cuisine

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 400–600 | 700–1000 | 1200–2000 |
| Cuisine équipée | 150–250 | 300–600 | 700–1500 |
| Plan de travail + crédence | 80–150 | 200–350 | 400–800 |
| Plomberie | 800–1200/forfait | 1500–2500/f | 3000–5000/f |
| Électricité | 30–50 | 60–90 | 100–150 |
| Sol | 20–40 | 50–80 | 100–200 |
| Peinture / murs | 15–25 | 30–50 | 60–100 |
| Ventilation | 300–500/f | 600–900/f | 1000–1800/f |

### Salle de bain

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 600–900 | 1000–1500 | 1800–3000 |
| Plomberie | 1500–2500/f | 3000–4500/f | 5000–9000/f |
| Carrelage mural | 40–70 | 80–120 | 150–300 |
| Carrelage sol | 30–60 | 70–110 | 130–250 |
| Électricité | 40–60 | 70–100 | 120–180 |
| Meuble vasque | 200–400/f | 500–900/f | 1000–2500/f |
| Douche à l'italienne | 1000–1800/f | 2000–3500/f | 4000–8000/f |
| Ventilation VMC | 300–500/f | 600–900/f | 1000–1500/f |

### WC / Toilettes

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 400–700/f | 800–1200/f | 1500–2500/f |
| Plomberie | 500–800/f | 900–1400/f | 1500–2500/f |
| Carrelage sol | 30–60 | 70–110 | 130–250 |
| Peinture / murs | 15–25 | 30–50 | 60–100 |
| Électricité | 150–250/f | 300–500/f | 600–1000/f |
| WC suspendu | 400–700/f | 800–1200/f | 1500–2500/f |

### Couloir / Entrée

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 100–160 | 180–260 | 300–500 |
| Sol | 20–40 | 50–80 | 100–200 |
| Peinture / murs | 15–25 | 30–50 | 60–100 |
| Électricité | 20–35 | 40–60 | 70–110 |
| Portes intérieures | 200–400/u | 500–800/u | 900–2000/u |

### Garage

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 80–150 | 180–280 | 320–500 |
| Sol | 20–40 | 50–80 | 100–180 |
| Électricité | 25–40 | 50–70 | 80–130 |
| Porte de garage | 800–1200/f | 1500–2500/f | 3000–5000/f |
| Isolation | 30–50 | 60–90 | 100–160 |

### Cave

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète | 100–180 | 200–320 | 380–600 |
| Traitement humidité | 50–100 | 120–200 | 250–500 |
| Sol | 20–40 | 50–80 | 100–180 |
| Électricité | 20–35 | 40–60 | 70–110 |
| Isolation | 30–50 | 60–90 | 100–160 |

### Combles

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Rénovation complète (aménagement) | 300–500 | 600–900 | 1000–1600 |
| Isolation perdus | 20–40 | 45–70 | 80–130 |
| Isolation + aménagement | 60–100 | 120–180 | 220–350 |
| Velux / fenêtre de toit | 800–1200/u | 1500–2200/u | 2500–4000/u |
| Électricité | 25–40 | 50–70 | 80–120 |
| Sol | 20–35 | 40–65 | 80–150 |
| Cloisons | 30–50 | 60–90 | 100–160 |

### Façade

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Ravalement complet | 30–50 | 60–90 | 100–180 |
| Peinture façade | 15–25 | 30–50 | 60–100 |
| Isolation extérieure (ITE) | 100–150 | 160–220 | 250–400 |
| Enduit | 20–35 | 40–65 | 80–140 |
| Nettoyage / hydrofuge | 8–15 | 18–30 | 35–60 |

### Toiture

| Travaux | Entrée | Milieu | Haut |
|---|---|---|---|
| Réfection complète | 80–130 | 150–220 | 250–400 |
| Réparations ponctuelles | 20–40 | 50–80 | 100–180 |
| Isolation toiture | 30–60 | 70–110 | 130–220 |
| Charpente | 50–90 | 100–160 | 180–300 |
| Gouttières / zinguerie | 20–35/ml | 40–65/ml | 70–120/ml |

---

## 7. ARCHITECTURE TECHNIQUE

```
dashboard/public/renovation.html     # Page principale du module
config/renovation_prices.js          # Base de prix de référence
dashboard/server.js                  # + route GET /renovation + GET /api/renovation/prices
```

---

## 8. FONCTIONNALITÉS DU MODULE

### Interface utilisateur
- [ ] Bouton "Ajouter une pièce"
- [ ] Sélecteur type de pièce (11 types)
- [ ] Nom personnalisé optionnel (ex : "Chambre parentale")
- [ ] Surface en m²
- [ ] Sélecteur gamme (3 niveaux)
- [ ] Checkboxes types de travaux (liste spécifique à chaque pièce)
- [ ] Suppression d'une pièce
- [ ] Calcul en temps réel

### Résultats
- [ ] Fourchette min/max par pièce
- [ ] Total général min/max
- [ ] Ventilation détaillée par pièce et par poste
- [ ] Indicateur de niveau de rénovation global

---

## 9. PLAN D'ACTION

| Étape | Description | Statut |
|---|---|---|
| 1 | Créer `config/renovation_prices.js` — base de données complète des prix | ✅ Fait |
| 2 | Ajouter routes dans `dashboard/server.js` | ✅ Fait |
| 3 | Créer `dashboard/public/renovation.html` — structure HTML + CSS | ✅ Fait |
| 4 | Logique JS — ajout/suppression de pièces, calcul temps réel | ✅ Fait |
| 5 | Affichage résultats — ventilation détaillée + total | ✅ Fait |
| 6 | Navigation — ajouter lien dans les pages existantes | ✅ Fait |
| 7 | Tests & ajustements des prix | ✅ Fait |

---

*Document vivant — mis à jour à chaque étape.*
