"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateOrderStatus } from "@/app/(dashboard)/sales/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { OrderStatus } from "@/types/database.types";

const FLOW: OrderStatus[] = ["pending", "confirmed", "processing", "ready", "completed"];

export function OrderStatusControl({ orderId, currentStatus }: { orderId: string; currentStatus: OrderStatus }) {
  const router = useRouter();
  const [nextStatus, setNextStatus] = React.useState<OrderStatus>(currentStatus);
  const [submitting, setSubmitting] = React.useState(false);

  const isTerminal = currentStatus === "completed" || currentStatus === "cancelled" || currentStatus === "refunded";
  const options: OrderStatus[] = isTerminal
    ? [currentStatus]
    : [...FLOW, "cancelled", "refunded"];

  async function apply() {
    if (nextStatus === currentStatus) return;
    setSubmitting(true);
    const result = await updateOrderStatus({ order_id: orderId, status: nextStatus });
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Order marked as ${nextStatus}`);
    router.refresh();
  }

  if (isTerminal) return null;

  return (
    <div className="flex gap-2">
      <Select value={nextStatus} onValueChange={(v) => setNextStatus(v as OrderStatus)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button onClick={apply} disabled={submitting || nextStatus === currentStatus}>
        {submitting ? "Updating..." : "Update Status"}
      </Button>
    </div>
  );
}
