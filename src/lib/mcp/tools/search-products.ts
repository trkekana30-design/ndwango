import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "search_products",
  title: "Search products",
  description: "Search active Ndwango marketplace products by keyword or category (prices in ZAR).",
  inputSchema: {
    query: z.string().optional().describe("Keyword to match in the product title."),
    category: z.string().optional().describe("Category to filter by."),
    limit: z.number().int().min(1).max(50).optional().describe("Max results (default 20)."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ query, category, limit }, ctx) => {
    const sb = supabaseForUser(ctx);
    let q = sb.from("products").select("id,title,category,price_cents,stock,shop_id").eq("is_active", true).limit(limit ?? 20);
    if (query) q = q.ilike("title", `%${query}%`);
    if (category) q = q.eq("category", category);
    const { data, error } = await q;
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const products = (data ?? []).map((p) => ({
      id: p.id as string, title: p.title as string, category: (p.category as string | null) ?? null,
      price_rand: (p.price_cents as number) / 100, stock: p.stock as number, shop_id: p.shop_id as string,
    }));
    return { content: [{ type: "text", text: JSON.stringify(products) }], structuredContent: { products } };
  },
});
