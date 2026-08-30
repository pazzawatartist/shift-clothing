"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { recordStockMovement } from "@/app/(dashboard)/inventory/actions";
import { VariantPicker, type VariantOption } from "@/components/shared/variant-picker";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const MOVEMENT_TYPES = [
  { value: "stock_in", label: "Stock In (increase)" },
  { value: "adjustment", label: "Adjustment (correction)" },
  { value: "damage", label: "Damage (decrease)" },
  { value: "stock_out", label: "Stock Out (decrease)" },
  { value: "transfer", label: "Transfer (decrease)" },
] as const;

const DECREASE_TYPES = new Set(["damage", "stock_out", "transfer"]);

export function StockMovementForm() {
  const router = useRouter();
  const [variant, setVariant] = React.useState<VariantOption | null>(null);
  const [type, setType] = React.useState<(typeof MOVEMENT_TYPES)[number]["value"]>("stock_in");
  const [quantity, setQuantity] = React.useState<number>(1);
  const [notes, setNotes] = React.useState("");
  const [submitting, setSubmitting] = React.useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!variant) {
      toast.error("Select a product variant");
      return;
    }
    if (!quantity || quantity <= 0) {
      toast.error("Quantity must be a positive number");
      return;
    }

    setSubmitting(true);
    const signedQuantity = DECREASE_TYPES.has(type) ? -Math.abs(quantity) : Math.abs(quantity);
    const result = await recordStockMovement({
      product_variant_id: variant.id,
      type,
      quantity: signedQuantity,
      notes: notes || null,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Stock movement recorded");
    setVariant(null);
    setQuantity(1);
    setNotes("");
    router.refresh();
  }

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={onSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Product Variant</Label>
            <VariantPicker value={variant} onChange={setVariant} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Movement Type</Label>
              <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MOVEMENT_TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Quantity</Label>
              <Input
                type="number"
                min={1}
                value={quantity}
                onChange={(e) => setQuantity(Number(e.target.value))}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional reference or reason" />
          </div>
          <Button type="submit" disabled={submitting} className="w-full">
            {submitting ? "Saving..." : "Record Movement"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
