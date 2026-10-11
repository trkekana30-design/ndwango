import { createFileRoute } from "@tanstack/react-router";
import { buildFinanceSnapshot, formatFinanceSummary, getAccountingEnvStatus } from "@/lib/finance";

export const Route = createFileRoute("/api/accounting")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const source = (url.searchParams.get("source") ?? "marketplace") as "marketplace" | "akaunting" | "invoice-ninja" | "mixed";
        const gross = Number(url.searchParams.get("gross_cents") ?? 0);
        const fees = Number(url.searchParams.get("fees_cents") ?? 0);
        const tax = Number(url.searchParams.get("tax_cents") ?? 0);
        const paid = Number(url.searchParams.get("paid_cents") ?? 0);
        const due = Number(url.searchParams.get("due_cents") ?? 0);
        const overdue = Number(url.searchParams.get("overdue_cents") ?? 0);
        const payouts = Number(url.searchParams.get("payouts_cents") ?? 0);
        const periodDays = Number(url.searchParams.get("period_days") ?? 30);

        const snapshot = buildFinanceSnapshot({
          source,
          gross_cents: gross,
          fees_cents: fees,
          tax_cents: tax,
          paid_cents: paid,
          due_cents: due,
          overdue_cents: overdue,
          payouts_cents: payouts,
          period_days: Number.isFinite(periodDays) && periodDays > 0 ? periodDays : 30,
        });

        return new Response(
          JSON.stringify({
            snapshot,
            summary: formatFinanceSummary(snapshot),
            env: getAccountingEnvStatus(),
          }),
          {
            status: 200,
            headers: {
              "Content-Type": "application/json",
              "Cache-Control": "no-store",
            },
          },
        );
      },
    },
  },
});
