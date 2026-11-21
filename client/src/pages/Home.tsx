import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { trpc } from "@/trpc";
import { GridSkeleton, ProductCard } from "@/components/ProductCard";

export function Home() {
  const { t, pick } = useI18n();
  usePageTitle(null);
  const site = trpc.shop.site.useQuery();
  const featured = trpc.shop.products.useQuery({ featured: true, sort: "curated" });
  const collections = (site.data?.collections ?? []).slice(0, 3);

  return (
    <>
      <section className="hero on-navy">
        <div className="page hero__inner">
          <div className="hero__copy">
            <h1>{t.home.title}</h1>
            <p className="hero__lead">{t.home.lead}</p>
            <div className="hero__actions">
              <Link href="/shop" className="link">
                {t.home.shopAll}
              </Link>
              <Link href="/shop?collection=emeralds" className="link">
                {t.home.seeEmeralds}
              </Link>
            </div>
          </div>
          <div className="hero__figure">
            <img src="/editorial/v3/hero-figure.webp" alt={t.home.heroAlt} fetchPriority="high" />
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page trio">
          {collections.map((c) => (
            <Link key={c.id} href={`/shop?collection=${c.slug}`} className="trio__tile">
              <div className="trio__img">{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</div>
              <h3>{pick(c, "name")}</h3>
              <span className="link">{t.collections.shop(pick(c, "name"))}</span>
            </Link>
          ))}
          {/* New arrivals fill the row until there are three collections. */}
          {site.data && collections.length < 3 ? (
            <Link href="/shop?sort=newest" className="trio__tile">
              <div className="trio__img">
                <img src="/catalog/v3/bypass-ring-1.jpg" alt="" loading="lazy" />
              </div>
              <h3>{t.home.newTitle}</h3>
              <span className="link">{t.home.newCta}</span>
            </Link>
          ) : null}
        </div>
      </section>

      <section className="section section--tint">
        <div className="page">
          <div className="section__head">
            <h2>{t.home.categoriesTitle}</h2>
          </div>
          <div className="type-grid">
            {site.data?.categories.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="type-tile">
                <div className="type-tile__img">{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</div>
                <h3>{pick(c, "name")}</h3>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page">
          <div className="section__head">
            <h2>{t.home.featuredTitle}</h2>
          </div>
          {featured.data ? (
            <div className="grid">
              {featured.data.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <GridSkeleton count={4} />
          )}
          <p className="section__foot">
            <Link href="/shop" className="link">
              {t.home.viewAll}
            </Link>
          </p>
        </div>
      </section>

      <section className="feature">
        <div className="feature__img">
          <img src="/editorial/v3/emerald-stud.jpg" alt={t.home.storyAlt} loading="lazy" />
        </div>
        <div className="feature__body">
          <h2>{t.story.closingTitle}</h2>
          <p>{t.story.closingBody}</p>
          <Link href="/contact" className="btn">
            {t.story.closingCta}
          </Link>
        </div>
      </section>

      <section className="section">
        <div className="page editorial">
          <h2>{t.home.storyTitle}</h2>
          <p>{t.home.storyBody}</p>
          <Link href="/our-story" className="link">
            {t.home.storyCta}
          </Link>
        </div>
      </section>

      <section className="section section--tint">
        <div className="page services">
          <div>
            <h3>{t.home.promiseShippingTitle}</h3>
            <p>{t.home.promiseShippingBody}</p>
            <Link href="/policies/shipping" className="link">
              {t.footer.shipping}
            </Link>
          </div>
          <div>
            <h3>{t.home.promisePayTitle}</h3>
            <p>{t.home.promisePayBody}</p>
            <Link href="/faq" className="link">
              {t.nav.faq}
            </Link>
          </div>
          <div>
            <h3>{t.home.promiseHelpTitle}</h3>
            <p>{t.home.promiseHelpBody}</p>
            <Link href="/contact" className="link">
              {t.nav.contact}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
