import Stripe from "stripe";
import crypto from "node:crypto";
import { and, eq, inArray, sql } from "drizzle-orm";
import { db, schema } from "../db";
import { env } from "../env";
import { sendNewOrderAlert, sendOrderConfirmation, type OrderEmailData } from "./email";
import type { Locale } from "../../shared/format";

const { orders, orderItems, products, productImages } = schema;

export const stripe = env.stripeSecretKey ? new Stripe(env.stripeSecretKey) : null;

// Stripe's minimum session lifetime is 30 minutes. Stock stays held for this long at most.
const SESSION_MINUTES = 31;
const STALE_MINUTES = 45;

export type CartLine = { productId: number; quantity: number };
export type CartProblem = { productId: number; reason: "unavailable" | "insufficient"; available: number };

export type CheckoutResult =
  | { ok: true; url: string; token: string }
  | { ok: false; reason: "not_configured" }
  | { ok: false; reason: "cart"; problems: CartProblem[] };

class StockError extends Error {
  constructor(public productId: number) {
    super("Not enough stock");
  }
}

function absoluteUrl(url: string | null | undefined) {
  if (!url) return undefined;
  const abs = url.startsWith("http") ? url : `${env.siteUrl}${url}`;
  return abs.startsWith("https://") ? abs : undefined; // Stripe only accepts public https images
}

/** Cancels a pending order and puts its held units back on sale. Safe to call twice. */
export async function releaseOrder(orderId: number) {
  return db.transaction(async (tx) => {
    const [res] = await tx
      .update(orders)
      .set({ status: "cancelled", stockReserved: false })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending"), eq(orders.stockReserved, true)));
    if (res.affectedRows === 0) return false;
    const items = await tx.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId == null) continue;
      await tx
        .update(products)
        .set({ stock: sql`${products.stock} + ${item.quantity}` })
        .where(eq(products.id, item.productId));
    }
    return true;
  });
}

async function loadEmailData(orderId: number): Promise<OrderEmailData | null> {
  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
  return { ...order, items };
}

/** Marks an order paid from a completed Stripe session. Emails go out exactly once. */
export async function finalizeFromSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return false;
  const orderId = Number(session.client_reference_id ?? session.metadata?.orderId);
  if (!Number.isInteger(orderId)) return false;

  const [order] = await db.select().from(orders).where(eq(orders.id, orderId));
  if (!order || (order.status !== "pending" && order.status !== "cancelled")) return false;

  const shipping = session.collected_information?.shipping_details;
  const address = shipping?.address ?? session.customer_details?.address ?? null;
  const paymentIntent = typeof session.payment_intent === "string" ? session.payment_intent : (session.payment_intent?.id ?? null);

  const [res] = await db
    .update(orders)
    .set({
      status: "paid",
      paidAt: new Date(),
      stockReserved: false,
      email: session.customer_details?.email ?? null,
      name: shipping?.name ?? session.customer_details?.name ?? null,
      phone: session.customer_details?.phone ?? null,
      shippingAddress: address
        ? {
            line1: address.line1,
            line2: address.line2,
            city: address.city,
            state: address.state,
            postalCode: address.postal_code,
            country: address.country,
          }
        : null,
      subtotalCents: session.amount_subtotal ?? order.subtotalCents,
      shippingCents: session.total_details?.amount_shipping ?? 0,
      taxCents: session.total_details?.amount_tax ?? 0,
      totalCents: session.amount_total ?? order.totalCents,
      stripePaymentIntentId: paymentIntent,
    })
    .where(and(eq(orders.id, orderId), inArray(orders.status, ["pending", "cancelled"])));
  if (res.affectedRows === 0) return false; // another request finalised it first

  // The hold had already been released (session outlived our sweep) but the
  // customer paid anyway: take the units out again, never below zero.
  if (order.status === "cancelled") {
    const items = await db.select().from(orderItems).where(eq(orderItems.orderId, orderId));
    for (const item of items) {
      if (item.productId == null) continue;
      await db
        .update(products)
        .set({ stock: sql`GREATEST(${products.stock} - ${item.quantity}, 0)` })
        .where(eq(products.id, item.productId));
    }
  }

  const data = await loadEmailData(orderId);
  if (data) {
    await Promise.allSettled([sendOrderConfirmation(data), sendNewOrderAlert(data)]);
  }
  return true;
}

/** Settles one pending order against Stripe: paid orders are finalised, anything else is released. */
async function settlePending(order: typeof orders.$inferSelect, expire: boolean) {
  if (stripe && order.stripeSessionId) {
    try {
      let session = await stripe.checkout.sessions.retrieve(order.stripeSessionId);
      if (session.payment_status === "paid") {
        await finalizeFromSession(session);
        return;
      }
      if (expire && session.status === "open") {
        session = await stripe.checkout.sessions.expire(order.stripeSessionId);
      }
    } catch (err) {
      console.error(`[orders] Could not check Stripe session for ${order.number}:`, err);
    }
  }
  await releaseOrder(order.id);
}

/** Called when the customer backs out of checkout, so the pieces go back on sale straight away. */
export async function cancelPendingByToken(token: string) {
  const [order] = await db.select().from(orders).where(eq(orders.token, token));
  if (!order || order.status !== "pending") return false;
  await settlePending(order, true);
  return true;
}

/** Frees stock held by checkouts that were abandoned without Stripe telling us. */
export async function releaseStaleOrders() {
  // Compared inside MySQL so the app's clock and time zone never enter into it.
  const stale = await db
    .select()
    .from(orders)
    .where(
      and(
        eq(orders.status, "pending"),
        eq(orders.stockReserved, true),
        sql`${orders.createdAt} < NOW() - INTERVAL ${sql.raw(String(STALE_MINUTES))} MINUTE`,
      ),
    );
  for (const order of stale) await settlePending(order, true);
  return stale.length;
}

export async function createCheckout(lines: CartLine[], locale: Locale, previousToken?: string): Promise<CheckoutResult> {
  if (!stripe) return { ok: false, reason: "not_configured" };

  await releaseStaleOrders().catch((err) => console.error("[orders] Stale sweep failed:", err));
  if (previousToken) await cancelPendingByToken(previousToken).catch(() => undefined);

  // Merge duplicate lines so one product is checked against its stock once.
  const wanted = new Map<number, number>();
  for (const l of lines) wanted.set(l.productId, (wanted.get(l.productId) ?? 0) + l.quantity);
  const ids = [...wanted.keys()];

  const rows = await db.select().from(products).where(inArray(products.id, ids));
  const byId = new Map(rows.map((r) => [r.id, r]));
  const problems: CartProblem[] = [];
  for (const [id, qty] of wanted) {
    const p = byId.get(id);
    if (!p || !p.active || p.priceCents == null || p.stock <= 0) {
      problems.push({ productId: id, reason: "unavailable", available: 0 });
    } else if (p.stock < qty) {
      problems.push({ productId: id, reason: "insufficient", available: p.stock });
    }
  }
  if (problems.length) return { ok: false, reason: "cart", problems };

  const images = await db.select().from(productImages).where(inArray(productImages.productId, ids)).orderBy(productImages.sortOrder);
  const firstImage = new Map<number, string>();
  for (const img of images) if (!firstImage.has(img.productId)) firstImage.set(img.productId, img.url);

  const items = ids.map((id) => {
    const p = byId.get(id)!;
    return {
      productId: id,
      name: locale === "es" ? p.nameEs : p.nameEn,
      sku: p.sku,
      image: firstImage.get(id) ?? null,
      unitPriceCents: p.priceCents!,
      quantity: wanted.get(id)!,
    };
  });
  const subtotal = items.reduce((s, i) => s + i.unitPriceCents * i.quantity, 0);
  const token = crypto.randomBytes(24).toString("hex");

  let orderId: number;
  try {
    orderId = await db.transaction(async (tx) => {
      for (const item of items) {
        // The WHERE clause makes the hold atomic: two shoppers cannot take the same last piece.
        const [res] = await tx
          .update(products)
          .set({ stock: sql`${products.stock} - ${item.quantity}` })
          .where(and(eq(products.id, item.productId), sql`${products.stock} >= ${item.quantity}`));
        if (res.affectedRows === 0) throw new StockError(item.productId);
      }
      const [res] = await tx.insert(orders).values({
        number: `TMP-${token.slice(0, 16)}`,
        token,
        status: "pending",
        locale,
        subtotalCents: subtotal,
        totalCents: subtotal,
        stockReserved: true,
      });
      const id = res.insertId;
      await tx.update(orders).set({ number: `MD-${10000 + id}` }).where(eq(orders.id, id));
      await tx.insert(orderItems).values(items.map((i) => ({ ...i, orderId: id })));
      return id;
    });
  } catch (err) {
    if (err instanceof StockError) {
      return { ok: false, reason: "cart", problems: [{ productId: err.productId, reason: "unavailable", available: 0 }] };
    }
    throw err;
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      locale: locale === "es" ? "es" : "en",
      client_reference_id: String(orderId),
      metadata: { orderId: String(orderId) },
      payment_intent_data: { metadata: { orderId: String(orderId) } },
      line_items: items.map((i) => {
        const image = absoluteUrl(i.image);
        return {
          quantity: i.quantity,
          price_data: {
            currency: "usd",
            unit_amount: i.unitPriceCents,
            product_data: { name: i.name, ...(image ? { images: [image] } : {}) },
          },
        };
      }),
      shipping_address_collection: { allowed_countries: ["US"] },
      phone_number_collection: { enabled: true },
      shipping_options: [
        {
          shipping_rate_data: {
            type: "fixed_amount",
            fixed_amount: { amount: 0, currency: "usd" },
            display_name: locale === "es" ? "Envío sin costo" : "Complimentary shipping",
            delivery_estimate: {
              minimum: { unit: "day", value: 5 },
              maximum: { unit: "day", value: 7 },
            },
          },
        },
      ],
      automatic_tax: { enabled: env.stripeAutomaticTax },
      expires_at: Math.floor(Date.now() / 1000) + SESSION_MINUTES * 60,
      success_url: `${env.siteUrl}/order/confirmed?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${env.siteUrl}/bag?cancelled=1`,
    });
    if (!session.url) throw new Error("Stripe returned a session without a URL");
    await db.update(orders).set({ stripeSessionId: session.id }).where(eq(orders.id, orderId));
    return { ok: true, url: session.url, token };
  } catch (err) {
    await releaseOrder(orderId);
    throw err;
  }
}

/** Order summary for the confirmation page. Also settles the order if the webhook has not arrived yet. */
export async function getOrderBySession(sessionId: string) {
  let [order] = await db.select().from(orders).where(eq(orders.stripeSessionId, sessionId));
  if (!order) return null;
  if ((order.status === "pending" || order.status === "cancelled") && stripe) {
    try {
      const session = await stripe.checkout.sessions.retrieve(sessionId);
      if (await finalizeFromSession(session)) {
        [order] = await db.select().from(orders).where(eq(orders.id, order.id));
      }
    } catch (err) {
      console.error(`[orders] Could not confirm session ${sessionId}:`, err);
    }
  }
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, order.id));
  return {
    number: order.number,
    status: order.status,
    email: order.email,
    name: order.name,
    shippingAddress: order.shippingAddress,
    subtotalCents: order.subtotalCents,
    shippingCents: order.shippingCents,
    taxCents: order.taxCents,
    totalCents: order.totalCents,
    items: items.map((i) => ({ productId: i.productId, name: i.name, image: i.image, quantity: i.quantity, unitPriceCents: i.unitPriceCents })),
  };
}

export async function handleStripeEvent(event: Stripe.Event) {
  switch (event.type) {
    case "checkout.session.completed":
    case "checkout.session.async_payment_succeeded":
      await finalizeFromSession(event.data.object);
      break;
    case "checkout.session.expired":
    case "checkout.session.async_payment_failed": {
      const orderId = Number(event.data.object.client_reference_id);
      if (Number.isInteger(orderId)) await releaseOrder(orderId);
      break;
    }
  }
}

export { loadEmailData };
