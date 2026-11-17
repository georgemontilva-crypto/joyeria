import crypto from "node:crypto";
import type { Request, Response } from "express";
import { env } from "../env";

const COOKIE = "md_admin";
const MAX_AGE_S = 60 * 60 * 12;

// Without SESSION_SECRET the key is random per boot: admin sessions still work,
// they just end whenever the server restarts.
const secret = env.sessionSecret || crypto.randomBytes(32).toString("hex");

function sign(payload: string) {
  return crypto.createHmac("sha256", secret).update(payload).digest("base64url");
}

function safeEqual(a: string, b: string) {
  const ha = crypto.createHash("sha256").update(a).digest();
  const hb = crypto.createHash("sha256").update(b).digest();
  return crypto.timingSafeEqual(ha, hb);
}

export function adminConfigured() {
  return Boolean(env.adminEmail && env.adminPassword);
}

export function checkCredentials(email: string, password: string) {
  if (!adminConfigured()) return false;
  const okEmail = safeEqual(email.trim().toLowerCase(), env.adminEmail);
  const okPass = safeEqual(password, env.adminPassword);
  return okEmail && okPass;
}

export function readCookie(req: Request, name: string) {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(";")) {
    const i = part.indexOf("=");
    if (i === -1) continue;
    if (part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

export function setAdminCookie(res: Response) {
  const payload = Buffer.from(JSON.stringify({ exp: Date.now() + MAX_AGE_S * 1000 })).toString("base64url");
  const value = `${payload}.${sign(payload)}`;
  res.cookie(COOKIE, value, {
    httpOnly: true,
    sameSite: "lax",
    secure: env.isProd,
    maxAge: MAX_AGE_S * 1000,
    path: "/",
  });
}

export function clearAdminCookie(res: Response) {
  res.clearCookie(COOKIE, { path: "/" });
}

export function isAdmin(req: Request) {
  const value = readCookie(req, COOKIE);
  if (!value) return false;
  const [payload, sig] = value.split(".");
  if (!payload || !sig || !safeEqual(sig, sign(payload))) return false;
  try {
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp > Date.now();
  } catch {
    return false;
  }
}
