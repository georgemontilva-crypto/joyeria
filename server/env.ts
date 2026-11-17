const e = process.env;

function bool(v: string | undefined) {
  return v === "1" || v === "true";
}

export const env = {
  isProd: e.NODE_ENV === "production",
  port: Number(e.PORT ?? 3000),
  // Railway's MySQL plugin exposes MYSQL_URL; DATABASE_URL wins if both exist.
  databaseUrl: e.DATABASE_URL || e.MYSQL_URL || "",
  siteUrl: (e.SITE_URL || (e.RAILWAY_PUBLIC_DOMAIN ? `https://${e.RAILWAY_PUBLIC_DOMAIN}` : `http://localhost:${e.PORT ?? 3000}`)).replace(/\/$/, ""),
  sessionSecret: e.SESSION_SECRET || "",
  adminEmail: (e.ADMIN_EMAIL || "").trim().toLowerCase(),
  adminPassword: e.ADMIN_PASSWORD || "",
  stripeSecretKey: e.STRIPE_SECRET_KEY || "",
  stripeWebhookSecret: e.STRIPE_WEBHOOK_SECRET || "",
  stripeAutomaticTax: bool(e.STRIPE_AUTOMATIC_TAX),
  resendApiKey: e.RESEND_API_KEY || "",
  emailFrom: e.EMAIL_FROM || "Madison D'Or <onboarding@resend.dev>",
  ordersEmail: e.ORDERS_EMAIL || "Madisondor18k@gmail.com",
  r2: {
    accountId: e.R2_ACCOUNT_ID || "",
    accessKeyId: e.R2_ACCESS_KEY_ID || "",
    secretAccessKey: e.R2_SECRET_ACCESS_KEY || "",
    bucket: e.R2_BUCKET || "",
    publicUrl: (e.R2_PUBLIC_URL || "").replace(/\/$/, ""),
  },
};

export const r2Enabled = Boolean(
  env.r2.accountId && env.r2.accessKeyId && env.r2.secretAccessKey && env.r2.bucket && env.r2.publicUrl,
);
