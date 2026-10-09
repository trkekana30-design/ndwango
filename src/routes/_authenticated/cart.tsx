import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { Loader2, Minus, Plus, ShoppingBag, Trash2, Truck } from "lucide-react";

export const Route = createFileRoute("/_authenticated/cart")({
  component: CartPage,
});

const PROVINCES = [
  "Gauteng", "Western Cape", "KwaZulu-Natal", "Eastern Cape", "Free State",
  "Limpopo", "Mpumalanga", "North West", "Northern Cape",
];

type Row = {
  id: string;
  quantity: number;
  product: {
    id: string;
    title: string;
    price_cents: number;
    currency: string;
    image_url: string | null;
    stock: number;
    shop_id: string;
    shop: { name: string } | null;
  };
};

type Zone = {
  id: string;
  shop_id: string;
  name: string;
  areas: string | null;
  fee_cents: number;
  eta_days: number;
};

function CartPage() {
  const { user } = Route.useRouteContext();
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [zones, setZones] = useState<Zone[]>([]);
  const [zonePicks, setZonePicks] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [placing, setPlacing] = useState(false);

  const load = async () => {
    const { data } = await supabase
      .from("cart_items")
      .select(
        "id,quantity,product:products(id,title,price_cents,currency,image_url,stock,shop_id,shop:shops(name))",
      )
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    const items = (data as Row[] | null)?.filter((r) => r.product) ?? [];
    setRows(items);

    const shopIds = Array.from(new Set(items.map((r) => r.product.shop_id)));
    if (shopIds.length > 0) {
      const { data: z } = await supabase
        .from("delivery_zones")
        .select("id,shop_id,name,areas,fee_cents,eta_days")
        .in("shop_id", shopIds)
        .eq("is_active", true);
      setZones((z as Zone[] | null) ?? []);
    } else setZones([]);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const updateQty = async (id: string, next: number) => {
    if (next < 1) return;
    await supabase.from("cart_items").update({ quantity: next }).eq("id", id);
    load();
  };
  const removeRow = async (id: string) => {
    await supabase.from("cart_items").delete().eq("id", id);
    load();
  };

  const byShop = useMemo(() => {
    const map = new Map<string, { name: string; rows: Row[]; subtotal: number; zones: Zone[] }>();
    for (const r of rows) {
      const entry = map.get(r.product.shop_id) ?? {
        name: r.product.shop?.name ?? "Shop",
        rows: [],
        subtotal: 0,
        zones: zones.filter((z) => z.shop_id === r.product.shop_id),
      };
      entry.rows.push(r);
      entry.subtotal += r.product.price_cents * r.quantity;
      map.set(r.product.shop_id, entry);
    }
    return map;
  }, [rows, zones]);

  const deliveryTotal = useMemo(() => {
    let t = 0;
    for (const [shopId, entry] of byShop) {
      const zid = zonePicks[shopId];
      const z = entry.zones.find((x) => x.id === zid);
      if (z) t += z.fee_cents;
    }
    return t;
  }, [byShop, zonePicks]);

  const subtotal = rows.reduce((s, r) => s + r.product.price_cents * r.quantity, 0);
  const grandTotal = subtotal + deliveryTotal;

  const checkout = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (rows.length === 0) return;

    // Every shop needs a delivery zone picked
    for (const [shopId, entry] of byShop) {
      if (entry.zones.length === 0) {
        toast.error(`${entry.name} hasn't set up delivery yet — please remove those items.`);
        return;
      }
      if (!zonePicks[shopId]) {
        toast.error(`Pick a delivery option for ${entry.name}`);
        return;
      }
    }

    const form = new FormData(e.currentTarget);
    setPlacing(true);
    const shipping_name = String(form.get("full_name"));
    const shipping_phone = String(form.get("phone"));
    const shipping_address = `${String(form.get("line1"))}, ${String(form.get("postal_code"))}`;
    const shipping_city = String(form.get("city"));
    const shipping_province = String(form.get("province"));

    try {
      for (const [shop_id, entry] of byShop) {
        const zid = zonePicks[shop_id]!;
        const z = entry.zones.find((x) => x.id === zid)!;
        const shopTotal = entry.subtotal + z.fee_cents;
        const { data: order, error } = await supabase
          .from("orders")
          .insert({
            buyer_id: user.id,
            shop_id,
            total_cents: shopTotal,
            currency: "ZAR",
            status: "pending",
            shipping_name,
            shipping_phone,
            shipping_address,
            shipping_city,
            shipping_province,
            delivery_zone_id: z.id,
            delivery_fee_cents: z.fee_cents,
          })
          .select()
          .single();
        if (error || !order) throw new Error(error?.message ?? "Could not place order");

        const items = entry.rows.map((r) => ({
          order_id: order.id,
          product_id: r.product.id,
          title: r.product.title,
          image_url: r.product.image_url,
          quantity: r.quantity,
          price_cents: r.product.price_cents,
        }));
        const { error: itemsErr } = await supabase.from("order_items").insert(items);
        if (itemsErr) throw new Error(itemsErr.message);
      }
      await supabase.from("cart_items").delete().eq("user_id", user.id);
      toast.success("Order placed!");
      navigate({ to: "/orders" });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Checkout failed");
    } finally {
      setPlacing(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold sm:text-4xl">Your cart</h1>
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : rows.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <ShoppingBag className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">Your cart is empty.</p>
            <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/">Browse marketplace</Link>
            </Button>
          </div>
        ) : (
          <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
            <div className="space-y-5">
              {Array.from(byShop.entries()).map(([shopId, entry]) => (
                <div key={shopId} className="rounded-2xl border bg-card p-4 sm:p-5">
                  <p className="mb-3 text-[10px] uppercase tracking-[0.25em] text-accent">
                    {entry.name}
                  </p>
                  <div className="space-y-2">
                    {entry.rows.map((r) => (
                      <div key={r.id} className="flex items-center gap-3 rounded-xl border bg-background p-2 sm:gap-4 sm:p-3">
                        <Link
                          to="/product/$id"
                          params={{ id: r.product.id }}
                          className="h-16 w-16 shrink-0 overflow-hidden rounded-md bg-muted sm:h-20 sm:w-20"
                        >
                          {r.product.image_url && (
                            <img
                              src={r.product.image_url}
                              alt={r.product.title}
                              className="h-full w-full object-cover"
                            />
                          )}
                        </Link>
                        <div className="min-w-0 flex-1">
                          <Link to="/product/$id" params={{ id: r.product.id }} className="truncate font-medium hover:text-accent">
                            {r.product.title}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            {formatPrice(r.product.price_cents, r.product.currency)}
                          </p>
                        </div>
                        <div className="flex items-center gap-1">
                          <Button variant="outline" size="icon" onClick={() => updateQty(r.id, r.quantity - 1)}>
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-6 text-center text-sm font-medium sm:w-8">{r.quantity}</span>
                          <Button variant="outline" size="icon" onClick={() => updateQty(r.id, r.quantity + 1)}>
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <Button variant="ghost" size="icon" onClick={() => removeRow(r.id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 rounded-xl border bg-background/60 p-3">
                    <div className="mb-2 flex items-center gap-2 text-sm font-medium">
                      <Truck className="h-4 w-4 text-accent" /> Delivery
                    </div>
                    {entry.zones.length === 0 ? (
                      <p className="text-xs text-destructive">
                        This shop hasn't set up delivery yet. Please remove these items or contact
                        the seller.
                      </p>
                    ) : (
                      <div className="grid gap-2">
                        {entry.zones.map((z) => (
                          <label
                            key={z.id}
                            className={`flex cursor-pointer items-start gap-2 rounded-lg border p-2.5 text-sm transition ${
                              zonePicks[shopId] === z.id ? "border-accent bg-accent/5" : "hover:border-accent/50"
                            }`}
                          >
                            <input
                              type="radio"
                              name={`zone-${shopId}`}
                              value={z.id}
                              checked={zonePicks[shopId] === z.id}
                              onChange={() => setZonePicks((p) => ({ ...p, [shopId]: z.id }))}
                              className="mt-1"
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <p className="font-medium">{z.name}</p>
                                <p className="font-semibold text-accent">{formatPrice(z.fee_cents)}</p>
                              </div>
                              <p className="text-xs text-muted-foreground">
                                {z.eta_days} day{z.eta_days === 1 ? "" : "s"}
                                {z.areas && ` · ${z.areas}`}
                              </p>
                            </div>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <form onSubmit={checkout} className="h-fit space-y-4 rounded-2xl border bg-card p-5 sm:p-6">
              <h2 className="font-display text-xl">Delivery details</h2>
              <div className="grid gap-3">
                <div>
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" name="full_name" required />
                </div>
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" name="phone" required />
                </div>
                <div>
                  <Label htmlFor="line1">Address</Label>
                  <Input id="line1" name="line1" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input id="city" name="city" required />
                  </div>
                  <div>
                    <Label htmlFor="postal_code">Postal</Label>
                    <Input id="postal_code" name="postal_code" required />
                  </div>
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <select id="province" name="province" required className="h-10 w-full rounded-md border bg-background px-3 text-sm" defaultValue="">
                    <option value="" disabled>Select province</option>
                    {PROVINCES.map((p) => <option key={p} value={p}>{p}</option>)}
                  </select>
                </div>
              </div>
              <div className="space-y-1 border-t pt-4 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatPrice(subtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>{formatPrice(deliveryTotal)}</span>
                </div>
                <div className="mt-2 flex justify-between font-display text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-accent">{formatPrice(grandTotal)}</span>
                </div>
              </div>
              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-accent text-accent-foreground hover:bg-accent/90"
                disabled={placing}
              >
                {placing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Place order"}
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Pay on delivery — sellers arrange the courier.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
