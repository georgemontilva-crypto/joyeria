import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation, useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { useBag } from "@/lib/bag";
import { trpc } from "@/trpc";
import { Monogram } from "./Monogram";

function LanguageToggle() {
  const { locale, setLocale, t } = useI18n();
  return (
    <div className="lang" role="group" aria-label={t.nav.language}>
      <button type="button" aria-pressed={locale === "en"} onClick={() => setLocale("en")} lang="en">
        EN
      </button>
      <button type="button" aria-pressed={locale === "es"} onClick={() => setLocale("es")} lang="es">
        ES
      </button>
    </div>
  );
}

function Header() {
  const { t, locale, pick } = useI18n();
  const { count } = useBag();
  const [location] = useLocation();
  const search = useSearch();
  const [open, setOpen] = useState(false);
  const site = trpc.shop.site.useQuery();
  const announcement = site.data?.settings[locale === "es" ? "announcementEs" : "announcementEn"];
  const activeCategory = location === "/shop" ? new URLSearchParams(search).get("category") : null;

  useEffect(() => setOpen(false), [location, search]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const current = (href: string): "page" | undefined => (location === href || location.startsWith(`${href}/`) ? "page" : undefined);
  // The main row is the catalogue itself: one link per category, then the two editorial pages.
  const links = [
    ...(site.data?.categories ?? []).map((c) => ({
      href: `/shop?category=${c.slug}`,
      label: pick(c, "name"),
      current: activeCategory === c.slug ? ("page" as const) : undefined,
    })),
    { href: "/collections", label: t.nav.collections, current: current("/collections") },
    { href: "/our-story", label: t.nav.story, current: current("/our-story") },
  ];

  return (
    <>
      {announcement ? <div className="announce">{announcement}</div> : null}
      <header className="header">
        <div className="page header__bar">
          <button type="button" className="menu-btn" aria-expanded={open} onClick={() => setOpen(true)}>
            {t.nav.menu}
          </button>
          <div className="header__left">
            <LanguageToggle />
            <Link href="/contact" aria-current={current("/contact")}>
              {t.nav.contact}
            </Link>
          </div>
          <Link href="/" className="wordmark" aria-label={t.nav.home}>
            MADISON D’OR
          </Link>
          <div className="header__tools">
            <Link href="/bag" className="bag-link" aria-current={current("/bag")} aria-label={count > 0 ? `${t.nav.bag} (${count})` : t.nav.bag}>
              <svg viewBox="0 0 24 24" width="24" height="24" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
                <path d="M2.5 3.5h2.6l2.3 11.2a1.5 1.5 0 0 0 1.5 1.2h8.7a1.5 1.5 0 0 0 1.5-1.2l1.4-7.2H6.1" />
                <circle cx="9.5" cy="19.6" r="1.3" />
                <circle cx="17" cy="19.6" r="1.3" />
              </svg>
              {count > 0 ? <span aria-hidden="true">{count}</span> : null}
            </Link>
          </div>
        </div>
        <nav className="page header__nav" aria-label="Primary">
          <Link href="/shop" aria-current={location === "/shop" && !activeCategory ? "page" : undefined}>
            {t.nav.shop}
          </Link>
          {links.map((l) => (
            <Link key={l.href} href={l.href} aria-current={l.current}>
              {l.label}
            </Link>
          ))}
        </nav>
      </header>
      {open ? (
        <div className="drawer" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <div className="drawer__top">
            <span className="wordmark">MADISON D’OR</span>
            <button type="button" onClick={() => setOpen(false)} autoFocus>
              {t.nav.close}
            </button>
          </div>
          <nav aria-label="Primary">
            {[
              { href: "/shop", label: t.nav.shop },
              ...links,
              { href: "/contact", label: t.nav.contact },
              { href: "/faq", label: t.nav.faq },
            ].map((l) => (
              <Link key={l.href} href={l.href}>
                {l.label}
              </Link>
            ))}
          </nav>
          <LanguageToggle />
        </div>
      ) : null}
    </>
  );
}

function Footer() {
  const { t, pick } = useI18n();
  const site = trpc.shop.site.useQuery();
  const s = site.data?.settings ?? {};
  const social = [
    ["Instagram", s.instagram],
    ["Facebook", s.facebook],
    ["TikTok", s.tiktok],
  ].filter((x): x is [string, string] => /^https?:\/\//.test(x[1] ?? ""));

  return (
    <footer className="footer">
      <div className="page">
        <div className="footer__grid">
          <div className="footer__brand">
            <Monogram />
            <p>{t.footer.tagline}</p>
          </div>
          <div>
            <h2>{t.footer.shop}</h2>
            <ul>
              {site.data?.categories.map((c) => (
                <li key={c.id}>
                  <Link href={`/shop?category=${c.slug}`}>{pick(c, "name")}</Link>
                </li>
              ))}
              <li>
                <Link href="/collections">{t.nav.collections}</Link>
              </li>
            </ul>
          </div>
          <div>
            <h2>{t.footer.help}</h2>
            <ul>
              <li><Link href="/faq">{t.nav.faq}</Link></li>
              <li><Link href="/policies/shipping">{t.footer.shipping}</Link></li>
              <li><Link href="/policies/returns">{t.footer.returns}</Link></li>
              <li><Link href="/contact">{t.nav.contact}</Link></li>
            </ul>
          </div>
          <div>
            <h2>{t.footer.company}</h2>
            <ul>
              <li><Link href="/our-story">{t.nav.story}</Link></li>
              {s.contactEmail ? (
                <li><a href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></li>
              ) : null}
              {s.contactPhone ? (
                <li><a href={`tel:${s.contactPhone.replace(/[^+\d]/g, "")}`}>{s.contactPhone}</a></li>
              ) : null}
              {social.map(([name, url]) => (
                <li key={name}>
                  <a href={url} target="_blank" rel="noreferrer">{name}</a>
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="footer__base">
          <span>© {new Date().getFullYear()} Madison D’Or. {t.footer.rights}</span>
          <span>
            <Link href="/policies/privacy">{t.footer.privacy}</Link>
            {"  /  "}
            <Link href="/policies/terms">{t.footer.terms}</Link>
            {"  /  "}
            <Link href="/policies/cookies">{t.footer.cookies}</Link>
          </span>
        </div>
      </div>
    </footer>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  return (
    <>
      <a href="#main" className="skip-link">
        {t.nav.skip}
      </a>
      <Header />
      <main id="main">{children}</main>
      <Footer />
    </>
  );
}
