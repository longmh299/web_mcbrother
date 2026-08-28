// app/sitemap.ts
import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL } from "@/lib/site";

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticRoutes: MetadataRoute.Sitemap = [
    "",
    "/san-pham",
    "/tin-tuc",
    "/gioi-thieu",
    "/lien-he",
  ].map((path) => ({
    url: `${SITE_URL}${path}`,
    lastModified: new Date(),
    changeFrequency: "weekly",
    priority: path === "" ? 1 : 0.7,
  }));

  try {
    const [products, posts, categories] = await Promise.all([
      prisma.product.findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
      }),
      prisma.post.findMany({
        where: { published: true, noindex: false },
        select: { slug: true, updatedAt: true },
      }),
      prisma.category.findMany({
        select: { slug: true, updatedAt: true },
      }),
    ]);

    const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
      url: `${SITE_URL}/san-pham/${p.slug}`,
      lastModified: p.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.8,
    }));

    const postEntries: MetadataRoute.Sitemap = posts.map((x) => ({
      url: `${SITE_URL}/tin-tuc/${x.slug}`,
      lastModified: x.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.5,
    }));

    const categoryEntries: MetadataRoute.Sitemap = categories.map((c) => ({
      url: `${SITE_URL}/${c.slug}`,
      lastModified: c.updatedAt ?? new Date(),
      changeFrequency: "weekly",
      priority: 0.6,
    }));

    return [...staticRoutes, ...categoryEntries, ...productEntries, ...postEntries];
  } catch {
    return staticRoutes;
  }
}