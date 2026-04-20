import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import { deptName } from '@/lib/departments';

export const revalidate = 86400;

// ─── Prisma singleton ─────────────────────────────────────────────────────────

declare global {
  // eslint-disable-next-line no-var
  var __prisma: PrismaClient | undefined;
}
const prisma = globalThis.__prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalThis.__prisma = prisma;

// ─── Types ────────────────────────────────────────────────────────────────────

type CommuneRow = {
  nom: string;
  slug: string;
  score_global: number | null;
  score_dvf: number | null;
  score_dpe: number | null;
  score_risques: number | null;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreClass(score: number): string {
  if (score >= 70) return 'bg-score-high text-white';
  if (score >= 40) return 'bg-score-mid text-white';
  return 'bg-score-low text-white';
}

// ─── generateStaticParams ─────────────────────────────────────────────────────

export async function generateStaticParams() {
  try {
    const depts = await prisma.commune.findMany({
      distinct: ['departement'],
      select: { departement: true },
    });
    return depts.map((d) => ({ code: d.departement }));
  } catch {
    return [];
  }
}

// ─── generateMetadata ─────────────────────────────────────────────────────────

export async function generateMetadata({
  params,
}: {
  params: { code: string };
}): Promise<Metadata> {
  const nom = deptName(params.code);
  let count = 0;
  try {
    count = await prisma.commune.count({ where: { departement: params.code } });
  } catch {
    // DB indisponible au build
  }
  return {
    title: `Immobilier ${nom} — Score par commune | CityRank`,
    description: `Classement des ${count} communes du ${nom} par score d'attractivité immobilière. Données DVF, DPE et Géorisques.`,
    alternates: { canonical: `/departements/${params.code}` },
  };
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default async function DepartementPage({
  params,
}: {
  params: { code: string };
}) {
  const nom = deptName(params.code);

  const [communes, regionRow] = await Promise.all([
    prisma.$queryRaw<CommuneRow[]>`
      SELECT c.nom, c.slug,
             s.score_global, s.score_dvf, s.score_dpe, s.score_risques
      FROM immo_score.communes c
      LEFT JOIN immo_score.scores s ON s.code_commune = c.code_insee
      WHERE c.departement = ${params.code}
      ORDER BY s.score_global DESC NULLS LAST
    `,
    prisma.commune.findFirst({
      where: { departement: params.code },
      select: { region: true },
    }),
  ]);

  if (communes.length === 0) notFound();

  const region = regionRow?.region ?? '';
  const scoredCount = communes.filter((c) => c.score_global != null).length;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Top communes du ${nom} par score immobilier`,
    itemListElement: communes.slice(0, 10).map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.nom,
      url: `https://cityrank.fr/communes/${c.slug}`,
    })),
  };

  return (
    <div className="bg-paper-soft flex-1">

      {/* ── Hero ── */}
      <div className="border-b-2 border-ink bg-paper">
        <div className="max-w-5xl mx-auto px-6 py-8">

          {/* Breadcrumb */}
          <nav aria-label="Fil d'Ariane" className="font-mono text-xs text-ink-muted mb-5">
            <Link href="/" className="hover:text-ink transition-colors">Accueil</Link>
            <span className="mx-2">/</span>
            <Link href="/departements" className="hover:text-ink transition-colors">Départements</Link>
            <span className="mx-2">/</span>
            <span className="text-ink font-bold">{nom}</span>
          </nav>

          <div className="flex flex-wrap items-baseline gap-3 mb-3">
            <span className="border-2 border-ink bg-paper-soft px-3 py-1 font-mono text-xs font-bold">
              Dép. {params.code}
            </span>
            {region && (
              <span className="font-mono text-xs text-ink-muted">{region}</span>
            )}
          </div>

          <h1 className="font-display text-4xl sm:text-5xl font-bold text-ink leading-tight">
            {nom}
          </h1>
          <p className="font-mono text-sm text-ink-muted mt-3 tabular-nums">
            {communes.length.toLocaleString('fr-FR')} communes
            {scoredCount < communes.length && (
              <> · <span>{scoredCount} scorées</span></>
            )}
          </p>
        </div>
      </div>

      {/* ── Tableau ── */}
      <main className="max-w-5xl mx-auto px-6 py-10">

        <div className="border-2 border-ink overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b-2 border-ink bg-paper">
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted w-12">
                  Rang
                </th>
                <th className="text-left px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted">
                  Commune
                </th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted w-24">
                  Score
                </th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted w-20 hidden sm:table-cell">
                  DVF
                </th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted w-20 hidden sm:table-cell">
                  DPE
                </th>
                <th className="text-center px-4 py-3 font-mono text-[10px] uppercase tracking-widest text-ink-muted w-20 hidden sm:table-cell">
                  Risques
                </th>
              </tr>
            </thead>
            <tbody>
              {communes.map((commune, index) => {
                const gs =
                  commune.score_global != null
                    ? Math.round(commune.score_global)
                    : null;
                const dvf =
                  commune.score_dvf != null ? Math.round(commune.score_dvf) : null;
                const dpe =
                  commune.score_dpe != null ? Math.round(commune.score_dpe) : null;
                const risques =
                  commune.score_risques != null
                    ? Math.round(commune.score_risques)
                    : null;

                return (
                  <tr
                    key={commune.slug}
                    className="border-b border-ink/20 last:border-b-0 hover:bg-paper transition-colors group"
                  >
                    <td className="px-4 py-3 font-mono text-xs text-ink-muted tabular-nums">
                      {index + 1}
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/communes/${commune.slug}`}
                        className="font-display font-semibold text-ink hover:text-accent transition-colors group-hover:underline"
                      >
                        {commune.nom}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {gs != null ? (
                        <span
                          className={`inline-block font-mono text-xs font-bold px-2.5 py-1 tabular-nums ${scoreClass(gs)}`}
                        >
                          {gs}
                        </span>
                      ) : (
                        <span className="font-mono text-xs text-ink-muted">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs text-ink tabular-nums">
                        {dvf ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs text-ink tabular-nums">
                        {dpe ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center hidden sm:table-cell">
                      <span className="font-mono text-xs text-ink tabular-nums">
                        {risques ?? '—'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Légende */}
        <div className="mt-4 flex flex-wrap gap-5 font-mono text-xs text-ink-muted">
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-score-high border border-ink" />
            70–100 — Attractif
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-score-mid border border-ink" />
            40–69 — Moyen
          </span>
          <span className="flex items-center gap-2">
            <span className="inline-block w-3 h-3 bg-score-low border border-ink" />
            0–39 — Faible
          </span>
        </div>

        {/* Sources */}
        <div className="mt-8 border-2 border-ink bg-paper p-4 flex flex-col sm:flex-row items-start gap-3">
          <span className="font-mono text-xs font-bold shrink-0">SOURCES</span>
          <span className="hidden sm:block w-px h-4 bg-ink shrink-0 mt-0.5" />
          <p className="font-mono text-xs text-ink-muted">
            DVF — Demandes de Valeurs Foncières (data.gouv.fr) ·{' '}
            DPE ADEME — Diagnostics de Performance Énergétique (data.ademe.fr) ·{' '}
            Géorisques — risques naturels et technologiques (georisques.gouv.fr) ·{' '}
            Données open data, mise à jour annuelle.
          </p>
        </div>

      </main>

      {/* JSON-LD structured data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </div>
  );
}
