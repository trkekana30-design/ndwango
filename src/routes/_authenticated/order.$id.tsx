import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { Loader2, Package, Truck, CheckCircle2, Clock, XCircle, MessageCircle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/order/$id")({
  component: OrderPage,
});

const STEPS = ["pending", "confirmed", "shipped", "delivered"] as const;

type Order = {
  id: string;
  created_at: string;
  status: string;
  total_cents: number;
  delivery_fee_cents: number;
  currency: string;
  payment_method: string;
  payment_status: string;
  courier: string | null;
  tracking_number: string | null;
  shipping_name: string | null;
  shipping_phone: string | null;
  shipping_address: string | null;
  shipping_city: string | null;
  shipping_province: string | null;
  shop: { name: string; slug: string; whatsapp: string | null; phone: string | null } | null;
  items: {
    id: string;
    title: string;
    quantity: number;
    price_cents: number;
    image_url: string | null;
    product_id: string | null;
  }[];
};

type Event = { id: string; status: string; note: string | null; created_at: string };

function OrderPage() {
  const { id } = Route.useParams();
  const [order, setOrder] = useState<Order | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [{ data: o }, { data: e }] = await Promise.all([
        supabase
          .from("orders")
          .select(
            "id,created_at,status,total_cents,delivery_fee_cents,currency,payment_method,payment_status,courier,tracking_number,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_province,shop:shops(name,slug,whatsapp,phone),items:order_items(id,title,quantity,price_cents,image_url,product_id)",
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("order_events")
          .select("id,status,note,created_at")
          .eq("order_id", id)
          .order("created_at", { ascending: true }),
      ]);
      setOrder(o as unknown as Order | null);
      setEvents((e as Event[] | null) ?? []);
      setLoading(false);
    })();
  }, [id]);

  const stepIndex = order ? STEPS.indexOf(order.status as (typeof STEPS)[number]) : -1;
  const cancelled = order?.status === "cancelled";

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-8">
        {loading ? (
          <div className="flex justify-center py-24">
            <Loader2 className="h-8 w-8 animate-spin text-accent" />
          </div>
        ) : !order ? (
          <div className="rounded-2xl border border-dashed py-20 text-center">
            <p className="text-muted-foreground">Order not found.</p>
            <Button asChild className="mt-4">
              <Link to="/orders">Back to my orders</Link>
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            <div>
              <Link to="/orders" className="text-xs text-muted-foreground hover:text-accent">
                ← My orders
              </Link>
              <h1 className="mt-1 font-display text-3xl font-semibold">
                Order #{order.id.slice(0, 8)}
              </h1>
              <p className="text-sm text-muted-foreground">
                {order.shop?.name} · {new Date(order.created_at).toLocaleString()}
              </p>
            </div>

            {/* Tracking */}
            <div className="rounded-2xl border bg-card p-5">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-2 font-medium">
                  <Truck className="h-4 w-4 text-accent" /> Tracking
                </p>
                <Badge variant={cancelled ? "destructive" : "secondary"} className="capitalize">
                  {order.status}
                </Badge>
              </div>
              {cancelled ? (
                <p className="flex items-center gap-2 text-sm text-destructive">
                  <XCircle className="h-4 w-4" /> This order was cancelled.
                </p>
              ) : (
                <div className="flex items-center">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex flex-1 items-center last:flex-none">
                      <div className="flex flex-col items-center gap-1">
                        <div
                          className={`flex h-8 w-8 items-center justify-center rounded-full border-2 ${
                            i <= stepIndex
                              ? "border-accent bg-accent text-accent-foreground"
                              : "border-border text-muted-foreground"
                          }`}
                        >
                          {i <= stepIndex ? (
                            <CheckCircle2 className="h-4 w-4" />
                          ) : (
                            <Clock className="h-4 w-4" />
                          )}
                        </div>
                        <span className="text-[10px] capitalize text-muted-foreground">{s}</span>
                      </div>
                      {i < STEPS.length - 1 && (
                        <div
                          className={`mx-1 h-0.5 flex-1 ${i < stepIndex ? "bg-accent" : "bg-border"}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              )}
              {(order.courier || order.tracking_number) && (
                <p className="mt-4 text-sm text-muted-foreground">
                  {order.courier && <>Courier: <span className="text-foreground">{order.courier}</span></>}
                  {order.tracking_number && (
                    <> · Waybill: <span className="text-foreground">{order.tracking_number}</span></>
                  )}
                </p>
              )}
              {events.length > 0 && (
                <div className="mt-4 space-y-1.5 border-t pt-4 text-sm">
                  {events.map((ev) => (
                    <div key={ev.id} className="flex justify-between gap-3 text-muted-foreground">
                      <span className="capitalize">{ev.note ?? ev.status}</span>
                      <span className="text-xs">{new Date(ev.created_at).toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Items */}
            <div className="rounded-2xl border bg-card p-5">
              <p className="mb-3 flex items-center gap-2 font-medium">
                <Package className="h-4 w-4 text-accent" /> Items
              </p>
              <div className="space-y-3">
                {order.items.map((it) => (
                  <div key={it.id} className="flex items-center gap-3">
                    <div className="h-12 w-12 shrink-0 overflow-hidden rounded bg-muted">
                      {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{it.title}</p>
                      <p className="text-xs text-muted-foreground">Qty {it.quantity}</p>
                    </div>
                    <span className="text-sm">{formatPrice(it.price_cents * it.quantity, order.currency)}</span>
                    {order.status === "delivered" && it.product_id && (
                      <Button asChild size="sm" variant="outline">
                        <Link to="/product/$id" params={{ id: it.product_id }}>Review</Link>
                      </Button>
                    )}
                  </div>
                ))}
              </div>
              <div className="mt-4 space-y-1 border-t pt-3 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>{formatPrice(order.delivery_fee_cents, order.currency)}</span>
                </div>
                <div className="flex justify-between font-display text-lg font-semibold">
                  <span>Total</span>
                  <span className="text-accent">{formatPrice(order.total_cents, order.currency)}</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Payment: {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method.toUpperCase()} ·{" "}
                  <span className="capitalize">{order.payment_status}</span>
                </p>
              </div>
            </div>

            {/* Delivery details */}
            <div className="rounded-2xl border bg-card p-5 text-sm">
              <p className="mb-2 font-medium">Delivering to</p>
              <p className="text-muted-foreground">
                {order.shipping_name} · {order.shipping_phone}
                <br />
                {order.shipping_address}, {order.shipping_city}, {order.shipping_province}
              </p>
              {order.shop?.whatsapp && (
                <Button asChild size="sm" variant="outline" className="mt-3">
                  <a
                    href={`https://wa.me/${order.shop.whatsapp.replace(/[^0-9]/g, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="mr-1.5 h-4 w-4" /> Message seller
                  </a>
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
