# Commande /sprint-update

Met à jour le Journal de Sessions Notion avec le résumé de la session en cours.

## Usage
```
/sprint-update
```

## Comportement
1. Lire la page Journal de Sessions Immo Score dans Notion
2. Archiver la "Dernière Session" existante dans un toggle
3. Écrire la nouvelle session en haut :
   - Date et thème
   - Résumé des décisions
   - Tickets complétés
   - Problèmes rencontrés
   - Next steps

---

# Commande /ingest-data

Lance un script d'ingestion de données pour une source spécifique.

## Usage
```
/ingest-data [source]
```
Sources : `communes`, `dvf`, `dpe`, `bpe`, `risques`, `fiscalite`, `demo`, `all`

## Comportement
1. Exécuter le script `src/scripts/ingest-[source].ts`
2. Afficher le résultat (communes traitées, erreurs, durée)
3. Si `all` : exécuter tous les scripts dans l'ordre, puis `compute-scores`
4. Proposer de lancer la revalidation ISR si des données ont changé

---

# Commande /compute-scores

Recalcule le score composite pour toutes les communes.

## Usage
```
/compute-scores
```

## Comportement
1. Exécuter `src/scripts/compute-scores.ts`
2. Afficher les statistiques : distribution des scores, top 10, bottom 10
3. Comparer avec le calcul précédent (nb communes dont le score a changé de > 5 points)
4. Proposer de revalider les pages impactées
