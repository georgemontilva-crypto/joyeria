import type { ReactNode } from "react";

export function Field({ label, hint, full, children }: { label: string; hint?: string; full?: boolean; children: ReactNode }) {
  // The hint sits outside the <label> so it is not read out as part of the field's name.
  return (
    <div className={`field${full ? " full" : ""}`}>
      <label style={{ display: "block", marginBottom: 0 }}>
        <span style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.925rem", fontWeight: 500 }}>{label}</span>
        {children}
      </label>
      {hint ? <p className="hint">{hint}</p> : null}
    </div>
  );
}

export function Check({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <label className="check">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      {label}
    </label>
  );
}

export const money = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(cents / 100);

export const dateTime = (value: string | Date | null | undefined) =>
  value ? new Intl.DateTimeFormat("es", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "";

export const STATUS_LABEL: Record<string, string> = {
  pending: "Sin pagar",
  paid: "Pagado",
  shipped: "Enviado",
  delivered: "Entregado",
  cancelled: "Cancelado",
  refunded: "Reembolsado",
};

export function StatusTag({ status }: { status: string }) {
  const tone = status === "paid" ? "tag--warn" : status === "shipped" || status === "delivered" ? "tag--ok" : status === "pending" ? "" : "tag--bad";
  return <span className={`tag ${tone}`}>{STATUS_LABEL[status] ?? status}</span>;
}

/** Sends one photo to the server and returns its public URL. */
export async function uploadImage(file: File): Promise<string> {
  const body = new FormData();
  body.append("file", file);
  const res = await fetch("/api/admin/upload", { method: "POST", body, credentials: "same-origin" });
  const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
  if (!res.ok || !data.url) throw new Error(data.error || "No se pudo subir la foto. Intente de nuevo.");
  return data.url;
}

/** "1,250.00" → 125000. Empty means no price. Returns undefined when the text is not a number. */
export function parseDollars(text: string): number | null | undefined {
  const clean = text.replace(/[$,\s]/g, "");
  if (!clean) return null;
  if (!/^\d+(\.\d{1,2})?$/.test(clean)) return undefined;
  return Math.round(Number(clean) * 100);
}

export const dollars = (cents: number | null | undefined) => (cents == null ? "" : (cents / 100).toFixed(2));
