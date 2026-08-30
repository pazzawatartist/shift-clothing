"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { expenseSchema, type ExpenseInput, EXPENSE_CATEGORIES } from "@/lib/validations/expense";
import { upsertExpense } from "@/app/(dashboard)/expenses/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";

export function ExpenseFormDialog() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [uploading, setUploading] = React.useState(false);
  const form = useForm<ExpenseInput>({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      category: "other",
      description: "",
      amount: 0,
      expense_date: new Date().toISOString().slice(0, 10),
      payment_method: "cash",
      receipt_url: "",
      notes: "",
    },
  });

  async function handleReceiptUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
    const { error } = await supabase.storage.from("expense-receipts").upload(path, file);
    setUploading(false);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    form.setValue("receipt_url", path);
    toast.success("Receipt attached");
  }

  async function onSubmit(values: ExpenseInput) {
    const result = await upsertExpense(null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Expense recorded");
    form.reset();
    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Expense
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Expense</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                defaultValue={form.getValues("category")}
                onValueChange={(v) => form.setValue("category", v as ExpenseInput["category"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EXPENSE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c} className="capitalize">
                      {c.replace("_", " ")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input type="number" step="0.01" {...form.register("amount", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Input {...form.register("description")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Date</Label>
              <Input type="date" {...form.register("expense_date")} />
            </div>
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select
                defaultValue={form.getValues("payment_method")}
                onValueChange={(v) => form.setValue("payment_method", v as ExpenseInput["payment_method"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="gcash">GCash</SelectItem>
                  <SelectItem value="maya">Maya</SelectItem>
                  <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>Receipt</Label>
            <Input type="file" accept="image/*,application/pdf" onChange={handleReceiptUpload} disabled={uploading} />
            {uploading && <p className="text-xs text-muted-foreground">Uploading...</p>}
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
