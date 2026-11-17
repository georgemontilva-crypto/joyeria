import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/trpc";
import { Check, Field, dollars, money, parseDollars, uploadImage } from "./ui";

export function ProductList() {
  const list = trpc.admin.products.list.useQuery();
  const site = trpc.shop.site.useQuery();
  const categoryName = new Map(site.data?.categories.map((c) => [c.id, c.nameEs]));
  const [filter, setFilter] = useState("");
  const rows = (list.data ?? []).filter((p) => {
    const f = filter.trim().toLowerCase();
    return !f || [p.nameEs, p.nameEn, p.sku ?? ""].some((v) => v.toLowerCase().includes(f));
  });

  return (
    <>
      <div className="adm__head">
        <h1>Productos</h1>
        <div className="actions">
          <input className="input" style={{ width: "14rem", minHeight: "2.6rem" }} type="search" placeholder="Buscar por nombre o SKU" aria-label="Buscar productos" value={filter} onChange={(e) => setFilter(e.target.value)} />
          <Link href="/admin/products/new" className="btn">Agregar producto</Link>
        </div>
      </div>
      {!list.data ? (
        <p>Cargando…</p>
      ) : rows.length === 0 ? (
        <div className="panel">
          <p>{list.data.length === 0 ? "El catálogo está vacío. Agregue el primer producto." : "Ningún producto coincide con la búsqueda."}</p>
        </div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th></th>
                <th>Producto</th>
                <th>Categoría</th>
                <th className="num">Precio</th>
                <th className="num">Existencias</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id}>
                  <td style={{ width: "4rem" }}>{p.image ? <img className="thumb" src={p.image} alt="" loading="lazy" /> : <span className="thumb" />}</td>
                  <td>
                    <Link href={`/admin/products/${p.id}`}>{p.nameEs}</Link>
                    <div className="hint" style={{ marginTop: 0 }}>{p.sku}</div>
                  </td>
                  <td>{p.categoryId ? categoryName.get(p.categoryId) : ""}</td>
                  <td className="num">{p.priceCents == null ? <span className="tag tag--warn">A consultar</span> : money(p.priceCents)}</td>
                  <td className="num">{p.stock}</td>
                  <td>
                    {!p.active ? <span className="tag">Oculto</span> : p.stock <= 0 ? <span className="tag tag--bad">Agotado</span> : <span className="tag tag--ok">Visible</span>}
                    {p.featured ? <> <span className="tag">Destacado</span></> : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

const EMPTY = {
  nameEn: "", nameEs: "", slug: "", sku: "",
  descriptionEn: "", descriptionEs: "", detailsEn: "", detailsEs: "",
  price: "", compareAt: "", stock: "1", sortOrder: "0",
  categoryId: "", collectionId: "",
  featured: false, isNew: false, active: true,
  images: [] as string[],
};

export function ProductForm({ id }: { id?: number }) {
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const site = trpc.shop.site.useQuery();
  const existing = trpc.admin.products.get.useQuery({ id: id! }, { enabled: id != null, staleTime: 0 });
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const p = existing.data;
    if (!p) return;
    setForm({
      nameEn: p.nameEn, nameEs: p.nameEs, slug: p.slug, sku: p.sku ?? "",
      descriptionEn: p.descriptionEn ?? "", descriptionEs: p.descriptionEs ?? "",
      detailsEn: p.detailsEn ?? "", detailsEs: p.detailsEs ?? "",
      price: dollars(p.priceCents), compareAt: dollars(p.compareAtCents),
      stock: String(p.stock), sortOrder: String(p.sortOrder),
      categoryId: p.categoryId ? String(p.categoryId) : "", collectionId: p.collectionId ? String(p.collectionId) : "",
      featured: p.featured, isNew: p.isNew, active: p.active,
      images: p.images,
    });
  }, [existing.data]);

  const invalidate = () => Promise.all([utils.admin.products.invalidate(), utils.admin.overview.invalidate(), utils.shop.invalidate()]);
  const save = trpc.admin.products.save.useMutation();
  const remove = trpc.admin.products.remove.useMutation();

  const set = <K extends keyof typeof EMPTY>(key: K, value: (typeof EMPTY)[K]) => {
    setSaved(false);
    setForm((f) => ({ ...f, [key]: value }));
  };
  const text = (key: "nameEn" | "nameEs" | "slug" | "sku" | "descriptionEn" | "descriptionEs" | "detailsEn" | "detailsEs" | "price" | "compareAt" | "stock" | "sortOrder" | "categoryId" | "collectionId") =>
    ({ value: form[key], onChange: (e: { target: { value: string } }) => set(key, e.target.value) });

  async function onFiles(files: FileList | null) {
    if (!files?.length) return;
    setError("");
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const url = await uploadImage(file);
        setForm((f) => ({ ...f, images: [...f.images, url] }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo subir la foto.");
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }
  const moveImage = (i: number, by: number) =>
    setForm((f) => {
      const images = [...f.images];
      [images[i], images[i + by]] = [images[i + by], images[i]];
      return { ...f, images };
    });

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    const priceCents = parseDollars(form.price);
    const compareAtCents = parseDollars(form.compareAt);
    const stock = Number(form.stock);
    if (!form.nameEn.trim() || !form.nameEs.trim()) return setError("Escriba el nombre en español y en inglés.");
    if (priceCents === undefined || compareAtCents === undefined) return setError("El precio debe ser un número, por ejemplo 1250 o 1250.50. Déjelo vacío para “Precio a consultar”.");
    if (!Number.isInteger(stock) || stock < 0) return setError("Las existencias deben ser un número entero, 0 o mayor.");
    try {
      const result = await save.mutateAsync({
        id,
        slug: form.slug || undefined,
        sku: form.sku,
        nameEn: form.nameEn, nameEs: form.nameEs,
        descriptionEn: form.descriptionEn, descriptionEs: form.descriptionEs,
        detailsEn: form.detailsEn, detailsEs: form.detailsEs,
        priceCents, compareAtCents, stock,
        sortOrder: Number(form.sortOrder) || 0,
        categoryId: form.categoryId ? Number(form.categoryId) : null,
        collectionId: form.collectionId ? Number(form.collectionId) : null,
        featured: form.featured, isNew: form.isNew, active: form.active,
        images: form.images,
      });
      await invalidate();
      setSaved(true);
      if (id == null) navigate(`/admin/products/${result.id}`, { replace: true });
    } catch {
      setError("No se guardó el producto. Revise la conexión e intente de nuevo.");
    }
  }

  async function onDelete() {
    if (id == null || !window.confirm(`¿Eliminar “${form.nameEs}” del catálogo? Esta acción no se puede deshacer.`)) return;
    await remove.mutateAsync({ id });
    await invalidate();
    navigate("/admin/products");
  }

  if (id != null && existing.isError) return <p>Este producto ya no existe. <Link href="/admin/products" className="link">Volver a productos</Link></p>;
  if (id != null && !existing.data) return <p>Cargando…</p>;

  return (
    <form onSubmit={onSubmit}>
      <div className="adm__head">
        <h1>{id == null ? "Nuevo producto" : form.nameEs || "Producto"}</h1>
        <div className="actions">
          {id != null && form.slug ? <a className="link" href={`/product/${form.slug}`} target="_blank" rel="noreferrer">Ver en la tienda</a> : null}
          <Link href="/admin/products" className="btn btn--outline">Volver</Link>
          <button type="submit" className="btn" disabled={save.isPending || uploading}>{save.isPending ? "Guardando…" : "Guardar producto"}</button>
        </div>
      </div>
      {error ? <p className="flash flash--error" role="alert">{error}</p> : null}
      {saved ? <p className="flash" role="status">Producto guardado.</p> : null}

      <div className="panel">
        <h2>Fotos</h2>
        {form.images.length ? (
          <div className="imgs">
            {form.images.map((url, i) => (
              <figure key={url}>
                <img src={url} alt="" />
                <figcaption>
                  <span>
                    <button type="button" aria-label="Mover antes" disabled={i === 0} onClick={() => moveImage(i, -1)}>←</button>
                    <button type="button" aria-label="Mover después" disabled={i === form.images.length - 1} onClick={() => moveImage(i, 1)}>→</button>
                  </span>
                  <button type="button" onClick={() => set("images", form.images.filter((_, k) => k !== i))}>Quitar</button>
                </figcaption>
              </figure>
            ))}
          </div>
        ) : (
          <p className="hint" style={{ marginBottom: "1rem" }}>Este producto no tiene fotos todavía. La primera foto es la que se ve en el catálogo.</p>
        )}
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,image/avif" multiple hidden onChange={(e) => onFiles(e.target.files)} />
        <button type="button" className="btn btn--outline" disabled={uploading} onClick={() => fileRef.current?.click()}>
          {uploading ? "Subiendo…" : "Subir fotos"}
        </button>
      </div>

      <div className="panel">
        <h2>Nombre y descripción</h2>
        <div className="fgrid">
          <Field label="Nombre en español"><input className="input" {...text("nameEs")} maxLength={200} /></Field>
          <Field label="Nombre en inglés"><input className="input" {...text("nameEn")} maxLength={200} /></Field>
          <Field label="Descripción en español"><textarea className="textarea" {...text("descriptionEs")} /></Field>
          <Field label="Descripción en inglés"><textarea className="textarea" {...text("descriptionEn")} /></Field>
          <Field label="Detalles en español" hint="Un dato por línea, con dos puntos. Ejemplo: Metal: Oro amarillo 18k">
            <textarea className="textarea" {...text("detailsEs")} placeholder={"Metal: Oro amarillo 18k\nPeso: 12 g\nLargo: 60 cm"} />
          </Field>
          <Field label="Detalles en inglés" hint="One per line. Example: Metal: 18k yellow gold">
            <textarea className="textarea" {...text("detailsEn")} placeholder={"Metal: 18k yellow gold\nWeight: 12 g\nLength: 24 in"} />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h2>Precio y existencias</h2>
        <div className="fgrid fgrid--3">
          <Field label="Precio (USD)" hint="Vacío = “Precio a consultar”; el cliente escribe en vez de comprar.">
            <input className="input" inputMode="decimal" {...text("price")} placeholder="1250.00" />
          </Field>
          <Field label="Precio anterior (USD)" hint="Opcional. Se muestra tachado junto al precio.">
            <input className="input" inputMode="decimal" {...text("compareAt")} />
          </Field>
          <Field label="Existencias" hint="Con 0 la pieza aparece como vendida.">
            <input className="input" inputMode="numeric" {...text("stock")} />
          </Field>
        </div>
      </div>

      <div className="panel">
        <h2>Organización</h2>
        <div className="fgrid fgrid--3">
          <Field label="Categoría">
            <select className="select" {...text("categoryId")}>
              <option value="">Sin categoría</option>
              {site.data?.categories.map((c) => <option key={c.id} value={c.id}>{c.nameEs}</option>)}
            </select>
          </Field>
          <Field label="Colección">
            <select className="select" {...text("collectionId")}>
              <option value="">Sin colección</option>
              {site.data?.collections.map((c) => <option key={c.id} value={c.id}>{c.nameEs}</option>)}
            </select>
          </Field>
          <Field label="SKU"><input className="input" {...text("sku")} maxLength={60} /></Field>
          <Field label="Dirección web" hint="Se genera sola a partir del nombre en inglés si la deja vacía.">
            <input className="input" {...text("slug")} maxLength={160} />
          </Field>
          <Field label="Orden" hint="Los números menores aparecen primero.">
            <input className="input" inputMode="numeric" {...text("sortOrder")} />
          </Field>
        </div>
        <div className="checks" style={{ marginTop: "1.25rem" }}>
          <Check label="Visible en la tienda" checked={form.active} onChange={(v) => set("active", v)} />
          <Check label="Destacado en el inicio" checked={form.featured} onChange={(v) => set("featured", v)} />
          <Check label="Marcar como nuevo" checked={form.isNew} onChange={(v) => set("isNew", v)} />
        </div>
      </div>

      <div className="actions" style={{ justifyContent: "space-between" }}>
        <button type="submit" className="btn" disabled={save.isPending || uploading}>{save.isPending ? "Guardando…" : "Guardar producto"}</button>
        {id != null ? <button type="button" className="btn btn--danger" onClick={onDelete} disabled={remove.isPending}>Eliminar producto</button> : null}
      </div>
    </form>
  );
}
