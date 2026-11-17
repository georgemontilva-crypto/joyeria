import { useEffect, useRef } from "react";
import { Link, useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { pendingCheckout, useBag } from "@/lib/bag";
import { trpc } from "@/trpc";

export function OrderConfirmed() {
  const { t, money } = useI18n();
  const bag = useBag();
  const sessionId = new URLSearchParams(useSearch()).get("session_id") ?? "";
  const tries = useRef(0);

  const order = trpc.shop.order.useQuery(
    { sessionId },
    {
      enabled: sessionId.length >= 10,
      staleTime: 0,
      // Poll briefly while Stripe's confirmation is still on its way.
      refetchInterval: (q) => (q.state.data?.status === "pending" && tries.current++ < 20 ? 2500 : false),
    },
  );
  const data = order.data;
  const paid = data && data.status !== "pending" && data.status !== "cancelled";
  usePageTitle(paid ? t.order.title : t.order.pendingTitle);

  const cleared = useRef(false);
  useEffect(() => {
    if (paid && !cleared.current) {
      cleared.current = true;
      bag.clear();
      pendingCheckout.clear();
    }
  }, [paid, bag]);

  if (order.isLoading) {
    return (
      <div className="page confirm">
        <h1>{t.order.pendingTitle}</h1>
        <p>{t.order.pendingBody}</p>
      </div>
    );
  }
  if (!data || sessionId.length < 10) {
    return (
      <div className="page confirm">
        <h1>{t.order.missingTitle}</h1>
        <p>{t.order.missingBody}</p>
        <p><Link href="/contact" className="btn">{t.nav.contact}</Link></p>
      </div>
    );
  }
  if (!paid) {
    return (
      <div className="page confirm" role="status">
        <h1>{t.order.pendingTitle}</h1>
        <p>{t.order.pendingBody}</p>
      </div>
    );
  }

  const a = data.shippingAddress;
  return (
    <div className="page confirm">
      <h1>{t.order.title}</h1>
      <p>{t.order.body(data.number, data.email)}</p>

      <div className="summary">
        <h2>{t.order.summary}</h2>
        <ul>
          {data.items.map((i, k) => (
            <li key={k}>
              <span>{i.name}{i.quantity > 1 ? ` × ${i.quantity}` : ""}</span>
              <span>{money(i.unitPriceCents * i.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl>
          <dt>{t.bag.subtotal}</dt>
          <dd>{money(data.subtotalCents)}</dd>
          <dt>{t.bag.shipping}</dt>
          <dd>{data.shippingCents ? money(data.shippingCents) : t.bag.free}</dd>
          {data.taxCents ? (
            <>
              <dt>{t.order.tax}</dt>
              <dd>{money(data.taxCents)}</dd>
            </>
          ) : null}
          <dt className="summary__total">{t.order.total}</dt>
          <dd>{money(data.totalCents)}</dd>
        </dl>
        {a ? (
          <small style={{ marginTop: "1.5rem", fontSize: "0.975rem", color: "var(--navy)" }}>
            <strong>{t.order.shipTo}</strong>
            <br />
            {data.name}
            <br />
            {[a.line1, a.line2].filter(Boolean).join(", ")}
            <br />
            {[a.city, a.state, a.postalCode].filter(Boolean).join(", ")}
          </small>
        ) : null}
      </div>
      <p style={{ marginTop: "2rem" }}>
        <Link href="/shop" className="btn btn--outline">{t.order.continue}</Link>
      </p>
    </div>
  );
}
