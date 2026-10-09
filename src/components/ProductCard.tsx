import { Link } from "@tanstack/react-router";
import { formatPrice } from "@/lib/format";
import { Package } from "lucide-react";

export type ProductCardData = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  shop?: { name: string; slug: string } | null;
};

export function ProductCard({ product }: { product: ProductCardData }) {
  return (
    <Link
      to="/product/$id"
      params={{ id: product.id }}
      className="group block overflow-hidden rounded-lg border bg-card transition hover:shadow-lg"
    >
      <div className="relative aspect-square overflow-hidden bg-muted">
        {product.image_url ? (
          <img
            src={product.image_url}
            alt={product.title}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-muted-foreground">
            <Package className="h-10 w-10" />
          </div>
        )}
      </div>
      <div className="space-y-1 p-3">
        <h3 className="line-clamp-1 font-medium">{product.title}</h3>
        {product.shop && (
          <p className="line-clamp-1 text-xs text-muted-foreground">{product.shop.name}</p>
        )}
        <p className="pt-1 font-display text-lg font-semibold text-accent">
          {formatPrice(product.price_cents, product.currency)}
        </p>
      </div>
    </Link>
  );
}
