"use client";

import * as React from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { formatCurrency } from "@/lib/utils/currency";
import type { PosProduct } from "@/hooks/use-pos-catalog";

export function VariantSelectDialog({
  product,
  onClose,
  onSelect,
}: {
  product: PosProduct | null;
  onClose: () => void;
  onSelect: (variant: PosProduct["variants"][number]) => void;
}) {
  return (
    <Dialog open={!!product} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{product?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
          {product?.variants.map((v) => (
            <button
              key={v.id}
              disabled={v.available <= 0}
              onClick={() => onSelect(v)}
              className="flex flex-col items-start gap-1 rounded-md border p-3 text-left text-sm hover:border-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <span className="font-medium">
                {v.size} / {v.color}
              </span>
              <span className="text-muted-foreground">{formatCurrency(v.selling_price)}</span>
              <Badge variant={v.available > 0 ? "secondary" : "destructive"} className="text-xs">
                {v.available > 0 ? `${v.available} available` : "Out of stock"}
              </Badge>
            </button>
          ))}
        </div>
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
      </DialogContent>
    </Dialog>
  );
}
