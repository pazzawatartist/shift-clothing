"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createReturnRequest } from "@/app/(dashboard)/sales/actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VariantPicker, type VariantOption } from "@/components/shared/variant-picker";
import { formatCurrency } from "@/lib/utils/currency";
import type { OrderDetail } from "@/services/orders";

const REASONS = [
  { value: "wrong_size", label: "Wrong Size" },
  { value: "wrong_color", label: "Wrong Color" },
  { value: "damaged", label: "Damaged" },
  { value: "defective", label: "Defective" },
  { value: "change_of_mind", label: "Change of Mind" },
  { value: "other", label: "Other" },
] as const;

type LineState = {
  selected: boolean;
  quantity: number;
  action: "refund" | "exchange";
  exchangeVariant: VariantOption | null;
};

export function NewReturnForm({ order }: { order: OrderDetail }) {
  const router = useRouter();
  const [reason, setReason] = React.useState<(typeof REASONS)[number]["value"]>("wrong_size");
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);
  const [lines, setLines] = React.useState<Record<string, LineState>>(
    Object.fromEntries(
      order.order_items.map((item) => [
        item.id,
        { selected: false, quantity: item.quantity, action: "refund" as const, exchangeVariant: null },
      ])
    )
  );

  function getLine(itemId: string): LineState {
    return lines[itemId] ?? { selected: false, quantity: 1, action: "refund", exchangeVariant: null };
  }

  function updateLine(itemId: string, patch: Partial<LineState>) {
    setLines((prev) => ({ ...prev, [itemId]: { ...getLine(itemId), ...patch } }));
  }

  async function onSubmit() {
    const items = order.order_items
      .filter((item) => getLine(item.id).selected)
      .map((item) => ({
        order_item_id: item.id,
        product_variant_id: item.product_variant_id,
        quantity: getLine(item.id).quantity,
        action: getLine(item.id).action,
        exchange_variant_id: getLine(item.id).exchangeVariant?.id ?? null,
      }));

    if (items.length === 0) {
      toast.error("Select at least one item to return");
      return;
    }
    if (items.some((i) => i.action === "exchange" && !i.exchange_variant_id)) {
      toast.error("Select an exchange variant for every exchange item");
      return;
    }

    setSubmitting(true);
    const result = await createReturnRequest({ order_id: order.id, reason, notes: notes || null, items });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Return request created");
    router.push("/sales/returns");
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        {order.order_items.map((item) => {
          const line = getLine(item.id);
          return (
            <div key={item.id} className="rounded-md border p-3">
              <div className="flex items-start gap-3">
                <Checkbox
                  checked={line.selected}
                  onCheckedChange={(checked) => updateLine(item.id, { selected: !!checked })}
                  className="mt-1"
                />
                <div className="flex-1">
                  <p className="font-medium">{item.product_name_snapshot}</p>
                  <p className="text-sm text-muted-foreground">
                    {item.variant_label_snapshot} — {formatCurrency(item.unit_price)} × {item.quantity}
                  </p>
                </div>
              </div>
              {line.selected && (
                <div className="mt-3 grid gap-3 pl-7 sm:grid-cols-2">
                  <div className="space-y-1">
                    <Label className="text-xs">Quantity to return</Label>
                    <Input
                      type="number"
                      min={1}
                      max={item.quantity}
                      value={line.quantity}
                      onChange={(e) => updateLine(item.id, { quantity: Number(e.target.value) })}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Action</Label>
                    <Select value={line.action} onValueChange={(v) => updateLine(item.id, { action: v as "refund" | "exchange" })}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="refund">Refund</SelectItem>
                        <SelectItem value="exchange">Exchange</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {line.action === "exchange" && (
                    <div className="space-y-1 sm:col-span-2">
                      <Label className="text-xs">Exchange for</Label>
                      <VariantPicker
                        value={line.exchangeVariant}
                        onChange={(v) => updateLine(item.id, { exchangeVariant: v })}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Reason</Label>
          <Select value={reason} onValueChange={(v) => setReason(v as typeof reason)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REASONS.map((r) => (
                <SelectItem key={r.value} value={r.value}>
                  {r.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Notes</Label>
        <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
      </div>

      <Button onClick={onSubmit} disabled={submitting}>
        {submitting ? "Submitting..." : "Submit Return Request"}
      </Button>
    </div>
  );
}
