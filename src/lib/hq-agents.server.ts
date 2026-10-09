// Ndwango HQ autonomous agents — deterministic checks, owner-only. Server-only.
// Guardrails: agents never delete data, never move money, never ban, never send messages or spend.
import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const HQ_AGENTS = ["platform_health", "finance", "trust_safety", "growth", "marketing"] as const;
export type HqAgent = (typeof HQ_AGENTS)[number] | "manager";
type Issue = { level: "p1" | "p2" | "p3"; text: string };
type Result = { status: "green" | "yellow" | "red"; issues: Issue[]; actions: string[]; metrics: Record<string, any> };

const COMMISSION = 0.08;
const hoursAgo = (h: number) => new Date(Date.now() - h * 3600_000).toISOString();
const daysAgo = (d: number) => hoursAgo(d * 24);
const R = (c: number) => `R${(c / 100).toLocaleString("en-ZA", { maximumFractionDigits: 0 })}`;
const statusOf = (issues: Issue[]): Result["status"] =>
  issues.some((i) => i.level === "p1") ? "red" : issues.length ? "yellow" : "green";

export async function log(agent: HqAgent, action: string, status = "info", details?: any) {
  await supabaseAdmin.from("agent_logs").insert({ agent_name: agent, action, status, details: details ?? null });
}

async function loadData() {
  const [orders, shops, products, profiles, leads, reviews, carts, expenses, items] = await Promise.all([
    supabaseAdmin.from("orders").select("id,shop_id,buyer_id,status,total_cents,delivery_fee_cents,payment_status,payment_method,tracking_number,delivered_at,created_at,updated_at").gte("created_at", daysAgo(60)).limit(5000),
    supabaseAdmin.from("shops").select("id,name,owner_id,whatsapp,phone,email,address,id_number,created_at").limit(2000),
    supabaseAdmin.from("products").select("id,shop_id,title,description,price_cents,stock,image_url,is_active,created_at").limit(5000),
    supabaseAdmin.from("profiles").select("id,phone,created_at").limit(5000),
    supabaseAdmin.from("leads").select("id,type,status,subject,interest,shop_id,created_at").gte("created_at", daysAgo(30)).limit(2000),
    supabaseAdmin.from("reviews").select("id,product_id,shop_id,buyer_id,rating,created_at").gte("created_at", daysAgo(30)).limit(2000),
    supabaseAdmin.from("cart_items").select("user_id,product_id,quantity,created_at").limit(5000),
    supabaseAdmin.from("expenses").select("amount_cents,spent_on,category").gte("spent_on", daysAgo(30).slice(0, 10)),
    supabaseAdmin.from("order_items").select("order_id,product_id,title,quantity,price_cents").limit(10000),
  ]);
  const errors = [orders, shops, products, profiles, leads, reviews, carts, expenses, items].filter((r) => r.error).map((r) => r.error!.message);
  return {
    errors,
    orders: (orders.data ?? []) as any[], shops: (shops.data ?? []) as any[], products: (products.data ?? []) as any[],
    profiles: (profiles.data ?? []) as any[], leads: (leads.data ?? []) as any[], reviews: (reviews.data ?? []) as any[],
    carts: (carts.data ?? []) as any[], expenses: (expenses.data ?? []) as any[], items: (items.data ?? []) as any[],
  };
}
type Data = Awaited<ReturnType<typeof loadData>>;

// ---------- Sentry (real app errors) ----------
async function sentryIssues(): Promise<{ connected: boolean; top: { title: string; count: number; users: number; level: string }[] }> {
  const token = process.env.SENTRY_AUTH_TOKEN;
  if (!token) return { connected: false, top: [] };
  try {
    const r = await fetch("https://de.sentry.io/api/0/organizations/ndwango/issues/?query=is:unresolved&statsPeriod=24h&sort=freq&limit=10", { headers: { Authorization: `Bearer ${token}` } });
    if (!r.ok) { console.error(`Sentry ${r.status}: ${await r.text()}`); return { connected: false, top: [] }; }
    const rows = (await r.json()) as any[];
    return { connected: true, top: rows.map((x) => ({ title: String(x.title), count: Number(x.count), users: Number(x.userCount), level: String(x.level) })) };
  } catch (e) { console.error(e); return { connected: false, top: [] }; }
}

// ---------- Platform Health ----------
async function platformHealth(d: Data, siteUrl?: string): Promise<Result> {
  const issues: Issue[] = [];
  const actions: string[] = [];
  if (d.errors.length) issues.push({ level: "p1", text: `Database read errors: ${d.errors.length} table(s) failed to load` });

  // Page uptime + speed (retry up to 3 times, never destructive)
  const pages: any[] = [];
  if (siteUrl) {
    for (const path of ["/", "/auth"]) {
      let ok = false, ms = 0, code = 0, attempts = 0;
      while (!ok && attempts < 3) {
        attempts++;
        const t = Date.now();
        try { const r = await fetch(siteUrl + path, { redirect: "follow" }); code = r.status; ok = r.ok; } catch { code = 0; }
        ms = Date.now() - t;
      }
      pages.push({ path, code, ms, attempts });
      if (attempts > 1) actions.push(`Retried ${path} ${attempts - 1}x`);
      if (!ok) issues.push({ level: "p1", text: `Page ${path} is down (status ${code || "no response"}) after 3 attempts` });
      else if (ms > 3000) issues.push({ level: "p2", text: `Page ${path} is slow (${(ms / 1000).toFixed(1)}s)` });
    }
  }

  // Sign-in
  let signIn: any = {};
  try {
    const { data } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const users = (data?.users ?? []) as any[];
    const recent = users.filter((u) => u.created_at >= daysAgo(7));
    const unconfirmed = recent.filter((u) => !u.email_confirmed_at).length;
    signIn = { signups_7d: recent.length, unconfirmed_7d: unconfirmed };
    if (recent.length >= 4 && unconfirmed / recent.length > 0.5) issues.push({ level: "p1", text: `Sign-in problem: ${unconfirmed}/${recent.length} new users never confirmed their email` });
  } catch { issues.push({ level: "p2", text: "Could not check sign-ins" }); }

  // Workflows
  const o = d.orders;
  const stuckPending = o.filter((x) => x.status === "pending" && x.created_at < hoursAgo(48)).length;
  const stuckShip = o.filter((x) => x.status === "confirmed" && x.updated_at < hoursAgo(72)).length;
  const noTracking = o.filter((x) => x.status === "shipped" && !x.tracking_number).length;
  const failedPay = o.filter((x) => x.payment_status === "failed" && x.created_at >= hoursAgo(24)).length;
  const onboarding = d.shops.filter((s) => !s.whatsapp && !s.phone).length;
  if (failedPay >= 3) issues.push({ level: "p1", text: `${failedPay} failed payments in the last 24h` });
  else if (failedPay) issues.push({ level: "p2", text: `${failedPay} failed payment(s) in the last 24h` });
  if (stuckPending) issues.push({ level: stuckPending > 5 ? "p1" : "p2", text: `Checkout workflow: ${stuckPending} order(s) pending over 48h` });
  if (stuckShip) issues.push({ level: "p2", text: `Fulfilment workflow: ${stuckShip} confirmed order(s) not shipped in 72h` });
  if (noTracking) issues.push({ level: "p3", text: `${noTracking} shipped order(s) have no tracking number` });
  if (onboarding) issues.push({ level: "p3", text: `Onboarding: ${onboarding} shop(s) missing contact numbers` });
  const appComplaints = d.leads.filter((l) => l.type === "support" && !l.shop_id && l.status !== "resolved").length;
  if (appComplaints) issues.push({ level: "p2", text: `${appComplaints} open complaint(s) about the app itself` });

  const sentry = await sentryIssues();
  if (sentry.connected) {
    for (const i of sentry.top.slice(0, 5)) issues.push({ level: i.users >= 10 || i.level === "fatal" ? "p1" : "p2", text: `App error (Sentry): ${i.title} — ${i.count} times, ${i.users} users` });
    actions.push(`Checked Sentry: ${sentry.top.length} unresolved errors in last 24h`);
  }
  return { status: statusOf(issues), issues, actions, metrics: { sentry_errors_24h: sentry.connected ? sentry.top.length : "Sentry key not added yet", pages, signIn, stuckPending, stuckShip, noTracking, failedPay, note: "Payment gateway not connected yet — payment checks use order records." } };
}

// ---------- Finance ----------
function finance(d: Data): Result {
  const issues: Issue[] = [];
  const valid = d.orders.filter((o) => o.status !== "cancelled");
  const byDay = new Map<string, { gmv: number; del: number }>();
  for (const o of valid) {
    const k = o.created_at.slice(0, 10);
    const v = byDay.get(k) ?? { gmv: 0, del: 0 };
    v.gmv += o.total_cents || 0; v.del += o.delivery_fee_cents || 0; byDay.set(k, v);
  }
  const last30 = valid.filter((o) => o.created_at >= daysAgo(30));
  const gmv = last30.reduce((s, o) => s + (o.total_cents || 0), 0);
  const delivery = last30.reduce((s, o) => s + (o.delivery_fee_cents || 0), 0);
  const commission = Math.round((gmv - delivery) * COMMISSION);
  const opex = d.expenses.reduce((s, e) => s + (e.amount_cents || 0), 0);
  const payouts = gmv - commission;
  const profit = commission - opex;

  // Double-check: recompute commission from order items
  const itemTotal = d.items.filter((i) => last30.some((o) => o.id === i.order_id)).reduce((s, i) => s + i.price_cents * i.quantity, 0);
  const check = Math.round(itemTotal * COMMISSION);
  if (itemTotal && Math.abs(check - commission) > Math.max(100, commission * 0.02)) issues.push({ level: "p1", text: `Commission mismatch: orders say ${R(commission)}, items say ${R(check)}` });

  // Profit < 0 for 3 days in a row (daily opex spread over 30 days)
  const dailyOpex = opex / 30;
  let streak = 0;
  for (let i = 0; i < 3; i++) {
    const k = daysAgo(i).slice(0, 10);
    const v = byDay.get(k) ?? { gmv: 0, del: 0 };
    if ((v.gmv - v.del) * COMMISSION - dailyOpex < 0) streak++;
  }
  if (opex > 0 && streak === 3) issues.push({ level: "p1", text: "URGENT: Ndwango lost money 3 days in a row" });
  if (profit < 0) issues.push({ level: "p2", text: `30-day profit is negative: ${R(profit)}` });
  const unpaidDelivered = valid.filter((o) => o.status === "delivered" && o.payment_status !== "paid").length;
  if (unpaidDelivered) issues.push({ level: "p2", text: `${unpaidDelivered} delivered order(s) not marked paid — seller payouts may be wrong` });
  if (!opex) issues.push({ level: "p3", text: "No operating costs recorded — add expenses so profit is real" });

  const best = new Map<string, number>();
  for (const i of d.items) best.set(i.title, (best.get(i.title) ?? 0) + i.quantity);
  const top = [...best.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([t, q]) => `${t} (${q})`);
  return { status: statusOf(issues), issues, actions: ["Reconciled commission against order items"], metrics: { gmv_30d: gmv, delivery_30d: delivery, commission_30d: commission, payouts_30d: payouts, opex_30d: opex, profit_30d: profit, top_products: top, paystack: "not connected" } };
}

// ---------- Trust & Safety ----------
async function trustSafety(d: Data): Promise<Result> {
  const flags: any[] = [];
  const flag = (subject_type: string, subject_id: string | null, key: string, reason: string, risk: string, evidence: any) =>
    flags.push({ subject_type, subject_id, dedupe_key: key, reason, risk, evidence });

  const shopHasOrders = new Set(d.orders.map((o) => o.shop_id));
  for (const p of d.products) {
    const text = `${p.title} ${p.description ?? ""}`.toLowerCase();
    if (/\b(replica|fake|counterfeit|1:1|aaa grade|knock ?off)\b/.test(text)) flag("product", p.id, `fake:${p.id}`, "Listing text suggests a fake/replica product", "high", { title: p.title });
    const shop = d.shops.find((s) => s.id === p.shop_id);
    if (shop && shop.created_at >= daysAgo(7) && p.price_cents >= 500000 && !shop.id_number && !shopHasOrders.has(shop.id))
      flag("shop", shop.id, `newhigh:${shop.id}`, "New unverified shop listing high-value products (R5,000+)", "medium", { shop: shop.name, product: p.title, price: p.price_cents });
  }
  const idMap = new Map<string, any[]>();
  for (const s of d.shops) if (s.id_number) idMap.set(s.id_number, [...(idMap.get(s.id_number) ?? []), s]);
  for (const [, list] of idMap) if (list.length > 1) flag("shop", list[0].id, `dupid:${list.map((s) => s.id).sort().join(",")}`, "Several shops use the same ID number", "high", { shops: list.map((s) => s.name) });
  const phoneMap = new Map<string, number>();
  for (const p of d.profiles) if (p.phone) phoneMap.set(p.phone, (phoneMap.get(p.phone) ?? 0) + 1);
  for (const [ph, n] of phoneMap) if (n > 2) flag("account", null, `dupphone:${ph}`, `${n} accounts share one phone number`, "medium", { accounts: n });

  const byBuyer = new Map<string, any[]>();
  for (const o of d.orders.filter((o) => o.created_at >= hoursAgo(24))) byBuyer.set(o.buyer_id, [...(byBuyer.get(o.buyer_id) ?? []), o]);
  for (const [b, list] of byBuyer) {
    const failed = list.filter((o) => o.payment_status === "failed").length;
    if (failed >= 3) flag("buyer", b, `failpay:${b}:${daysAgo(0).slice(0, 10)}`, `${failed} failed payments in 24h`, "high", { orders: list.length, failed });
    else if (list.length >= 6) flag("buyer", b, `rapid:${b}:${daysAgo(0).slice(0, 10)}`, `${list.length} orders in 24h (rapid ordering)`, "low", { orders: list.length });
  }
  for (const r of d.reviews.filter((r) => r.rating < 2)) flag("review", r.id, `badrev:${r.id}`, "Very low rating (under 2 stars)", "low", { product_id: r.product_id, rating: r.rating });
  const complaintsByShop = new Map<string, number>();
  for (const l of d.leads.filter((l) => l.type === "support" && l.shop_id)) complaintsByShop.set(l.shop_id, (complaintsByShop.get(l.shop_id) ?? 0) + 1);
  for (const [s, n] of complaintsByShop) if (n >= 3) flag("shop", s, `complaints:${s}`, `${n} customer complaints in 30 days`, n >= 6 ? "high" : "medium", { complaints: n });

  let created = 0;
  if (flags.length) {
    const { data } = await supabaseAdmin.from("moderation_queue").upsert(flags, { onConflict: "dedupe_key", ignoreDuplicates: true }).select("id");
    created = data?.length ?? 0;
  }
  const { data: open } = await supabaseAdmin.from("moderation_queue").select("risk").eq("status", "open");
  const openList = (open ?? []) as any[];
  const high = openList.filter((f) => f.risk === "high").length;
  const issues: Issue[] = [];
  if (high) issues.push({ level: "p1", text: `${high} high-risk case(s) need your review` });
  const med = openList.filter((f) => f.risk === "medium").length;
  if (med) issues.push({ level: "p2", text: `${med} medium-risk case(s) in the moderation queue` });
  return { status: statusOf(issues), issues, actions: created ? [`Flagged ${created} new case(s) — no one was banned`] : [], metrics: { open: openList.length, high, medium: med, new_flags: created } };
}

// ---------- Growth ----------
function growth(d: Data): Result {
  const issues: Issue[] = [];
  const ownerIds = new Set(d.shops.map((s) => s.owner_id));
  const buyers = d.profiles.filter((p) => !ownerIds.has(p.id));
  const newBuyers7 = buyers.filter((p) => p.created_at >= daysAgo(7)).length;
  const newBuyersPrev = buyers.filter((p) => p.created_at >= daysAgo(14) && p.created_at < daysAgo(7)).length;
  const newSellers7 = d.shops.filter((s) => s.created_at >= daysAgo(7)).length;
  const withProducts = new Set(d.products.map((p) => p.shop_id));
  const inactiveSellers = d.shops.filter((s) => !withProducts.has(s.id)).length;
  const activation = d.shops.length ? Math.round(((d.shops.length - inactiveSellers) / d.shops.length) * 100) : 0;
  const cartUsers = new Set(d.carts.filter((c) => c.created_at < hoursAgo(24)).map((c) => c.user_id));
  const buyersOrdered = new Map<string, number>();
  for (const o of d.orders.filter((o) => o.status !== "cancelled")) buyersOrdered.set(o.buyer_id, (buyersOrdered.get(o.buyer_id) ?? 0) + 1);
  const repeat = [...buyersOrdered.values()].filter((n) => n > 1).length;
  const conversion = buyers.length ? Math.round((buyersOrdered.size / buyers.length) * 100) : 0;
  if (inactiveSellers) issues.push({ level: "p3", text: `${inactiveSellers} seller(s) signed up but never listed a product` });
  if (cartUsers.size) issues.push({ level: "p3", text: `${cartUsers.size} abandoned cart(s) older than 24h — consider a reminder (needs your approval)` });
  if (newBuyersPrev && newBuyers7 < newBuyersPrev * 0.7) issues.push({ level: "p2", text: `New buyers dropped ${Math.round((1 - newBuyers7 / newBuyersPrev) * 100)}% week on week` });
  return { status: statusOf(issues), issues, actions: [], metrics: { new_buyers_7d: newBuyers7, new_buyers_prev_7d: newBuyersPrev, new_sellers_7d: newSellers7, activation_pct: activation, abandoned_carts: cartUsers.size, repeat_buyers: repeat, conversion_pct: conversion, total_buyers: buyers.length, referrals: "not tracked yet" } };
}

// ---------- Marketing ----------
function marketing(d: Data): Result {
  const issues: Issue[] = [];
  const active = d.products.filter((p) => p.is_active);
  const weakSeo = active.filter((p) => !p.description || p.description.length < 40 || p.title.length < 6).length;
  const noImage = active.filter((p) => !p.image_url).length;
  if (weakSeo) issues.push({ level: "p3", text: `${weakSeo} product page(s) have weak titles/descriptions (bad for Google)` });
  if (noImage) issues.push({ level: "p2", text: `${noImage} active product(s) have no photo` });
  const sold = new Map<string, number>();
  for (const i of d.items) if (i.product_id) sold.set(i.product_id, (sold.get(i.product_id) ?? 0) + i.quantity);
  const trending = [...sold.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id]) => d.products.find((p) => p.id === id)?.title).filter(Boolean);
  return { status: statusOf(issues), issues, actions: [], metrics: { weak_seo_pages: weakSeo, missing_images: noImage, trending, ad_spend: "R0 (auto-spend disabled)", campaigns: "drafts only — you approve before anything is posted" } };
}

// ---------- Orchestrator ----------
export async function runAllAgents(opts: { siteUrl?: string; only?: string }) {
  const d = await loadData();
  const runners: Record<string, () => Promise<Result> | Result> = {
    platform_health: () => platformHealth(d, opts.siteUrl),
    finance: () => finance(d),
    trust_safety: () => trustSafety(d),
    growth: () => growth(d),
    marketing: () => marketing(d),
  };
  const out: Record<string, Result> = {};
  for (const name of HQ_AGENTS) {
    if (opts.only && opts.only !== name) continue;
    try {
      const r = await runners[name]();
      out[name] = r;
      await supabaseAdmin.from("agent_status").upsert({ agent_name: name, status: r.status, issues: r.issues, actions: r.actions, metrics: r.metrics, last_check: new Date().toISOString() });
      await log(name, `Check complete: ${r.issues.length} issue(s)`, r.status, { issues: r.issues, actions: r.actions });
    } catch (e: any) {
      await supabaseAdmin.from("agent_status").upsert({ agent_name: name, status: "red", issues: [{ level: "p1", text: "Agent failed to run" }], actions: [], metrics: {}, last_check: new Date().toISOString() });
      await log(name, "Agent run failed", "error", { message: String(e?.message ?? e).slice(0, 300) });
    }
  }
  // Manager: only alert on P1s (no spam)
  const p1 = Object.entries(out).flatMap(([a, r]) => r.issues.filter((i) => i.level === "p1").map((i) => `${a}: ${i.text}`));
  await supabaseAdmin.from("agent_status").upsert({ agent_name: "manager", status: p1.length ? "red" : Object.values(out).some((r) => r.status === "yellow") ? "yellow" : "green", issues: p1.map((t) => ({ level: "p1", text: t })), actions: ["Collected reports from all agents"], metrics: { p1_count: p1.length }, last_check: new Date().toISOString() });
  if (p1.length) await log("manager", `P1 ALERT for owner: ${p1.length} urgent issue(s)`, "alert", { p1 });
  return out;
}

export async function weeklyNumbers() {
  const d = await loadData();
  const f = finance(d), g = growth(d);
  const week = d.orders.filter((o) => o.created_at >= daysAgo(7) && o.status !== "cancelled");
  const gmv = week.reduce((s, o) => s + (o.total_cents || 0), 0);
  const del = week.reduce((s, o) => s + (o.delivery_fee_cents || 0), 0);
  const shopRev = new Map<string, number>();
  for (const o of week) shopRev.set(o.shop_id, (shopRev.get(o.shop_id) ?? 0) + o.total_cents);
  const topSellers = [...shopRev.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([id, c]) => `${d.shops.find((s) => s.id === id)?.name ?? "?"} (${R(c)})`);
  const activeSellers = new Set(week.map((o) => o.shop_id)).size;
  return {
    GMV: R(gmv), Revenue: R(Math.round((gmv - del) * COMMISSION)), "Active sellers": activeSellers, "New sellers": g.metrics.new_sellers_7d,
    Buyers: g.metrics.total_buyers, Orders: week.length, Conversion: `${g.metrics.conversion_pct}% of buyers have ordered`,
    "Failed payments": week.filter((o) => o.payment_status === "failed").length,
    "Customer complaints": d.leads.filter((l) => l.type === "support" && l.created_at >= daysAgo(7)).length,
    "Top products": f.metrics.top_products, "Top sellers": topSellers,
  };
}
