import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Loader2, Package } from "lucide-react";

export const Route = createFileRoute("/_authenticated/orders")({
  component: OrdersPage,
});

type Order = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  currency: string;
  items: {
    quantity: number;
    unit_price_cents: number;
    product: { id: string; title: string; image_url: string | null } | null;
  }[];
};

function OrdersPage() {
  const { user } = Route.useRouteContext();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase
      .from("orders")
      .select(
        "id,created_at,status,total_cents,currency,items:order_items(quantity,unit_price_cents,product:products(id,title,image_url))",
      )
      .eq("buyer_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => {
        setOrders((data as Order[] | null) ?? []);
        setLoading(false);
      });
  }, [user.id]);

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8">
        <h1 className="mb-6 font-display text-3xl font-semibold">My orders</h1>
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : orders.length === 0 ? (
          <div className="rounded-lg border border-dashed py-20 text-center">
            <Package className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
            <p className="text-muted-foreground">No orders yet.</p>
            <Button asChild className="mt-4 bg-accent text-accent-foreground hover:bg-accent/90">
              <Link to="/">Start shopping</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <div key={o.id} className="rounded-xl border bg-card p-5">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Order #{o.id.slice(0, 8)} · {new Date(o.created_at).toLocaleDateString()}
                    </p>
                    <p className="font-display text-xl font-semibold text-accent">
                      {formatPrice(o.total_cents, o.currency)}
                    </p>
                  </div>
                  <Badge variant={o.status === "pending" ? "secondary" : "default"}>{o.status}</Badge>
                </div>
                <div className="space-y-2">
                  {o.items.map((it, i) => (
                    <div key={i} className="flex items-center gap-3 text-sm">
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
                        {it.product?.image_url && (
                          <img src={it.product.image_url} alt="" className="h-full w-full object-cover" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0 truncate">
                        {it.product?.title ?? "Product removed"} × {it.quantity}
                      </div>
                      <div className="text-muted-foreground">
                        {formatPrice(it.unit_price_cents * it.quantity, o.currency)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
