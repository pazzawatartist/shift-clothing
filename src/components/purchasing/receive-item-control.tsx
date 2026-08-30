"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { PackageCheck } from "lucide-react";
import { receivePurchaseItem } from "@/app/(dashboard)/purchasing/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function ReceiveItemControl({
  purchaseItemId,
  remaining,
}: {
  purchaseItemId: string;
  remaining: number;
}) {
  const router = useRouter();
  const [quantity, setQuantity] = React.useState(remaining);
  const [submitting, setSubmitting] = React.useState(false);

  if (remaining <= 0) {
    return <span className="text-xs text-success">Fully received</span>;
  }

  async function receive() {
    setSubmitting(true);
    const result = await receivePurchaseItem(purchaseItemId, quantity);
    setSubmitting(false);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Stock received");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2">
      <Input
        type="number"
        min={1}
        max={remaining}
        value={quantity}
        onChange={(e) => setQuantity(Number(e.target.value))}
        className="h-8 w-20"
      />
      <Button size="sm" onClick={receive} disabled={submitting || quantity <= 0 || quantity > remaining}>
        <PackageCheck className="h-3.5 w-3.5" /> Receive
      </Button>
    </div>
  );
}
