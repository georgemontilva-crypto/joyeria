import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";

export function Faq() {
  const { t } = useI18n();
  usePageTitle(t.faq.title);
  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.faq.title}</h1>
        <p>
          {t.faq.lead}{" "}
          <Link href="/contact" className="link">{t.nav.contact}</Link>
        </p>
      </header>
      <div className="faq">
        {t.faq.items.map((item) => (
          <details key={item.q}>
            <summary>{item.q}</summary>
            <p>{item.a}</p>
          </details>
        ))}
      </div>
    </div>
  );
}
