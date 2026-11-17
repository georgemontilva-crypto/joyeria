# Madison D'Or

Tienda en línea de joyería: catálogo, carrito, pago con Stripe y panel de administración.
En inglés y español, precios en dólares, envío sin costo dentro de Estados Unidos.

**Stack:** React + Vite, tRPC, Drizzle ORM, MySQL, Express. Stripe Checkout para el pago,
Resend para los correos y Cloudflare R2 para las fotos que se suben desde el panel.

## Qué incluye

| Sección | Dirección |
| --- | --- |
| Inicio | `/` |
| Tienda con filtros, búsqueda y orden | `/shop` |
| Detalle de producto | `/product/:slug` |
| Colecciones y categorías | `/collections` |
| Nuestra historia | `/our-story` |
| Contacto | `/contact` |
| Preguntas frecuentes | `/faq` |
| Carrito y pago | `/bag` → Stripe → `/order/confirmed` |
| Políticas | `/policies/shipping`, `returns`, `privacy`, `terms`, `cookies` |
| Panel de administración | `/admin` |

Por decisión del cliente no hay cuentas de usuario, seguimiento de pedido, blog ni páginas de campaña.
La compra es como invitado.

## Desplegar en Railway

1. Crear un proyecto en Railway con este repositorio y agregar un servicio **MySQL**.
2. En el servicio web, definir las variables de `.env.example`. Para la base de datos:
   `DATABASE_URL = ${{MySQL.MYSQL_URL}}`.
3. Desplegar. Al arrancar, el servidor crea las tablas (migraciones en `drizzle/`) y,
   si la base está vacía, carga el catálogo inicial con las 19 piezas de las fotos del cliente.
4. En Stripe → Developers → Webhooks, crear un endpoint hacia `https://SU-DOMINIO/api/stripe/webhook`
   con los eventos `checkout.session.completed`, `checkout.session.expired`,
   `checkout.session.async_payment_succeeded` y `checkout.session.async_payment_failed`.
   Copiar su secreto en `STRIPE_WEBHOOK_SECRET`.

El panel `/admin` → Resumen muestra qué integraciones faltan por configurar.

## Trabajar en local

```
npm install
copy .env.example .env      (y completar al menos DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD)
npm run dev
```

Abre en `http://localhost:3000`. Otros comandos: `npm run check` (tipos), `npm run build`, `npm start`.
Si cambia `server/db/schema.ts`, ejecute `npm run db:generate` para crear la migración; se aplica sola al arrancar.

## Cómo funciona la compra

- Un producto **sin precio** se muestra como "Precio a consultar" y lleva al formulario de contacto.
  Al ponerle precio en el panel pasa a tener botón de compra.
- Al ir a pagar, las piezas quedan **reservadas** hasta 31 minutos. Si el cliente cancela o abandona,
  vuelven a estar disponibles. Así dos personas no pueden comprar la misma pieza única.
- El pedido se marca pagado por el webhook de Stripe, o al volver el cliente a la página de confirmación,
  lo que ocurra primero. Se envían un correo al cliente y otro a `ORDERS_EMAIL`.
- Al marcar un pedido como "Enviado" en el panel se puede avisar al cliente con el número de guía.
- Los reembolsos se hacen en el panel de Stripe; aquí solo se marca el estado.

## Dónde cambiar cada cosa

- Textos del sitio (ambos idiomas, FAQ y políticas): `client/src/lib/strings.ts`
- Colores y tipografía: variables al inicio de `client/src/styles/site.css`
- Monograma provisional: `client/src/components/Monogram.tsx`
- Catálogo inicial: `server/db/seed-data.ts` (solo se usa con la base vacía)
- Productos, categorías, colecciones, datos de contacto y aviso superior: desde `/admin`
