import {
  mysqlTable, int, varchar, text, boolean, timestamp, json, mysqlEnum, index, uniqueIndex,
} from "drizzle-orm/mysql-core";

export const categories = mysqlTable("categories", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  nameEs: varchar("name_es", { length: 160 }).notNull(),
  descriptionEn: text("description_en"),
  descriptionEs: text("description_es"),
  image: varchar("image", { length: 500 }),
  sortOrder: int("sort_order").notNull().default(0),
});

// Curated groupings that cut across categories (a stone, a campaign, a line).
export const collections = mysqlTable("collections", {
  id: int("id").autoincrement().primaryKey(),
  slug: varchar("slug", { length: 120 }).notNull().unique(),
  nameEn: varchar("name_en", { length: 160 }).notNull(),
  nameEs: varchar("name_es", { length: 160 }).notNull(),
  descriptionEn: text("description_en"),
  descriptionEs: text("description_es"),
  image: varchar("image", { length: 500 }),
  sortOrder: int("sort_order").notNull().default(0),
});

export const products = mysqlTable(
  "products",
  {
    id: int("id").autoincrement().primaryKey(),
    slug: varchar("slug", { length: 160 }).notNull(),
    sku: varchar("sku", { length: 60 }),
    nameEn: varchar("name_en", { length: 200 }).notNull(),
    nameEs: varchar("name_es", { length: 200 }).notNull(),
    descriptionEn: text("description_en"),
    descriptionEs: text("description_es"),
    // One "Label: value" pair per line, shown as the specification list.
    detailsEn: text("details_en"),
    detailsEs: text("details_es"),
    // null = price on request; the piece can be inquired about but not bought online.
    priceCents: int("price_cents"),
    compareAtCents: int("compare_at_cents"),
    stock: int("stock").notNull().default(0),
    categoryId: int("category_id"),
    collectionId: int("collection_id"),
    featured: boolean("featured").notNull().default(false),
    isNew: boolean("is_new").notNull().default(false),
    active: boolean("active").notNull().default(true),
    sortOrder: int("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow().onUpdateNow(),
  },
  (t) => [uniqueIndex("products_slug_idx").on(t.slug), index("products_category_idx").on(t.categoryId)],
);

export const productImages = mysqlTable(
  "product_images",
  {
    id: int("id").autoincrement().primaryKey(),
    productId: int("product_id").notNull(),
    url: varchar("url", { length: 500 }).notNull(),
    sortOrder: int("sort_order").notNull().default(0),
  },
  (t) => [index("product_images_product_idx").on(t.productId)],
);

export type ShippingAddress = {
  line1?: string | null;
  line2?: string | null;
  city?: string | null;
  state?: string | null;
  postalCode?: string | null;
  country?: string | null;
};

export const orderStatuses = ["pending", "paid", "shipped", "delivered", "cancelled", "refunded"] as const;

export const orders = mysqlTable(
  "orders",
  {
    id: int("id").autoincrement().primaryKey(),
    number: varchar("number", { length: 24 }).notNull(),
    // Unguessable handle the storefront uses to refer to its own pending order.
    token: varchar("token", { length: 64 }).notNull(),
    status: mysqlEnum("status", orderStatuses).notNull().default("pending"),
    locale: varchar("locale", { length: 5 }).notNull().default("en"),
    email: varchar("email", { length: 255 }),
    name: varchar("name", { length: 255 }),
    phone: varchar("phone", { length: 60 }),
    shippingAddress: json("shipping_address").$type<ShippingAddress>(),
    subtotalCents: int("subtotal_cents").notNull().default(0),
    shippingCents: int("shipping_cents").notNull().default(0),
    taxCents: int("tax_cents").notNull().default(0),
    totalCents: int("total_cents").notNull().default(0),
    currency: varchar("currency", { length: 8 }).notNull().default("usd"),
    stripeSessionId: varchar("stripe_session_id", { length: 255 }),
    stripePaymentIntentId: varchar("stripe_payment_intent_id", { length: 255 }),
    // true while the order is holding units taken out of products.stock
    stockReserved: boolean("stock_reserved").notNull().default(false),
    trackingCarrier: varchar("tracking_carrier", { length: 80 }),
    trackingNumber: varchar("tracking_number", { length: 120 }),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    paidAt: timestamp("paid_at"),
    shippedAt: timestamp("shipped_at"),
  },
  (t) => [
    uniqueIndex("orders_number_idx").on(t.number),
    uniqueIndex("orders_token_idx").on(t.token),
    index("orders_session_idx").on(t.stripeSessionId),
    index("orders_status_idx").on(t.status),
  ],
);

export const orderItems = mysqlTable(
  "order_items",
  {
    id: int("id").autoincrement().primaryKey(),
    orderId: int("order_id").notNull(),
    productId: int("product_id"),
    name: varchar("name", { length: 200 }).notNull(),
    sku: varchar("sku", { length: 60 }),
    image: varchar("image", { length: 500 }),
    unitPriceCents: int("unit_price_cents").notNull(),
    quantity: int("quantity").notNull(),
  },
  (t) => [index("order_items_order_idx").on(t.orderId)],
);

export const messages = mysqlTable("messages", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 160 }).notNull(),
  email: varchar("email", { length: 255 }).notNull(),
  phone: varchar("phone", { length: 60 }),
  subject: varchar("subject", { length: 200 }),
  message: text("message").notNull(),
  locale: varchar("locale", { length: 5 }).notNull().default("en"),
  read: boolean("is_read").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const settings = mysqlTable("settings", {
  key: varchar("key", { length: 80 }).primaryKey(),
  value: text("value").notNull(),
});
