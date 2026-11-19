import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { trpc } from "@/trpc";
import { Monogram } from "@/components/Monogram";
import { GridSkeleton, ProductCard } from "@/components/ProductCard";

export function Home() {
  const { t, pick } = useI18n();
  usePageTitle(null);
  const site = trpc.shop.site.useQuery();
  const featured = trpc.shop.products.useQuery({ featured: true, sort: "curated" });

  return (
    <>
      <section className="hero on-navy">
        <div className="hero__frame" aria-hidden="true" />
        <div className="page hero__inner">
          <div className="hero__copy">
            <Monogram className="hero__mark" />
            <h1>{t.home.title}</h1>
            <p className="hero__lead">{t.home.lead}</p>
            <div className="hero__actions">
              <Link href="/shop" className="btn btn--gold">
                {t.home.shopAll}
              </Link>
              <Link href="/shop?collection=emeralds" className="btn btn--outline">
                {t.home.seeEmeralds}
              </Link>
            </div>
          </div>
          <div className="hero__photo">
            <img src="/editorial/v2/hero-cross.jpg" alt={t.home.heroAlt} fetchPriority="high" />
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="page">
          <div className="section__head">
            <h2>{t.home.categoriesTitle}</h2>
          </div>
          <div className="type-grid">
            {site.data?.categories.map((c) => (
              <Link key={c.id} href={`/shop?category=${c.slug}`} className="type-tile">
                <div className="type-tile__img">{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</div>
                <h3>{pick(c, "name")}</h3>
                <p>{pick(c, "description")}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="page">
          <div className="section__head">
            <h2>{t.home.featuredTitle}</h2>
            <Link href="/shop" className="link">
              {t.home.viewAll}
            </Link>
          </div>
          {featured.data ? (
            <div className="grid grid--feature">
              {featured.data.slice(0, 5).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <GridSkeleton count={4} />
          )}
        </div>
      </section>

      <section className="section band on-navy">
        <div className="page band__inner">
          <div className="band__photo">
            <img src="/editorial/v2/emerald-bracelet.jpg" alt={t.home.emeraldAlt} loading="lazy" />
          </div>
          <div>
            <h2>{t.home.emeraldTitle}</h2>
            <p>{t.home.emeraldBody}</p>
            <Link href="/shop?collection=emeralds" className="btn btn--gold">
              {t.home.emeraldCta}
            </Link>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="page">
          <div className="split">
            <div>
              <h2>{t.home.storyTitle}</h2>
              <p>{t.home.storyBody}</p>
              <Link href="/our-story" className="link">
                {t.home.storyCta}
              </Link>
            </div>
            <img src="/editorial/v2/emerald-stud.jpg" alt={t.home.storyAlt} loading="lazy" />
          </div>
        </div>
      </section>

      <section className="page" style={{ paddingBlock: "clamp(3rem, 6vw, 5rem)" }}>
        <div className="promises">
          <div>
            <h3>{t.home.promiseShippingTitle}</h3>
            <p>{t.home.promiseShippingBody}</p>
          </div>
          <div>
            <h3>{t.home.promisePayTitle}</h3>
            <p>{t.home.promisePayBody}</p>
          </div>
          <div>
            <h3>{t.home.promiseHelpTitle}</h3>
            <p>{t.home.promiseHelpBody}</p>
          </div>
        </div>
      </section>
    </>
  );
}
