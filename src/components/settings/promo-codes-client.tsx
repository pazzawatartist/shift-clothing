"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Tag } from "lucide-react";
import { promoCodeSchema, type PromoCodeInput } from "@/lib/validations/order";
import { upsertPromoCode } from "@/app/(dashboard)/settings/actions";
import type { PromoCodeRow } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";

function PromoDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<PromoCodeInput>({
    resolver: zodResolver(promoCodeSchema),
    defaultValues: { code: "", type: "percentage", value: 10, min_order_amount: 0, status: "active" },
  });

  async function onSubmit(values: PromoCodeInput) {
    const result = await upsertPromoCode(null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Promo code created");
    form.reset();
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Promo Code
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Promo Code</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Code</Label>
            <Input {...form.register("code")} placeholder="SUMMER10" className="uppercase" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select
                defaultValue={form.getValues("type")}
                onValueChange={(v) => form.setValue("type", v as PromoCodeInput["type"])}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage</SelectItem>
                  <SelectItem value="fixed">Fixed Amount</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Value</Label>
              <Input type="number" step="0.01" {...form.register("value", { valueAsNumber: true })} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Min Order Amount</Label>
              <Input type="number" step="0.01" {...form.register("min_order_amount", { valueAsNumber: true })} />
            </div>
            <div className="space-y-2">
              <Label>Usage Limit</Label>
              <Input type="number" {...form.register("usage_limit", { valueAsNumber: true })} placeholder="Unlimited" />
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function PromoCodesClient({ promoCodes }: { promoCodes: PromoCodeRow[] }) {
  const router = useRouter();

  return (
    <div className="mt-4 space-y-4">
      <div className="flex justify-end">
        <PromoDialog onSaved={() => router.refresh()} />
      </div>
      {promoCodes.length === 0 ? (
        <EmptyState icon={Tag} title="No promo codes yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Discount</TableHead>
              <TableHead className="text-right">Min Order</TableHead>
              <TableHead className="text-right">Used</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {promoCodes.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-mono font-medium">{p.code}</TableCell>
                <TableCell>{p.type === "percentage" ? `${p.value}%` : formatCurrency(p.value)}</TableCell>
                <TableCell className="text-right">{formatCurrency(p.min_order_amount)}</TableCell>
                <TableCell className="text-right">
                  {p.usage_count}
                  {p.usage_limit ? ` / ${p.usage_limit}` : ""}
                </TableCell>
                <TableCell>
                  <Badge variant={p.status === "active" ? "success" : "secondary"}>{p.status}</Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
