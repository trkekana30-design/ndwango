import accounting from "accounting";
import Dinero from "dinero.js";

export type FinanceSource = "marketplace" | "akaunting" | "invoice-ninja" | "mixed";

export type FinanceSnapshot = {
  source: FinanceSource;
  currency: "ZAR";
  gross_cents: number;
  fees_cents: number;
  tax_cents: number;
  net_cents: number;
  paid_cents: number;
  due_cents: number;
  overdue_cents: number;
  payouts_cents: number;
  period_days: number;
  updated_at: string;
};

export function toDinero(cents: number, currency: "ZAR" = "ZAR") {
  return Dinero({ amount: Math.round(cents), currency });
}

export function centsFromAmount(value: number) {
  return Math.round(value * 100);
}

export function formatZar(cents: number, options?: { symbol?: string; format?: string }) {
  return accounting.formatMoney(cents / 100, {
    symbol: options?.symbol ?? "R ",
    thousand: ",",
    decimal: ".",
    precision: 2,
    format: options?.format ?? "%s%v",
  });
}

export function buildFinanceSnapshot(input: Partial<FinanceSnapshot> & { gross_cents?: number; fees_cents?: number; tax_cents?: number; paid_cents?: number; due_cents?: number; overdue_cents?: number; payouts_cents?: number; period_days?: number; source?: FinanceSource }): FinanceSnapshot {
  const gross = Math.round(input.gross_cents ?? 0);
  const fees = Math.round(input.fees_cents ?? 0);
  const tax = Math.round(input.tax_cents ?? 0);
  const paid = Math.round(input.paid_cents ?? 0);
  const due = Math.round(input.due_cents ?? 0);
  const overdue = Math.round(input.overdue_cents ?? 0);
  const payouts = Math.round(input.payouts_cents ?? 0);
  const periodDays = input.period_days ?? 30;

  return {
    source: input.source ?? "marketplace",
    currency: "ZAR",
    gross_cents: gross,
    fees_cents: fees,
    tax_cents: tax,
    net_cents: Math.round(gross - fees - tax),
    paid_cents: paid,
    due_cents: due,
    overdue_cents: overdue,
    payouts_cents: payouts,
    period_days: periodDays,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeAccountingData(rows: Array<{ amount_cents?: number; total_cents?: number; paid_cents?: number; due_cents?: number; overdue_cents?: number; tax_cents?: number; fees_cents?: number; payouts_cents?: number }>) {
  return rows.reduce(
    (acc, row) => ({
      gross_cents: acc.gross_cents + Math.round(row.amount_cents ?? row.total_cents ?? 0),
      paid_cents: acc.paid_cents + Math.round(row.paid_cents ?? 0),
      due_cents: acc.due_cents + Math.round(row.due_cents ?? 0),
      overdue_cents: acc.overdue_cents + Math.round(row.overdue_cents ?? 0),
      tax_cents: acc.tax_cents + Math.round(row.tax_cents ?? 0),
      fees_cents: acc.fees_cents + Math.round(row.fees_cents ?? 0),
      payouts_cents: acc.payouts_cents + Math.round(row.payouts_cents ?? 0),
    }),
    { gross_cents: 0, paid_cents: 0, due_cents: 0, overdue_cents: 0, tax_cents: 0, fees_cents: 0, payouts_cents: 0 },
  );
}

export function formatFinanceSummary(snapshot: FinanceSnapshot) {
  return {
    gross: formatZar(snapshot.gross_cents),
    fees: formatZar(snapshot.fees_cents),
    net: formatZar(snapshot.net_cents),
    due: formatZar(snapshot.due_cents),
    overdue: formatZar(snapshot.overdue_cents),
    payouts: formatZar(snapshot.payouts_cents),
    source: snapshot.source,
  };
}

export function getAccountingEnvStatus() {
  return {
    akaunting: Boolean(process.env.AKAUNTING_URL && process.env.AKAUNTING_TOKEN),
    invoiceNinja: Boolean(process.env.INVOICE_NINJA_URL && process.env.INVOICE_NINJA_TOKEN),
  };
}

export function buildAccountabilityNote() {
  return "All money values are normalized to South African Rand and stored in cents for agent safety and consistency.";
}
