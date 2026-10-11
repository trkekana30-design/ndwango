import accounting from "accounting";
import Dinero from "dinero.js";

export type MoneyCurrency = "ZAR";

export function toDinero(cents: number, currency: MoneyCurrency = "ZAR") {
  return Dinero({ amount: Math.round(cents), currency });
}

export function centsFromAmount(value: number) {
  return Math.round(value * 100);
}

export function formatZar(cents: number, options?: { symbol?: string; format?: string }) {
  const symbol = options?.symbol ?? "R ";
  const format = options?.format ?? "%.2f";
  return accounting.formatMoney(cents / 100, {
    symbol,
    thousand: ",",
    decimal: ".",
    precision: 2,
    format,
  });
}

export function formatPrice(cents: number, currency: MoneyCurrency = "ZAR") {
  if (currency !== "ZAR") {
    return accounting.formatMoney(cents / 100, {
      symbol: currency,
      thousand: ",",
      decimal: ".",
      precision: 2,
    });
  }

  return formatZar(cents);
}

export function addMoneyCents(...amounts: number[]) {
  return amounts.reduce((sum, value) => sum + Math.round(value), 0);
}

export function subtractMoneyCents(base: number, ...amounts: number[]) {
  return amounts.reduce((sum, value) => sum + Math.round(value), base);
}

export function percentOf(part: number, total: number) {
  if (!total) return 0;
  return Number(((part / total) * 100).toFixed(2));
}

export function formatPercentage(value: number) {
  return `${Number(value).toFixed(2)}%`;
}
