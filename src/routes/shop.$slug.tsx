import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Loader2, MapPin } from "lucide-react";

export const Route = createFileRoute("/shop/$slug")({
  component: ShopPage,
});

type Shop = {
  id: string;
  name: string;
  slug: string;
  slogan: string | null;
  description: string | null;
  logo_url: string | null;
  banner_url: string | null;
  city: string | null;
};

function ShopPage() {
  const { slug } = Route.useParams();
  const [shop, setShop] = useState<Shop | null>(null);
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: s } = await supabase
        .from("shops")
        .select("*")
        .eq("slug", slug)
        .maybeSingle();
      setShop(s as Shop | null);
      if (s) {
        const { data: p } = await supabase
          .from("products")
          .select("id,title,price_cents,currency,image_url")
          .eq("shop_id", s.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false });
        setProducts((p as ProductCardData[] | null) ?? []);
      }
      setLoading(false);
    })();
  }, [slug]);

  return (
    <div className="min-h-screen">
      <Header />
      {loading ? (
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      ) : !shop ? (
        <div className="mx-auto max-w-2xl py-24 text-center">
          <h2 className="font-display text-2xl">Shop not found</h2>
          <Button asChild className="mt-4">
            <Link to="/">Back to marketplace</Link>
          </Button>
        </div>
      ) : (
        <>
          <div
            className="relative h-56 bg-primary md:h-72"
            style={
              shop.banner_url
                ? {
                    backgroundImage: `url(${shop.banner_url})`,
                    backgroundSize: "cover",
                    backgroundPosition: "center",
                  }
                : undefined
            }
          >
            <div className="absolute inset-0 bg-gradient-to-t from-primary/90 to-primary/30" />
          </div>
          <div className="mx-auto max-w-7xl px-4">
            <div className="-mt-16 flex flex-col items-start gap-5 rounded-xl border bg-card p-6 shadow-lg sm:flex-row">
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-full border-4 border-background bg-secondary">
                {shop.logo_url ? (
                  <img src={shop.logo_url} alt={shop.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full items-center justify-center font-display text-3xl text-accent">
                    {shop.name.charAt(0)}
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h1 className="font-display text-3xl font-semibold">{shop.name}</h1>
                {shop.slogan && <p className="text-accent">{shop.slogan}</p>}
                {shop.city && (
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" /> {shop.city}
                  </p>
                )}
                {shop.description && (
                  <p className="mt-3 whitespace-pre-line text-muted-foreground">
                    {shop.description}
                  </p>
                )}
              </div>
            </div>

            <div className="py-10">
              <h2 className="mb-4 font-display text-2xl">Products</h2>
              {products.length === 0 ? (
                <p className="rounded-lg border border-dashed py-16 text-center text-muted-foreground">
                  No products listed yet.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
                  {products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
