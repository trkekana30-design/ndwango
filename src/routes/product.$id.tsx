import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { useAuth } from "@/lib/useAuth";
import { toast } from "sonner";
import {
  Loader2, Package, ShoppingBag, Store, LifeBuoy, MessageCircle, Mail, Phone, Truck,
} from "lucide-react";

export const Route = createFileRoute("/product/$id")({
  component: ProductPage,
});

type Product = {
  id: string;
  title: string;
  description: string | null;
  price_cents: number;
  currency: string;
  stock: number;
  image_url: string | null;
  category: string | null;
  is_active: boolean;
  shop: {
    id: string; name: string; slug: string; slogan: string | null;
    contact_name: string | null; whatsapp: string | null; email: string | null;
    phone: string | null; city: string | null;
  } | null;
};

type Zone = { id: string; name: string; fee_cents: number; eta_days: number; areas: string | null };

function ProductPage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [zones, setZones] = useState<Zone[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [qty, setQty] = useState(1);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*,shop:shops(id,name,slug,slogan,contact_name,whatsapp,email,phone,city)")
        .eq("id", id)
        .maybeSingle();
      setProduct(data as Product | null);
      if (data?.shop?.id) {
        const { data: z } = await supabase
          .from("delivery_zones")
          .select("id,name,fee_cents,eta_days,areas")
          .eq("shop_id", data.shop.id)
          .eq("is_active", true)
          .order("fee_cents", { ascending: true });
        setZones((z as Zone[] | null) ?? []);
      }
      setLoading(false);
    })();
  }, [id]);

  const addToCart = async () => {
    if (!user) return navigate({ to: "/auth" });
    if (!product) return;
    setAdding(true);
    const { data: existing } = await supabase
      .from("cart_items")
      .select("id,quantity")
      .eq("user_id", user.id)
      .eq("product_id", product.id)
      .maybeSingle();
    let error;
    if (existing) {
      ({ error } = await supabase
        .from("cart_items")
        .update({ quantity: existing.quantity + qty })
        .eq("id", existing.id));
    } else {
      ({ error } = await supabase
        .from("cart_items")
        .insert({ user_id: user.id, product_id: product.id, quantity: qty }));
    }
    setAdding(false);
    if (error) toast.error(error.message);
    else toast.success("Added to cart");
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : !product ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <h2 className="font-display text-2xl">Product not found</h2>
            <Button asChild className="mt-4">
              <Link to="/">Back to marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-8 md:grid-cols-2">
            <div className="aspect-square overflow-hidden rounded-2xl border bg-muted">
              {product.image_url ? (
                <img src={product.image_url} alt={product.title} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <Package className="h-16 w-16" />
                </div>
              )}
            </div>
            <div className="space-y-5">
              {product.shop && (
                <Link
                  to="/shop/$slug"
                  params={{ slug: product.shop.slug }}
                  className="inline-flex items-center gap-2 text-sm font-medium text-accent hover:underline"
                >
                  <Store className="h-4 w-4" /> {product.shop.name}
                </Link>
              )}
              <h1 className="font-display text-3xl font-semibold sm:text-4xl">{product.title}</h1>
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-display text-3xl font-semibold text-accent">
                  {formatPrice(product.price_cents, product.currency)}
                </span>
                {product.stock > 0 ? (
                  <Badge variant="secondary">{product.stock} in stock</Badge>
                ) : (
                  <Badge variant="destructive">Out of stock</Badge>
                )}
                {product.category && <Badge variant="outline">{product.category}</Badge>}
              </div>
              {product.description && (
                <p className="whitespace-pre-line text-muted-foreground">{product.description}</p>
              )}

              <div className="flex items-end gap-3 border-t pt-5">
                <div>
                  <label className="mb-1 block text-xs font-medium text-muted-foreground">Qty</label>
                  <input
                    type="number"
                    min={1}
                    max={product.stock || 1}
                    value={qty}
                    onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                    className="h-11 w-20 rounded-md border bg-background px-3"
                  />
                </div>
                <Button
                  size="lg"
                  onClick={addToCart}
                  disabled={adding || product.stock === 0 || !product.is_active}
                  className="h-11 flex-1 rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                >
                  {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><ShoppingBag className="mr-2 h-4 w-4" /> Add to cart</>)}
                </Button>
              </div>

              {/* Delivery */}
              {zones.length > 0 && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                    <Truck className="h-4 w-4 text-accent" /> Delivery options
                  </p>
                  <div className="grid gap-1.5 text-sm">
                    {zones.map((z) => (
                      <div key={z.id} className="flex items-center justify-between gap-2 text-muted-foreground">
                        <span>{z.name} · {z.eta_days}d{z.areas ? ` · ${z.areas}` : ""}</span>
                        <span className="font-medium text-foreground">{formatPrice(z.fee_cents)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Contact / Support */}
              {product.shop && (
                <div className="rounded-xl border bg-card p-4">
                  <p className="mb-2 text-sm font-medium">Need help with this product?</p>
                  <div className="flex flex-wrap gap-2">
                    {product.shop.whatsapp && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`https://wa.me/${product.shop.whatsapp.replace(/[^0-9]/g, "")}`} target="_blank" rel="noreferrer">
                          <MessageCircle className="mr-1.5 h-4 w-4" /> WhatsApp seller
                        </a>
                      </Button>
                    )}
                    {product.shop.email && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`mailto:${product.shop.email}`}>
                          <Mail className="mr-1.5 h-4 w-4" /> Email
                        </a>
                      </Button>
                    )}
                    {product.shop.phone && (
                      <Button asChild variant="outline" size="sm">
                        <a href={`tel:${product.shop.phone}`}>
                          <Phone className="mr-1.5 h-4 w-4" /> Call
                        </a>
                      </Button>
                    )}
                    <ReportProblem
                      productId={product.id}
                      shopId={product.shop.id}
                      shopName={product.shop.name}
                      buyerId={user?.id ?? null}
                      onNeedsAuth={() => navigate({ to: "/auth" })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ReportProblem({
  productId, shopId, shopName, buyerId, onNeedsAuth,
}: {
  productId: string; shopId: string; shopName: string;
  buyerId: string | null; onNeedsAuth: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const submit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!buyerId) return onNeedsAuth();
    const f = new FormData(e.currentTarget);
    setSaving(true);
    const { error } = await supabase.from("leads").insert({
      buyer_id: buyerId,
      shop_id: shopId,
      product_id: productId,
      type: "support",
      status: "new",
      source: "product_page",
      subject: String(f.get("subject") ?? "").trim() || "Product issue",
      interest: String(f.get("details") ?? "").trim(),
      name: String(f.get("name") ?? "").trim() || null,
      phone: String(f.get("phone") ?? "").trim() || null,
      email: String(f.get("email") ?? "").trim() || null,
      ai_summary: `Buyer reported an issue with a product. Please follow up.`,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(`Sent to ${shopName}. They'll be in touch.`);
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <LifeBuoy className="mr-1.5 h-4 w-4" /> Report a problem
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report a problem to {shopName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <Label htmlFor="subject">Subject *</Label>
            <Input id="subject" name="subject" required placeholder="e.g. Item arrived damaged" />
          </div>
          <div>
            <Label htmlFor="details">Details *</Label>
            <Textarea id="details" name="details" rows={4} required placeholder="Tell the seller what happened…" />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><Label htmlFor="name">Your name</Label><Input id="name" name="name" /></div>
            <div><Label htmlFor="phone">Phone</Label><Input id="phone" name="phone" /></div>
          </div>
          <div><Label htmlFor="email">Email</Label><Input id="email" name="email" type="email" /></div>
          <Button type="submit" disabled={saving} className="w-full bg-accent text-accent-foreground hover:bg-accent/90">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send to seller"}
          </Button>
          <p className="text-center text-xs text-muted-foreground">
            Your ticket lands in the seller's dashboard immediately.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
