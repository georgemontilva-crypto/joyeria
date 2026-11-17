import { Link, useParams } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { NotFound } from "./NotFound";

export function Policy() {
  const { slug = "" } = useParams<{ slug: string }>();
  const { t } = useI18n();
  const pages = t.policies.pages;
  const page = slug in pages ? pages[slug as keyof typeof pages] : undefined;
  usePageTitle(page?.title);
  if (!page) return <NotFound />;

  return (
    <div className="page">
      <header className="page-head">
        <h1>{page.title}</h1>
      </header>
      <nav className="policy-nav chips" aria-label={t.policies.title}>
        {(Object.keys(pages) as (keyof typeof pages)[]).map((key) => (
          <Link key={key} href={`/policies/${key}`} className="chip" aria-current={key === slug ? "true" : undefined}>
            {pages[key].title}
          </Link>
        ))}
      </nav>
      <div className="prose">
        <p className="notice" style={{ marginTop: 0 }}>{t.policies.updated}</p>
        {page.body.map(([heading, text]) => (
          <section key={heading}>
            <h2>{heading}</h2>
            <p>{text}</p>
          </section>
        ))}
      </div>
    </div>
  );
}
