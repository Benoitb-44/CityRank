import { MetadataRoute } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const BATCH_SIZE = 20000;
const BASE_URL = 'https://immorank.fr';

const DEPARTEMENTS = [
  '01','02','03','04','05','06','07','08','09','10',
  '11','12','13','14','15','16','17','18','19','21',
  '22','23','24','25','26','27','28','29','2A','2B',
  '30','31','32','33','34','35','36','37','38','39',
  '40','41','42','43','44','45','46','47','48','49',
  '50','51','52','53','54','55','56','57','58','59',
  '60','61','62','63','64','65','66','67','68','69',
  '70','71','72','73','74','75','76','77','78','79',
  '80','81','82','83','84','85','86','87','88','89',
  '90','91','92','93','94','95','971','972','973',
  '974','976',
];

export async function generateSitemaps() {
  return [{ id: 0 }, { id: 1 }, { id: 2 }];
}

export default async function sitemap({
  id,
}: {
  id: number;
}): Promise<MetadataRoute.Sitemap> {
  if (id === 2) {
    const now = new Date();
    const staticPages: MetadataRoute.Sitemap = [
      { url: `${BASE_URL}/`, lastModified: now, changeFrequency: 'daily', priority: 1.0 },
      { url: `${BASE_URL}/methodologie`, lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
      { url: `${BASE_URL}/departements`, lastModified: now, changeFrequency: 'weekly', priority: 0.9 },
    ];
    const deptPages: MetadataRoute.Sitemap = DEPARTEMENTS.map((d) => ({
      url: `${BASE_URL}/departements/${d}`,
      lastModified: now,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    }));
    return [...staticPages, ...deptPages];
  }

  const communes = await prisma.commune.findMany({
    orderBy: { code_insee: 'asc' },
    skip: id * BATCH_SIZE,
    take: BATCH_SIZE,
    select: {
      slug: true,
      score: {
        select: { score_global: true, updated_at: true },
      },
    },
  });

  return communes.map((c) => {
      const s = c.score?.score_global ?? 30;
      const priority = s >= 70 ? 0.9 : s >= 30 ? 0.7 : 0.5;
      return {
        url: `${BASE_URL}/communes/${c.slug}`,
        lastModified: c.score?.updated_at ?? new Date(),
        changeFrequency: 'weekly' as const,
        priority,
      };
    });
}

