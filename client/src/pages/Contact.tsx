import { useState, type FormEvent } from "react";
import { useSearch } from "wouter";
import { useI18n } from "@/lib/i18n";
import { usePageTitle } from "@/lib/usePageTitle";
import { trpc } from "@/trpc";

type Errors = Partial<Record<"name" | "email" | "message", string>>;

export function Contact() {
  const { t, locale } = useI18n();
  usePageTitle(t.contact.title);
  const params = new URLSearchParams(useSearch());
  const site = trpc.shop.site.useQuery();
  const s = site.data?.settings ?? {};
  const send = trpc.shop.contact.useMutation();

  const [form, setForm] = useState({ name: "", email: "", phone: "", subject: params.get("subject") ?? "", message: "", company: "" });
  const [errors, setErrors] = useState<Errors>({});
  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    const next: Errors = {};
    if (!form.name.trim()) next.name = t.contact.required;
    if (!form.email.trim()) next.email = t.contact.required;
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = t.contact.invalidEmail;
    if (!form.message.trim()) next.message = t.contact.required;
    setErrors(next);
    if (Object.keys(next).length) {
      document.getElementById(`contact-${Object.keys(next)[0]}`)?.focus();
      return;
    }
    send.mutate({ ...form, email: form.email.trim(), locale });
  }

  const hours = locale === "es" ? s.hoursEs : s.hoursEn;
  const whatsappDigits = s.whatsapp?.replace(/\D/g, "");
  const social = [
    ["Instagram", s.instagram],
    ["Facebook", s.facebook],
    ["TikTok", s.tiktok],
  ].filter((x): x is [string, string] => /^https?:\/\//.test(x[1] ?? ""));

  return (
    <div className="page">
      <header className="page-head">
        <h1>{t.contact.title}</h1>
        <p>{t.contact.lead}</p>
      </header>

      <div className="contact">
        {send.isSuccess ? (
          <div role="status">
            <h2>{t.contact.sentTitle}</h2>
            <p style={{ marginTop: "0.75rem", color: "var(--slate)" }}>{t.contact.sentBody}</p>
            <button
              type="button"
              className="btn btn--outline"
              style={{ marginTop: "1.5rem" }}
              onClick={() => {
                send.reset();
                setForm((f) => ({ ...f, subject: "", message: "" }));
              }}
            >
              {t.contact.another}
            </button>
          </div>
        ) : (
          <form className="form" onSubmit={onSubmit} noValidate>
            {send.isError ? (
              <p className="notice notice--error" role="alert" style={{ marginBottom: 0 }}>
                {send.error.data?.code === "TOO_MANY_REQUESTS" ? t.contact.tooMany : t.contact.error}
              </p>
            ) : null}
            <div className="form__row">
              <div className="field">
                <label htmlFor="contact-name">{t.contact.name}</label>
                <input id="contact-name" className="input" autoComplete="name" value={form.name} onChange={set("name")} aria-invalid={Boolean(errors.name)} aria-describedby={errors.name ? "contact-name-error" : undefined} />
                {errors.name ? <p className="field__error" id="contact-name-error">{errors.name}</p> : null}
              </div>
              <div className="field">
                <label htmlFor="contact-email">{t.contact.email}</label>
                <input id="contact-email" className="input" type="email" autoComplete="email" value={form.email} onChange={set("email")} aria-invalid={Boolean(errors.email)} aria-describedby={errors.email ? "contact-email-error" : undefined} />
                {errors.email ? <p className="field__error" id="contact-email-error">{errors.email}</p> : null}
              </div>
            </div>
            <div className="form__row">
              <div className="field">
                <label htmlFor="contact-phone">{t.contact.phone}</label>
                <input id="contact-phone" className="input" type="tel" autoComplete="tel" value={form.phone} onChange={set("phone")} />
              </div>
              <div className="field">
                <label htmlFor="contact-subject">{t.contact.subject}</label>
                <input id="contact-subject" className="input" value={form.subject} onChange={set("subject")} />
              </div>
            </div>
            <div className="field">
              <label htmlFor="contact-message">{t.contact.message}</label>
              <textarea id="contact-message" className="textarea" value={form.message} onChange={set("message")} aria-invalid={Boolean(errors.message)} aria-describedby={errors.message ? "contact-message-error" : undefined} />
              {errors.message ? <p className="field__error" id="contact-message-error">{errors.message}</p> : null}
            </div>
            <div className="hp" aria-hidden="true">
              <label htmlFor="contact-company">Company</label>
              <input id="contact-company" tabIndex={-1} autoComplete="off" value={form.company} onChange={set("company")} />
            </div>
            <div>
              <button type="submit" className="btn" disabled={send.isPending}>
                {send.isPending ? t.contact.sending : t.contact.send}
              </button>
            </div>
          </form>
        )}

        <aside className="contact__direct">
          <h2>{t.contact.direct}</h2>
          <dl>
            {s.contactEmail ? (
              <div>
                <dt>{t.contact.emailLabel}</dt>
                <dd><a className="link" href={`mailto:${s.contactEmail}`}>{s.contactEmail}</a></dd>
              </div>
            ) : null}
            {s.contactPhone ? (
              <div>
                <dt>{t.contact.phoneLabel}</dt>
                <dd><a className="link" href={`tel:${s.contactPhone.replace(/[^+\d]/g, "")}`}>{s.contactPhone}</a></dd>
              </div>
            ) : null}
            {whatsappDigits ? (
              <div>
                <dt>{t.contact.whatsappLabel}</dt>
                <dd><a className="link" href={`https://wa.me/${whatsappDigits}`} target="_blank" rel="noreferrer">{s.whatsapp}</a></dd>
              </div>
            ) : null}
            {s.address ? (
              <div>
                <dt>{t.contact.addressLabel}</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{s.address}</dd>
              </div>
            ) : null}
            {hours ? (
              <div>
                <dt>{t.contact.hoursLabel}</dt>
                <dd style={{ whiteSpace: "pre-line" }}>{hours}</dd>
              </div>
            ) : null}
            {social.length ? (
              <div>
                <dt>{t.contact.followLabel}</dt>
                <dd style={{ display: "flex", gap: "1rem", flexWrap: "wrap" }}>
                  {social.map(([name, url]) => (
                    <a key={name} className="link" href={url} target="_blank" rel="noreferrer">{name}</a>
                  ))}
                </dd>
              </div>
            ) : null}
          </dl>
        </aside>
      </div>
    </div>
  );
}
