import { useEffect, useState } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { trpc } from "@/trpc";
import { GridSkeleton, ProductCard } from "@/components/ProductCard";

const SORTS = ["curated", "newest", "price-asc", "price-desc"] as const;
type Sort = (typeof SORTS)[number];

export function Shop() {
  const { t, pick } = useI18n();
  const [, navigate] = useLocation();
  const params = new URLSearchParams(useSearch());
  const category = params.get("category") ?? undefined;
  const collection = params.get("collection") ?? undefined;
  const q = params.get("q") ?? "";
  const sortParam = params.get("sort");
  const sort: Sort = SORTS.includes(sortParam as Sort) ? (sortParam as Sort) : "curated";

  const site = trpc.shop.site.useQuery();
  const list = trpc.shop.products.useQuery({ category, collection, q: q || undefined, sort }, { placeholderData: (prev) => prev });

  const activeCategory = site.data?.categories.find((c) => c.slug === category);
  const activeCollection = site.data?.collections.find((c) => c.slug === collection);
  const heading = activeCollection ? pick(activeCollection, "name") : activeCategory ? pick(activeCategory, "name") : t.shop.title;
  const lead = activeCollection ? pick(activeCollection, "description") : activeCategory ? pick(activeCategory, "description") : "";
  usePageTitle(heading);

  const href = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams(params);
    for (const [k, v] of Object.entries(changes)) {
      if (v) next.set(k, v);
      else next.delete(k);
    }
    const qs = next.toString();
    return qs ? `/shop?${qs}` : "/shop";
  };

  // The search box updates the URL shortly after typing stops.
  const [term, setTerm] = useState(q);
  useEffect(() => setTerm(q), [q]);
  useEffect(() => {
    if (term === q) return;
    const id = setTimeout(() => navigate(href({ q: term.trim() || undefined }), { replace: true }), 300);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [term]);

  const filtered = Boolean(category || collection || q);

  return (
    <div className="page">
      <header className="page-head">
        <h1>{heading}</h1>
        {lead ? <p>{lead}</p> : null}
      </header>

      <div className="filters">
        <nav className="chips" aria-label={t.shop.type}>
          <Link href={href({ category: undefined })} className="chip" aria-current={!category ? "true" : undefined}>
            {t.shop.all}
          </Link>
          {site.data?.categories.map((c) => (
            <Link key={c.id} href={href({ category: c.slug })} className="chip" aria-current={category === c.slug ? "true" : undefined}>
              {pick(c, "name")}
            </Link>
          ))}
        </nav>
        <div className="filters__right">
          <label className="visually-hidden" htmlFor="shop-search">{t.shop.search}</label>
          <input id="shop-search" className="input" type="search" placeholder={t.shop.search} value={term} onChange={(e) => setTerm(e.target.value)} />
          {site.data?.collections.length ? (
            <>
              <label className="visually-hidden" htmlFor="shop-collection">{t.shop.collection}</label>
              <select id="shop-collection" className="select" value={collection ?? ""} onChange={(e) => navigate(href({ collection: e.target.value || undefined }))}>
                <option value="">{t.shop.collection}</option>
                {site.data.collections.map((c) => (
                  <option key={c.id} value={c.slug}>{pick(c, "name")}</option>
                ))}
              </select>
            </>
          ) : null}
          <label className="visually-hidden" htmlFor="shop-sort">{t.shop.sort}</label>
          <select id="shop-sort" className="select" value={sort} onChange={(e) => navigate(href({ sort: e.target.value === "curated" ? undefined : e.target.value }))}>
            <option value="curated">{t.shop.sortCurated}</option>
            <option value="newest">{t.shop.sortNewest}</option>
            <option value="price-asc">{t.shop.sortPriceAsc}</option>
            <option value="price-desc">{t.shop.sortPriceDesc}</option>
          </select>
        </div>
      </div>

      <div style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
        {list.isError ? (
          <div className="empty" role="alert">
            <p>{t.shop.loadError}</p>
            <button type="button" className="btn btn--outline" onClick={() => list.refetch()}>{t.shop.retry}</button>
          </div>
        ) : !list.data ? (
          <GridSkeleton />
        ) : list.data.length === 0 ? (
          <div className="empty">
            <h2>{t.shop.emptyTitle}</h2>
            <p>{t.shop.emptyBody}</p>
            {filtered ? <Link href="/shop" className="btn btn--outline">{t.shop.clear}</Link> : null}
          </div>
        ) : (
          <>
            <p style={{ marginBottom: "1.25rem", color: "var(--slate)", fontSize: "0.95rem" }} aria-live="polite">
              {t.shop.count(list.data.length)}
            </p>
            <div className="grid">
              {list.data.map((p, i) => (
                <ProductCard key={p.id} product={p} eager={i < 4} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
