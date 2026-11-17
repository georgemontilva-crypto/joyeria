import { useRef, useState, type FormEvent } from "react";
import { trpc, type Taxon } from "@/trpc";
import { Field, uploadImage } from "./ui";

type Kind = "categories" | "collections";
const BLANK = { nameEs: "", nameEn: "", descriptionEs: "", descriptionEn: "", image: "", sortOrder: "0", slug: "" };

function Group({ kind, title, intro, items }: { kind: Kind; title: string; intro: string; items: Taxon[] }) {
  const utils = trpc.useUtils();
  const save = trpc.admin[kind].save.useMutation();
  const remove = trpc.admin[kind].remove.useMutation();
  const [editing, setEditing] = useState<number | "new" | null>(null);
  const [form, setForm] = useState(BLANK);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const singular = kind === "categories" ? "categoría" : "colección";

  const open = (item?: Taxon) => {
    setError("");
    setEditing(item ? item.id : "new");
    setForm(
      item
        ? {
            nameEs: item.nameEs, nameEn: item.nameEn,
            descriptionEs: item.descriptionEs ?? "", descriptionEn: item.descriptionEn ?? "",
            image: item.image ?? "", sortOrder: String(item.sortOrder), slug: item.slug,
          }
        : { ...BLANK, sortOrder: String(items.length) },
    );
  };
  const bind = (key: keyof typeof BLANK) => ({ value: form[key], onChange: (e: { target: { value: string } }) => setForm((f) => ({ ...f, [key]: e.target.value })) });
  const refresh = () => Promise.all([utils.shop.invalidate(), utils.admin.products.invalidate()]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!form.nameEs.trim() || !form.nameEn.trim()) return setError("Escriba el nombre en español y en inglés.");
    try {
      await save.mutateAsync({ ...form, id: editing === "new" ? undefined : editing!, slug: form.slug || undefined, sortOrder: Number(form.sortOrder) || 0 });
      await refresh();
      setEditing(null);
    } catch {
      setError("No se guardó. Revise la conexión e intente de nuevo.");
    }
  }

  async function onDelete(item: Taxon) {
    if (!window.confirm(`¿Eliminar la ${singular} “${item.nameEs}”? Sus productos se conservan, solo quedan sin ${singular}.`)) return;
    await remove.mutateAsync({ id: item.id });
    await refresh();
    if (editing === item.id) setEditing(null);
  }

  async function onFile(file?: File) {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const url = await uploadImage(file);
      setForm((f) => ({ ...f, image: url }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <div className="panel">
      <div className="adm__head" style={{ marginBottom: "0.5rem" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        <button type="button" className="btn btn--outline" onClick={() => open()}>Agregar {singular}</button>
      </div>
      <p className="hint" style={{ marginBottom: "1rem" }}>{intro}</p>

      {items.length ? (
        <table className="table">
          <tbody>
            {items.map((item) => (
              <tr key={item.id}>
                <td style={{ width: "4rem" }}>{item.image ? <img className="thumb" src={item.image} alt="" /> : <span className="thumb" />}</td>
                <td>
                  {item.nameEs} <span style={{ color: "var(--slate)" }}>/ {item.nameEn}</span>
                </td>
                <td className="num">
                  <button type="button" className="textbtn" onClick={() => open(item)}>Editar</button>
                  {"   "}
                  <button type="button" className="textbtn" style={{ color: "var(--danger)" }} onClick={() => onDelete(item)}>Eliminar</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p style={{ color: "var(--slate)" }}>Aún no hay ninguna. Agregue la primera.</p>
      )}

      {editing != null ? (
        <form onSubmit={onSubmit} style={{ marginTop: "1.5rem", paddingTop: "1.5rem", borderTop: "1px solid var(--line)" }}>
          <h2>{editing === "new" ? `Nueva ${singular}` : `Editar ${singular}`}</h2>
          {error ? <p className="flash flash--error" role="alert">{error}</p> : null}
          <div className="fgrid">
            <Field label="Nombre en español"><input className="input" {...bind("nameEs")} maxLength={160} /></Field>
            <Field label="Nombre en inglés"><input className="input" {...bind("nameEn")} maxLength={160} /></Field>
            <Field label="Descripción en español"><textarea className="textarea" style={{ minHeight: "5rem" }} {...bind("descriptionEs")} /></Field>
            <Field label="Descripción en inglés"><textarea className="textarea" style={{ minHeight: "5rem" }} {...bind("descriptionEn")} /></Field>
            <Field label="Foto" hint="Suba una foto o pegue la dirección de una ya subida.">
              <input className="input" {...bind("image")} />
            </Field>
            <Field label="Orden" hint="Los números menores aparecen primero."><input className="input" inputMode="numeric" {...bind("sortOrder")} /></Field>
          </div>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
          <div className="actions" style={{ marginTop: "1.25rem" }}>
            <button type="submit" className="btn" disabled={save.isPending || uploading}>{save.isPending ? "Guardando…" : `Guardar ${singular}`}</button>
            <button type="button" className="btn btn--outline" disabled={uploading} onClick={() => fileRef.current?.click()}>{uploading ? "Subiendo…" : "Subir foto"}</button>
            <button type="button" className="textbtn" onClick={() => setEditing(null)}>Cancelar</button>
          </div>
        </form>
      ) : null}
    </div>
  );
}

export function Taxonomy() {
  const site = trpc.shop.site.useQuery();
  return (
    <>
      <div className="adm__head">
        <h1>Categorías y colecciones</h1>
      </div>
      {!site.data ? (
        <p>Cargando…</p>
      ) : (
        <>
          <Group kind="categories" title="Categorías" intro="El tipo de pieza: cadenas, dijes, pulseras, aretes. Cada producto va en una." items={site.data.categories} />
          <Group kind="collections" title="Colecciones" intro="Grupos que cruzan categorías: una piedra, una línea, una campaña. Son opcionales." items={site.data.collections} />
        </>
      )}
    </>
  );
}
