import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";

export function Story() {
  const { t } = useI18n();
  usePageTitle(t.story.title);
  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.story.title}</h1>
        <p>{t.story.lead}</p>
      </header>
      <div className="story">
        <div className="story__photo">
          <img src="/editorial/v4/linen-curb-chain.jpg" alt={t.story.imageAlt} />
        </div>
        <div className="prose" style={{ paddingBottom: 0 }}>
          {t.story.sections.map((s) => (
            <section key={s.title}>
              <h2>{s.title}</h2>
              <p>{s.body}</p>
            </section>
          ))}
          <div className="cta-panel on-navy">
            <h2>{t.story.closingTitle}</h2>
            <p>{t.story.closingBody}</p>
            <Link href="/contact" className="btn btn--gold">
              {t.story.closingCta}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
