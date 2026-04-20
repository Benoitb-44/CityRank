# Skill : SEO Programmatique — CityRank

## Template Meta Tags

```typescript
// src/lib/seo.ts
export function generateCommuneMetadata(commune: CommuneWithScore) {
  const title = `Immobilier ${commune.nom} (${commune.departement}) : Score ${commune.score_global}/100, Prix ${commune.prix_m2}€/m² | CityRank`;
  const description = `${commune.nom} obtient un CityRank de ${commune.score_global}/100. Prix médian : ${commune.prix_m2}€/m², DPE moyen : ${commune.dpe_moyen}, Taxe foncière : ${commune.taux_foncier}%. Analyse complète des données immobilières.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'website',
      url: `https://immoscore.fr/commune/${commune.slug}`,
    },
    alternates: {
      canonical: `https://immoscore.fr/commune/${commune.slug}`,
    },
  };
}
```

## Structured Data JSON-LD

```typescript
export function generateCommuneJsonLd(commune: CommuneWithScore) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Place',
    name: commune.nom,
    address: {
      '@type': 'PostalAddress',
      addressLocality: commune.nom,
      addressRegion: commune.region,
      addressCountry: 'FR',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: commune.latitude,
      longitude: commune.longitude,
    },
    additionalProperty: [
      {
        '@type': 'PropertyValue',
        name: 'CityRank',
        value: commune.score_global,
        maxValue: 100,
        minValue: 0,
      },
      {
        '@type': 'PropertyValue',
        name: 'Prix médian au m²',
        value: commune.prix_m2,
        unitCode: 'EUR',
      },
    ],
  };
}
```

## Sitemap Dynamique

```typescript
// src/app/sitemap.ts
import { prisma } from '@/lib/prisma';
import { MetadataRoute } from 'next';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const communes = await prisma.communes.findMany({
    select: { slug: true, updated_at: true },
  });

  return [
    { url: 'https://immoscore.fr', changeFrequency: 'weekly', priority: 1.0 },
    ...communes.map(c => ({
      url: `https://immoscore.fr/commune/${c.slug}`,
      lastModified: c.updated_at,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
```

## Internal Linking
Chaque page commune doit inclure :
1. **Breadcrumb** : Accueil > Département 33 > Bordeaux
2. **Communes voisines** : 5-10 communes les plus proches (calcul distance GPS)
3. **Même département** : Top 5 communes du département par score
4. **Lien comparateur** : CTA "Comparer Bordeaux avec une autre commune"

## Robots.txt
```
User-agent: *
Allow: /
Sitemap: https://immoscore.fr/sitemap.xml
Disallow: /api/
```
