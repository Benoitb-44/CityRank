# Règle : Qualité des Données — CityRank

## Principes
1. **NULL ≠ 0** : Une commune sans données DVF a `prix_m2_median = NULL`, pas `0`
2. **Idempotence** : Toute ingestion peut être rejouée sans effet de bord (UPSERT)
3. **Traçabilité** : Chaque table a un champ `updated_at` mis à jour à chaque ingestion
4. **Complétude** : Après ingestion, vérifier que les ~35 000 communes COG sont présentes dans la table `communes`

## Validation Post-Ingestion
Après chaque script d'ingestion, loguer :
- Nombre de communes traitées vs nombre attendu
- Nombre de valeurs NULL par champ
- Min/Max/Médiane des valeurs numériques (détection d'anomalies)
- Temps d'exécution

## Gestion des Données Manquantes pour le Score
- Si une dimension est NULL → utiliser la médiane nationale de cette dimension
- Jamais exclure une commune du scoring — toute commune a un score
- Flaguer les communes avec > 2 dimensions manquantes (fiabilité du score réduite)

## Sources Officielles
Toujours utiliser les URLs d'API officielles. Ne jamais scraper de sites tiers.
Citer la source et la date de dernière mise à jour sur chaque page commune.
