import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MODEL = "google/gemini-3-flash-preview";

type Msg = { role: "system" | "user" | "assistant" | "tool"; content: string; tool_calls?: any; tool_call_id?: string; name?: string };

export type Recommendation = {
  id: string;
  title: string;
  price_cents: number;
  currency: string;
  image_url: string | null;
  shop_name: string | null;
  shop_slug: string | null;
};

const SYSTEM_PROMPT = `You are the Ndwango receptionist — a warm, elegant concierge for a South African afro-luxury marketplace called Ndwango ("Khaya le Kotini"). Local brands open a "Khaya" (shop) and sell directly to buyers.

Your job:
- Greet shoppers warmly. Ask what they're looking for.
- Recommend real products using recommend_products whenever a shopper mentions a category, product, style, or need. Never invent product names.
- When a shopper shows serious buying interest, wants a callback, custom order, bulk pricing, or leaves contact info, call capture_lead so the seller can follow up.
- When a shopper has a PROBLEM with a product they bought or are considering (damaged, wrong item, delivery issue, refund request, defect, complaint, etc.), call escalate_to_seller so the matter goes to the seller's support inbox. Always try to include product_id or shop_id when known from the conversation.
- Be concise, kind, confident. Use South African context naturally. Short paragraphs.
- If a tool returns nothing, say so honestly and offer to capture the lead.`;

const TOOLS = [
  {
    type: "function",
    function: {
      name: "recommend_products",
      description: "Search Ndwango's live product catalog. Returns up to 6 products with shop info.",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string" },
          limit: { type: "number", default: 4 },
        },
        required: ["query"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "capture_lead",
      description: "Save a buyer lead so a seller can follow up. Use for callbacks, custom orders, bulk pricing, or strong buying intent.",
      parameters: {
        type: "object",
        properties: {
          interest: { type: "string" },
          budget_cents: { type: "number" },
          shop_id: { type: "string" },
          product_id: { type: "string" },
          contact_name: { type: "string" },
          contact_phone: { type: "string" },
          contact_email: { type: "string" },
          ai_summary: { type: "string" },
        },
        required: ["interest"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "escalate_to_seller",
      description: "Transfer a buyer's product problem, complaint, or support issue to the seller's support inbox. Use for damage, wrong item, refunds, delivery problems, defects, or any complaint about a specific product/shop.",
      parameters: {
        type: "object",
        properties: {
          subject: { type: "string", description: "Short subject line for the ticket." },
          details: { type: "string", description: "What the buyer said, in their own words." },
          shop_id: { type: "string" },
          product_id: { type: "string" },
          contact_name: { type: "string" },
          contact_phone: { type: "string" },
          contact_email: { type: "string" },
          ai_summary: { type: "string", description: "One-sentence summary of the issue for the seller." },
        },
        required: ["subject", "details"],
      },
    },
  },
];


async function loadHistory(supabase: any, userId: string): Promise<Msg[]> {
  const { data } = await supabase
    .from("chat_messages")
    .select("role,content")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(40);
  return (data ?? []) as Msg[];
}

async function runRecommend(supabase: any, args: { query: string; limit?: number }): Promise<Recommendation[]> {
  const limit = Math.min(Math.max(args.limit ?? 4, 1), 6);
  const q = (args.query ?? "").trim();
  if (!q) return [];
  const { data } = await supabase
    .from("products")
    .select("id,title,price_cents,currency,image_url,shop:shops(name,slug)")
    .eq("is_active", true)
    .or(`title.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`)
    .limit(limit);
  return ((data ?? []) as any[]).map((p) => ({
    id: p.id,
    title: p.title,
    price_cents: p.price_cents,
    currency: p.currency,
    image_url: p.image_url,
    shop_name: p.shop?.name ?? null,
    shop_slug: p.shop?.slug ?? null,
  }));
}

async function runCaptureLead(supabase: any, userId: string, args: any) {
  const insert = {
    buyer_id: userId,
    interest: String(args.interest ?? "").slice(0, 500),
    budget_cents: typeof args.budget_cents === "number" ? args.budget_cents : null,
    shop_id: args.shop_id ?? null,
    product_id: args.product_id ?? null,
    name: args.contact_name ?? null,
    phone: args.contact_phone ?? null,
    email: args.contact_email ?? null,
    ai_summary: args.ai_summary ?? null,
    source: "ai_receptionist",
  };
  const { data, error } = await supabase.from("leads").insert(insert).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, lead_id: data.id };
}

async function runEscalate(supabase: any, userId: string, args: any) {
  const insert = {
    buyer_id: userId,
    type: "support",
    interest: String(args.details ?? "").slice(0, 1000),
    subject: String(args.subject ?? "Product issue").slice(0, 200),
    shop_id: args.shop_id ?? null,
    product_id: args.product_id ?? null,
    name: args.contact_name ?? null,
    phone: args.contact_phone ?? null,
    email: args.contact_email ?? null,
    ai_summary: args.ai_summary ?? null,
    source: "ai_receptionist",
    status: "new",
  };
  const { data, error } = await supabase.from("leads").insert(insert).select("id").single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, ticket_id: data.id };
}

async function callGateway(messages: Msg[]): Promise<any> {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const res = await fetch(GATEWAY_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Lovable-API-Key": key,
    },
    body: JSON.stringify({ model: MODEL, messages, tools: TOOLS, tool_choice: "auto" }),
  });
  if (!res.ok) {
    const text = await res.text();
    if (res.status === 429) throw new Error("The receptionist is busy right now. Please try again in a moment.");
    if (res.status === 402) throw new Error("AI credits exhausted. Please add credits to continue.");
    throw new Error(`Gateway error ${res.status}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

export const getReceptionistHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("chat_messages")
      .select("id,role,content,created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: true })
      .limit(80);
    return (data ?? []) as Array<{ id: string; role: string; content: string; created_at: string }>;
  });

export const clearReceptionistHistory = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    await supabase.from("chat_messages").delete().eq("user_id", userId);
    return { ok: true };
  });

export const sendReceptionistMessage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ text: z.string().trim().min(1).max(2000) }).parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Persist user turn
    await supabase.from("chat_messages").insert({ user_id: userId, role: "user", content: data.text });

    const history = await loadHistory(supabase, userId);
    const messages: Msg[] = [{ role: "system", content: SYSTEM_PROMPT }, ...history];

    let recommendations: Recommendation[] = [];
    let finalText = "";

    for (let step = 0; step < 4; step++) {
      const resp = await callGateway(messages);
      const choice = resp.choices?.[0];
      const msg = choice?.message;
      if (!msg) throw new Error("No response from AI");

      // If tool calls, execute and loop
      const toolCalls = msg.tool_calls as any[] | undefined;
      if (toolCalls && toolCalls.length > 0) {
        messages.push({ role: "assistant", content: msg.content ?? "", tool_calls: toolCalls });
        for (const tc of toolCalls) {
          const name = tc.function?.name;
          let args: any = {};
          try {
            args = JSON.parse(tc.function?.arguments ?? "{}");
          } catch {}
          let result: any = { ok: false };
          if (name === "recommend_products") {
            const recs = await runRecommend(supabase, args);
            recommendations = recs;
            result = { count: recs.length, items: recs.map((r) => ({ id: r.id, title: r.title, price_cents: r.price_cents, shop: r.shop_name })) };
          } else if (name === "capture_lead") {
            result = await runCaptureLead(supabase, userId, args);
          } else if (name === "escalate_to_seller") {
            result = await runEscalate(supabase, userId, args);
          }

          messages.push({ role: "tool", tool_call_id: tc.id, name, content: JSON.stringify(result) });
        }
        continue;
      }

      finalText = (msg.content ?? "").trim();
      break;
    }

    if (!finalText) finalText = "Sorry — I didn't catch that. Could you rephrase?";

    await supabase.from("chat_messages").insert({ user_id: userId, role: "assistant", content: finalText });

    return { text: finalText, recommendations };
  });
