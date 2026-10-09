import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Crown, Users, Store, ShoppingBag, Wallet, LifeBuoy, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { DashboardPanel } from "@/components/DashboardPanel";
import { getAdminOverview, type AdminOverview } from "@/lib/admin.functions";

export const Route = createFileRoute("/_authenticated/admin")({
  component: AdminPage,
  head: () => ({
    meta: [
      { title: "Admin console — Ndwango" },
      { name: "description", content: "Platform owner console: track every buyer, seller, order and ticket on Ndwango." },
      { property: "og:title", content: "Admin console — Ndwango" },
      { property: "og:description", content: "Platform owner console for the Ndwango marketplace." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
});

const rand = (cents: number) =>
  `R${(cents / 100).toLocaleString("en-ZA", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
const date = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("en-ZA") : "—");

function AdminPage() {
  const load = useServerFn(getAdminOverview);
  const [data, setData] = useState<AdminOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = () => {
    setLoading(true);
    load()
      .then((d) => {
        setData(d);
        setError(null);
      })
      .catch((e) => setError(e instanceof Error ? e.message : "Could not load"))
      .finally(() => setLoading(false));
  };

  useEffect(refresh, [load]);

  if (loading && !data) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-accent" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="mx-auto max-w-md px-4 py-24 text-center">
        <Crown className="mx-auto h-10 w-10 text-accent" />
        <h1 className="mt-4 font-display text-2xl">Admin console</h1>
        <p className="mt-2 text-sm text-muted-foreground">{error ?? "Unavailable"}</p>
      </div>
    );
  }

  const t = data.totals;
  const cards = [
    { icon: Users, label: "Buyers", value: t.buyers.toString() },
    { icon: Store, label: "Sellers", value: t.sellers.toString() },
    { icon: ShoppingBag, label: "Orders", value: t.orders.toString() },
    { icon: Wallet, label: "Gross sales", value: rand(t.gross_cents) },
    { icon: Crown, label: "Platform commission", value: rand(t.commission_cents) },
    { icon: LifeBuoy, label: "Open tickets", value: t.open_tickets.toString() },
  ];

  return (
    <div className="mx-auto w-full max-w-6xl px-3 py-5 sm:px-6 sm:py-8">
      <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border bg-gradient-to-br from-primary to-[oklch(0.2_0.11_265)] p-5 text-primary-foreground shadow-elegant">
        <div>
          <h1 className="font-display text-2xl sm:text-3xl">Admin console</h1>
          <p className="mt-1 text-sm text-primary-foreground/80">
            Every buyer, seller, order and ticket on Ndwango — owner only.
          </p>
        </div>
        <Button
          onClick={refresh}
          size="sm"
          variant="ghost"
          disabled={loading}
          className="shrink-0 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
        >
          {loading ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-1.5 h-4 w-4" />}
          Refresh
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Button asChild size="sm"><Link to="/admin/agents">HQ Agents board</Link></Button>
        <Button asChild size="sm" variant="outline"><Link to="/admin/manager">Talk to Manager Agent</Link></Button>
      </div>

      <div className="mb-5">
        <DashboardPanel
          title="Platform command centre"
          subtitle="Ndwango HQ · all shops"
          orders={data.order_series}
          kpis={[
            { label: "Gross sales", value: rand(t.gross_cents), hint: `${t.orders} orders` },
            { label: "Commission", value: rand(t.commission_cents), hint: "8% of sales" },
            { label: "Buyers", value: String(t.buyers), hint: `${t.sellers} sellers` },
            { label: "Open tickets", value: String(t.open_tickets), hint: "needs attention" },
          ]}
        />
      </div>

      <div className="mb-5 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {cards.map(({ icon: Icon, label, value }) => (
          <div key={label} className="rounded-xl border bg-background p-3 shadow-sm">
            <div className="flex items-center gap-1.5 text-[11px] uppercase tracking-wide text-muted-foreground">
              <Icon className="h-3.5 w-3.5 text-accent" /> {label}
            </div>
            <div className="mt-1 font-display text-lg">{value}</div>
          </div>
        ))}
      </div>

      <Tabs defaultValue="sellers">
        <TabsList className="mb-3 grid w-full grid-cols-3 sm:w-auto sm:inline-grid">
          <TabsTrigger value="sellers">Sellers</TabsTrigger>
          <TabsTrigger value="buyers">Buyers</TabsTrigger>
          <TabsTrigger value="orders">Orders</TabsTrigger>
        </TabsList>

        <TabsContent value="sellers">
          <div className="overflow-x-auto rounded-2xl border bg-background shadow-elegant">
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Contact</th>
                  <th className="px-3 py-2">Province</th>
                  <th className="px-3 py-2 text-right">Products</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Revenue</th>
                  <th className="px-3 py-2">Joined</th>
                </tr>
              </thead>
              <tbody>
                {data.sellers.map((s) => (
                  <tr key={s.shop_id} className="border-t">
                    <td className="px-3 py-2">
                      <div className="font-medium">{s.name}</div>
                      <div className="text-xs text-muted-foreground">{s.owner_name ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2 text-xs">
                      <div>{s.contact_name ?? "—"}</div>
                      <div className="text-muted-foreground">{s.whatsapp ?? s.email ?? "—"}</div>
                    </td>
                    <td className="px-3 py-2">{s.province ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{s.products}</td>
                    <td className="px-3 py-2 text-right">{s.orders}</td>
                    <td className="px-3 py-2 text-right font-medium">{rand(s.revenue_cents)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{date(s.created_at)}</td>
                  </tr>
                ))}
                {data.sellers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-3 py-8 text-center text-muted-foreground">No sellers yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="buyers">
          <div className="overflow-x-auto rounded-2xl border bg-background shadow-elegant">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Buyer</th>
                  <th className="px-3 py-2">City</th>
                  <th className="px-3 py-2">Phone</th>
                  <th className="px-3 py-2 text-right">Orders</th>
                  <th className="px-3 py-2 text-right">Spend</th>
                  <th className="px-3 py-2">Last order</th>
                </tr>
              </thead>
              <tbody>
                {data.buyers.map((b) => (
                  <tr key={b.id} className="border-t">
                    <td className="px-3 py-2 font-medium">{b.display_name ?? "Guest"}</td>
                    <td className="px-3 py-2">{b.city ?? "—"}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{b.phone ?? "—"}</td>
                    <td className="px-3 py-2 text-right">{b.orders}</td>
                    <td className="px-3 py-2 text-right font-medium">{rand(b.spend_cents)}</td>
                    <td className="px-3 py-2 text-xs text-muted-foreground">{date(b.last_order_at)}</td>
                  </tr>
                ))}
                {data.buyers.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-3 py-8 text-center text-muted-foreground">No buyers yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="orders">
          <div className="overflow-x-auto rounded-2xl border bg-background shadow-elegant">
            <table className="w-full min-w-[640px] text-sm">
              <thead className="bg-secondary/50 text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr>
                  <th className="px-3 py-2">Date</th>
                  <th className="px-3 py-2">Shop</th>
                  <th className="px-3 py-2">Buyer</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_orders.map((o) => (
                  <tr key={o.id} className="border-t">
                    <td className="px-3 py-2 text-xs text-muted-foreground">{date(o.created_at)}</td>
                    <td className="px-3 py-2">{o.shop ?? "—"}</td>
                    <td className="px-3 py-2">{o.buyer ?? "—"}</td>
                    <td className="px-3 py-2">
                      <Badge variant="secondary" className="capitalize">{o.status}</Badge>
                    </td>
                    <td className="px-3 py-2 text-right font-medium">{rand(o.total_cents)}</td>
                  </tr>
                ))}
                {data.recent_orders.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">No orders yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
