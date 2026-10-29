import type { AttrValue, FieldStatus, Outcome, PriceComponent, Total } from "@fairbuy/core";

const eur = new Intl.NumberFormat("en-IE", { style: "currency", currency: "EUR" });

export function formatCents(cents: number): string {
  return eur.format(cents / 100);
}

// An incomplete total is a minimum: say so instead of showing it as the price.
export function formatTotal(total: Total): string {
  return total.isLowerBound ? `from ${formatCents(total.cents)}` : formatCents(total.cents);
}

export const statusLabel: Record<FieldStatus, string> = {
  verified: "verified",
  seller_claim: "seller claim",
  estimate: "estimate",
  unknown: "unknown",
};

export const outcomeLabel: Record<Outcome, string> = {
  pass: "Met",
  fail: "Not met",
  unknown: "Not verifiable",
};

export function componentLabel(c: PriceComponent): string {
  return c.label ?? c.kind.charAt(0).toUpperCase() + c.kind.slice(1);
}

export function formatAttr(value: AttrValue): string {
  switch (value.kind) {
    case "number":
      return `${value.value} ${value.unit}`;
    case "bool":
      return value.value ? "yes" : "no";
    default:
      return value.value;
  }
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}
