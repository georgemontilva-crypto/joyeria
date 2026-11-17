import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "wouter";
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
  const { t, locale } = useI18n();
  const { count } = useBag();
  const [location] = useLocation();
  const [open, setOpen] = useState(false);
  const site = trpc.shop.site.useQuery();
  const announcement = site.data?.settings[locale === "es" ? "announcementEs" : "announcementEn"];

  useEffect(() => setOpen(false), [location]);
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const links = [
    { href: "/shop", label: t.nav.shop },
    { href: "/collections", label: t.nav.collections },
    { href: "/our-story", label: t.nav.story },
  ];
  const current = (href: string) => (location === href || location.startsWith(`${href}/`) ? "page" : undefined);

  return (
    <>
      {announcement ? <div className="announce">{announcement}</div> : null}
      <header className="header on-navy">
        <div className="page header__bar">
          <button type="button" className="menu-btn" aria-expanded={open} onClick={() => setOpen(true)}>
            {t.nav.menu}
          </button>
          <nav className="header__nav" aria-label="Primary">
            {links.map((l) => (
              <Link key={l.href} href={l.href} aria-current={current(l.href)}>
                {l.label}
              </Link>
            ))}
          </nav>
          <Link href="/" className="wordmark" aria-label={t.nav.home}>
            MADISON D’OR
          </Link>
          <div className="header__tools">
            <Link href="/contact" className="contact-link" aria-current={current("/contact")}>
              {t.nav.contact}
            </Link>
            <LanguageToggle />
            <Link href="/bag" className="bag-link" aria-current={current("/bag")}>
              {t.nav.bag}
              {count > 0 ? <span>{count}</span> : null}
            </Link>
          </div>
        </div>
      </header>
      {open ? (
        <div className="drawer on-navy" role="dialog" aria-modal="true" aria-label={t.nav.menu}>
          <div className="drawer__top">
            <span className="wordmark">MADISON D’OR</span>
            <button type="button" onClick={() => setOpen(false)} autoFocus>
              {t.nav.close}
            </button>
          </div>
          <nav aria-label="Primary">
            {[...links, { href: "/contact", label: t.nav.contact }, { href: "/faq", label: t.nav.faq }].map((l) => (
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
    <footer className="footer on-navy">
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
