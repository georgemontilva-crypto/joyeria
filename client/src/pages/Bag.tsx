import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { pendingCheckout, useBag } from "@/lib/bag";
import { trpc } from "@/trpc";

export function Bag() {
  const { t, pick, money, locale } = useI18n();
  usePageTitle(t.bag.title);
  const bag = useBag();
  const [, navigate] = useLocation();
  const cancelled = new URLSearchParams(useSearch()).get("cancelled") === "1";
  const utils = trpc.useUtils();

  const ids = useMemo(() => bag.lines.map((l) => l.productId).sort((a, b) => a - b), [bag.lines]);
  const products = trpc.shop.byIds.useQuery({ ids }, { enabled: ids.length > 0, staleTime: 0, placeholderData: (prev) => prev });
  const checkout = trpc.shop.checkout.useMutation();
  const cancel = trpc.shop.cancelCheckout.useMutation({ onSettled: () => utils.shop.byIds.invalidate() });
  const [adjusted, setAdjusted] = useState<Record<number, number>>({});
  const [failure, setFailure] = useState<"not_configured" | "error" | null>(null);

  // Coming back from Stripe without paying: release the pieces that were being held.
  const released = useRef(false);
  useEffect(() => {
    if (!cancelled || released.current) return;
    released.current = true;
    const token = pendingCheckout.get();
    if (token) {
      pendingCheckout.clear();
      cancel.mutate({ token });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cancelled]);

  const byId = useMemo(() => new Map((products.data ?? []).map((p) => [p.id, p])), [products.data]);

  // If stock dropped below what is in the bag, lower the quantity and say so.
  useEffect(() => {
    if (!products.data || cancel.isPending) return;
    for (const line of bag.lines) {
      const p = byId.get(line.productId);
      if (p && p.priceCents != null && p.stock > 0 && line.quantity > p.stock) {
        bag.setQuantity(line.productId, p.stock);
        setAdjusted((a) => ({ ...a, [line.productId]: p.stock }));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [products.data, cancel.isPending]);

  if (bag.lines.length === 0) {
    return (
      <div className="page confirm">
        <h1>{t.bag.emptyTitle}</h1>
        <p>{t.bag.emptyBody}</p>
        <p><Link href="/shop" className="btn">{t.bag.browse}</Link></p>
      </div>
    );
  }

  const loaded = Boolean(products.data) && !cancel.isPending;
  const rows = bag.lines.map((line) => {
    const product = byId.get(line.productId);
    const available = Boolean(product && product.priceCents != null && product.stock > 0);
    return { line, product, available };
  });
  const blocked = loaded && rows.some((r) => !r.available);
  const subtotal = rows.reduce((sum, r) => sum + (r.available ? r.product!.priceCents! * r.line.quantity : 0), 0);

  async function goToCheckout() {
    setFailure(null);
    try {
      const result = await checkout.mutateAsync({ items: bag.lines, locale, previousToken: pendingCheckout.get() });
      if (result.ok) {
        pendingCheckout.set(result.token);
        window.location.assign(result.url);
        return;
      }
      if (result.reason === "not_configured") setFailure("not_configured");
      else await utils.shop.byIds.invalidate(); // stock changed under us: the rows below will explain
    } catch {
      setFailure("error");
    }
  }

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.bag.title}</h1>
      </header>

      {cancelled ? <p className="notice">{t.bag.cancelled}</p> : null}
      {failure === "error" ? <p className="notice notice--error" role="alert">{t.bag.error}</p> : null}
      {failure === "not_configured" ? (
        <p className="notice" role="alert">
          {t.bag.notConfigured} <Link href="/contact" className="link">{t.nav.contact}</Link>
        </p>
      ) : null}

      <div className="bag">
        <ul className="bag__lines">
          {rows.map(({ line, product, available }) => {
            const name = product ? pick(product, "name") : "";
            return (
              <li key={line.productId} className="line">
                <div className="line__img">{product?.images[0] ? <img src={product.images[0]} alt="" /> : null}</div>
                <div>
                  {product ? (
                    <Link href={`/product/${product.slug}`} className="line__name">{name}</Link>
                  ) : (
                    <span className="line__name">{loaded ? t.bag.unavailable : t.common.loading}</span>
                  )}
                  {product && available ? <p className="line__meta">{money(product.priceCents!)}</p> : null}
                  {loaded && !available ? <p className="line__warn">{t.bag.unavailable}</p> : null}
                  {adjusted[line.productId] && available ? <p className="line__warn">{t.bag.onlyLeft(adjusted[line.productId])}</p> : null}
                  <div className="line__controls">
                    {available ? (
                      <div className="qty" role="group" aria-label={`${t.bag.quantity}: ${name}`}>
                        <button type="button" aria-label={t.bag.decrease} onClick={() => bag.setQuantity(line.productId, line.quantity - 1)}>−</button>
                        <output>{line.quantity}</output>
                        <button type="button" aria-label={t.bag.increase} disabled={line.quantity >= product!.stock} onClick={() => bag.setQuantity(line.productId, line.quantity + 1)}>+</button>
                      </div>
                    ) : null}
                    <button type="button" className="textbtn" onClick={() => bag.remove(line.productId)}>
                      {t.bag.remove}
                      <span className="visually-hidden"> {name}</span>
                    </button>
                  </div>
                </div>
                <div className="line__total">{available ? money(product!.priceCents! * line.quantity) : null}</div>
              </li>
            );
          })}
        </ul>

        <aside className="summary" aria-label={t.order.summary}>
          <h2>{t.order.summary}</h2>
          <dl>
            <dt>{t.bag.subtotal}</dt>
            <dd>{loaded ? money(subtotal) : "…"}</dd>
            <dt>{t.bag.shipping}</dt>
            <dd>{t.bag.free}</dd>
            <dt className="summary__total">{t.order.total}</dt>
            <dd>{loaded ? money(subtotal) : "…"}</dd>
          </dl>
          <button type="button" className="btn btn--block" disabled={!loaded || blocked || checkout.isPending || subtotal === 0} onClick={goToCheckout}>
            {checkout.isPending ? t.bag.redirecting : t.bag.checkout}
          </button>
          {blocked ? <small style={{ color: "var(--danger)" }}>{t.bag.fixFirst}</small> : null}
          <small>{t.bag.payNote}</small>
          <small>{t.bag.taxNote}</small>
          <small>
            <button type="button" className="textbtn" onClick={() => navigate("/shop")}>{t.bag.continue}</button>
          </small>
        </aside>
      </div>
    </div>
  );
}
