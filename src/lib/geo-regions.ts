/**
 * geo-regions.ts
 * Mapping département → code INSEE région 2016 pour l'imputation DVF.
 * Les valeurs correspondent au champ `communes.region` (codeRegion de geo.api.gouv.fr).
 * Utilisé par compute-scores.ts pour les communes sans données DVF
 * (Alsace-Moselle : 57/67/68 + Mayotte : 976).
 */

export const DEPT_TO_REGION: Record<string, string> = {
  // 84 — Auvergne-Rhône-Alpes
  '01': '84', '03': '84', '07': '84',
  '15': '84', '26': '84', '38': '84',
  '42': '84', '43': '84', '63': '84',
  '69': '84', '73': '84', '74': '84',
  // 27 — Bourgogne-Franche-Comté
  '21': '27', '25': '27', '39': '27',
  '58': '27', '70': '27', '71': '27',
  '89': '27', '90': '27',
  // 53 — Bretagne
  '22': '53', '29': '53', '35': '53', '56': '53',
  // 24 — Centre-Val de Loire
  '18': '24', '28': '24', '36': '24',
  '37': '24', '41': '24', '45': '24',
  // 94 — Corse
  '2A': '94', '2B': '94',
  // 44 — Grand Est (inclut Alsace-Moselle sans DVF : 57, 67, 68)
  '08': '44', '10': '44', '51': '44', '52': '44',
  '54': '44', '55': '44', '57': '44', '67': '44',
  '68': '44', '88': '44',
  // 32 — Hauts-de-France
  '02': '32', '59': '32', '60': '32',
  '62': '32', '80': '32',
  // 11 — Île-de-France
  '75': '11', '77': '11', '78': '11',
  '91': '11', '92': '11', '93': '11',
  '94': '11', '95': '11',
  // 28 — Normandie
  '14': '28', '27': '28', '50': '28', '61': '28', '76': '28',
  // 75 — Nouvelle-Aquitaine
  '16': '75', '17': '75', '19': '75',
  '23': '75', '24': '75', '33': '75',
  '40': '75', '47': '75', '64': '75',
  '79': '75', '86': '75', '87': '75',
  // 76 — Occitanie
  '09': '76', '11': '76', '12': '76', '30': '76',
  '31': '76', '32': '76', '34': '76', '46': '76',
  '48': '76', '65': '76', '66': '76', '81': '76', '82': '76',
  // 52 — Pays de la Loire
  '44': '52', '49': '52', '53': '52',
  '72': '52', '85': '52',
  // 93 — Provence-Alpes-Côte d'Azur
  '04': '93', '05': '93', '06': '93', '13': '93', '83': '93', '84': '93',
  // DOM — chaque département-région a son propre code région
  '971': '01', '972': '02', '973': '03', '974': '04', '976': '06',
};

/** Départements exclus du DVF : livre foncier alsacien-mosellan (57/67/68) et Mayotte (976). */
export const DEPTS_WITHOUT_DVF = new Set(['57', '67', '68', '976']);

/**
 * Extrait le code département d'un code INSEE commune.
 * Gère Corse (2A/2B) et DOM-TOM (971–976).
 */
export function getDeptFromCodeInsee(codeInsee: string): string {
  if (codeInsee.startsWith('97')) return codeInsee.substring(0, 3);
  if (codeInsee.startsWith('2A') || codeInsee.startsWith('2B')) return codeInsee.substring(0, 2);
  return codeInsee.substring(0, 2);
}

export function getRegionFromCodeInsee(codeInsee: string): string | null {
  return DEPT_TO_REGION[getDeptFromCodeInsee(codeInsee)] ?? null;
}
