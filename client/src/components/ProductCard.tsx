import { Link } from "wouter";
import { useI18n } from "@/lib/i18n";
import type { Product } from "@/trpc";

export function Price({ product, className = "card__price" }: { product: Pick<Product, "priceCents" | "compareAtCents" | "stock">; className?: string }) {
  const { t, money } = useI18n();
  if (product.priceCents == null) return <span className={`${className} ${className}--request`}>{t.product.onRequest}</span>;
  if (product.stock <= 0) return <span className={className}>{t.product.sold}</span>;
  return (
    <span className={className}>
      {money(product.priceCents)}
      {product.compareAtCents && product.compareAtCents > product.priceCents ? <s>{money(product.compareAtCents)}</s> : null}
    </span>
  );
}

export function ProductCard({ product, eager = false }: { product: Product; eager?: boolean }) {
  const { t, pick } = useI18n();
  const name = pick(product, "name");
  return (
    <Link href={`/product/${product.slug}`} className="card">
      <span className="card__imgwrap">
        <span className="card__img">
          {product.images[0] ? <img src={product.images[0]} alt={name} loading={eager ? "eager" : "lazy"} decoding="async" /> : null}
          {product.images[1] ? <img src={product.images[1]} alt="" loading="lazy" decoding="async" /> : null}
        </span>
        {product.isNew ? <span className="card__flag">{t.product.isNew}</span> : null}
      </span>
      <span className="card__name">{name}</span>
      <Price product={product} />
    </Link>
  );
}

export function GridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="skeleton" />
      ))}
    </div>
  );
}
