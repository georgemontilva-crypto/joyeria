import { useEffect, useState, type FormEvent } from "react";
import { trpc } from "@/trpc";
import { Field, dateTime } from "./ui";

export function Messages() {
  const utils = trpc.useUtils();
  const list = trpc.admin.messages.list.useQuery(undefined, { staleTime: 0 });
  const refresh = () => Promise.all([utils.admin.messages.invalidate(), utils.admin.overview.invalidate()]);
  const setRead = trpc.admin.messages.setRead.useMutation({ onSuccess: refresh });
  const remove = trpc.admin.messages.remove.useMutation({ onSuccess: refresh });

  return (
    <>
      <div className="adm__head">
        <h1>Mensajes</h1>
      </div>
      {!list.data ? (
        <p>Cargando…</p>
      ) : list.data.length === 0 ? (
        <div className="panel"><p>No hay mensajes. Lo que escriban en el formulario de contacto llegará aquí y a su correo.</p></div>
      ) : (
        <div className="panel">
          {list.data.map((m) => (
            <article key={m.id} className={`msg${m.read ? "" : " msg--unread"}`}>
              <div className="msg__head">
                <div>
                  <span className="msg__name">{m.name}</span>{" "}
                  {!m.read ? <span className="tag tag--warn">Sin leer</span> : null}
                  <div className="hint" style={{ marginTop: 0 }}>
                    <a className="link" href={`mailto:${m.email}${m.subject ? `?subject=${encodeURIComponent(`Re: ${m.subject}`)}` : ""}`}>{m.email}</a>
                    {m.phone ? ` / ${m.phone}` : ""} / {dateTime(m.createdAt)}
                  </div>
                </div>
                <div className="actions">
                  <button type="button" className="textbtn" onClick={() => setRead.mutate({ id: m.id, read: !m.read })}>
                    {m.read ? "Marcar sin leer" : "Marcar leído"}
                  </button>
                  <button
                    type="button"
                    className="textbtn"
                    style={{ color: "var(--danger)" }}
                    onClick={() => window.confirm(`¿Eliminar el mensaje de ${m.name}?`) && remove.mutate({ id: m.id })}
                  >
                    Eliminar
                  </button>
                </div>
              </div>
              {m.subject ? <p style={{ marginTop: "0.6rem", fontWeight: 500 }}>{m.subject}</p> : null}
              <p className="msg__body">{m.message}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
}

const FIELDS: { key: string; label: string; hint?: string; area?: boolean }[] = [
  { key: "contactEmail", label: "Correo de contacto", hint: "Se muestra en el pie de página y en Contacto." },
  { key: "contactPhone", label: "Teléfono" },
  { key: "whatsapp", label: "WhatsApp", hint: "Con código de país, por ejemplo +1 305 555 0100." },
  { key: "instagram", label: "Instagram", hint: "Dirección completa: https://instagram.com/…" },
  { key: "facebook", label: "Facebook", hint: "Dirección completa." },
  { key: "tiktok", label: "TikTok", hint: "Dirección completa." },
  { key: "address", label: "Dirección comercial", area: true },
  { key: "hoursEs", label: "Horario (español)", area: true },
  { key: "hoursEn", label: "Horario (inglés)", area: true },
  { key: "announcementEs", label: "Aviso superior (español)", hint: "La franja sobre el menú. Vacío la oculta." },
  { key: "announcementEn", label: "Aviso superior (inglés)" },
];

export function Settings() {
  const utils = trpc.useUtils();
  const q = trpc.admin.settings.get.useQuery(undefined, { staleTime: 0 });
  const save = trpc.admin.settings.save.useMutation();
  const [form, setForm] = useState<Record<string, string>>({});
  const [flash, setFlash] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    if (q.data) setForm(Object.fromEntries(FIELDS.map((f) => [f.key, q.data[f.key] ?? ""])));
  }, [q.data]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setFlash(null);
    try {
      await save.mutateAsync(form);
      await Promise.all([utils.admin.settings.invalidate(), utils.shop.site.invalidate()]);
      setFlash({ ok: true, text: "Ajustes guardados." });
    } catch {
      setFlash({ ok: false, text: "No se guardaron los ajustes. Revise la conexión e intente de nuevo." });
    }
  }

  if (!q.data) return <p>Cargando…</p>;
  return (
    <form onSubmit={onSubmit}>
      <div className="adm__head">
        <h1>Ajustes</h1>
        <button type="submit" className="btn" disabled={save.isPending}>{save.isPending ? "Guardando…" : "Guardar ajustes"}</button>
      </div>
      {flash ? <p className={`flash${flash.ok ? "" : " flash--error"}`} role="status">{flash.text}</p> : null}
      <div className="panel">
        <h2>Contacto y redes</h2>
        <p className="hint" style={{ marginBottom: "1rem" }}>Los campos vacíos no se muestran en la tienda.</p>
        <div className="fgrid">
          {FIELDS.map((f) => (
            <Field key={f.key} label={f.label} hint={f.hint}>
              {f.area ? (
                <textarea className="textarea" style={{ minHeight: "4.5rem" }} value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              ) : (
                <input className="input" value={form[f.key] ?? ""} onChange={(e) => setForm((s) => ({ ...s, [f.key]: e.target.value }))} />
              )}
            </Field>
          ))}
        </div>
      </div>
    </form>
  );
}
