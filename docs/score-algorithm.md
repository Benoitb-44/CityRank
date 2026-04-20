# Skill : Algorithme Score — CityRank

## Vue d'ensemble
Le score CityRank (0-100) est un indicateur composite d'attractivité immobilière d'une commune. Il agrège 6 dimensions normalisées par percentile rank.

## Dimensions et Pondérations

| Dimension | Poids | Source | Direction | Logique |
|-----------|-------|--------|-----------|---------|
| Prix attractifs | 25% | DVF | Inverse | Prix bas = bon score |
| Performance DPE | 15% | ADEME | Direct | % A-C élevé = bon score |
| Fiscalité légère | 15% | data.economie | Inverse | Taxe basse = bon score |
| Équipements | 20% | BPE INSEE | Direct | Plus d'équipements/hab = bon score |
| Risques faibles | 10% | Géorisques | Inverse | Moins de risques = bon score |
| Dynamisme démo | 15% | INSEE | Direct | Croissance + revenus + emploi = bon score |

## Algorithme de Calcul

### Étape 1 : Valeur brute par dimension
```typescript
// Prix : prix m² médian de l'année la plus récente
score_prix_raw = dvf.prix_m2_median

// DPE : pourcentage de logements classés A, B ou C
score_dpe_raw = dpe.pct_a + dpe.pct_b + dpe.pct_c

// Fiscalité : taux de taxe foncière bâti
score_fiscalite_raw = fiscalite.taux_foncier_bati

// Équipements : score composite pour 1000 habitants
score_equipements_raw = (ecoles * 10 + medecins * 8 + commerces * 3 + gares * 15 + pharmacies * 5) / (population / 1000)

// Risques : score agrégé (somme pondérée des niveaux de risque)
score_risques_raw = inondation * 3 + seisme * 2 + radon * 1 + (catnat > 5 ? 3 : catnat > 2 ? 2 : 1)

// Démographie : composite normalisé
score_demo_raw = normalize(variation_pop_5ans) * 0.3 + normalize(revenu_median) * 0.4 + normalize(taux_emploi) * 0.3
```

### Étape 2 : Normalisation par percentile rank
```typescript
function percentileRank(values: number[], value: number): number {
  const below = values.filter(v => v < value).length;
  const equal = values.filter(v => v === value).length;
  return ((below + equal * 0.5) / values.length) * 100;
}

// Pour les dimensions "inverse" (prix, fiscalité, risques) :
// percentile_score = 100 - percentileRank(allValues, thisValue)
```

### Étape 3 : Score composite
```typescript
const score = Math.round(
  0.25 * percentile_prix +
  0.15 * percentile_dpe +
  0.15 * percentile_fiscalite +
  0.20 * percentile_equipements +
  0.10 * percentile_risques +
  0.15 * percentile_demo
);
```

### Étape 4 : Classement
```typescript
// Rang national : ORDER BY score_global DESC
// Rang départemental : PARTITION BY departement ORDER BY score_global DESC
```

## Gestion des Données Manquantes
- NULL → médiane nationale de la dimension
- Communes avec > 2 dimensions NULL → flag `fiabilite = 'faible'` affiché sur la page

## Interprétation du Score
| Plage | Label | Couleur |
|-------|-------|---------|
| 80-100 | Excellent | Vert foncé |
| 60-79 | Bon | Vert clair |
| 40-59 | Moyen | Orange |
| 20-39 | Faible | Orange foncé |
| 0-19 | Très faible | Rouge |
