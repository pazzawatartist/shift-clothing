"use client";

import * as React from "react";
import { Minus, Plus, Trash2, ShoppingCart } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { createOrder } from "@/app/(dashboard)/sales/actions";
import { CustomerPicker, type CustomerOption } from "./customer-picker";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { formatCurrency } from "@/lib/utils/currency";
import { EmptyState } from "@/components/shared/empty-state";
import type { PosProduct } from "@/hooks/use-pos-catalog";

export type CartLine = {
  variantId: string;
  productName: string;
  size: string;
  color: string;
  unitPrice: number;
  quantity: number;
  available: number;
};

export function CartPanel({
  cart,
  setCart,
  taxPercentage,
}: {
  cart: CartLine[];
  setCart: React.Dispatch<React.SetStateAction<CartLine[]>>;
  taxPercentage: number;
}) {
  const router = useRouter();
  const [customer, setCustomer] = React.useState<CustomerOption | null>(null);
  const [discountType, setDiscountType] = React.useState<"none" | "fixed" | "percentage">("none");
  const [discountValue, setDiscountValue] = React.useState(0);
  const [paymentMethod, setPaymentMethod] = React.useState<"cash" | "gcash" | "maya" | "bank_transfer" | "card" | "other">(
    "cash"
  );
  const [amountPaid, setAmountPaid] = React.useState(0);
  const [submitting, setSubmitting] = React.useState(false);

  const subtotal = cart.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0);
  const discountAmount =
    discountType === "fixed" ? Math.min(discountValue, subtotal) : discountType === "percentage" ? (subtotal * Math.min(discountValue, 100)) / 100 : 0;
  const taxAmount = ((subtotal - discountAmount) * taxPercentage) / 100;
  const total = subtotal - discountAmount + taxAmount;
  const change = Math.max(amountPaid - total, 0);

  function updateQuantity(variantId: string, delta: number) {
    setCart((prev) =>
      prev
        .map((l) =>
          l.variantId === variantId
            ? { ...l, quantity: Math.min(Math.max(l.quantity + delta, 1), Math.max(l.available, 1)) }
            : l
        )
        .filter(Boolean)
    );
  }

  function removeLine(variantId: string) {
    setCart((prev) => prev.filter((l) => l.variantId !== variantId));
  }

  async function completeSale() {
    if (cart.length === 0) {
      toast.error("Cart is empty");
      return;
    }
    setSubmitting(true);
    const result = await createOrder({
      customer_id: customer?.id ?? null,
      sales_channel: "pos",
      items: cart.map((l) => ({ variant_id: l.variantId, quantity: l.quantity })),
      payment_method: paymentMethod,
      discount_type: discountType === "none" ? null : discountType,
      discount_value: discountType === "none" ? 0 : discountValue,
      shipping_amount: 0,
      amount_paid: amountPaid,
    });
    setSubmitting(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Sale completed");
    setCart([]);
    setCustomer(null);
    setDiscountType("none");
    setDiscountValue(0);
    setAmountPaid(0);
    if (result.id) router.push(`/sales/orders/${result.id}`);
    else router.refresh();
  }

  return (
    <div className="flex h-full flex-col gap-4">
      <CustomerPicker value={customer} onChange={setCustomer} />

      <div className="flex-1 space-y-3 overflow-y-auto">
        {cart.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Cart is empty" description="Tap a product to add it." />
        ) : (
          cart.map((line) => (
            <div key={line.variantId} className="flex items-center gap-2 rounded-md border p-2 text-sm">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium">{line.productName}</p>
                <p className="text-xs text-muted-foreground">
                  {line.size}/{line.color} — {formatCurrency(line.unitPrice)}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(line.variantId, -1)}>
                  <Minus className="h-3 w-3" />
                </Button>
                <span className="w-6 text-center">{line.quantity}</span>
                <Button type="button" size="icon" variant="outline" className="h-7 w-7" onClick={() => updateQuantity(line.variantId, 1)}>
                  <Plus className="h-3 w-3" />
                </Button>
              </div>
              <p className="w-20 text-right font-medium">{formatCurrency(line.unitPrice * line.quantity)}</p>
              <Button type="button" size="icon" variant="ghost" className="h-7 w-7" onClick={() => removeLine(line.variantId)}>
                <Trash2 className="h-3.5 w-3.5 text-destructive" />
              </Button>
            </div>
          ))
        )}
      </div>

      <div className="space-y-3 border-t pt-3">
        <div className="grid grid-cols-2 gap-2">
          <Select value={discountType} onValueChange={(v) => setDiscountType(v as typeof discountType)}>
            <SelectTrigger>
              <SelectValue placeholder="Discount" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No discount</SelectItem>
              <SelectItem value="fixed">Fixed amount</SelectItem>
              <SelectItem value="percentage">Percentage</SelectItem>
            </SelectContent>
          </Select>
          <Input
            type="number"
            min={0}
            disabled={discountType === "none"}
            value={discountValue}
            onChange={(e) => setDiscountValue(Number(e.target.value))}
            placeholder="Discount value"
          />
        </div>

        <div className="space-y-1 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          {discountAmount > 0 && (
            <div className="flex justify-between text-destructive">
              <span>Discount</span>
              <span>-{formatCurrency(discountAmount)}</span>
            </div>
          )}
          {taxPercentage > 0 && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Tax ({taxPercentage}%)</span>
              <span>{formatCurrency(taxAmount)}</span>
            </div>
          )}
          <div className="flex justify-between text-base font-bold">
            <span>Total</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Payment Method</Label>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as typeof paymentMethod)}>
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
          <div className="space-y-1">
            <Label className="text-xs">Amount Tendered</Label>
            <Input type="number" min={0} value={amountPaid} onChange={(e) => setAmountPaid(Number(e.target.value))} />
          </div>
        </div>

        {amountPaid > 0 && (
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Change</span>
            <span className="font-medium">{formatCurrency(change)}</span>
          </div>
        )}

        <Button className="w-full" size="lg" disabled={submitting || cart.length === 0} onClick={completeSale}>
          {submitting ? "Processing..." : `Complete Sale — ${formatCurrency(total)}`}
        </Button>
      </div>
    </div>
  );
}

export function addToCart(
  cart: CartLine[],
  product: PosProduct,
  variant: PosProduct["variants"][number]
): CartLine[] {
  const existing = cart.find((l) => l.variantId === variant.id);
  if (existing) {
    return cart.map((l) =>
      l.variantId === variant.id ? { ...l, quantity: Math.min(l.quantity + 1, Math.max(variant.available, 1)) } : l
    );
  }
  return [
    ...cart,
    {
      variantId: variant.id,
      productName: product.name,
      size: variant.size,
      color: variant.color,
      unitPrice: variant.selling_price,
      quantity: 1,
      available: variant.available,
    },
  ];
}
