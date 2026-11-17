import { useEffect, useState, type FormEvent } from "react";
import { Link } from "wouter";
import { trpc } from "@/trpc";
import { Check, Field, STATUS_LABEL, StatusTag, dateTime, money } from "./ui";

const STATUSES = ["paid", "shipped", "delivered", "cancelled", "refunded", "pending"] as const;
type Status = (typeof STATUSES)[number];

export function OrderList() {
  const [status, setStatus] = useState<Status | "">("");
  const list = trpc.admin.orders.list.useQuery(status ? { status } : undefined, { staleTime: 0 });
  return (
    <>
      <div className="adm__head">
        <h1>Pedidos</h1>
        <select className="select" style={{ width: "auto", minHeight: "2.6rem" }} aria-label="Filtrar por estado" value={status} onChange={(e) => setStatus(e.target.value as Status | "")}>
          <option value="">Todos los pagados</option>
          {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
        </select>
      </div>
      {!list.data ? (
        <p>Cargando…</p>
      ) : list.data.length === 0 ? (
        <div className="panel">
          <p>{status ? "No hay pedidos con ese estado." : "Todavía no hay pedidos. Aparecerán aquí en cuanto alguien compre."}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Pedido</th>
                <th>Fecha</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th className="num">Total</th>
              </tr>
            </thead>
            <tbody>
              {list.data.map((o) => (
                <tr key={o.id}>
                  <td><Link href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                  <td>{dateTime(o.createdAt)}</td>
                  <td>
                    {o.name}
                    <div className="hint" style={{ marginTop: 0 }}>{o.email}</div>
                  </td>
                  <td><StatusTag status={o.status} /></td>
                  <td className="num">{money(o.totalCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

export function OrderDetail({ id }: { id: number }) {
  const utils = trpc.useUtils();
  const q = trpc.admin.orders.get.useQuery({ id }, { staleTime: 0 });
  const update = trpc.admin.orders.update.useMutation();
  const [status, setStatus] = useState<Status>("paid");
  const [carrier, setCarrier] = useState("");
  const [tracking, setTracking] = useState("");
  const [notes, setNotes] = useState("");
  const [notify, setNotify] = useState(true);
  const [restock, setRestock] = useState(true);
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  const o = q.data;
  useEffect(() => {
    if (!o) return;
    setStatus(o.status);
    setCarrier(o.trackingCarrier ?? "");
    setTracking(o.trackingNumber ?? "");
    setNotes(o.notes ?? "");
  }, [o]);

  if (q.isError) return <p>Este pedido no existe. <Link href="/admin/orders" className="link">Volver a pedidos</Link></p>;
  if (!o) return <p>Cargando…</p>;

  const wasFulfilled = ["paid", "shipped", "delivered"].includes(o.status);
  const closing = (status === "cancelled" || status === "refunded") && wasFulfilled;
  const shippingNow = status === "shipped" && o.status !== "shipped";

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFlash(null);
    try {
      const res = await update.mutateAsync({
        id, status, trackingCarrier: carrier, trackingNumber: tracking, notes,
        notifyCustomer: shippingNow && notify,
        restock: closing && restock,
      });
      await Promise.all([utils.admin.orders.invalidate(), utils.admin.overview.invalidate(), utils.shop.invalidate()]);
      setFlash({
        ok: true,
        text: shippingNow && notify
          ? res.emailed ? "Pedido guardado y cliente avisado por correo." : "Pedido guardado, pero el correo al cliente no salió. Avísele usted directamente."
          : "Pedido guardado.",
      });
    } catch {
      setFlash({ ok: false, text: "No se guardó el pedido. Revise la conexión e intente de nuevo." });
    }
  }

  const a = o.shippingAddress;
  return (
    <>
      <div className="adm__head">
        <h1>Pedido {o.number}</h1>
        <div className="actions">
          <StatusTag status={o.status} />
          <Link href="/admin/orders" className="btn btn--outline">Volver</Link>
        </div>
      </div>
      {flash ? <p className={`flash${flash.ok ? "" : " flash--error"}`} role="status">{flash.text}</p> : null}

      <div className="fgrid" style={{ alignItems: "start" }}>
        <div className="panel" style={{ marginBottom: 0 }}>
          <h2>Piezas</h2>
          <table className="table">
            <tbody>
              {o.items.map((i) => (
                <tr key={i.id}>
                  <td style={{ width: "4rem", paddingLeft: 0 }}>{i.image ? <img className="thumb" src={i.image} alt="" /> : <span className="thumb" />}</td>
                  <td>
                    {i.name}
                    <div className="hint" style={{ marginTop: 0 }}>{i.sku}</div>
                  </td>
                  <td className="num">{i.quantity} × {money(i.unitPriceCents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <dl style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: "0.4rem 1rem", margin: "1rem 0 0" }}>
            <dt>Subtotal</dt><dd style={{ margin: 0 }}>{money(o.subtotalCents)}</dd>
            <dt>Envío</dt><dd style={{ margin: 0 }}>{o.shippingCents ? money(o.shippingCents) : "Sin costo"}</dd>
            {o.taxCents ? <><dt>Impuestos</dt><dd style={{ margin: 0 }}>{money(o.taxCents)}</dd></> : null}
            <dt><strong>Total</strong></dt><dd style={{ margin: 0 }}><strong>{money(o.totalCents)}</strong></dd>
          </dl>
        </div>

        <div className="panel" style={{ marginBottom: 0 }}>
          <h2>Cliente y envío</h2>
          <p>
            {o.name}<br />
            {o.email ? <a className="link" href={`mailto:${o.email}`}>{o.email}</a> : null}
            {o.phone ? <><br />{o.phone}</> : null}
          </p>
          {a ? (
            <p style={{ marginTop: "1rem" }}>
              {a.line1}{a.line2 ? <>, {a.line2}</> : null}<br />
              {[a.city, a.state, a.postalCode].filter(Boolean).join(", ")}<br />
              {a.country}
            </p>
          ) : (
            <p className="hint">Sin dirección: el pago no se completó.</p>
          )}
          <p className="hint" style={{ marginTop: "1rem" }}>
            Creado {dateTime(o.createdAt)}
            {o.paidAt ? <><br />Pagado {dateTime(o.paidAt)}</> : null}
            {o.shippedAt ? <><br />Enviado {dateTime(o.shippedAt)}</> : null}
          </p>
        </div>
      </div>

      <form className="panel" style={{ marginTop: "1.5rem" }} onSubmit={onSubmit}>
        <h2>Estado y envío</h2>
        <div className="fgrid fgrid--3">
          <Field label="Estado">
            <select className="select" value={status} onChange={(e) => setStatus(e.target.value as Status)}>
              {STATUSES.map((s) => <option key={s} value={s}>{STATUS_LABEL[s]}</option>)}
            </select>
          </Field>
          <Field label="Transportadora"><input className="input" value={carrier} onChange={(e) => setCarrier(e.target.value)} placeholder="UPS, FedEx, USPS…" maxLength={80} /></Field>
          <Field label="Número de guía"><input className="input" value={tracking} onChange={(e) => setTracking(e.target.value)} maxLength={120} /></Field>
          <Field label="Notas internas" hint="Solo se ven en este panel." full>
            <textarea className="textarea" style={{ minHeight: "5rem" }} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </Field>
        </div>
        <div className="checks" style={{ marginTop: "1rem" }}>
          {shippingNow ? <Check label="Avisar al cliente por correo que el pedido salió" checked={notify} onChange={setNotify} /> : null}
          {closing ? <Check label="Devolver las piezas a existencias" checked={restock} onChange={setRestock} /> : null}
        </div>
        {status === "refunded" && o.status !== "refunded" ? (
          <p className="hint" style={{ marginTop: "0.75rem" }}>
            Este cambio solo marca el pedido. El dinero se devuelve desde el panel de Stripe, en el pago de este pedido.
          </p>
        ) : null}
        <div className="actions" style={{ marginTop: "1.25rem" }}>
          <button type="submit" className="btn" disabled={update.isPending}>{update.isPending ? "Guardando…" : "Guardar pedido"}</button>
        </div>
      </form>
    </>
  );
}
