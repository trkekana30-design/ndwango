import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { ProductCard, type ProductCardData } from "@/components/ProductCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Logo } from "@/components/Logo";
import { supabase } from "@/integrations/supabase/client";
import { Search, Store, ShoppingBag, Sparkles, Truck, ShieldCheck } from "lucide-react";

export const Route = createFileRoute("/")({
  component: Index,
});

type ShopChip = { id: string; name: string; slug: string; city: string | null };

function Index() {
  const [products, setProducts] = useState<ProductCardData[]>([]);
  const [shops, setShops] = useState<ShopChip[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: prod } = await supabase
        .from("products")
        .select("id,title,price_cents,currency,image_url,shop:shops(name,slug)")
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(48);
      setProducts((prod as ProductCardData[] | null) ?? []);
      const { data: sh } = await supabase
        .from("shops")
        .select("id,name,slug,city")
        .order("created_at", { ascending: false })
        .limit(12);
      setShops(sh ?? []);
      setLoading(false);
    })();
  }, []);

  const filtered = search
    ? products.filter(
        (p) =>
          p.title.toLowerCase().includes(search.toLowerCase()) ||
          p.shop?.name.toLowerCase().includes(search.toLowerCase()),
      )
    : products;

  return (
    <div className="min-h-screen bg-background">
      <Header />

      {/* HERO — afro-luxury phone-card energy */}
      <section className="bg-crown-pattern relative overflow-hidden text-primary-foreground">
        <div className="bg-royal-gradient absolute inset-0" />
        <div className="pointer-events-none absolute -left-24 top-10 h-72 w-72 rounded-full bg-accent/30 blur-3xl" />
        <div className="pointer-events-none absolute -right-24 bottom-0 h-80 w-80 rounded-full bg-crown/20 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 pb-16 pt-10 sm:pt-14 md:pb-24 md:pt-20">
          <div className="mx-auto flex max-w-2xl flex-col items-center text-center">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-primary-foreground/20 bg-primary-foreground/5 px-3 py-1 text-[10px] uppercase tracking-[0.3em] backdrop-blur">
              <Sparkles className="h-3 w-3 text-accent" /> Khaya le Kotini
            </div>

            <div className="relative mb-6">
              <div className="absolute inset-0 -m-6 rounded-full bg-accent/30 blur-2xl" />
              <div className="relative grid h-28 w-28 place-items-center rounded-full bg-primary-foreground/5 ring-1 ring-primary-foreground/20 backdrop-blur-lg sm:h-32 sm:w-32">
                <Logo className="h-20 w-auto drop-shadow-2xl sm:h-24" />
              </div>
            </div>

            <h1 className="font-display text-5xl font-black uppercase leading-none tracking-tight sm:text-6xl md:text-7xl">
              NDWANGO
            </h1>
            <p className="mt-3 font-display text-lg italic text-crown sm:text-xl">
              Afro-Luxury Marketplace
            </p>
            <p className="mt-5 max-w-lg text-sm leading-relaxed text-primary-foreground/75 sm:text-base">
              Where South African brands come home. Open your Khaya, list your products, and sell
              directly to buyers — with an AI concierge that never sleeps.
            </p>

            <div className="mt-8 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
              <Button
                asChild
                size="lg"
                className="shadow-elegant h-12 rounded-full bg-accent px-8 text-accent-foreground hover:bg-accent/90"
              >
                <Link to="/seller">
                  <Store className="mr-2 h-4 w-4" /> Open your Khaya
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="h-12 rounded-full border-primary-foreground/25 bg-transparent px-8 text-primary-foreground backdrop-blur hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <a href="#browse">
                  <ShoppingBag className="mr-2 h-4 w-4" /> Browse
                </a>
              </Button>
            </div>

            <div className="mt-10 grid w-full grid-cols-3 gap-2 text-[10px] uppercase tracking-widest text-primary-foreground/60 sm:text-xs">
              <div className="flex flex-col items-center gap-1 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                <Store className="h-4 w-4 text-crown" /> Local sellers
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                <Sparkles className="h-4 w-4 text-crown" /> AI concierge
              </div>
              <div className="flex flex-col items-center gap-1 rounded-xl border border-primary-foreground/10 bg-primary-foreground/[0.04] p-3">
                <Truck className="h-4 w-4 text-crown" /> Direct delivery
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Shops strip */}
      {shops.length > 0 && (
        <section className="border-y bg-secondary/40">
          <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto px-4 py-3 sm:gap-3 sm:py-4">
            <span className="flex shrink-0 items-center pr-2 text-xs font-medium uppercase tracking-widest text-muted-foreground sm:text-sm">
              Shops
            </span>
            {shops.map((s) => (
              <Link
                key={s.id}
                to="/shop/$slug"
                params={{ slug: s.slug }}
                className="shrink-0 rounded-full border bg-background px-3 py-1.5 text-xs hover:border-accent hover:text-accent sm:px-4 sm:text-sm"
              >
                {s.name}
                {s.city && <span className="ml-2 text-[10px] text-muted-foreground sm:text-xs">· {s.city}</span>}
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Products */}
      <section id="browse" className="mx-auto max-w-7xl px-4 py-10 sm:py-14">
        <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <div className="mb-1 text-[11px] uppercase tracking-[0.25em] text-accent">Fresh drops</div>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              From the marketplace
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {loading ? "Loading…" : `${filtered.length} products from local sellers`}
            </p>
          </div>
          <div className="relative sm:w-80">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search products or shops…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-11 rounded-full pl-9"
            />
          </div>
        </div>

        {!loading && filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <h3 className="font-display text-xl">No products yet</h3>
            <p className="mt-1 text-muted-foreground">
              Be the first — open your Khaya and list something for sale.
            </p>
            <Button asChild className="mt-6 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/seller">Start selling</Link>
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4">
            {filtered.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </section>

      {/* Trust strip */}
      <section className="border-t bg-secondary/30">
        <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:grid-cols-3">
          {[
            { icon: ShieldCheck, title: "Verified sellers", body: "Every Khaya submits full contact details before going live." },
            { icon: Truck, title: "Seller-managed delivery", body: "Choose a delivery zone at checkout — priced by your seller." },
            { icon: Sparkles, title: "AI receptionist", body: "Get help 24/7 and buyer issues route straight to the seller." },
          ].map((f) => (
            <div key={f.title} className="rounded-2xl border bg-card p-5">
              <f.icon className="mb-3 h-5 w-5 text-accent" />
              <p className="font-display text-lg">{f.title}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.body}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="bg-crown-pattern relative border-t text-primary-foreground/80">
        <div className="bg-royal-gradient absolute inset-0" />
        <div className="relative mx-auto flex max-w-7xl flex-col items-center gap-2 px-4 py-12 text-center">
          <Logo className="h-12 w-auto" />
          <p className="font-display text-2xl uppercase text-primary-foreground">Ndwango</p>
          <p className="text-[10px] uppercase tracking-[0.3em] text-crown">Khaya le Kotini</p>
          <p className="mt-3 text-xs text-primary-foreground/60">
            © {new Date().getFullYear()} Ndwango Marketplace · Afro-Luxury
          </p>
        </div>
      </footer>
    </div>
  );
}
