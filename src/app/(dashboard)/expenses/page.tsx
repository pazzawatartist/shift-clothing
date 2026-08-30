import { Receipt } from "lucide-react";
import { format } from "date-fns";
import { createClient } from "@/lib/supabase/server";
import { ExpenseFormDialog } from "@/components/expenses/expense-form-dialog";
import { ViewReceiptButton } from "@/components/expenses/view-receipt-button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const { data: expenses } = await supabase
    .from("expenses")
    .select("id, category, description, amount, expense_date, payment_method, receipt_url, profiles(full_name)")
    .order("expense_date", { ascending: false })
    .limit(100);

  const total = (expenses ?? []).reduce((sum, e) => sum + e.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expenses</h1>
          <p className="text-muted-foreground">Total: {formatCurrency(total)}</p>
        </div>
        <ExpenseFormDialog />
      </div>

      {!expenses || expenses.length === 0 ? (
        <EmptyState icon={Receipt} title="No expenses recorded yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Recorded By</TableHead>
              <TableHead className="text-right">Amount</TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((e) => (
              <TableRow key={e.id}>
                <TableCell className="text-muted-foreground">{format(new Date(e.expense_date), "d MMM yyyy")}</TableCell>
                <TableCell>
                  <Badge variant="secondary" className="capitalize">
                    {e.category.replace("_", " ")}
                  </Badge>
                </TableCell>
                <TableCell>{e.description}</TableCell>
                <TableCell className="capitalize text-muted-foreground">{e.payment_method.replace("_", " ")}</TableCell>
                <TableCell className="text-muted-foreground">
                  {(e as unknown as { profiles: { full_name: string } | null }).profiles?.full_name ?? "—"}
                </TableCell>
                <TableCell className="text-right font-medium">{formatCurrency(e.amount)}</TableCell>
                <TableCell>{e.receipt_url && <ViewReceiptButton path={e.receipt_url} />}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
