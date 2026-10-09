import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only.");
}

export type AdminOverview = {
  totals: {
    buyers: number;
    sellers: number;
    products: number;
    orders: number;
    gross_cents: number;
    commission_cents: number;
    open_tickets: number;
  };
  sellers: Array<{
    shop_id: string;
    name: string;
    slug: string;
    owner_name: string | null;
    contact_name: string | null;
    whatsapp: string | null;
    email: string | null;
    province: string | null;
    products: number;
    orders: number;
    revenue_cents: number;
    created_at: string;
  }>;
  buyers: Array<{
    id: string;
    display_name: string | null;
    phone: string | null;
    city: string | null;
    orders: number;
    spend_cents: number;
    last_order_at: string | null;
    created_at: string;
  }>;
  order_series: Array<{ status: string; total_cents: number; created_at: string }>;
  recent_orders: Array<{
    id: string;
    status: string;
    total_cents: number;
    shop: string | null;
    buyer: string | null;
    created_at: string;
  }>;
};

export const getAdminOverview = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<AdminOverview> => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [profilesRes, shopsRes, productsRes, ordersRes, leadsRes] = await Promise.all([
      supabaseAdmin.from("profiles").select("id,display_name,phone,city,created_at").limit(2000),
      supabaseAdmin
        .from("shops")
        .select("id,name,slug,owner_id,contact_name,whatsapp,email,province,created_at")
        .limit(1000),
      supabaseAdmin.from("products").select("id,shop_id,is_active").limit(5000),
      supabaseAdmin
        .from("orders")
        .select("id,shop_id,buyer_id,status,total_cents,delivery_fee_cents,created_at")
        .order("created_at", { ascending: false })
        .limit(3000),
      supabaseAdmin.from("leads").select("id,type,status").limit(2000),
    ]);

    const profiles = (profilesRes.data ?? []) as any[];
    const shops = (shopsRes.data ?? []) as any[];
    const products = (productsRes.data ?? []) as any[];
    const orders = (ordersRes.data ?? []) as any[];
    const leads = (leadsRes.data ?? []) as any[];

    const profileById = new Map(profiles.map((p) => [p.id, p]));
    const shopById = new Map(shops.map((s) => [s.id, s]));
    const ownerIds = new Set(shops.map((s) => s.owner_id));

    const valid = orders.filter((o) => o.status !== "cancelled");

    const shopStats = new Map<string, { orders: number; revenue: number }>();
    const buyerStats = new Map<string, { orders: number; spend: number; last: string | null }>();
    for (const o of valid) {
      const s = shopStats.get(o.shop_id) ?? { orders: 0, revenue: 0 };
      s.orders += 1;
      s.revenue += o.total_cents || 0;
      shopStats.set(o.shop_id, s);

      const b = buyerStats.get(o.buyer_id) ?? { orders: 0, spend: 0, last: null };
      b.orders += 1;
      b.spend += o.total_cents || 0;
      if (!b.last || o.created_at > b.last) b.last = o.created_at;
      buyerStats.set(o.buyer_id, b);
    }

    const productCount = new Map<string, number>();
    for (const p of products) productCount.set(p.shop_id, (productCount.get(p.shop_id) || 0) + 1);

    const gross = valid.reduce((s, o) => s + (o.total_cents || 0), 0);
    const delivery = valid.reduce((s, o) => s + (o.delivery_fee_cents || 0), 0);
    const commission = Math.round((gross - delivery) * 0.08);

    return {
      totals: {
        buyers: profiles.filter((p) => !ownerIds.has(p.id)).length,
        sellers: shops.length,
        products: products.length,
        orders: valid.length,
        gross_cents: gross,
        commission_cents: commission,
        open_tickets: leads.filter((l) => l.type === "support" && l.status !== "resolved").length,
      },
      sellers: shops
        .map((s) => ({
          shop_id: s.id,
          name: s.name,
          slug: s.slug,
          owner_name: profileById.get(s.owner_id)?.display_name ?? null,
          contact_name: s.contact_name ?? null,
          whatsapp: s.whatsapp ?? null,
          email: s.email ?? null,
          province: s.province ?? null,
          products: productCount.get(s.id) ?? 0,
          orders: shopStats.get(s.id)?.orders ?? 0,
          revenue_cents: shopStats.get(s.id)?.revenue ?? 0,
          created_at: s.created_at,
        }))
        .sort((a, b) => b.revenue_cents - a.revenue_cents),
      buyers: profiles
        .filter((p) => !ownerIds.has(p.id))
        .map((p) => ({
          id: p.id,
          display_name: p.display_name ?? null,
          phone: p.phone ?? null,
          city: p.city ?? null,
          orders: buyerStats.get(p.id)?.orders ?? 0,
          spend_cents: buyerStats.get(p.id)?.spend ?? 0,
          last_order_at: buyerStats.get(p.id)?.last ?? null,
          created_at: p.created_at,
        }))
        .sort((a, b) => b.spend_cents - a.spend_cents),
      order_series: orders.map((o: any) => ({ status: o.status as string, total_cents: o.total_cents as number, created_at: o.created_at as string })),
      recent_orders: orders.slice(0, 25).map((o) => ({
        id: o.id,
        status: o.status,
        total_cents: o.total_cents || 0,
        shop: shopById.get(o.shop_id)?.name ?? null,
        buyer: profileById.get(o.buyer_id)?.display_name ?? null,
        created_at: o.created_at,
      })),
    };
  });

export const getMyAccess = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: admin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    const { data: shop } = await supabase.from("shops").select("id").eq("owner_id", userId).maybeSingle();
    return { isAdmin: Boolean(admin), isSeller: Boolean(shop?.id) };
  });
