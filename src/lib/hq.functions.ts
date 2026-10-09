import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function requireAdmin(supabase: any, userId: string) {
  const { data } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (!data) throw new Error("Admins only.");
}

export const getAgentDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await requireAdmin(supabase, userId);
    const [s, l, f, e] = await Promise.all([
      supabase.from("agent_status").select("*"),
      supabase.from("agent_logs").select("*").order("created_at", { ascending: false }).limit(60),
      supabase.from("moderation_queue").select("*").order("created_at", { ascending: false }).limit(100),
      supabase.from("expenses").select("*").order("spent_on", { ascending: false }).limit(100),
    ]);
    return { status: (s.data ?? []) as any[], logs: (l.data ?? []) as any[], flags: (f.data ?? []) as any[], expenses: (e.data ?? []) as any[] };
  });

export const runAgentsNow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { only?: string; origin?: string }) => z.object({ only: z.string().max(40).optional(), origin: z.string().url().max(200).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { runAllAgents, log } = await import("./hq-agents.server");
    await log("manager", `Owner pressed "Run check now"${data.only ? ` (${data.only})` : ""}`);
    await runAllAgents({ only: data.only, siteUrl: data.origin });
    return { ok: true };
  });

export const updateFlag = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string; status: string }) => z.object({ id: z.string().uuid(), status: z.enum(["open", "reviewing", "dismissed", "suspended", "resolved"]) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("moderation_queue").update({ status: data.status }).eq("id", data.id);
    if (error) throw new Error(error.message);
    const { log } = await import("./hq-agents.server");
    await log("trust_safety", `Owner set case to "${data.status}"`, "info", { id: data.id });
    return { ok: true };
  });

export const addExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { label: string; category: string; amount: number }) => z.object({ label: z.string().trim().min(1).max(100), category: z.string().max(40), amount: z.number().positive().max(10_000_000) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("expenses").insert({ label: data.label, category: data.category, amount_cents: Math.round(data.amount * 100) });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteExpense = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    await context.supabase.from("expenses").delete().eq("id", data.id);
    return { ok: true };
  });

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export const askManager = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { messages: { role: "user" | "assistant"; content: string }[] }) =>
    z.object({ messages: z.array(z.object({ role: z.enum(["user", "assistant"]), content: z.string().max(4000) })).max(30) }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context.supabase, context.userId);
    const { weeklyNumbers, log } = await import("./hq-agents.server");
    const [{ data: status }, { data: flags }, numbers] = await Promise.all([
      context.supabase.from("agent_status").select("agent_name,status,issues,metrics,last_check"),
      context.supabase.from("moderation_queue").select("reason,risk,status").eq("status", "open").limit(20),
      weeklyNumbers(),
    ]);
    const system = `You are the Ndwango MANAGER AGENT — the single point of contact for the platform owner of Ndwango, a South African marketplace for local brands. You receive reports from the Platform Health, Finance, Trust & Safety, Growth and Marketing agents.
Rules: use ONLY the JSON below, never invent numbers. Prioritise P1 issues first. Be short and plain (the owner is not technical). Use Rand. Markdown.
Agents never delete data, move money, ban users, send messages or spend on ads — anything like that is "Needs your approval".
If asked for the weekly report, use exactly this format with one line each: GMV, Revenue, Active sellers, New sellers, Buyers, Orders, Conversion, Failed payments, Customer complaints, Platform issues, Top products, Top sellers, Biggest problem, Recommended actions.
Payment gateway (Paystack/Ozow) is not connected yet.
WEEKLY NUMBERS: ${JSON.stringify(numbers)}
AGENT REPORTS: ${JSON.stringify(status ?? [])}
OPEN MODERATION CASES: ${JSON.stringify(flags ?? [])}`;
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("AI is not configured.");
    const res = await fetch(GATEWAY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "Lovable-API-Key": key },
      body: JSON.stringify({ model: "google/gemini-3-flash-preview", messages: [{ role: "system", content: system }, ...data.messages] }),
    });
    if (!res.ok) {
      if (res.status === 429) throw new Error("The Manager is busy — try again in a minute.");
      if (res.status === 402) throw new Error("AI credits are used up. Add credits in your workspace billing settings.");
      throw new Error("The Manager could not answer right now.");
    }
    const json = await res.json();
    const reply = (json.choices?.[0]?.message?.content ?? "").trim();
    await log("manager", `Answered owner: "${data.messages.at(-1)?.content.slice(0, 80) ?? ""}"`);
    return { reply };
  });
