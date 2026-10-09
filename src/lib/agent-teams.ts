// Shared (client-safe) definition of the two King Kotini agent teams.

export type TeamScope = "owner" | "seller";

export type AgentDef = {
  key: string;
  label: string;
  mission: string;
  tasks?: string[];
  boundaries?: string[];
};

export const TEAMS: Record<TeamScope, { name: string; leader: AgentDef; agents: AgentDef[] }> = {
  seller: {
    name: "Khaya Team",
    leader: {
      key: "khaya_manager",
      label: "Khaya Manager",
      mission: "Manages the store, creates tasks, sends the weekly report and flags emergencies.",
      tasks: ["Manage the store overview", "Create a clear task list for the seller", "Send the weekly report", "Raise emergencies at the top of the report"],
      boundaries: ["Never override a seller decision without the seller's approval", "Only recommend — the seller decides and acts"],
    },
    agents: [
      {
        key: "product", label: "Product", mission: "Writes descriptions, checks images and categorises products.",
        tasks: ["Write or improve product descriptions", "Check products for missing or weak images", "Suggest the right category for each product"],
        boundaries: ["Never publish a product without approval", "Never change prices without approval"],
      },
      {
        key: "sales", label: "Sales", mission: "Tracks sales, finds bestsellers, spots slow products and answers the seller's questions.",
        tasks: ["Track sales and growth", "Find bestsellers", "Identify slow-moving products", "Answer the seller's sales questions"],
        boundaries: ["Never offer discounts on its own", "Never alter listings on its own"],
      },
      {
        key: "inventory", label: "Inventory", mission: "Watches stock, detects low stock and alerts the seller.",
        tasks: ["Watch stock levels", "Detect low and out-of-stock items", "Alert the seller with suggested reorder amounts"],
        boundaries: ["Never order new stock automatically"],
      },
      {
        key: "marketing", label: "Marketing", mission: "Creates social posts and campaigns and suggests promotions.",
        tasks: ["Create Meta and TikTok posts", "Create email campaigns", "Suggest promotions"],
        boundaries: ["Never post anything without the seller confirming", "Never message customers without approval"],
      },
      {
        key: "customer", label: "Customer", mission: "Handles FAQs and order questions, escalates difficult problems to the manager.",
        tasks: ["Draft answers to common questions (FAQs)", "Handle order questions and updates", "Escalate difficult questions and problems to the Khaya Manager"],
        boundaries: ["Never make refunds", "Never make promises to customers", "Never argue with customers"],
      },
      {
        key: "finance", label: "Finance", mission: "Tracks revenue, commission, payouts and fees.",
        tasks: ["Track revenue", "Track platform commission and fees", "Track expected payouts"],
        boundaries: ["Never move money", "Never initiate a payout", "Never change fee structures"],
      },
    ],
  },
  owner: {
    name: "Ndwango HQ Team",
    leader: { key: "ceo", label: "CEO", mission: "Leads the platform team and sends the owner's weekly briefing." },
    agents: [
      { key: "platform_health", label: "Platform Health", mission: "Finds problems in the app itself: payment issues, sign-in issues, broken or stuck workflows and errors." },
      { key: "inventory", label: "Inventory", mission: "Order flow, fulfilment delays, stock gaps and active listings across the platform." },
      { key: "growth", label: "Growth", mission: "New buyers, rising cities, category trends and seller recruitment." },
      { key: "finance", label: "Finance", mission: "Platform GMV, commission income, refunds and net." },
      { key: "trust_safety", label: "Trust & Safety", mission: "Complaints, refund patterns, suspicious orders and seller compliance." },
    ],
  },
};

export function agentRulesText(a: AgentDef) {
  const t = a.tasks?.length ? `\nYOUR TASKS:\n${a.tasks.map((x) => `- ${x}`).join("\n")}` : "";
  const b = a.boundaries?.length
    ? `\nHARD BOUNDARIES (never break these; phrase any such action as "Needs your approval: ..."):\n${a.boundaries.map((x) => `- ${x}`).join("\n")}`
    : "";
  return t + b;
}
