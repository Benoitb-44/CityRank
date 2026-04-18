/**
 * bpe-codes.ts
 * 30 codes TYPEQU retenus de la BPE INSEE 2023 pour le scoring équipements.
 * Distribués en 5 sous-catégories : education, sante, commerces, transport, cultureSport.
 */

export type BpeCategory = 'education' | 'sante' | 'commerces' | 'transport' | 'cultureSport';

export interface BpeCode {
  typequ: string;
  label: string;
  category: BpeCategory;
  /** Nom du champ booléen dans BpeCommune (has_xxx) */
  flag: string;
}

export const BPE_CODES: readonly BpeCode[] = [
  // ── Éducation (5) ────────────────────────────────────────────────────────
  { typequ: 'C501', label: 'Crèche',                  category: 'education',    flag: 'has_creche' },
  { typequ: 'C101', label: 'École maternelle',         category: 'education',    flag: 'has_ecole_maternelle' },
  { typequ: 'C102', label: 'École élémentaire',        category: 'education',    flag: 'has_ecole_primaire' },
  { typequ: 'C201', label: 'Collège',                  category: 'education',    flag: 'has_college' },
  { typequ: 'C301', label: 'Lycée',                    category: 'education',    flag: 'has_lycee' },

  // ── Santé (7) ─────────────────────────────────────────────────────────────
  { typequ: 'D201', label: 'Médecin généraliste',      category: 'sante',        flag: 'has_medecin' },
  { typequ: 'D231', label: 'Chirurgien-dentiste',      category: 'sante',        flag: 'has_dentiste' },
  { typequ: 'D301', label: 'Pharmacie',                category: 'sante',        flag: 'has_pharmacie' },
  { typequ: 'D401', label: 'Urgences',                 category: 'sante',        flag: 'has_urgences' },
  { typequ: 'D402', label: 'Maternité',                category: 'sante',        flag: 'has_maternite' },
  { typequ: 'D501', label: 'Hôpital court séjour',     category: 'sante',        flag: 'has_hopital' },
  { typequ: 'D106', label: 'EHPAD',                    category: 'sante',        flag: 'has_ehpad' },

  // ── Commerces & services (7) ──────────────────────────────────────────────
  { typequ: 'B101', label: 'Hypermarché',              category: 'commerces',    flag: 'has_hypermarche' },
  { typequ: 'B102', label: 'Supérette',                category: 'commerces',    flag: 'has_superette' },
  { typequ: 'B201', label: 'Boulangerie-pâtisserie',   category: 'commerces',    flag: 'has_boulangerie' },
  { typequ: 'B203', label: 'Librairie-papeterie',      category: 'commerces',    flag: 'has_librairie' },
  { typequ: 'B301', label: 'Banque',                   category: 'commerces',    flag: 'has_banque' },
  { typequ: 'B306', label: 'Bureau de poste',          category: 'commerces',    flag: 'has_poste' },
  { typequ: 'A101', label: 'Police / gendarmerie',     category: 'commerces',    flag: 'has_police' },

  // ── Transport (5) ─────────────────────────────────────────────────────────
  { typequ: 'E101', label: 'Gare nationale',           category: 'transport',    flag: 'has_gare_national' },
  { typequ: 'E102', label: 'Gare régionale',           category: 'transport',    flag: 'has_gare_regional' },
  { typequ: 'E103', label: 'Arrêt transport interurbain', category: 'transport', flag: 'has_arret_transport' },
  { typequ: 'E107', label: 'Accès autoroute',          category: 'transport',    flag: 'has_autoroute' },
  { typequ: 'E201', label: 'Aéroport',                 category: 'transport',    flag: 'has_aeroport' },

  // ── Culture & sport (6) ───────────────────────────────────────────────────
  { typequ: 'F101', label: 'Cinéma',                   category: 'cultureSport', flag: 'has_cinema' },
  { typequ: 'F111', label: 'Salle de spectacle',       category: 'cultureSport', flag: 'has_salle_spectacle' },
  { typequ: 'F201', label: 'Piscine',                  category: 'cultureSport', flag: 'has_piscine' },
  { typequ: 'F301', label: 'Stade',                    category: 'cultureSport', flag: 'has_stade' },
  { typequ: 'F302', label: 'Gymnase',                  category: 'cultureSport', flag: 'has_gymnase' },
  { typequ: 'F303', label: 'Tennis (court)',           category: 'cultureSport', flag: 'has_tennis' },
];

/** Lookup rapide TYPEQU → BpeCode */
export const BPE_CODE_MAP = new Map(BPE_CODES.map(c => [c.typequ, c]));

/** Set des TYPEQU retenus pour le filtrage CSV */
export const BPE_TYPEQUS = new Set(BPE_CODES.map(c => c.typequ));

/** Nombre total d'équipements essentiels (dénominateur du score) */
export const BPE_TOTAL = BPE_CODES.length; // 30
