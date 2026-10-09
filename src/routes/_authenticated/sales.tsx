import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Header } from "@/components/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";
import { toast } from "sonner";
import { DashboardPanel } from "@/components/DashboardPanel";
import { Loader2, Package, TrendingUp, Truck, Store } from "lucide-react";

export const Route = createFileRoute("/_authenticated/sales")({
  component: SalesPage,
});

const FLOW: Record<string, { next: string; label: string }[]> = {
  pending: [
    { next: "confirmed", label: "Confirm order" },
    { next: "cancelled", label: "Cancel" },
  ],
  confirmed: [
    { next: "shipped", label: "Mark shipped" },
    { next: "cancelled", label: "Cancel" },
  ],
  shipped: [{ next: "delivered", label: "Mark delivered" }],
  delivered: [],
  cancelled: [],
};

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
  items: { id: string; title: string; quantity: number; price_cents: number; image_url: string | null }[];
};

function SalesPage() {
  const { user } = Route.useRouteContext();
  const [shopId, setShopId] = useState<string | null>(null);
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("all");

  const load = async () => {
    const { data: shop } = await supabase
      .from("shops")
      .select("id")
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!shop) {
      setShopId(null);
      setLoading(false);
      return;
    }
    setShopId(shop.id);
    const { data } = await supabase
      .from("orders")
      .select(
        "id,created_at,status,total_cents,delivery_fee_cents,currency,payment_method,payment_status,courier,tracking_number,shipping_name,shipping_phone,shipping_address,shipping_city,shipping_province,items:order_items(id,title,quantity,price_cents,image_url)",
      )
      .eq("shop_id", shop.id)
      .order("created_at", { ascending: false });
    setOrders((data as unknown as Order[] | null) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user.id]);

  const stats = useMemo(() => {
    const paidish = orders.filter((o) => o.status !== "cancelled");
    const revenue = paidish.reduce((s, o) => s + o.total_cents, 0);
    const units = paidish.reduce(
      (s, o) => s + o.items.reduce((a, i) => a + i.quantity, 0),
      0,
    );
    const pending = orders.filter((o) => o.status === "pending").length;
    return { revenue, units, pending, count: paidish.length };
  }, [orders]);

  const visible = filter === "all" ? orders : orders.filter((o) => o.status === filter);

  const setStatus = async (order: Order, status: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ status: status as "pending" | "confirmed" | "shipped" | "delivered" | "cancelled" })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success(`Order marked ${status}`);
    load();
  };

  const saveTracking = async (order: Order, courier: string, tracking: string) => {
    const { error } = await supabase
      .from("orders")
      .update({ courier: courier || null, tracking_number: tracking || null })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    toast.success("Tracking saved");
    load();
  };

  const markPaid = async (order: Order) => {
    const { error } = await supabase
      .from("orders")
      .update({ payment_status: order.payment_status === "paid" ? "unpaid" : "paid" })
      .eq("id", order.id);
    if (error) return toast.error(error.message);
    load();
  };

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="flex justify-center py-24">
          <Loader2 className="h-8 w-8 animate-spin text-accent" />
        </div>
      </div>
    );
  }

  if (!shopId) {
    return (
      <div className="min-h-screen">
        <Header />
        <div className="mx-auto max-w-2xl px-4 py-20 text-center">
          <Store className="mx-auto mb-4 h-10 w-10 text-muted-foreground" />
          <h1 className="font-display text-2xl">Create your Khaya first</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Set up your shop and add products, then your orders will show up here.
          </p>
          <Button asChild className="mt-4 rounded-full bg-accent text-accent-foreground hover:bg-accent/90">
            <Link to="/seller">Open seller dashboard</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:py-8">
        <h1 className="mb-1 font-display text-3xl font-semibold sm:text-4xl">Sales & orders</h1>
        <p className="mb-6 text-sm text-muted-foreground">
          Every order for your Khaya — confirm, ship, track and get paid.
        </p>

        <div className="mb-6">
          <DashboardPanel
            title="Your Khaya dashboard"
            subtitle="Sales · orders · performance"
            orders={orders}
            kpis={[
              { label: "Revenue", value: formatPrice(stats.revenue), hint: `${stats.count} orders` },
              { label: "Units sold", value: String(stats.units) },
              { label: "Awaiting action", value: String(stats.pending), hint: "pending orders" },
              { label: "Avg order", value: formatPrice(stats.count ? Math.round(stats.revenue / stats.count) : 0) },
            ]}
          />
        </div>
        <div className="mb-6 hidden">
          <Stat icon={<TrendingUp className="h-4 w-4" />} label="Revenue" value={formatPrice(stats.revenue)} />
          <Stat icon={<Package className="h-4 w-4" />} label="Orders" value={String(stats.count)} />
          <Stat icon={<Truck className="h-4 w-4" />} label="Units sold" value={String(stats.units)} />
          <Stat icon={<Package className="h-4 w-4" />} label="Awaiting action" value={String(stats.pending)} />
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {["all", "pending", "confirmed", "shipped", "delivered", "cancelled"].map((s) => (
            <Button
              key={s}
              size="sm"
              variant={filter === s ? "default" : "outline"}
              className={`rounded-full capitalize ${filter === s ? "bg-accent text-accent-foreground hover:bg-accent/90" : ""}`}
              onClick={() => setFilter(s)}
            >
              {s}
            </Button>
          ))}
        </div>

        {visible.length === 0 ? (
          <div className="rounded-2xl border border-dashed py-20 text-center text-muted-foreground">
            No orders here yet.
          </div>
        ) : (
          <div className="space-y-4">
            {visible.map((o) => (
              <OrderCard
                key={o.id}
                order={o}
                onStatus={setStatus}
                onTracking={saveTracking}
                onPaid={markPaid}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs uppercase tracking-[0.15em] text-muted-foreground">
        {icon} {label}
      </div>
      <p className="mt-2 font-display text-2xl font-semibold text-accent">{value}</p>
    </div>
  );
}

function OrderCard({
  order,
  onStatus,
  onTracking,
  onPaid,
}: {
  order: Order;
  onStatus: (o: Order, s: string) => void;
  onTracking: (o: Order, courier: string, tracking: string) => void;
  onPaid: (o: Order) => void;
}) {
  const [courier, setCourier] = useState(order.courier ?? "");
  const [tracking, setTracking] = useState(order.tracking_number ?? "");

  return (
    <div className="rounded-2xl border bg-card p-5">
      <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-muted-foreground">
            #{order.id.slice(0, 8)} · {new Date(order.created_at).toLocaleString()}
          </p>
          <p className="font-display text-xl font-semibold text-accent">
            {formatPrice(order.total_cents, order.currency)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={order.status === "cancelled" ? "destructive" : "secondary"} className="capitalize">
            {order.status}
          </Badge>
          <Badge
            variant={order.payment_status === "paid" ? "default" : "outline"}
            className="cursor-pointer capitalize"
            onClick={() => onPaid(order)}
          >
            {order.payment_status}
          </Badge>
        </div>
      </div>

      <div className="space-y-2">
        {order.items.map((it) => (
          <div key={it.id} className="flex items-center gap-3 text-sm">
            <div className="h-10 w-10 shrink-0 overflow-hidden rounded bg-muted">
              {it.image_url && <img src={it.image_url} alt="" className="h-full w-full object-cover" />}
            </div>
            <span className="min-w-0 flex-1 truncate">{it.title} × {it.quantity}</span>
            <span className="text-muted-foreground">
              {formatPrice(it.price_cents * it.quantity, order.currency)}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-3 rounded-xl bg-background/60 p-3 text-sm text-muted-foreground">
        <span className="font-medium text-foreground">{order.shipping_name}</span> · {order.shipping_phone}
        <br />
        {order.shipping_address}, {order.shipping_city}, {order.shipping_province}
        <br />
        Delivery fee {formatPrice(order.delivery_fee_cents, order.currency)} ·{" "}
        {order.payment_method === "cod" ? "Cash on delivery" : order.payment_method.toUpperCase()}
      </div>

      {order.status !== "cancelled" && order.status !== "delivered" && (
        <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <div>
            <Label className="text-xs">Courier</Label>
            <Input value={courier} onChange={(e) => setCourier(e.target.value)} placeholder="e.g. Paxi" />
          </div>
          <div>
            <Label className="text-xs">Waybill / tracking no.</Label>
            <Input value={tracking} onChange={(e) => setTracking(e.target.value)} />
          </div>
          <Button
            variant="outline"
            className="self-end"
            onClick={() => onTracking(order, courier.trim(), tracking.trim())}
          >
            Save
          </Button>
        </div>
      )}

      <div className="mt-3 flex flex-wrap gap-2">
        {(FLOW[order.status] ?? []).map((a) => (
          <Button
            key={a.next}
            size="sm"
            variant={a.next === "cancelled" ? "outline" : "default"}
            className={a.next === "cancelled" ? "text-destructive" : "bg-accent text-accent-foreground hover:bg-accent/90"}
            onClick={() => onStatus(order, a.next)}
          >
            {a.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
