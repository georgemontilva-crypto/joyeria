import { z } from "zod";
import { and, asc, desc, eq, inArray, like, ne, or, sql } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, schema } from "../db";
import { publicProcedure, router } from "../trpc";
import { cancelPendingByToken, createCheckout, getOrderBySession } from "../lib/orders";
import { sendContactMessage } from "../lib/email";

const { products, productImages, categories, collections, settings, messages } = schema;

const PUBLIC_SETTINGS = [
  "contactEmail", "contactPhone", "whatsapp", "instagram", "facebook", "tiktok",
  "address", "hoursEn", "hoursEs", "announcementEn", "announcementEs",
];

type ProductRow = typeof products.$inferSelect;

/** Attaches images to product rows and trims them to what the storefront shows. */
async function present(rows: ProductRow[]) {
  if (!rows.length) return [];
  const images = await db
    .select()
    .from(productImages)
    .where(inArray(productImages.productId, rows.map((r) => r.id)))
    .orderBy(asc(productImages.sortOrder), asc(productImages.id));
  const byProduct = new Map<number, string[]>();
  for (const img of images) {
    const list = byProduct.get(img.productId) ?? [];
    list.push(img.url);
    byProduct.set(img.productId, list);
  }
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    sku: r.sku,
    nameEn: r.nameEn,
    nameEs: r.nameEs,
    descriptionEn: r.descriptionEn,
    descriptionEs: r.descriptionEs,
    detailsEn: r.detailsEn,
    detailsEs: r.detailsEs,
    priceCents: r.priceCents,
    compareAtCents: r.compareAtCents,
    stock: r.stock,
    categoryId: r.categoryId,
    collectionId: r.collectionId,
    featured: r.featured,
    isNew: r.isNew,
    images: byProduct.get(r.id) ?? [],
  }));
}

export const shopRouter = router({
  site: publicProcedure.query(async () => {
    const [cats, cols, rows] = await Promise.all([
      db.select().from(categories).orderBy(asc(categories.sortOrder), asc(categories.id)),
      db.select().from(collections).orderBy(asc(collections.sortOrder), asc(collections.id)),
      db.select().from(settings).where(inArray(settings.key, PUBLIC_SETTINGS)),
    ]);
    return {
      categories: cats,
      collections: cols,
      settings: Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>,
    };
  }),

  products: publicProcedure
    .input(
      z.object({
        category: z.string().max(120).optional(),
        collection: z.string().max(120).optional(),
        q: z.string().max(80).optional(),
        featured: z.boolean().optional(),
        sort: z.enum(["curated", "newest", "price-asc", "price-desc"]).default("curated"),
      }),
    )
    .query(async ({ input }) => {
      const where = [eq(products.active, true)];
      if (input.category) {
        const [cat] = await db.select().from(categories).where(eq(categories.slug, input.category));
        if (!cat) return [];
        where.push(eq(products.categoryId, cat.id));
      }
      if (input.collection) {
        const [col] = await db.select().from(collections).where(eq(collections.slug, input.collection));
        if (!col) return [];
        where.push(eq(products.collectionId, col.id));
      }
      if (input.featured) where.push(eq(products.featured, true));
      const q = input.q?.trim();
      if (q) {
        const term = `%${q.replace(/[%_\\]/g, "\\$&")}%`;
        where.push(or(like(products.nameEn, term), like(products.nameEs, term), like(products.sku, term))!);
      }
      const order =
        input.sort === "newest" ? [desc(products.createdAt), desc(products.id)]
        : input.sort === "price-asc" ? [sql`${products.priceCents} IS NULL`, asc(products.priceCents)]
        : input.sort === "price-desc" ? [sql`${products.priceCents} IS NULL`, desc(products.priceCents)]
        : [asc(products.sortOrder), asc(products.id)];
      const rows = await db.select().from(products).where(and(...where)).orderBy(...order);
      return present(rows);
    }),

  product: publicProcedure.input(z.object({ slug: z.string().max(160) })).query(async ({ input }) => {
    const [row] = await db.select().from(products).where(and(eq(products.slug, input.slug), eq(products.active, true)));
    if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "This piece is no longer in the catalog." });
    const [product] = await present([row]);

    // Related: same collection first, then same category.
    const relatedRows = await db
      .select()
      .from(products)
      .where(
        and(
          eq(products.active, true),
          ne(products.id, row.id),
          or(
            row.collectionId != null ? eq(products.collectionId, row.collectionId) : undefined,
            row.categoryId != null ? eq(products.categoryId, row.categoryId) : undefined,
          ),
        ),
      )
      .orderBy(
        row.collectionId != null ? sql`${products.collectionId} <=> ${row.collectionId} DESC` : asc(products.sortOrder),
        asc(products.sortOrder),
      )
      .limit(4);
    return { product, related: await present(relatedRows) };
  }),

  /** Current price and stock for the pieces in a visitor's bag. */
  byIds: publicProcedure.input(z.object({ ids: z.array(z.number().int().positive()).max(50) })).query(async ({ input }) => {
    if (!input.ids.length) return [];
    const rows = await db.select().from(products).where(and(inArray(products.id, input.ids), eq(products.active, true)));
    return present(rows);
  }),

  checkout: publicProcedure
    .input(
      z.object({
        items: z.array(z.object({ productId: z.number().int().positive(), quantity: z.number().int().min(1).max(20) })).min(1).max(50),
        locale: z.enum(["en", "es"]),
        previousToken: z.string().max(64).optional(),
      }),
    )
    .mutation(({ input }) => createCheckout(input.items, input.locale, input.previousToken)),

  cancelCheckout: publicProcedure.input(z.object({ token: z.string().max(64) })).mutation(async ({ input }) => {
    await cancelPendingByToken(input.token);
    return { ok: true };
  }),

  order: publicProcedure.input(z.object({ sessionId: z.string().min(10).max(255) })).query(({ input }) => getOrderBySession(input.sessionId)),

  contact: publicProcedure
    .input(
      z.object({
        name: z.string().trim().min(1).max(160),
        email: z.email().max(255),
        phone: z.string().trim().max(60).optional(),
        subject: z.string().trim().max(200).optional(),
        message: z.string().trim().min(1).max(5000),
        locale: z.enum(["en", "es"]),
        // Honeypot: real visitors never see or fill this field.
        company: z.string().max(200).optional(),
      }),
    )
    .mutation(async ({ input }) => {
      if (input.company) return { ok: true };
      const { company: _company, ...data } = input;
      await db.insert(messages).values({ ...data, phone: data.phone || null, subject: data.subject || null });
      await sendContactMessage(data);
      return { ok: true };
    }),
});
