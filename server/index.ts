import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import helmet from "helmet";
import multer from "multer";
import { rateLimit } from "express-rate-limit";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import fs from "node:fs/promises";
import path from "node:path";
import { and, eq } from "drizzle-orm";
import { env, r2Enabled } from "./env";
import { db, pool, runMigrations, seedIfEmpty, schema } from "./db";
import { createContext } from "./trpc";
import { appRouter } from "./routers";
import { isAdmin } from "./lib/auth";
import { LOCAL_UPLOAD_DIR, storeImage } from "./lib/storage";
import { handleStripeEvent, releaseStaleOrders, stripe } from "./lib/orders";

const app = express();
app.set("trust proxy", 1); // Railway terminates TLS in front of the app
app.disable("x-powered-by");

app.use(
  helmet({
    // Vite's dev server relies on inline scripts, so the policy is production-only.
    contentSecurityPolicy: env.isProd
      ? {
          directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", "data:", "blob:", "https:"],
            fontSrc: ["'self'", "data:"],
            connectSrc: ["'self'"],
            formAction: ["'self'"],
            frameAncestors: ["'none'"],
            objectSrc: ["'none'"],
          },
        }
      : false,
    crossOriginEmbedderPolicy: false,
  }),
);
app.use(compression());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

// Stripe signs the raw request body, so this route must come before express.json().
app.post("/api/stripe/webhook", express.raw({ type: "application/json" }), async (req, res) => {
  if (!stripe || !env.stripeWebhookSecret) {
    res.status(503).send("Stripe webhook is not configured");
    return;
  }
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, String(req.headers["stripe-signature"] ?? ""), env.stripeWebhookSecret);
  } catch {
    res.status(400).send("Invalid signature");
    return;
  }
  try {
    await handleStripeEvent(event);
    res.json({ received: true });
  } catch (err) {
    console.error(`[stripe] Failed to handle ${event.type}:`, err);
    res.status(500).send("Webhook handler failed"); // Stripe will retry
  }
});

app.use(express.json({ limit: "200kb" }));

// Throttle the procedures worth abusing, however the request batches them.
const limiter = (max: number, windowMinutes: number) =>
  rateLimit({
    windowMs: windowMinutes * 60_000,
    limit: max,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    // Shaped like a tRPC error so the client can tell the visitor what happened.
    message: { error: { message: "Too many requests. Try again later.", code: -32029, data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 } } },
  });
const sensitive: [string, ReturnType<typeof limiter>][] = [
  ["admin.login", limiter(10, 15)],
  ["shop.contact", limiter(8, 60)],
  ["shop.checkout", limiter(30, 15)],
];
app.use("/api/trpc", (req: Request, res: Response, next: NextFunction) => {
  const hit = sensitive.find(([name]) => req.path.includes(name));
  if (hit) hit[1](req, res, next);
  else next();
});

app.use("/api/trpc", createExpressMiddleware({ router: appRouter, createContext }));

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 12 * 1024 * 1024, files: 1 } });
app.post("/api/admin/upload", (req, res, next) => {
  if (!isAdmin(req)) {
    res.status(401).json({ error: "Sign in to the admin panel first." });
    return;
  }
  next();
}, upload.single("file"), async (req, res) => {
  if (!req.file || !/^image\/(jpeg|png|webp|avif|heic|heif)$/.test(req.file.mimetype)) {
    res.status(400).json({ error: "Upload a JPG, PNG, WebP or HEIC photo." });
    return;
  }
  try {
    res.json({ url: await storeImage(req.file.buffer), persistent: r2Enabled });
  } catch (err) {
    console.error("[upload] Could not store image:", err);
    res.status(500).json({ error: "The photo could not be processed. Try exporting it as JPG and upload again." });
  }
});

app.use("/uploads", express.static(LOCAL_UPLOAD_DIR, { maxAge: "30d", fallthrough: true }));

app.get("/robots.txt", (_req, res) => {
  res.type("text/plain").send(`User-agent: *\nDisallow: /admin\nDisallow: /bag\nDisallow: /order\nSitemap: ${env.siteUrl}/sitemap.xml\n`);
});

app.get("/sitemap.xml", async (_req, res) => {
  const [cats, cols, prods] = await Promise.all([
    db.select({ slug: schema.categories.slug }).from(schema.categories),
    db.select({ slug: schema.collections.slug }).from(schema.collections),
    db.select({ slug: schema.products.slug }).from(schema.products).where(eq(schema.products.active, true)),
  ]);
  const paths = [
    "/", "/shop", "/collections", "/our-story", "/contact", "/faq",
    "/policies/shipping", "/policies/returns", "/policies/privacy", "/policies/terms", "/policies/cookies",
    ...cats.map((c) => `/shop?category=${c.slug}`),
    ...cols.map((c) => `/shop?collection=${c.slug}`),
    ...prods.map((p) => `/product/${p.slug}`),
  ];
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${paths
    .map((p) => `  <url><loc>${env.siteUrl}${p.replace(/&/g, "&amp;")}</loc></url>`)
    .join("\n")}\n</urlset>\n`;
  res.type("application/xml").send(xml);
});

// ── Page shell ────────────────────────────────────────────────────────────────
// The storefront is a single-page app. The server fills in the title, description
// and share image so links to a piece preview properly in WhatsApp, iMessage, etc.

const SITE_NAME = "Madison D’Or";
const DEFAULT_DESCRIPTION = "Fine gold jewelry set with precious stones. Chains, pendants, bracelets and earrings, shipped free within the United States.";

function escapeHtml(s: string) {
  return s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);
}

async function headFor(urlPath: string) {
  let title = `${SITE_NAME} — Fine gold jewelry`;
  let description = DEFAULT_DESCRIPTION;
  let image = `${env.siteUrl}/editorial/v4/hero-curb-chain.jpg`;
  let noindex = /^\/(admin|bag|order)/.test(urlPath);

  const match = urlPath.match(/^\/product\/([^/?#]+)/);
  if (match) {
    try {
      const { products, productImages } = schema;
      const [p] = await db.select().from(products).where(and(eq(products.slug, decodeURIComponent(match[1])), eq(products.active, true)));
      if (p) {
        title = `${p.nameEn} — ${SITE_NAME}`;
        if (p.descriptionEn) description = p.descriptionEn;
        const [img] = await db.select().from(productImages).where(eq(productImages.productId, p.id)).orderBy(productImages.sortOrder).limit(1);
        if (img) image = img.url.startsWith("http") ? img.url : `${env.siteUrl}${img.url}`;
      } else {
        noindex = true;
      }
    } catch (err) {
      console.error("[head] Could not load product meta:", err);
    }
  }
  const t = escapeHtml(title);
  const d = escapeHtml(description.slice(0, 300));
  return [
    `<title>${t}</title>`,
    `<meta name="description" content="${d}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:type" content="${match ? "product" : "website"}">`,
    `<meta property="og:title" content="${t}">`,
    `<meta property="og:description" content="${d}">`,
    `<meta property="og:image" content="${escapeHtml(image)}">`,
    `<meta property="og:url" content="${escapeHtml(env.siteUrl + urlPath)}">`,
    `<meta name="twitter:card" content="summary_large_image">`,
    noindex ? `<meta name="robots" content="noindex">` : "",
  ].join("\n    ");
}

async function attachFrontend() {
  if (env.isProd) {
    const dist = path.resolve(process.cwd(), "dist/public");
    const template = await fs.readFile(path.join(dist, "index.html"), "utf8");
    app.use("/assets", express.static(path.join(dist, "assets"), { maxAge: "1y", immutable: true }));
    app.use(express.static(dist, { index: false, maxAge: "7d" }));
    app.use(async (req, res, next) => {
      if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) return next();
      res.status(200).type("html").send(template.replace("<!--app-head-->", await headFor(req.path)));
    });
  } else {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    app.use(vite.middlewares);
    app.use(async (req, res, next) => {
      if ((req.method !== "GET" && req.method !== "HEAD") || req.path.startsWith("/api/")) return next();
      try {
        const raw = await fs.readFile(path.resolve(process.cwd(), "client/index.html"), "utf8");
        const html = await vite.transformIndexHtml(req.originalUrl, raw);
        res.status(200).type("html").send(html.replace("<!--app-head-->", await headFor(req.path)));
      } catch (err) {
        next(err);
      }
    });
  }
}

async function main() {
  await runMigrations();
  if (await seedIfEmpty()) console.log("[db] Empty database: starting catalog loaded.");
  await attachFrontend();

  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    console.error("[server] Unhandled error:", err);
    res.status(500).json({ error: "Something went wrong on our side." });
  });

  const server = app.listen(env.port, "0.0.0.0", () => {
    console.log(`Madison D'Or listening on :${env.port} (${env.isProd ? "production" : "development"})`);
    if (!env.stripeSecretKey) console.warn("[config] STRIPE_SECRET_KEY is not set: checkout is disabled.");
    if (!env.adminEmail || !env.adminPassword) console.warn("[config] ADMIN_EMAIL / ADMIN_PASSWORD are not set: the admin panel cannot be opened.");
    if (!env.sessionSecret) console.warn("[config] SESSION_SECRET is not set: admin sessions end on every restart.");
    if (!r2Enabled) console.warn("[config] Cloudflare R2 is not configured: uploaded photos are stored on local disk and are lost on redeploy.");
  });

  const sweep = setInterval(() => {
    releaseStaleOrders().catch((err) => console.error("[orders] Stale sweep failed:", err));
  }, 10 * 60_000);
  sweep.unref();

  const shutdown = () => {
    server.close(() => {
      pool.end().finally(() => process.exit(0));
    });
  };
  process.on("SIGTERM", shutdown);
  process.on("SIGINT", shutdown);
}

main().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
