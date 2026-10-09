import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { TEAMS, agentRulesText, type AgentDef } from "./agent-teams";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Scope = "owner" | "seller";

// ---------- data gathering ----------

async function isAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  return Boolean(data);
}

async function getSellerShopId(supabase: any, userId: string): Promise<string | null> {
  const { data } = await supabase.from("shops").select("id").eq("owner_id", userId).maybeSingle();
  return data?.id ?? null;
}

async function gatherSnapshot(
  supabase: any,
  scope: Scope,
  shopId: string | null,
  days: number,
) {
  const sinceIso = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();
  const prevIso = new Date(Date.now() - 2 * days * 24 * 60 * 60 * 1000).toISOString();

  const ordersQ = () => {
    let q = supabase
      .from("orders")
      .select("id,total_cents,delivery_fee_cents,buyer_id,shop_id,shipping_city,shipping_province,status,created_at")
      .limit(2000);
    if (scope === "seller" && shopId) q = q.eq("shop_id", shopId);
    return q;
  };

  const itemsQ = (fromIso: string) => {
    let q = supabase
      .from("order_items")
      .select("title,quantity,price_cents,product_id,order:orders!inner(shop_id,created_at,status)")
      .gte("order.created_at", fromIso)
      .limit(2000);
    if (scope === "seller" && shopId) q = q.eq("order.shop_id", shopId);
    return q;
  };

  const productsQ = () => {
    let q = supabase.from("products").select("id,title,price_cents,stock,is_active,category,shop_id").limit(200);
    if (scope === "seller" && shopId) q = q.eq("shop_id", shopId);
    return q;
  };

  const supportQ = () => {
    let q = supabase
      .from("leads")
      .select("id,type,subject,interest,status,created_at,shop_id,name,email,phone,order_id")
      .gte("created_at", sinceIso)
      .order("created_at", { ascending: false })
      .limit(80);
    if (scope === "seller" && shopId) q = q.eq("shop_id", shopId);
    return q;
  };

  const [curOrdersRes, prevOrdersRes, itemsRes, productsRes, leadsRes] = await Promise.all([
    ordersQ().gte("created_at", sinceIso),
    ordersQ().gte("created_at", prevIso).lt("created_at", sinceIso),
    itemsQ(sinceIso),
    productsQ(),
    supportQ(),
  ]);

  const cur = (curOrdersRes.data ?? []) as any[];
  const prev = (prevOrdersRes.data ?? []) as any[];
  const items = (itemsRes.data ?? []) as any[];
  const products = (productsRes.data ?? []) as any[];
  const leads = (leadsRes.data ?? []) as any[];

  const sum = (rows: any[], k: string) => rows.reduce((s, r) => s + (r[k] || 0), 0);

  const cancelled = cur.filter((o) => o.status === "cancelled");
  const fulfilled = cur.filter((o) => o.status !== "cancelled");

  const grossCur = sum(fulfilled, "total_cents");
  const grossPrev = sum(prev.filter((o) => o.status !== "cancelled"), "total_cents");
  const deliveryCur = sum(fulfilled, "delivery_fee_cents");
  const refundedCents = sum(cancelled, "total_cents");
  const growthPct = grossPrev > 0 ? Math.round(((grossCur - grossPrev) / grossPrev) * 100) : null;

  const byBuyer = new Map<string, number>();
  const byCity = new Map<string, number>();
  for (const o of fulfilled) {
    byBuyer.set(o.buyer_id, (byBuyer.get(o.buyer_id) || 0) + 1);
    const city = o.shipping_city || "Unknown";
    byCity.set(city, (byCity.get(city) || 0) + 1);
  }

  const itemMap = new Map<string, { product_id: string | null; title: string; qty: number; revenue: number }>();
  for (const it of items) {
    if (it.order?.status === "cancelled") continue;
    const key = it.product_id ?? it.title;
    const c = itemMap.get(key) ?? { product_id: it.product_id ?? null, title: it.title, qty: 0, revenue: 0 };
    c.qty += it.quantity || 0;
    c.revenue += (it.price_cents || 0) * (it.quantity || 0);
    itemMap.set(key, c);
  }
  const ranked = [...itemMap.values()].sort((a, b) => b.revenue - a.revenue);
  const bestSellers = ranked.slice(0, 8);
  const slowMovers = products
    .filter((p) => p.is_active && !itemMap.has(p.id))
    .slice(0, 8)
    .map((p) => ({ title: p.title, stock: p.stock }));

  // ---- demand forecast per product (based on this period's velocity) ----
  const forecast = products
    .filter((p) => p.is_active)
    .map((p) => {
      const sold = itemMap.get(p.id)?.qty ?? 0;
      const perDay = sold / days;
      const projectedNext = Math.round(perDay * days * 10) / 10;
      const daysOfCover = perDay > 0 ? Math.round((p.stock ?? 0) / perDay) : null;
      const reorderQty = Math.max(0, Math.ceil(projectedNext - (p.stock ?? 0)));
      return {
        title: p.title,
        stock: p.stock ?? 0,
        sold_this_period: sold,
        projected_next_period: projectedNext,
        days_of_cover: daysOfCover,
        suggested_reorder_qty: reorderQty,
      };
    })
    .sort((a, b) => b.projected_next_period - a.projected_next_period)
    .slice(0, 12);

  const lowStock = products.filter((p) => p.is_active && (p.stock ?? 0) > 0 && (p.stock ?? 0) <= 3);
  const outOfStock = products.filter((p) => p.is_active && (p.stock ?? 0) === 0);
  const inactive = products.filter((p) => !p.is_active);

  const supportOpen = leads.filter((l) => l.type === "support" && l.status !== "resolved");
  const inquiryLeads = leads.filter((l) => l.type !== "support");
  const returnish = leads.filter((l) =>
    `${l.subject ?? ""} ${l.interest ?? ""}`.toLowerCase().match(/return|refund|exchange|broken|damaged|wrong/),
  );

  const merchandise = grossCur - deliveryCur;
  const platformFee = Math.round(merchandise * 0.08);

  const statusCounts: Record<string, number> = {};
  for (const o of cur) statusCounts[o.status] = (statusCounts[o.status] || 0) + 1;

  return {
    period_days: days,
    scope,
    sales: {
      gross_cents: grossCur,
      prev_period_gross_cents: grossPrev,
      growth_pct: growthPct,
      order_count: fulfilled.length,
      prev_order_count: prev.length,
      avg_order_cents: fulfilled.length ? Math.round(grossCur / fulfilled.length) : 0,
      best_sellers: bestSellers,
      slow_movers: slowMovers,
    },
    customers: {
      unique_buyers: byBuyer.size,
      repeat_buyers: [...byBuyer.values()].filter((n) => n > 1).length,
      top_cities: [...byCity.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([city, orders]) => ({ city, orders })),
    },
    finance: {
      income: {
        merchandise_cents: merchandise,
        delivery_income_cents: deliveryCur,
        gross_cents: grossCur,
      },
      expenses: {
        platform_commission_cents: scope === "seller" ? platformFee : 0,
        refunds_cancellations_cents: refundedCents,
        delivery_cost_cents: deliveryCur,
      },
      net_cents:
        scope === "seller"
          ? merchandise - platformFee
          : platformFee, // platform earns commission
      platform_commission_income_cents: scope === "owner" ? platformFee : undefined,
      commission_rate_pct: 8,
      note: "Only in-platform Ndwango orders are counted. Off-platform costs are not visible.",
    },
    operations: {
      total_products: products.length,
      active_products: products.filter((p) => p.is_active).length,
      low_stock: lowStock.map((p) => ({ title: p.title, stock: p.stock })),
      out_of_stock: outOfStock.map((p) => ({ title: p.title })),
      inactive: inactive.slice(0, 10).map((p) => ({ title: p.title })),
      pending_orders: cur.filter((o) => o.status === "pending" || o.status === "confirmed").length,
      order_status_counts: statusCounts,
      forecast,
    },
    support: {
      open_tickets: supportOpen.length,
      recent_tickets: supportOpen.slice(0, 8).map((t) => ({
        subject: t.subject,
        from: t.name,
        detail: t.interest,
        order_id: t.order_id,
        created_at: t.created_at,
      })),
      return_or_refund_requests: returnish.slice(0, 8).map((t) => ({
        subject: t.subject,
        detail: t.interest,
        status: t.status,
      })),
      inquiries: inquiryLeads.length,
      email_leads: inquiryLeads.filter((l) => !!l.email).length,
    },
  };
}

// ---------- App health (owner only) ----------

const APP_ISSUE_WORDS = /(error|crash|bug|login|log in|sign ?in|sign ?up|password|payment|pay|checkout|card|eft|not working|broken|stuck|can't|cannot)/i;

async function gatherAppHealth(supabase: any) {
  const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
  const [{ data: orders }, { data: tickets }, { data: shops }, { data: products }] = await Promise.all([
    supabase.from("orders").select("id,status,payment_method,payment_status,courier,tracking_number,delivered_at,created_at,updated_at").gte("created_at", hoursAgo(24 * 30)).limit(3000),
    supabase.from("leads").select("subject,interest,type,status,created_at").gte("created_at", hoursAgo(24 * 30)).limit(500),
    supabase.from("shops").select("name,whatsapp,phone,email,address"),
    supabase.from("products").select("title,image_url,price_cents,is_active").eq("is_active", true).limit(2000),
  ]);
  const o = (orders ?? []) as any[];
  const byMethod: Record<string, { total: number; paid: number; unpaid: number; failed: number }> = {};
  for (const r of o) {
    const m = (byMethod[r.payment_method || "unknown"] ??= { total: 0, paid: 0, unpaid: 0, failed: 0 });
    m.total++;
    if (r.payment_status === "paid") m.paid++;
    else if (r.payment_status === "failed") m.failed++;
    else m.unpaid++;
  }
  const old24 = hoursAgo(24), old48 = hoursAgo(48), old72 = hoursAgo(72);

  let signIn: any = { note: "Sign-in data unavailable" };
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = data?.users ?? [];
    const recent = users.filter((u: any) => u.created_at >= hoursAgo(24 * 30));
    signIn = {
      total_users: users.length,
      new_signups_30d: recent.length,
      unconfirmed_email: users.filter((u: any) => !u.email_confirmed_at && !u.phone_confirmed_at).length,
      signed_up_never_signed_in: users.filter((u: any) => !u.last_sign_in_at).length,
      no_sign_in_14d: users.filter((u: any) => u.last_sign_in_at && u.last_sign_in_at < hoursAgo(24 * 14)).length,
      providers: users.reduce((acc: Record<string, number>, u: any) => {
        const p = u.app_metadata?.provider ?? "email";
        acc[p] = (acc[p] ?? 0) + 1;
        return acc;
      }, {}),
    };
  } catch {}

  const appTickets = ((tickets ?? []) as any[]).filter((t) => APP_ISSUE_WORDS.test(`${t.subject ?? ""} ${t.interest ?? ""}`));

  return {
    payments: {
      by_method: byMethod,
      unpaid_over_24h: o.filter((r) => r.payment_status !== "paid" && r.status !== "cancelled" && r.created_at < old24).length,
      failed: o.filter((r) => r.payment_status === "failed").length,
      delivered_but_unpaid: o.filter((r) => r.status === "delivered" && r.payment_status !== "paid").length,
    },
    sign_in: signIn,
    workflow: {
      pending_over_48h: o.filter((r) => r.status === "pending" && r.created_at < old48).length,
      confirmed_not_shipped_72h: o.filter((r) => r.status === "confirmed" && r.updated_at < old72).length,
      shipped_without_tracking: o.filter((r) => r.status === "shipped" && !r.tracking_number).length,
      delivered_without_date: o.filter((r) => r.status === "delivered" && !r.delivered_at).length,
      shops_missing_contact: ((shops ?? []) as any[]).filter((s) => !s.whatsapp && !s.phone && !s.email).map((s) => s.name).slice(0, 10),
      products_missing_image: ((products ?? []) as any[]).filter((p) => !p.image_url).length,
      products_zero_price: ((products ?? []) as any[]).filter((p) => !p.price_cents).length,
    },
    app_complaints: appTickets.slice(0, 10).map((t) => ({ subject: t.subject, detail: String(t.interest ?? "").slice(0, 200), status: t.status, at: t.created_at })),
  };
}

// ---------- AI helpers ----------

async function callAI(system: string, user: string): Promise<string> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });
  if (!res.ok) {
    const t = await res.text();
    if (res.status === 429) throw new Error("AI is busy — try again shortly.");
    if (res.status === 402) throw new Error("AI credits exhausted.");
    throw new Error(`Gateway ${res.status}: ${t.slice(0, 200)}`);
  }
  const json = await res.json();
  return (json.choices?.[0]?.message?.content ?? "").trim();
}

const scopeLine = (scope: Scope) =>
  scope === "owner"
    ? "You are advising the PLATFORM OWNER of Ndwango — a South African afro-luxury marketplace. Data is platform-wide and strictly confidential."
    : "You are advising ONE seller on Ndwango. Data is only their own shop — you can never see other sellers.";

const commonRules =
  "Use South African context (Rand, provinces, WhatsApp). Never invent numbers — use only the JSON provided. Be concise: short bullets, plain English, action-oriented. Format as markdown. Max ~200 words.";

const AGENT_BRIEFS: Record<string, { rules: string; data: (s: any) => any }> = {
  // ---- Seller (Khaya) team ----
  product: {
    rules: "Review the listings: flag weak/inactive products, pricing outliers vs best sellers, and suggest 2 new product or bundle ideas.",
    data: (s) => ({ sales: s.sales, operations: s.operations }),
  },
  sales: {
    rules: "Report revenue, orders, average order value, growth vs previous period and best sellers. Suggest 2 moves to lift sales.",
    data: (s) => ({ sales: s.sales, customers: s.customers }),
  },
  inventory: {
    rules: "Call out low/out-of-stock items, forecast next period demand (days_of_cover) and give a reorder table: product, stock, projected demand, reorder qty.",
    data: (s) => s.operations,
  },
  marketing: {
    rules: "Produce: META – 2 posts with captions + hashtags; TIKTOK – 1 video concept (hook, 3 shots, caption); EMAIL – subject + 3-line body + CTA. Base it on what actually sells.",
    data: (s) => ({ sales: s.sales, customers: s.customers, leads: { inquiries: s.support.inquiries, email_leads: s.support.email_leads } }),
  },
  customer: {
    rules: "List urgent complaints and what to reply, orders buyers must be updated about, return/refund requests with approve/replace/investigate. Write ONE ready-to-send WhatsApp reply.",
    data: (s) => ({ support: s.support, customers: s.customers, pending_orders: s.operations.pending_orders, order_status_counts: s.operations.order_status_counts }),
  },
  finance: {
    rules: "Give an Income / Expenses / Net mini-table (merchandise, delivery income, commission, refunds), growth vs previous period, and best sellers by revenue. Flag risks.",
    data: (s) => ({ finance: s.finance, sales: s.sales }),
  },
  // ---- Owner (HQ) team ----
  platform_health: {
    rules: `You are the app's technical watchdog. Report ONLY problems with the app itself, grouped under these headings:
### Payments — unpaid/failed payments, orders stuck unpaid for over 24h, payment methods that never get paid (sign payment flow may be down).
### Sign-in — accounts that never confirmed their email, failed/abandoned sign-ups, users who signed up but never did anything, complaints mentioning login.
### Workflow errors — orders stuck in pending/confirmed too long, shipped orders with no tracking, delivered without delivered date, shops missing contact details, products with no image/price.
### Complaints about the app — support tickets mentioning errors, crashes, checkout, payment or login.
For each problem give: what's wrong, how many are affected, severity (High/Medium/Low) and the fix. Start with an overall status: 🟢 All good / 🟡 Needs attention / 🔴 Something is down. If a section has no issues, say "No issues found".`,
    data: (s) => s.app_health ?? { note: "No app health data available" },
  },
  growth: {
    rules: "Spot growth: rising cities, new vs repeat buyers, category trends, seller recruitment targets. Max 3 opportunities.",
    data: (s) => s,
  },
  trust_safety: {
    rules: "Review complaints, refund/return patterns and suspicious activity. Flag risky orders or sellers and recommend actions (warn, investigate, pause). Never expose personal data beyond what is needed.",
    data: (s) => ({ support: s.support, order_status_counts: s.operations.order_status_counts }),
  },
};

const SELLER_BRIEFS: Record<string, string> = {
  product: "For each product with a weak/missing description, write a better one (2-3 lines). Flag products with no image. Suggest a category for uncategorised items. List any price ideas under 'Needs your approval'.",
  sales: "Report revenue, orders, average order value and growth. List top 3 bestsellers and the slowest products (low/no sales). Answer: what should the seller focus on? Any discount ideas go under 'Needs your approval'.",
  inventory: "List low (≤5) and out-of-stock items as ALERTS, with days of cover and a suggested reorder qty. Make clear the seller places any order themselves.",
  marketing: "Produce DRAFTS only: META – 2 posts with captions + hashtags; TIKTOK – 1 video concept; EMAIL – subject + 3-line body + CTA; 1 promotion idea. Label everything 'Draft — confirm before posting'.",
  customer: "Draft replies to FAQs and order questions (polite, no promises, no refunds). List difficult complaints/returns under 'Escalated to Khaya Manager'.",
  finance: "Give a mini-table: revenue, delivery income, platform commission (8%), fees, expected payout, refunds. Flag risks. Read-only — no money actions.",
};

async function runAgent(scope: Scope, agent: AgentDef, snap: any) {
  const brief = AGENT_BRIEFS[agent.key];
  const rules = scope === "seller" && SELLER_BRIEFS[agent.key] ? SELLER_BRIEFS[agent.key] : brief.rules;
  return callAI(
    `${scopeLine(scope)} You are the ${agent.label.toUpperCase()} agent of the ${TEAMS[scope].name}. Mission: ${agent.mission}${agentRulesText(agent)}\n${rules}\nStay strictly inside your mission. You are advisory only — you cannot take actions in the store. Convert cents to Rand (R). ${commonRules}`,
    `Snapshot (last ${snap.period_days} days):\n${JSON.stringify(brief.data(snap))}\n\nWrite your ${agent.label} report.`,
  );
}

async function leaderAgent(scope: Scope, snap: any, sections: Record<string, string>) {
  const team = TEAMS[scope];
  const sellerExtra = scope === "seller"
    ? `\n## 🚨 Emergencies\n- Anything urgent (out of stock bestsellers, escalated complaints, unpaid/stuck orders). Write "None" if nothing.\n\n## Needs your approval\n- Collect every item the agents marked as needing approval.\n`
    : "";
  const system = `${scopeLine(scope)} You are the ${team.leader.label} of the ${team.name}. Mission: ${team.leader.mission}${agentRulesText(team.leader)}
You received reports from: ${team.agents.map((a) => a.label).join(", ")}. Compile the weekly briefing.

Format EXACTLY as markdown:
${sellerExtra}
## This week at a glance
(2-3 sentences, headline numbers with growth %)

## Money
- Income, expenses, net — one line each in Rand

## Top wins
- 3 bullets max

## Top risks
- 3 bullets max, most urgent first

## Tasks this week (priority order)
1. …
2. …
3. …
4. …
5. …

Sign off as "${team.leader.label}, King Kotini 👑". Under ~380 words. Never invent numbers.`;

  const user = `Snapshot headlines:\n${JSON.stringify({
    period_days: snap.period_days,
    sales: { gross_cents: snap.sales.gross_cents, growth_pct: snap.sales.growth_pct, orders: snap.sales.order_count },
    finance: snap.finance,
  })}\n\nTeam reports:\n\n${team.agents.map((a) => `### ${a.label}\n${sections[a.key]}`).join("\n\n")}`;

  return callAI(system, user);
}

// ---------- server functions ----------

async function resolve(supabase: any, userId: string): Promise<{ scope: Scope; shopId: string | null }> {
  if (await isAdmin(supabase, userId)) return { scope: "owner", shopId: null };
  const shopId = await getSellerShopId(supabase, userId);
  if (!shopId) throw new Error("Open a shop first to run King Kotini Council.");
  return { scope: "seller", shopId };
}

export const runCouncilReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ days: z.number().int().min(1).max(90).optional() }).parse(i ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { scope, shopId } = await resolve(supabase, userId);
    const days = data.days ?? 7;

    const snapshot = await gatherSnapshot(supabase, scope, shopId, days);

    if (scope === "owner") (snapshot as any).app_health = await gatherAppHealth(supabase);
    const agents = TEAMS[scope].agents;
    const outputs = await Promise.all(agents.map((a) => runAgent(scope, a, snapshot)));
    const sections: Record<string, string> = {};
    agents.forEach((a, i) => (sections[a.key] = outputs[i]));
    const summary = await leaderAgent(scope, snapshot, sections);

    const title =
      scope === "owner"
        ? `Ndwango Platform — Council briefing (last ${days} days)`
        : `Your Khaya — Council briefing (last ${days} days)`;

    const { data: inserted, error } = await supabase
      .from("agent_reports")
      .insert({
        user_id: userId,
        scope,
        shop_id: shopId,
        period_days: days,
        title,
        summary_md: summary,
        sections,
        snapshot,
      })
      .select("id,title,summary_md,sections,snapshot,period_days,created_at,scope")
      .maybeSingle();

    if (error) throw new Error(error.message);
    return inserted;
  });

export const listCouncilReports = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("agent_reports")
      .select("id,title,summary_md,sections,period_days,created_at,scope")
      .eq("user_id", userId)
      .order("created_at", { ascending: false })
      .limit(20);
    return (data ?? []) as Array<{
      id: string;
      title: string;
      summary_md: string;
      sections: Record<string, string>;
      period_days: number;
      created_at: string;
      scope: Scope;
    }>;
  });

export const deleteCouncilReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: unknown) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    await supabase.from("agent_reports").delete().eq("id", data.id).eq("user_id", userId);
    return { ok: true };
  });
