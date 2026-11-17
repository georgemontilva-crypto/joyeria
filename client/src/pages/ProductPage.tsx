import { useEffect, useState } from "react";
import { Link, useParams } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { useBag } from "@/lib/bag";
import { trpc } from "@/trpc";
import { Price, ProductCard } from "@/components/ProductCard";

function parseDetails(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      const i = line.indexOf(":");
      return i === -1 ? { label: "", value: line } : { label: line.slice(0, i).trim(), value: line.slice(i + 1).trim() };
    });
}

export function ProductPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t, pick } = useI18n();
  const bag = useBag();
  const site = trpc.shop.site.useQuery();
  const query = trpc.shop.product.useQuery({ slug }, { retry: false });
  const [active, setActive] = useState(0);
  const [justAdded, setJustAdded] = useState(false);

  useEffect(() => {
    setActive(0);
    setJustAdded(false);
  }, [slug]);

  const product = query.data?.product;
  const name = product ? pick(product, "name") : undefined;
  usePageTitle(name ?? (query.isError ? t.product.notFoundTitle : undefined));

  if (query.isError) {
    return (
      <div className="page confirm">
        <h1>{t.product.notFoundTitle}</h1>
        <p>{t.product.notFoundBody}</p>
        <p><Link href="/shop" className="btn">{t.product.backToShop}</Link></p>
      </div>
    );
  }
  if (!product || !name) {
    return (
      <div className="page" style={{ paddingBlock: "3rem 6rem" }}>
        <div className="pdp">
          <div className="skeleton" />
          <p>{t.common.loading}</p>
        </div>
      </div>
    );
  }

  const category = site.data?.categories.find((c) => c.id === product.categoryId);
  const details = parseDetails(pick(product, "details"));
  const buyable = product.priceCents != null && product.stock > 0;
  const inBag = bag.lines.find((l) => l.productId === product.id);
  const canAddMore = buyable && (inBag?.quantity ?? 0) < product.stock;
  const inquiryHref = `/contact?subject=${encodeURIComponent(t.product.inquirySubject(name, product.sku))}`;
  const image = product.images[active] ?? product.images[0];

  return (
    <div className="page">
      <nav className="crumbs" aria-label="Breadcrumb">
        <Link href="/shop">{t.nav.shop}</Link>
        {category ? (
          <>
            <span aria-hidden="true">/</span>
            <Link href={`/shop?category=${category.slug}`}>{pick(category, "name")}</Link>
          </>
        ) : null}
      </nav>

      <div className="pdp">
        <div className={product.images.length > 1 ? "gallery" : "gallery gallery--single"}>
          {product.images.length > 1 ? (
            <div className="gallery__thumbs">
              {product.images.map((url, i) => (
                <button key={url} type="button" aria-current={i === active ? "true" : undefined} aria-label={t.product.photo(i + 1, product.images.length)} onClick={() => setActive(i)}>
                  <img src={url} alt="" loading="lazy" />
                </button>
              ))}
            </div>
          ) : null}
          <div className="gallery__main">{image ? <img src={image} alt={name} fetchPriority="high" /> : null}</div>
        </div>

        <div className="pdp__info">
          <h1>{name}</h1>
          <p><Price product={product} className="pdp__price" /></p>
          {pick(product, "description") ? <p className="pdp__desc">{pick(product, "description")}</p> : null}

          <div className="pdp__buy">
            {buyable ? (
              <>
                {product.stock === 1 ? <p className="pdp__stock">{t.product.lastOne}</p> : product.stock <= 3 ? <p className="pdp__stock">{t.product.left(product.stock)}</p> : null}
                {canAddMore ? (
                  <button
                    type="button"
                    className="btn btn--block"
                    onClick={() => {
                      bag.add(product.id);
                      setJustAdded(true);
                    }}
                  >
                    {t.product.add}
                  </button>
                ) : null}
                {inBag ? (
                  <Link href="/bag" className="btn btn--outline btn--block">{t.product.viewBag}</Link>
                ) : null}
                <p className="pdp__note" role="status">{justAdded ? t.product.added : inBag ? t.product.inBag : ""}</p>
              </>
            ) : (
              <>
                <Link href={inquiryHref} className="btn btn--block">{t.product.inquire}</Link>
                <p className="pdp__note">{product.priceCents == null ? t.product.inquireNote : t.product.soldNote}</p>
              </>
            )}
          </div>

          <div className="specs">
            {details.length ? (
              <details open>
                <summary>{t.product.details}</summary>
                <div>
                  <dl>
                    {details.map((d, i) => (
                      <div key={i} style={{ display: "contents" }}>
                        <dt>{d.label}</dt>
                        <dd>{d.value}</dd>
                      </div>
                    ))}
                    {product.sku ? (
                      <div style={{ display: "contents" }}>
                        <dt>SKU</dt>
                        <dd>{product.sku}</dd>
                      </div>
                    ) : null}
                  </dl>
                </div>
              </details>
            ) : null}
            <details>
              <summary>{t.product.shippingTitle}</summary>
              <div>{t.product.shippingBody}</div>
            </details>
            <details>
              <summary>{t.product.careTitle}</summary>
              <div>{t.product.careBody}</div>
            </details>
          </div>
        </div>
      </div>

      {query.data?.related.length ? (
        <section style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
          <div className="section__head">
            <h2>{t.product.related}</h2>
          </div>
          <div className="grid">
            {query.data.related.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
