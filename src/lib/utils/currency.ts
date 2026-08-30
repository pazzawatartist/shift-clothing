const PHP_FORMATTER = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(amount: number | string | null | undefined): string {
  const value = typeof amount === "string" ? parseFloat(amount) : amount;
  if (value === null || value === undefined || Number.isNaN(value)) {
    return PHP_FORMATTER.format(0);
  }
  return PHP_FORMATTER.format(value);
}

export function formatPercent(value: number | string | null | undefined, digits = 2): string {
  const num = typeof value === "string" ? parseFloat(value) : value;
  if (num === null || num === undefined || Number.isNaN(num)) return "0.00%";
  return `${num.toFixed(digits)}%`;
}

/** Round to 2 decimal places using integer cents to avoid float drift. */
export function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}
