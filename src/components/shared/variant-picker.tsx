"use client";

import * as React from "react";
import { Search, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";
import { cn } from "@/lib/utils";

export type VariantOption = {
  id: string;
  sku: string;
  size: string;
  color: string;
  productName: string;
};

export function VariantPicker({
  value,
  onChange,
  placeholder = "Search by SKU or product name...",
}: {
  value: VariantOption | null;
  onChange: (variant: VariantOption | null) => void;
  placeholder?: string;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<VariantOption[]>([]);
  const [open, setOpen] = React.useState(false);
  const [loading, setLoading] = React.useState(false);

  const search = useDebouncedCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { data } = await supabase
      .from("product_variants")
      .select("id, sku, size, color, products(name)")
      .or(`sku.ilike.%${text}%,barcode.eq.${text}`)
      .eq("status", "active")
      .limit(10);
    setResults(
      ((data ?? []) as unknown as { id: string; sku: string; size: string; color: string; products: { name: string } | null }[]).map(
        (v) => ({ id: v.id, sku: v.sku, size: v.size, color: v.color, productName: v.products?.name ?? "" })
      )
    );
    setLoading(false);
  }, 300);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
        <div>
          <p className="font-medium">{value.productName}</p>
          <p className="text-muted-foreground">
            {value.sku} — {value.size} / {value.color}
          </p>
        </div>
        <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-foreground">
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            search(e.target.value);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
        />
      </div>
      {open && query && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {loading && <div className="p-3 text-sm text-muted-foreground">Searching...</div>}
          {!loading && results.length === 0 && (
            <div className="p-3 text-sm text-muted-foreground">No matching variants</div>
          )}
          {results.map((r) => (
            <button
              type="button"
              key={r.id}
              className={cn("flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left text-sm hover:bg-accent")}
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(r);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium">{r.productName}</span>
              <span className="text-xs text-muted-foreground">
                {r.sku} — {r.size} / {r.color}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
