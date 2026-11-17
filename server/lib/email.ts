import { Resend } from "resend";
import { env } from "../env";
import { formatMoney, type Locale } from "../../shared/format";
import type { ShippingAddress } from "../db/schema";

const resend = env.resendApiKey ? new Resend(env.resendApiKey) : null;

const NAVY = "#07152F";
const GOLD = "#C9A66B";

function esc(s: string | null | undefined) {
  return (s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

function layout(title: string, body: string) {
  return `<!doctype html><html><body style="margin:0;background:#F4F6FA;font-family:Helvetica,Arial,sans-serif;color:${NAVY}">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#F4F6FA;padding:32px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff">
<tr><td style="background:${NAVY};padding:28px 32px;text-align:center;border-bottom:2px solid ${GOLD}">
<div style="font-family:Georgia,'Times New Roman',serif;font-size:22px;letter-spacing:6px;color:${GOLD}">MADISON D&rsquo;OR</div></td></tr>
<tr><td style="padding:32px">
<h1 style="font-family:Georgia,'Times New Roman',serif;font-weight:normal;font-size:24px;line-height:1.25;margin:0 0 16px">${title}</h1>
${body}
</td></tr>
<tr><td style="padding:20px 32px;border-top:1px solid #D9DEE8;font-size:12px;line-height:1.6;color:#56627A">
Madison D&rsquo;Or &middot; <a href="${env.siteUrl}" style="color:#56627A">${env.siteUrl.replace(/^https?:\/\//, "")}</a></td></tr>
</table></td></tr></table></body></html>`;
}

async function send(to: string, subject: string, html: string, replyTo?: string) {
  if (!resend) {
    console.log(`[email] RESEND_API_KEY not set; skipped "${subject}" to ${to}`);
    return false;
  }
  try {
    const { error } = await resend.emails.send({ from: env.emailFrom, to, subject, html, replyTo });
    if (error) {
      console.error(`[email] Resend rejected "${subject}" to ${to}:`, error);
      return false;
    }
    return true;
  } catch (err) {
    console.error(`[email] Failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

export type OrderEmailData = {
  number: string;
  locale: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  shippingAddress: ShippingAddress | null;
  subtotalCents: number;
  shippingCents: number;
  taxCents: number;
  totalCents: number;
  trackingCarrier?: string | null;
  trackingNumber?: string | null;
  items: { name: string; quantity: number; unitPriceCents: number }[];
};

function addressHtml(a: ShippingAddress | null) {
  if (!a) return "";
  return [a.line1, a.line2, [a.city, a.state, a.postalCode].filter(Boolean).join(", "), a.country]
    .filter(Boolean)
    .map((l) => esc(l))
    .join("<br>");
}

function itemsTable(o: OrderEmailData, l: Locale) {
  const t = l === "es"
    ? { subtotal: "Subtotal", shipping: "Envío", free: "Sin costo", tax: "Impuestos", total: "Total" }
    : { subtotal: "Subtotal", shipping: "Shipping", free: "Complimentary", tax: "Tax", total: "Total" };
  const row = (a: string, b: string, bold = false) =>
    `<tr><td style="padding:6px 0;font-size:14px${bold ? ";font-weight:bold" : ""}">${a}</td><td align="right" style="padding:6px 0;font-size:14px${bold ? ";font-weight:bold" : ""}">${b}</td></tr>`;
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #D9DEE8;border-bottom:1px solid #D9DEE8;margin:20px 0">
${o.items.map((i) => row(`${esc(i.name)} &times; ${i.quantity}`, formatMoney(i.unitPriceCents * i.quantity, l))).join("")}
<tr><td colspan="2" style="border-top:1px solid #D9DEE8;height:6px"></td></tr>
${row(t.subtotal, formatMoney(o.subtotalCents, l))}
${row(t.shipping, o.shippingCents ? formatMoney(o.shippingCents, l) : t.free)}
${o.taxCents ? row(t.tax, formatMoney(o.taxCents, l)) : ""}
${row(t.total, formatMoney(o.totalCents, l), true)}
</table>`;
}

const p = (s: string) => `<p style="font-size:15px;line-height:1.6;margin:0 0 14px">${s}</p>`;

export async function sendOrderConfirmation(o: OrderEmailData) {
  if (!o.email) return false;
  const l: Locale = o.locale === "es" ? "es" : "en";
  const first = esc((o.name ?? "").split(" ")[0]);
  const html = l === "es"
    ? layout(
        `Gracias por su compra${first ? `, ${first}` : ""}`,
        p(`Recibimos su pedido <strong>${esc(o.number)}</strong> y ya lo estamos preparando. El envío dentro de Estados Unidos no tiene costo y tarda de 5 a 7 días. Le escribiremos de nuevo cuando salga.`) +
          itemsTable(o, l) +
          p(`<strong>Dirección de envío</strong><br>${esc(o.name)}<br>${addressHtml(o.shippingAddress)}`) +
          p(`Si necesita cambiar algo, responda a este correo.`),
      )
    : layout(
        `Thank you for your order${first ? `, ${first}` : ""}`,
        p(`We received order <strong>${esc(o.number)}</strong> and are preparing it now. Shipping within the United States is complimentary and takes 5 to 7 days. We will write again when it leaves.`) +
          itemsTable(o, l) +
          p(`<strong>Shipping address</strong><br>${esc(o.name)}<br>${addressHtml(o.shippingAddress)}`) +
          p(`If anything needs to change, reply to this email.`),
      );
  const subject = l === "es" ? `Pedido ${o.number} confirmado` : `Order ${o.number} confirmed`;
  return send(o.email, subject, html, env.ordersEmail);
}

export async function sendOrderShipped(o: OrderEmailData) {
  if (!o.email) return false;
  const l: Locale = o.locale === "es" ? "es" : "en";
  const tracking = o.trackingNumber
    ? `${esc(o.trackingCarrier) || (l === "es" ? "Guía" : "Tracking")}: <strong>${esc(o.trackingNumber)}</strong>`
    : "";
  const html = l === "es"
    ? layout(
        "Su pedido va en camino",
        p(`El pedido <strong>${esc(o.number)}</strong> ya salió hacia la dirección que nos indicó.`) +
          (tracking ? p(tracking) : "") +
          p(`<strong>Dirección de envío</strong><br>${esc(o.name)}<br>${addressHtml(o.shippingAddress)}`),
      )
    : layout(
        "Your order is on its way",
        p(`Order <strong>${esc(o.number)}</strong> has left for the address you gave us.`) +
          (tracking ? p(tracking) : "") +
          p(`<strong>Shipping address</strong><br>${esc(o.name)}<br>${addressHtml(o.shippingAddress)}`),
      );
  const subject = l === "es" ? `Pedido ${o.number} enviado` : `Order ${o.number} shipped`;
  return send(o.email, subject, html, env.ordersEmail);
}

export async function sendNewOrderAlert(o: OrderEmailData) {
  const html = layout(
    `Nuevo pedido ${esc(o.number)}`,
    p(`<strong>${esc(o.name)}</strong><br>${esc(o.email)}${o.phone ? `<br>${esc(o.phone)}` : ""}`) +
      itemsTable(o, "es") +
      p(`<strong>Enviar a</strong><br>${addressHtml(o.shippingAddress)}`) +
      p(`<a href="${env.siteUrl}/admin/orders" style="color:${NAVY}">Abrir en el panel</a>`),
  );
  return send(env.ordersEmail, `Nuevo pedido ${o.number} — ${formatMoney(o.totalCents, "es")}`, html, o.email ?? undefined);
}

export async function sendContactMessage(m: { name: string; email: string; phone?: string | null; subject?: string | null; message: string }) {
  const html = layout(
    "Nuevo mensaje desde la web",
    p(`<strong>${esc(m.name)}</strong><br>${esc(m.email)}${m.phone ? `<br>${esc(m.phone)}` : ""}`) +
      (m.subject ? p(`<strong>Asunto:</strong> ${esc(m.subject)}`) : "") +
      p(esc(m.message).replace(/\n/g, "<br>")),
  );
  return send(env.ordersEmail, `Mensaje de ${m.name}${m.subject ? `: ${m.subject}` : ""}`, html, m.email);
}
