import { useState, type FormEvent } from "react";
import { Link, Route, Switch, useLocation } from "wouter";
import "./admin.css";
import { trpc } from "@/trpc";
import { Field, StatusTag, dateTime, money } from "./ui";
import { ProductForm, ProductList } from "./Products";
import { Taxonomy } from "./Taxonomy";
import { OrderDetail, OrderList } from "./Orders";
import { Messages, Settings } from "./Misc";

function Login({ configured }: { configured: boolean }) {
  const utils = trpc.useUtils();
  const login = trpc.admin.login.useMutation({ onSuccess: () => utils.admin.me.invalidate() });
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    login.mutate({ email, password });
  }

  return (
    <div className="login">
      <form onSubmit={onSubmit}>
        <h1>Panel de Madison D’Or</h1>
        {!configured ? (
          <p className="flash flash--error" style={{ margin: 0 }}>
            Faltan las variables ADMIN_EMAIL y ADMIN_PASSWORD en el servidor. Agréguelas en Railway y vuelva a desplegar.
          </p>
        ) : null}
        {login.isError ? (
          <p className="flash flash--error" role="alert" style={{ margin: 0 }}>
            {login.error.data?.code === "TOO_MANY_REQUESTS"
              ? "Demasiados intentos. Espere 15 minutos y vuelva a intentar."
              : login.error.data?.code === "UNAUTHORIZED"
                ? "El correo o la contraseña no coinciden."
                : "No se pudo iniciar sesión. Revise la conexión e intente de nuevo."}
          </p>
        ) : null}
        <Field label="Correo">
          <input className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </Field>
        <Field label="Contraseña">
          <input className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </Field>
        <button type="submit" className="btn" disabled={login.isPending || !configured}>
          {login.isPending ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </div>
  );
}

function Overview() {
  const q = trpc.admin.overview.useQuery();
  const d = q.data;
  if (!d) return <p>Cargando…</p>;
  const checks: [boolean, string, string][] = [
    [d.integrations.stripe, "Pagos con Stripe", "Falta STRIPE_SECRET_KEY. Sin ella el botón de pago avisa que el pago en línea aún no está abierto."],
    [d.integrations.stripeWebhook, "Webhook de Stripe", "Falta STRIPE_WEBHOOK_SECRET. Los pedidos se confirman igual cuando el cliente vuelve a la web, pero el webhook cubre a quien cierra la pestaña antes."],
    [d.integrations.email, "Correos con Resend", "Falta RESEND_API_KEY. No se envían confirmaciones de pedido ni avisos del formulario de contacto."],
    [d.integrations.storage, "Fotos en Cloudflare R2", "Faltan las variables R2_*. Las fotos que suba aquí se guardan en el disco del servidor y se pierden en cada despliegue."],
    [d.integrations.sessionSecret, "Sesión del panel", "Falta SESSION_SECRET. La sesión del panel se cierra cada vez que el servidor reinicia."],
  ];
  return (
    <>
      <div className="adm__head">
        <h1>Resumen</h1>
      </div>
      <div className="stats">
        <Link href="/admin/orders" className="stat"><b>{d.toShip}</b><span>Pedidos por enviar</span></Link>
        <Link href="/admin/orders" className="stat"><b>{d.orders}</b><span>Pedidos pagados</span></Link>
        <div className="stat"><b>{money(d.revenueCents)}</b><span>Ventas totales</span></div>
        <Link href="/admin/messages" className="stat"><b>{d.unreadMessages}</b><span>Mensajes sin leer</span></Link>
        <Link href="/admin/products" className="stat"><b>{d.products}</b><span>Productos</span></Link>
      </div>

      {d.unpricedProducts > 0 ? (
        <p className="flash" style={{ borderLeftColor: "var(--gold)", background: "#fbf5e4" }}>
          {d.unpricedProducts === 1 ? "1 producto no tiene precio" : `${d.unpricedProducts} productos no tienen precio`} y se muestran como
          “Precio a consultar”: no se pueden comprar hasta que les ponga uno. <Link href="/admin/products" className="link">Ir a productos</Link>
        </p>
      ) : null}

      <div className="panel">
        <h2>Configuración del servidor</h2>
        <ul className="checklist">
          {checks.map(([ok, label, help]) => (
            <li key={label}>
              <span className={`tag ${ok ? "tag--ok" : "tag--warn"}`}>{ok ? "Listo" : "Pendiente"}</span>
              <span>
                {label}
                {!ok ? <span className="hint" style={{ display: "block" }}>{help}</span> : null}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="panel">
        <h2>Últimos pedidos</h2>
        {d.recent.length === 0 ? (
          <p style={{ color: "var(--slate)" }}>Todavía no hay pedidos. Aparecerán aquí en cuanto alguien compre.</p>
        ) : (
          <div className="table-wrap" style={{ border: 0 }}>
            <table className="table">
              <tbody>
                {d.recent.map((o) => (
                  <tr key={o.id}>
                    <td><Link href={`/admin/orders/${o.id}`}>{o.number}</Link></td>
                    <td>{o.name ?? o.email ?? ""}</td>
                    <td>{dateTime(o.createdAt)}</td>
                    <td><StatusTag status={o.status} /></td>
                    <td className="num">{money(o.totalCents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}

export default function AdminApp() {
  const [location] = useLocation();
  const utils = trpc.useUtils();
  const me = trpc.admin.me.useQuery(undefined, { staleTime: 0 });
  const overview = trpc.admin.overview.useQuery(undefined, { enabled: Boolean(me.data?.signedIn) });
  const logout = trpc.admin.logout.useMutation({
    onSuccess: async () => {
      utils.admin.invalidate();
    },
  });

  if (!me.data) return null;
  if (!me.data.signedIn) return <Login configured={me.data.configured} />;

  const nav: [string, string, number?][] = [
    ["/admin", "Resumen"],
    ["/admin/orders", "Pedidos", overview.data?.toShip],
    ["/admin/products", "Productos"],
    ["/admin/taxonomy", "Categorías y colecciones"],
    ["/admin/messages", "Mensajes", overview.data?.unreadMessages],
    ["/admin/settings", "Ajustes"],
  ];
  const current = (href: string) => (href === "/admin" ? location === "/admin" : location.startsWith(href)) ? "page" : undefined;

  return (
    <div className="adm">
      <aside className="adm__side on-navy">
        <div className="adm__brand">MADISON D’OR</div>
        {nav.map(([href, label, badge]) => (
          <Link key={href} href={href} aria-current={current(href)}>
            {label}
            {badge ? <span className="adm__badge">{badge}</span> : null}
          </Link>
        ))}
        <div className="spacer" />
        <a href="/" target="_blank" rel="noreferrer">Ver la tienda</a>
        <button type="button" onClick={() => logout.mutate()}>Cerrar sesión</button>
      </aside>
      <main className="adm__main">
        <Switch>
          <Route path="/admin" component={Overview} />
          <Route path="/admin/products" component={ProductList} />
          <Route path="/admin/products/new">{() => <ProductForm />}</Route>
          <Route path="/admin/products/:id">{(p) => <ProductForm id={Number(p.id)} />}</Route>
          <Route path="/admin/taxonomy" component={Taxonomy} />
          <Route path="/admin/orders" component={OrderList} />
          <Route path="/admin/orders/:id">{(p) => <OrderDetail id={Number(p.id)} />}</Route>
          <Route path="/admin/messages" component={Messages} />
          <Route path="/admin/settings" component={Settings} />
          <Route>
            <p>Esta página del panel no existe. <Link href="/admin" className="link">Volver al resumen</Link></p>
          </Route>
        </Switch>
      </main>
    </div>
  );
}
