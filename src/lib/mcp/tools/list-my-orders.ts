import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_orders",
  title: "List my orders",
  description: "List the signed-in buyer's recent orders with status, payment and tracking details.",
  inputSchema: { limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10).") },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    const { data, error } = await sb
      .from("orders")
      .select("id,status,payment_status,total_cents,courier,tracking_number,created_at")
      .eq("buyer_id", ctx.getUserId()!)
      .order("created_at", { ascending: false })
      .limit(limit ?? 10);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const orders = (data ?? []).map((o) => ({
      id: o.id as string, status: o.status as string, payment_status: o.payment_status as string,
      total_rand: (o.total_cents as number) / 100, courier: (o.courier as string | null) ?? null,
      tracking_number: (o.tracking_number as string | null) ?? null, created_at: o.created_at as string,
    }));
    return { content: [{ type: "text", text: JSON.stringify(orders) }], structuredContent: { orders } };
  },
});
