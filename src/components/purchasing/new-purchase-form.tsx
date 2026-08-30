"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { createPurchase } from "@/app/(dashboard)/purchasing/actions";
import { VariantPicker, type VariantOption } from "@/components/shared/variant-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";

type PurchaseLine = { variant: VariantOption | null; quantity: number; unitCost: number };

export function NewPurchaseForm({ suppliers }: { suppliers: { id: string; name: string }[] }) {
  const router = useRouter();
  const [supplierId, setSupplierId] = React.useState("");
  const [referenceNumber, setReferenceNumber] = React.useState("");
  const [orderDate, setOrderDate] = React.useState(new Date().toISOString().slice(0, 10));
  const [expectedDate, setExpectedDate] = React.useState("");
  const [notes, setNotes] = React.useState("");
  const [lines, setLines] = React.useState<PurchaseLine[]>([{ variant: null, quantity: 1, unitCost: 0 }]);
  const [submitting, setSubmitting] = React.useState(false);

  const total = lines.reduce((sum, l) => sum + l.quantity * l.unitCost, 0);

  function updateLine(index: number, patch: Partial<PurchaseLine>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  async function onSubmit() {
    if (!supplierId) {
      toast.error("Select a supplier");
      return;
    }
    const items = lines.filter((l) => l.variant);
    if (items.length === 0) {
      toast.error("Add at least one item");
      return;
    }

    setSubmitting(true);
    const result = await createPurchase({
      supplier_id: supplierId,
      reference_number: referenceNumber || null,
      order_date: orderDate,
      expected_date: expectedDate || null,
      notes: notes || null,
      items: items.map((l) => ({
        product_variant_id: l.variant!.id,
        quantity: l.quantity,
        unit_cost: l.unitCost,
      })),
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Purchase order created");
    router.push(result.id ? `/purchasing/purchases/${result.id}` : "/purchasing/purchases");
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {suppliers.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reference Number</Label>
              <Input value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Order Date</Label>
              <Input type="date" value={orderDate} onChange={(e) => setOrderDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Expected Date</Label>
              <Input type="date" value={expectedDate} onChange={(e) => setExpectedDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 pt-6">
          <Label>Items</Label>
          {lines.map((line, index) => (
            <div key={index} className="grid grid-cols-[1fr_100px_120px_auto] items-end gap-2">
              <VariantPicker value={line.variant} onChange={(v) => updateLine(index, { variant: v })} />
              <div>
                <Label className="text-xs">Qty</Label>
                <Input
                  type="number"
                  min={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                />
              </div>
              <div>
                <Label className="text-xs">Unit Cost</Label>
                <Input
                  type="number"
                  step="0.01"
                  min={0}
                  value={line.unitCost}
                  onChange={(e) => updateLine(index, { unitCost: Number(e.target.value) })}
                />
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setLines((prev) => prev.filter((_, i) => i !== index))}
              >
                <Trash2 className="h-4 w-4 text-destructive" />
              </Button>
            </div>
          ))}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setLines((prev) => [...prev, { variant: null, quantity: 1, unitCost: 0 }])}
          >
            <Plus className="h-4 w-4" /> Add Item
          </Button>

          <div className="flex justify-end pt-2 text-base font-bold">Total: {formatCurrency(total)}</div>
        </CardContent>
      </Card>

      <Button onClick={onSubmit} disabled={submitting} size="lg">
        {submitting ? "Creating..." : "Create Purchase Order"}
      </Button>
    </div>
  );
}
