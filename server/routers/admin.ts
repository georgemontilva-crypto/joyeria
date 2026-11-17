import { z } from "zod";
import { and, asc, count, desc, eq, inArray, ne, sql, sum } from "drizzle-orm";
import { TRPCError } from "@trpc/server";
import { db, schema } from "../db";
import { adminProcedure, publicProcedure, router } from "../trpc";
import { adminConfigured, checkCredentials, clearAdminCookie, setAdminCookie } from "../lib/auth";
import { loadEmailData, releaseOrder } from "../lib/orders";
import { sendOrderShipped } from "../lib/email";
import { env, r2Enabled } from "../env";
import { slugify } from "../../shared/format";

const { products, productImages, categories, collections, orders, orderItems, messages, settings, orderStatuses } = schema;

const text = (max: number) => z.string().trim().max(max);
const optionalText = (max: number) => z.string().trim().max(max).nullish().transform((v) => v || null);
const cents = z.number().int().min(0).max(100_000_000).nullable();

const taxonomyInput = z.object({
  id: z.number().int().positive().optional(),
  slug: text(120).optional(),
  nameEn: text(160).min(1),
  nameEs: text(160).min(1),
  descriptionEn: optionalText(2000),
  descriptionEs: optionalText(2000),
  image: optionalText(500),
  sortOrder: z.number().int().default(0),
});

const productInput = z.object({
  id: z.number().int().positive().optional(),
  slug: text(160).optional(),
  sku: optionalText(60),
  nameEn: text(200).min(1),
  nameEs: text(200).min(1),
  descriptionEn: optionalText(5000),
  descriptionEs: optionalText(5000),
  detailsEn: optionalText(3000),
  detailsEs: optionalText(3000),
  priceCents: cents,
  compareAtCents: cents,
  stock: z.number().int().min(0).max(100000),
  categoryId: z.number().int().positive().nullable(),
  collectionId: z.number().int().positive().nullable(),
  featured: z.boolean(),
  isNew: z.boolean(),
  active: z.boolean(),
  sortOrder: z.number().int().default(0),
  images: z.array(text(500).min(1)).max(12),
});

async function uniqueSlug(table: typeof products | typeof categories | typeof collections, wanted: string, ownId?: number) {
  const base = slugify(wanted) || "item";
  for (let n = 1; n < 200; n++) {
    const candidate = n === 1 ? base : `${base}-${n}`;
    const [hit] = await db
      .select({ id: table.id })
      .from(table)
      .where(ownId ? and(eq(table.slug, candidate), ne(table.id, ownId)) : eq(table.slug, candidate));
    if (!hit) return candidate;
  }
  return `${base}-${Date.now().toString(36)}`;
}

function taxonomyRouter(table: typeof categories | typeof collections, fk: "categoryId" | "collectionId") {
  return router({
    save: adminProcedure.input(taxonomyInput).mutation(async ({ input }) => {
      const { id, slug, ...data } = input;
      const finalSlug = await uniqueSlug(table, slug || data.nameEn, id);
      if (id) {
        await db.update(table).set({ ...data, slug: finalSlug }).where(eq(table.id, id));
        return { id };
      }
      const [res] = await db.insert(table).values({ ...data, slug: finalSlug });
      return { id: res.insertId };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      // Products stay in the catalog; they just lose this grouping.
      await db.update(products).set({ [fk]: null }).where(eq(products[fk], input.id));
      await db.delete(table).where(eq(table.id, input.id));
      return { ok: true };
    }),
  });
}

export const adminRouter = router({
  me: publicProcedure.query(({ ctx }) => ({ signedIn: ctx.isAdmin, configured: adminConfigured() })),

  login: publicProcedure
    .input(z.object({ email: z.string().max(255), password: z.string().max(255) }))
    .mutation(({ input, ctx }) => {
      if (!adminConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "ADMIN_EMAIL and ADMIN_PASSWORD are not set on the server." });
      }
      if (!checkCredentials(input.email, input.password)) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "That email and password do not match." });
      }
      setAdminCookie(ctx.res);
      return { ok: true };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    clearAdminCookie(ctx.res);
    return { ok: true };
  }),

  overview: adminProcedure.query(async () => {
    const paidStates = ["paid", "shipped", "delivered"] as const;
    const [[sales], [toShip], [unread], [catalog], [unpriced], recent] = await Promise.all([
      db.select({ n: count(), total: sum(orders.totalCents) }).from(orders).where(inArray(orders.status, [...paidStates])),
      db.select({ n: count() }).from(orders).where(eq(orders.status, "paid")),
      db.select({ n: count() }).from(messages).where(eq(messages.read, false)),
      db.select({ n: count() }).from(products),
      db.select({ n: count() }).from(products).where(sql`${products.priceCents} IS NULL`),
      db.select().from(orders).where(ne(orders.status, "pending")).orderBy(desc(orders.createdAt)).limit(6),
    ]);
    return {
      orders: sales.n,
      revenueCents: Number(sales.total ?? 0),
      toShip: toShip.n,
      unreadMessages: unread.n,
      products: catalog.n,
      unpricedProducts: unpriced.n,
      recent,
      integrations: {
        stripe: Boolean(env.stripeSecretKey),
        stripeWebhook: Boolean(env.stripeWebhookSecret),
        email: Boolean(env.resendApiKey),
        storage: r2Enabled,
        sessionSecret: Boolean(env.sessionSecret),
      },
    };
  }),

  products: router({
    list: adminProcedure.query(async () => {
      const rows = await db.select().from(products).orderBy(asc(products.sortOrder), asc(products.id));
      const images = await db.select().from(productImages).orderBy(asc(productImages.sortOrder), asc(productImages.id));
      const first = new Map<number, string>();
      for (const img of images) if (!first.has(img.productId)) first.set(img.productId, img.url);
      return rows.map((r) => ({ ...r, image: first.get(r.id) ?? null }));
    }),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const [row] = await db.select().from(products).where(eq(products.id, input.id));
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Product not found." });
      const images = await db
        .select()
        .from(productImages)
        .where(eq(productImages.productId, input.id))
        .orderBy(asc(productImages.sortOrder), asc(productImages.id));
      return { ...row, images: images.map((i) => i.url) };
    }),
    save: adminProcedure.input(productInput).mutation(async ({ input }) => {
      const { id, slug, images, ...data } = input;
      const finalSlug = await uniqueSlug(products, slug || data.nameEn, id);
      return db.transaction(async (tx) => {
        let productId = id;
        if (productId) {
          await tx.update(products).set({ ...data, slug: finalSlug }).where(eq(products.id, productId));
          await tx.delete(productImages).where(eq(productImages.productId, productId));
        } else {
          const [res] = await tx.insert(products).values({ ...data, slug: finalSlug });
          productId = res.insertId;
        }
        if (images.length) {
          await tx.insert(productImages).values(images.map((url, i) => ({ productId: productId!, url, sortOrder: i })));
        }
        return { id: productId, slug: finalSlug };
      });
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await db.delete(productImages).where(eq(productImages.productId, input.id));
      await db.delete(products).where(eq(products.id, input.id));
      return { ok: true };
    }),
  }),

  categories: taxonomyRouter(categories, "categoryId"),
  collections: taxonomyRouter(collections, "collectionId"),

  orders: router({
    list: adminProcedure
      .input(z.object({ status: z.enum(orderStatuses).optional() }).optional())
      .query(async ({ input }) => {
        // Unpaid checkouts are noise unless someone asks for them.
        const where = input?.status ? eq(orders.status, input.status) : ne(orders.status, "pending");
        return db.select().from(orders).where(where).orderBy(desc(orders.createdAt)).limit(300);
      }),
    get: adminProcedure.input(z.object({ id: z.number().int().positive() })).query(async ({ input }) => {
      const [order] = await db.select().from(orders).where(eq(orders.id, input.id));
      if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });
      const items = await db.select().from(orderItems).where(eq(orderItems.orderId, input.id));
      return { ...order, items };
    }),
    update: adminProcedure
      .input(
        z.object({
          id: z.number().int().positive(),
          status: z.enum(orderStatuses),
          trackingCarrier: optionalText(80),
          trackingNumber: optionalText(120),
          notes: optionalText(5000),
          notifyCustomer: z.boolean().default(false),
          restock: z.boolean().default(false),
        }),
      )
      .mutation(async ({ input }) => {
        const [order] = await db.select().from(orders).where(eq(orders.id, input.id));
        if (!order) throw new TRPCError({ code: "NOT_FOUND", message: "Order not found." });

        if (order.status === "pending" && input.status === "cancelled") {
          await releaseOrder(order.id); // returns the held units
        } else if (input.restock && (input.status === "cancelled" || input.status === "refunded") && ["paid", "shipped", "delivered"].includes(order.status)) {
          const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
          for (const item of items) {
            if (item.productId == null) continue;
            await db.update(products).set({ stock: sql`${products.stock} + ${item.quantity}` }).where(eq(products.id, item.productId));
          }
        }

        const becameShipped = input.status === "shipped" && order.status !== "shipped";
        await db
          .update(orders)
          .set({
            status: input.status,
            trackingCarrier: input.trackingCarrier,
            trackingNumber: input.trackingNumber,
            notes: input.notes,
            ...(becameShipped ? { shippedAt: new Date() } : {}),
          })
          .where(eq(orders.id, input.id));

        let emailed = false;
        if (input.notifyCustomer && input.status === "shipped") {
          const data = await loadEmailData(input.id);
          if (data) emailed = await sendOrderShipped(data);
        }
        return { ok: true, emailed };
      }),
  }),

  messages: router({
    list: adminProcedure.query(() => db.select().from(messages).orderBy(desc(messages.createdAt)).limit(300)),
    setRead: adminProcedure.input(z.object({ id: z.number().int().positive(), read: z.boolean() })).mutation(async ({ input }) => {
      await db.update(messages).set({ read: input.read }).where(eq(messages.id, input.id));
      return { ok: true };
    }),
    remove: adminProcedure.input(z.object({ id: z.number().int().positive() })).mutation(async ({ input }) => {
      await db.delete(messages).where(eq(messages.id, input.id));
      return { ok: true };
    }),
  }),

  settings: router({
    get: adminProcedure.query(async () => {
      const rows = await db.select().from(settings);
      return Object.fromEntries(rows.map((r) => [r.key, r.value])) as Record<string, string | undefined>;
    }),
    save: adminProcedure.input(z.record(z.string().max(80), z.string().max(2000))).mutation(async ({ input }) => {
      for (const [key, value] of Object.entries(input)) {
        await db.insert(settings).values({ key, value: value.trim() }).onDuplicateKeyUpdate({ set: { value: value.trim() } });
      }
      return { ok: true };
    }),
  }),
});
