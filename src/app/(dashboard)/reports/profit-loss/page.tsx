import { createClient } from "@/lib/supabase/server";
import { DateRangeFilter } from "@/components/shared/date-range-filter";
import { getDateRangeFromPreset, type RangePreset } from "@/lib/utils/date-range";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatPercent } from "@/lib/utils/currency";

interface PLResult {
  gross_sales: number;
  discounts: number;
  net_sales: number;
  cogs: number;
  expenses: number;
}

export default async function ProfitLossPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string; from?: string; to?: string }>;
}) {
  const params = await searchParams;
  const preset = (params.range as RangePreset) ?? "month";
  const { from, to } = getDateRangeFromPreset(preset, params.from, params.to);

  const supabase = await createClient();
  const { data } = await supabase.rpc("get_profit_and_loss", { p_from: from, p_to: to });
  const pl = (data ?? {
    gross_sales: 0,
    discounts: 0,
    net_sales: 0,
    cogs: 0,
    expenses: 0,
  }) as unknown as PLResult;

  const grossProfit = pl.net_sales - pl.cogs;
  const netProfit = grossProfit - pl.expenses;
  const margin = pl.net_sales > 0 ? (netProfit / pl.net_sales) * 100 : 0;

  const rows: { label: string; value: number; bold?: boolean; negative?: boolean }[] = [
    { label: "Gross Sales", value: pl.gross_sales },
    { label: "Discounts", value: pl.discounts, negative: true },
    { label: "Net Sales", value: pl.net_sales, bold: true },
    { label: "Cost of Goods Sold (COGS)", value: pl.cogs, negative: true },
    { label: "Gross Profit", value: grossProfit, bold: true },
    { label: "Operating Expenses", value: pl.expenses, negative: true },
    { label: "Net Profit", value: netProfit, bold: true },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Profit &amp; Loss</h1>
        <p className="text-muted-foreground">
          {from} to {to}
        </p>
      </div>

      <DateRangeFilter />

      <Card className="max-w-xl">
        <CardHeader>
          <CardTitle>Statement</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1">
          {rows.map((row) => (
            <div
              key={row.label}
              className={`flex justify-between py-1.5 text-sm ${row.bold ? "border-t pt-2 font-bold" : ""}`}
            >
              <span className={row.bold ? "" : "text-muted-foreground"}>{row.label}</span>
              <span className={row.negative && row.value > 0 ? "text-destructive" : ""}>
                {row.negative && row.value > 0 ? "-" : ""}
                {formatCurrency(row.value)}
              </span>
            </div>
          ))}
          <div className="flex justify-between border-t pt-2 text-sm">
            <span className="text-muted-foreground">Profit Margin</span>
            <span className="font-medium">{formatPercent(margin)}</span>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
