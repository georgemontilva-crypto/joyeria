import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";

export function NotFound() {
  const { t } = useI18n();
  usePageTitle(t.notFound.title);
  return (
    <div className="page confirm">
      <h1>{t.notFound.title}</h1>
      <p>{t.notFound.body}</p>
      <p>
        <Link href="/" className="btn">{t.notFound.cta}</Link>
      </p>
    </div>
  );
}
