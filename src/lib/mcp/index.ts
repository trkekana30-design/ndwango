import { auth, defineMcp } from "@lovable.dev/mcp-js";
import searchProducts from "./tools/search-products";
import listMyOrders from "./tools/list-my-orders";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "ndwango-marketplace",
  title: "Ndwango Marketplace",
  version: "0.1.0",
  instructions:
    "Tools for the Ndwango marketplace (Khaya le Kotini). Use `search_products` to find local-brand products and `list_my_orders` to check the signed-in user's orders.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [searchProducts, listMyOrders],
});
