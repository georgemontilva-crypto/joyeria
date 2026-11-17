import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { trpc } from "@/trpc";

export function Collections() {
  const { t, pick } = useI18n();
  usePageTitle(t.collections.title);
  const site = trpc.shop.site.useQuery();

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.collections.title}</h1>
        <p>{t.collections.lead}</p>
      </header>

      <section style={{ paddingBottom: "clamp(3rem, 6vw, 5rem)" }}>
        <div className="section__head">
          <h2>{t.collections.byType}</h2>
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
      </section>

      {site.data?.collections.length ? (
        <section style={{ paddingBottom: "clamp(3rem, 7vw, 6rem)" }}>
          <div className="section__head">
            <h2>{t.collections.curated}</h2>
          </div>
          <div className="set-list">
            {site.data.collections.map((c) => (
              <article key={c.id} className="set">
                <div className="set__photo">{c.image ? <img src={c.image} alt="" loading="lazy" /> : null}</div>
                <div>
                  <h3 style={{ fontSize: "clamp(1.8rem, 3vw, 2.5rem)" }}>{pick(c, "name")}</h3>
                  <p>{pick(c, "description")}</p>
                  <Link href={`/shop?collection=${c.slug}`} className="btn btn--outline">
                    {t.collections.shop(pick(c, "name"))}
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
