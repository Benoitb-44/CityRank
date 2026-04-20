# CityRank — OS v2 : Document Stratégique Fondateur

> **Date** : 13 avril 2026
> **Auteur** : Benoît (Founder) + Claude (Mode CEO → PM → CTO)
> **Statut** : V1 — Prêt pour exécution

---

## PARTIE 1 — MODE CEO : Vision, Positionnement & OKRs

### 1.1 Vision

**BLUF** : Devenir la référence française du scoring immobilier communal en exploitant exclusivement l'open data, avec un modèle économique progressif (SEO → affiliation → API B2B).

**Énoncé de vision** :
> CityRank démocratise l'intelligence immobilière locale. Chaque commune de France dispose d'une page publique, gratuite, avec un score d'attractivité objectif et transparent basé à 100% sur des données publiques. Là où les portails immobiliers vendent des estimations opaques, CityRank offre la transparence comme produit.

### 1.2 Positionnement

| Critère | MeilleursAgents | Villedereve.fr | CityRank |
|---------|----------------|----------------|------------|
| Couverture | ~15 000 communes | ~35 000 communes | ~35 000 communes |
| Sources données | Propriétaires + notaires | Open data INSEE/ADEME | Open data DVF/ADEME/INSEE/Géorisques |
| Score propriétaire | Non (estimation prix) | Oui (score qualité vie) | Oui (score attractivité immo 0-100) |
| Business model | Lead gen agences | AdSense | AdSense → Affiliation → API |
| DPE intégré | Non | Partiellement | Oui (API ADEME) |
| Risques naturels | Non | Partiellement | Oui (Géorisques) |
| Taxe foncière | Non | Non | Oui (data.economie.gouv) |

**Positionnement différenciant** : CityRank est le seul site à combiner prix réels (DVF), performance énergétique (DPE), fiscalité locale (taxe foncière), équipements (BPE) ET risques naturels en un score unique. Villedereve couvre la qualité de vie ; CityRank couvre la décision d'investissement.

### 1.3 Hypothèses à Valider

| # | Hypothèse | Signal de validation | Seuil | Deadline |
|---|-----------|---------------------|-------|----------|
| H1 | Les pages programmatiques se positionnent sur "immobilier + [commune]" | Pages indexées + impressions GSC | 1 000 pages indexées, 500 clics/semaine | M+3 |
| H2 | Le score composite génère de l'engagement (temps passé, rebond) | Analytics | Temps moyen > 2min, rebond < 65% | M+3 |
| H3 | Le trafic organique croît linéairement avec le nombre de pages | GSC + Analytics | Corrélation pages/trafic R² > 0.7 | M+4 |
| H4 | L'affiliation courtier convertit sur du trafic intentionnel | Taux conversion formulaire | > 0.5% des visiteurs page commune | M+8 |
| H5 | Des professionnels paieraient pour un accès API aux scores | Interviews + landing page test | 10 inscriptions waitlist qualifiées | M+10 |

### 1.4 OKRs Phase 1 (M0 → M3)

**Objective 1 : Construire le pipeline de données open data**
- KR1 : 6/6 sources de données intégrées et actualisables (DVF, DPE, BPE, Géorisques, Taxe Foncière, INSEE)
- KR2 : Algorithme de score composite v1 documenté et testé sur 100 communes de référence
- KR3 : Pipeline d'ingestion automatisé (cron ou n8n) avec refresh mensuel

**Objective 2 : Lancer le SEO programmatique**
- KR1 : 35 000 pages communes générées et déployées
- KR2 : Sitemap dynamique + robots.txt + structured data (LocalBusiness schema)
- KR3 : 5 000 pages indexées dans Google (GSC) à M+3

**Objective 3 : Valider le product-market fit SEO**
- KR1 : 10 000 visites organiques/mois à M+3
- KR2 : 3 articles de blog "pillar content" publiés (guide investissement, comparatif régions, guide DPE)
- KR3 : AdSense activé et premier revenu généré

---

## PARTIE 2 — MODE PM : Roadmap & Backlog

### 2.1 Features Phase 1 (MVP) avec JTBD

| ID | Feature | JTBD (Job To Be Done) | User Story |
|----|---------|----------------------|------------|
| F1 | Page commune avec données agrégées | "Quand je cherche à acheter dans une commune, je veux voir toutes les données clés en un coup d'œil pour décider si ça vaut le coup d'investiguer plus" | En tant qu'acheteur potentiel, je veux voir les prix, DPE, taxe foncière, équipements et risques d'une commune sur une seule page |
| F2 | Score composite CityRank (0-100) | "Je veux un indicateur simple qui me dit si cette commune est un bon investissement comparé aux autres" | En tant qu'investisseur, je veux un score synthétique pour comparer rapidement les communes entre elles |
| F3 | Recherche commune (autocomplete) | "Je veux trouver ma commune en tapant son nom" | En tant qu'utilisateur, je veux une barre de recherche avec autocomplétion sur les 35 000 communes |
| F4 | Pages SEO optimisées (meta, schema, sitemap) | "Google doit trouver et comprendre chaque page" | En tant que moteur de recherche, je veux des pages avec title, description, structured data et sitemap |
| F5 | Comparateur 2-3 communes | "Je veux mettre côte à côte deux communes pour voir laquelle est mieux" | En tant qu'acheteur hésitant, je veux comparer 2 ou 3 communes sur les mêmes critères |
| F6 | Blog pillar content | "Je cherche des guides sur l'investissement immobilier" | En tant que prospect SEO, je veux des articles de fond qui répondent à mes questions |
| F7 | Landing page + waitlist API | "Je suis professionnel et je veux accéder à ces données par API" | En tant qu'agent immobilier, je veux m'inscrire pour être prévenu quand l'API sera disponible |

### 2.2 Priorisation RICE

| Feature | Reach (1-10) | Impact (1-10) | Confidence (%) | Effort (semaines) | Score RICE |
|---------|-------------|---------------|----------------|-------------------|------------|
| F1 - Page commune | 10 | 10 | 90% | 4 | 225 |
| F4 - SEO technique | 10 | 9 | 95% | 1 | 855 |
| F2 - Score composite | 8 | 8 | 70% | 2 | 224 |
| F3 - Recherche commune | 7 | 6 | 90% | 1 | 378 |
| F6 - Blog pillar | 6 | 7 | 80% | 2 | 168 |
| F5 - Comparateur | 5 | 7 | 75% | 2 | 131 |
| F7 - Waitlist API | 3 | 5 | 60% | 0.5 | 180 |

**Ordre d'exécution** : F4 → F1 → F3 → F2 → F7 → F6 → F5

### 2.3 Backlog Structuré Phase 1

#### Sprint 0 — Fondations (Semaine 1)
- [ ] INFRA-01 : Créer le repo `cityrank` sur GitHub
- [ ] INFRA-02 : Setup Next.js 14 (App Router) + Tailwind + TypeScript
- [ ] INFRA-03 : Setup PostgreSQL (schéma `immo_score` sur le VPS existant ou DB dédiée)
- [ ] INFRA-04 : Docker Compose prod + GitHub Actions CI/CD
- [ ] INFRA-05 : Configurer `score.homilink.fr` ou `immoscore.fr` (nginx server block)

#### Sprint 1 — Pipeline de Données (Semaines 2-3)
- [ ] DATA-01 : Script d'ingestion DVF → table `dvf_transactions` (prix m², nb transactions par commune/an)
- [ ] DATA-02 : Script d'ingestion API DPE ADEME → table `dpe_communes` (répartition A-G, DPE moyen)
- [ ] DATA-03 : Script d'ingestion BPE INSEE → table `equipements_communes` (nb écoles, médecins, commerces)
- [ ] DATA-04 : Script d'ingestion Géorisques → table `risques_communes` (niveaux risque par type)
- [ ] DATA-05 : Script d'ingestion taxe foncière → table `fiscalite_communes` (taux, montant moyen)
- [ ] DATA-06 : Script d'ingestion INSEE démographie → table `demo_communes` (population, revenus, emploi)
- [ ] DATA-07 : Table `communes` (code INSEE, nom, département, région, coordonnées GPS, slug URL)
- [ ] DATA-08 : Script d'agrégation → table `scores_communes` (score composite calculé)

#### Sprint 2 — Pages Programmatiques (Semaines 3-4)
- [ ] SEO-01 : Route dynamique `/commune/[slug]` avec ISR (Incremental Static Regeneration)
- [ ] SEO-02 : Template page commune (hero + score + sections données + CTA)
- [ ] SEO-03 : Composant score visuel (jauge circulaire 0-100 avec couleur)
- [ ] SEO-04 : Structured data JSON-LD (LocalBusiness / Place)
- [ ] SEO-05 : Meta tags dynamiques (title, description, og:image)
- [ ] SEO-06 : Sitemap XML dynamique (`/sitemap.xml` → 35 000 URLs)
- [ ] SEO-07 : robots.txt + canonical URLs
- [ ] SEO-08 : Internal linking (communes voisines, même département)

#### Sprint 3 — UX & Engagement (Semaine 5)
- [ ] UX-01 : Barre de recherche commune avec autocomplete (API route `/api/search?q=`)
- [ ] UX-02 : Page d'accueil (hero + recherche + top communes + dernières recherches)
- [ ] UX-03 : Page département (liste communes avec scores)
- [ ] UX-04 : Page comparateur (sélection 2-3 communes, tableau comparatif)
- [ ] UX-05 : Footer avec liens légaux, mentions, plan du site

#### Sprint 4 — Content & Monétisation (Semaine 6)
- [ ] CONTENT-01 : Blog engine (MDX ou CMS léger)
- [ ] CONTENT-02 : Article pillar #1 — "Guide investissement immobilier 2026 par commune"
- [ ] CONTENT-03 : Article pillar #2 — "Comprendre le DPE : impact sur la valeur de votre bien"
- [ ] CONTENT-04 : Article pillar #3 — "Taxe foncière : les communes les moins chères de France"
- [ ] MONET-01 : Intégration AdSense (placement non intrusif)
- [ ] MONET-02 : Landing page waitlist API B2B
- [ ] MONET-03 : Setup analytics (Plausible ou Umami — self-hosted, RGPD)

---

## PARTIE 3 — MODE CTO : Architecture & ADRs

### 3.1 Vue d'Ensemble Architecture

```
┌─────────────────────────────────────────────────────┐
│                    INGESTION (n8n / cron)            │
│  DVF  DPE  BPE  Géorisques  TaxeFoncière  INSEE    │
└──────────────────────┬──────────────────────────────┘
                       │ ETL scripts (Python/Node)
                       ▼
┌─────────────────────────────────────────────────────┐
│              PostgreSQL (OVH VPS)                    │
│  communes │ dvf │ dpe │ equipements │ risques │ …   │
│                scores_communes (matérialisée)        │
└──────────────────────┬──────────────────────────────┘
                       │ Prisma / drizzle ORM
                       ▼
┌─────────────────────────────────────────────────────┐
│              Next.js 14 (App Router)                 │
│  /commune/[slug]  (ISR revalidate: 86400)           │
│  /departement/[code]                                 │
│  /comparer                                           │
│  /blog/[slug]                                        │
│  /api/search  /api/scores                            │
│  /sitemap.xml                                        │
└──────────────────────┬──────────────────────────────┘
                       │ Docker + nginx
                       ▼
┌─────────────────────────────────────────────────────┐
│           OVH VPS (37.59.122.208)                    │
│  nginx → Next.js container                           │
│  PostgreSQL container (shared avec Homilink)         │
│  n8n container (n8n.homilink.fr)                     │
└─────────────────────────────────────────────────────┘
```

### 3.2 ADR-IS-001 : Stack Technique

**Décision** : Next.js 14 (App Router) + PostgreSQL + Prisma + Docker sur OVH VPS existant.

**Justification** :
- Next.js 14 avec ISR = parfait pour le SEO programmatique (pages pré-rendues, revalidation quotidienne)
- PostgreSQL partagé avec Homilink mais schéma séparé (`immo_score`) — isolation sans coût supplémentaire
- Prisma plutôt que Drizzle : meilleur support des vues matérialisées et des raw queries complexes pour l'agrégation
- Docker Compose distinct (`docker-compose.immo.yml`) pour éviter tout conflit avec Homilink

**Alternative écartée** : Astro (SSG pur) — écarté car 35 000 pages statiques = build time trop long + pas de revalidation incrémentale.

### 3.3 ADR-IS-002 : Stratégie ISR pour le SEO Programmatique

**Décision** : Incremental Static Regeneration avec `revalidate: 86400` (24h) + on-demand revalidation après refresh données.

**Justification** :
- 35 000 pages ne peuvent pas être générées au build (timeout)
- ISR génère les pages à la première visite puis les cache
- Revalidation quotidienne = données fraîches sans rebuild
- On-demand revalidation via API route `/api/revalidate?secret=XXX&slug=bordeaux` après ingestion

**Alternative écartée** : SSR pur — trop lent pour le SEO (TTFB élevé), Google pénalise.

### 3.4 ADR-IS-003 : Isolation Homilink / CityRank

**Décision** : Même VPS, même instance PostgreSQL, mais schéma séparé, Docker Compose séparé, repo GitHub séparé, sous-domaine séparé.

**Justification** :
- Budget < 50€/mois → pas de second VPS
- Schéma PostgreSQL `immo_score` = isolation logique suffisante
- Docker Compose séparé = déploiements indépendants
- `immoscore.homilink.fr` ou domaine dédié `immoscore.fr` (~10€/an)

**Risque** : Si le VPS sature (RAM/CPU), les deux projets souffrent. Mitigation : monitoring avec alertes (Uptime Kuma déjà en place ?) + migration vers VPS dédié si le trafic le justifie.

### 3.5 ADR-IS-004 : Pipeline d'Ingestion Données

**Décision** : Scripts Node.js/TypeScript orchestrés par n8n, exécution mensuelle.

**Justification** :
- n8n déjà installé sur le VPS → réutilisation
- Scripts TS = cohérence avec la stack Next.js (un seul langage)
- Mensuel = suffisant (DVF mis à jour trimestriellement, DPE en continu mais pas critique)
- Chaque script : fetch API → transform → upsert PostgreSQL (idempotent)

**Pipeline** :
1. `ingest-communes.ts` — Charge la table de référence communes (COG INSEE)
2. `ingest-dvf.ts` — DVF → prix m² médian par commune + tendance N-1
3. `ingest-dpe.ts` — API ADEME → répartition DPE + score moyen
4. `ingest-bpe.ts` — BPE → comptage équipements par catégorie
5. `ingest-risques.ts` — Géorisques → niveaux risque par commune
6. `ingest-fiscalite.ts` — Taxe foncière → taux + montant moyen
7. `ingest-demo.ts` — INSEE → population, revenus médians, taux emploi
8. `compute-scores.ts` — Calcul du score composite → table `scores_communes`

### 3.6 ADR-IS-005 : Algorithme Score Composite

**Décision** : Score pondéré normalisé 0-100 avec 6 dimensions.

**Formule v1** :
```
CityRank = w1 × S_prix + w2 × S_dpe + w3 × S_fiscalite + w4 × S_equipements + w5 × S_risques + w6 × S_demo

Pondérations v1 (à ajuster après analyse) :
  w1 (Prix attractifs)     = 0.25  → S_prix = normalisation inverse du prix m² (moins cher = meilleur)
  w2 (Performance DPE)     = 0.15  → S_dpe = % logements A-C
  w3 (Fiscalité légère)    = 0.15  → S_fiscalite = normalisation inverse taxe foncière
  w4 (Équipements)         = 0.20  → S_equipements = score composite nb écoles + médecins + commerces / pop
  w5 (Risques faibles)     = 0.10  → S_risques = normalisation inverse du niveau de risque agrégé
  w6 (Dynamisme démo)      = 0.15  → S_demo = composite (croissance pop + revenus + taux emploi)
```

**Normalisation** : Percentile rank par dimension → 0 à 100, puis somme pondérée.

**Justification** : La pondération met l'accent sur le prix (facteur #1 de décision) et les équipements (qualité de vie concrète). Les risques pèsent moins car ils sont binaires (zone inondable ou non) plutôt que graduels.

**Alternative écartée** : Machine learning — trop complexe pour le MVP, pas de ground truth pour entraîner. Le scoring pondéré est transparent, explicable, et ajustable.

### 3.7 Schéma de Base de Données (Simplifié)

```sql
CREATE SCHEMA immo_score;

-- Table de référence
CREATE TABLE immo_score.communes (
    code_insee VARCHAR(5) PRIMARY KEY,
    nom VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    code_postal VARCHAR(10),
    departement VARCHAR(3),
    region VARCHAR(100),
    population INTEGER,
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Données DVF agrégées
CREATE TABLE immo_score.dvf_prix (
    code_insee VARCHAR(5) REFERENCES immo_score.communes(code_insee),
    annee INTEGER,
    prix_m2_median DECIMAL(10,2),
    nb_transactions INTEGER,
    tendance_pct DECIMAL(5,2), -- variation vs année N-1
    PRIMARY KEY (code_insee, annee)
);

-- Données DPE agrégées
CREATE TABLE immo_score.dpe_communes (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    pct_a DECIMAL(5,2), pct_b DECIMAL(5,2), pct_c DECIMAL(5,2),
    pct_d DECIMAL(5,2), pct_e DECIMAL(5,2), pct_f DECIMAL(5,2), pct_g DECIMAL(5,2),
    dpe_moyen CHAR(1),
    nb_diagnostics INTEGER,
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Équipements BPE
CREATE TABLE immo_score.equipements (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    nb_ecoles INTEGER DEFAULT 0,
    nb_colleges INTEGER DEFAULT 0,
    nb_lycees INTEGER DEFAULT 0,
    nb_medecins INTEGER DEFAULT 0,
    nb_pharmacies INTEGER DEFAULT 0,
    nb_commerces INTEGER DEFAULT 0,
    nb_gares INTEGER DEFAULT 0,
    score_equipements DECIMAL(5,2), -- pré-calculé / 1000 hab
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Risques naturels
CREATE TABLE immo_score.risques (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    risque_inondation INTEGER DEFAULT 0, -- 0-4
    risque_seisme INTEGER DEFAULT 0,     -- 0-5
    risque_radon INTEGER DEFAULT 0,      -- 1-3
    nb_arretes_catnat INTEGER DEFAULT 0,
    score_risques DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Fiscalité
CREATE TABLE immo_score.fiscalite (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    taux_foncier_bati DECIMAL(6,3),
    taux_habitation DECIMAL(6,3), -- si encore applicable
    montant_moyen_foncier DECIMAL(10,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Démographie INSEE
CREATE TABLE immo_score.demographie (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    population INTEGER,
    variation_pop_5ans DECIMAL(5,2),
    revenu_median DECIMAL(10,2),
    taux_emploi DECIMAL(5,2),
    taux_pauvrete DECIMAL(5,2),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Score final (vue matérialisée ou table calculée)
CREATE TABLE immo_score.scores (
    code_insee VARCHAR(5) PRIMARY KEY REFERENCES immo_score.communes(code_insee),
    score_global INTEGER, -- 0-100
    score_prix INTEGER,
    score_dpe INTEGER,
    score_fiscalite INTEGER,
    score_equipements INTEGER,
    score_risques INTEGER,
    score_demo INTEGER,
    rang_national INTEGER,
    rang_departemental INTEGER,
    computed_at TIMESTAMP DEFAULT NOW()
);

-- Index pour les requêtes fréquentes
CREATE INDEX idx_communes_slug ON immo_score.communes(slug);
CREATE INDEX idx_communes_dept ON immo_score.communes(departement);
CREATE INDEX idx_scores_global ON immo_score.scores(score_global DESC);
CREATE INDEX idx_scores_dept ON immo_score.scores(code_insee, rang_departemental);
```

### 3.8 Structure SEO des URLs

```
/                          → Page d'accueil (recherche + top communes)
/commune/bordeaux          → Page commune Bordeaux
/commune/paris-1er         → Page arrondissement
/departement/33            → Liste communes Gironde avec scores
/region/nouvelle-aquitaine → Liste départements
/comparer?c=bordeaux&c=lyon → Comparateur
/blog/guide-investissement-immobilier → Article pillar
/sitemap.xml               → Sitemap dynamique
/api/search?q=bord         → API autocomplete
/api/scores?dept=33        → API scores (future monétisation)
```

### 3.9 Stack Technique Résumée

| Composant | Technologie | Justification |
|-----------|-------------|---------------|
| Frontend/SSR | Next.js 14 (App Router) | ISR + SEO + React |
| ORM | Prisma | Vues matérialisées, raw SQL |
| BDD | PostgreSQL (schéma `immo_score`) | Partagé avec Homilink |
| Styling | Tailwind CSS | Cohérence avec Homilink |
| Analytics | Umami (self-hosted) | RGPD, gratuit |
| CI/CD | GitHub Actions | Même pattern que Homilink |
| Conteneur | Docker Compose | Isolé de Homilink |
| Reverse proxy | nginx | Server block dédié |
| Orchestration données | n8n | Déjà installé |
| Hébergement | OVH VPS existant | Budget < 50€ |

---

## PARTIE 4 — FICHIERS CLAUDE CODE

### 4.1 CLAUDE.md

Voir fichier séparé : `CLAUDE.md`

### 4.2 Agents

Voir fichiers séparés dans `.claude/agents/`

### 4.3 Structure du Repo

```
cityrank/
├── .claude/
│   ├── agents/
│   │   ├── cto.md
│   │   ├── frontend.md
│   │   ├── backend.md
│   │   ├── data-engineer.md      ← spécifique CityRank
│   │   ├── code-reviewer.md
│   │   └── test-writer.md
│   ├── skills/
│   │   ├── data-ingestion.md     ← patterns d'ingestion open data
│   │   ├── seo-programmatic.md   ← patterns SEO Next.js
│   │   └── score-algorithm.md    ← doc algorithme de scoring
│   ├── rules/
│   │   ├── code-standards.md
│   │   ├── git-workflow.md
│   │   └── data-quality.md       ← règles qualité données
│   └── commands/
│       ├── sprint-update.md
│       ├── ingest-data.md        ← commande d'ingestion
│       └── compute-scores.md     ← commande de calcul scores
├── src/
│   ├── app/
│   │   ├── page.tsx              → accueil
│   │   ├── commune/[slug]/page.tsx
│   │   ├── departement/[code]/page.tsx
│   │   ├── comparer/page.tsx
│   │   ├── blog/[slug]/page.tsx
│   │   ├── api/
│   │   │   ├── search/route.ts
│   │   │   ├── scores/route.ts
│   │   │   └── revalidate/route.ts
│   │   ├── sitemap.ts
│   │   └── robots.ts
│   ├── components/
│   │   ├── ScoreGauge.tsx
│   │   ├── CommuneCard.tsx
│   │   ├── SearchBar.tsx
│   │   ├── CompareTable.tsx
│   │   └── DataSection.tsx
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── score.ts              → logique calcul score
│   │   └── seo.ts                → helpers meta/schema
│   └── scripts/
│       ├── ingest-communes.ts
│       ├── ingest-dvf.ts
│       ├── ingest-dpe.ts
│       ├── ingest-bpe.ts
│       ├── ingest-risques.ts
│       ├── ingest-fiscalite.ts
│       ├── ingest-demo.ts
│       └── compute-scores.ts
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── docker-compose.prod.yml
├── Dockerfile
├── Makefile
├── .github/workflows/deploy.yml
├── CLAUDE.md
└── package.json
```

---

## PARTIE 5 — STRUCTURE NOTION

### Pages à Créer dans le Workspace Notion

```
📊 CityRank (Dashboard)
├── 📓 Journal de Sessions
├── 👤 Rôles
│   ├── 🎯 CEO — Vision & Stratégie
│   ├── 📋 PM — Roadmap & Backlog
│   ├── 💻 CTO — Architecture & ADRs
│   └── 📈 CMO — SEO & Growth
├── 🗺️ Roadmap
│   └── 🗃️ Backlog (Database) — colonnes : ID, Titre, Sprint, Status, Priorité, Assigné (@agent), RICE
├── 📐 Architecture
│   ├── ADR-IS-001 Stack Technique
│   ├── ADR-IS-002 ISR Strategy
│   ├── ADR-IS-003 Isolation Homilink
│   ├── ADR-IS-004 Pipeline Données
│   └── ADR-IS-005 Algorithme Score
├── 📊 Data Sources
│   └── Documentation de chaque API + format + fréquence refresh
└── 📝 OKRs & Hypothèses
```

### Convention Journal (identique à Homilink)

Le Journal suit la convention "Dernière Session" :
- Seule la session en cours est visible en haut
- Les sessions précédentes sont archivées dans un toggle en dessous
- Format : `## Session [date] — [thème]` + résumé + décisions + next steps
