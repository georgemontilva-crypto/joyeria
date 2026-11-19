import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import { migrate } from "drizzle-orm/mysql2/migrator";
import { count } from "drizzle-orm";
import path from "node:path";
import { env } from "../env";
import * as schema from "./schema";
import { curatedOrder, seedCategories, seedCollections, seedProducts, seedSettings } from "./seed-data";

if (!env.databaseUrl) {
  throw new Error("DATABASE_URL is not set. Point it at a MySQL database (on Railway, reference the MySQL service's MYSQL_URL).");
}

export const pool = mysql.createPool({
  uri: env.databaseUrl,
  connectionLimit: 10,
  waitForConnections: true,
});

// Drizzle reads and writes timestamps as UTC. Pin every connection to UTC as well,
// so NOW() and column defaults agree with it whatever the database server's zone is.
pool.pool.on("connection", (conn) => {
  conn.query("SET time_zone = '+00:00'");
});

export const db = drizzle(pool, { schema, mode: "default" });
export type Db = typeof db;

export async function runMigrations() {
  await migrate(db, { migrationsFolder: path.resolve(process.cwd(), "drizzle") });
}

/** Fills an empty database with the starting catalog. Does nothing once any category or product exists. */
export async function seedIfEmpty() {
  const [{ n: productCount }] = await db.select({ n: count() }).from(schema.products);
  const [{ n: categoryCount }] = await db.select({ n: count() }).from(schema.categories);

  const existing = await db.select().from(schema.settings);
  const have = new Set(existing.map((s) => s.key));
  const missing = Object.entries(seedSettings).filter(([k]) => !have.has(k));
  if (missing.length) {
    await db.insert(schema.settings).values(missing.map(([key, value]) => ({ key, value })));
  }

  if (productCount > 0 || categoryCount > 0) return false;

  await db.insert(schema.categories).values(seedCategories.map((c, i) => ({ ...c, sortOrder: i })));
  await db.insert(schema.collections).values(seedCollections.map((c, i) => ({ ...c, sortOrder: i })));
  const cats = await db.select().from(schema.categories);
  const cols = await db.select().from(schema.collections);
  const catId = new Map(cats.map((c) => [c.slug, c.id]));
  const colId = new Map(cols.map((c) => [c.slug, c.id]));

  for (const p of seedProducts) {
    const position = curatedOrder.indexOf(p.slug);
    const [res] = await db.insert(schema.products).values({
      slug: p.slug,
      sku: p.sku,
      nameEn: p.nameEn,
      nameEs: p.nameEs,
      descriptionEn: p.descriptionEn,
      descriptionEs: p.descriptionEs,
      detailsEn: p.detailsEn,
      detailsEs: p.detailsEs,
      priceCents: null,
      stock: 1,
      categoryId: catId.get(p.category) ?? null,
      collectionId: p.collection ? (colId.get(p.collection) ?? null) : null,
      featured: Boolean(p.featured),
      isNew: Boolean(p.isNew),
      active: true,
      sortOrder: position === -1 ? curatedOrder.length : position,
    });
    const productId = res.insertId;
    await db.insert(schema.productImages).values(
      Array.from({ length: p.images }, (_, k) => ({
        productId,
        url: `/catalog/${p.studio ? "v2/" : ""}${p.slug}-${k + 1}.jpg`,
        sortOrder: k,
      })),
    );
  }
  return true;
}

export { schema };
