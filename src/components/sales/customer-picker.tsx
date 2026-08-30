"use client";

import * as React from "react";
import { Search, X, User } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export type CustomerOption = { id: string; full_name: string; phone: string | null };

export function CustomerPicker({
  value,
  onChange,
}: {
  value: CustomerOption | null;
  onChange: (customer: CustomerOption | null) => void;
}) {
  const [query, setQuery] = React.useState("");
  const [results, setResults] = React.useState<CustomerOption[]>([]);
  const [open, setOpen] = React.useState(false);

  const search = useDebouncedCallback(async (text: string) => {
    if (!text.trim()) {
      setResults([]);
      return;
    }
    const supabase = createClient();
    const { data } = await supabase
      .from("customers")
      .select("id, full_name, phone")
      .or(`full_name.ilike.%${text}%,phone.ilike.%${text}%`)
      .limit(8);
    setResults(data ?? []);
  }, 300);

  if (value) {
    return (
      <div className="flex items-center justify-between rounded-md border bg-muted px-3 py-2 text-sm">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">{value.full_name}</span>
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
          placeholder="Walk-in customer (search to attach one)"
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
      {open && query && results.length > 0 && (
        <div className="absolute z-20 mt-1 w-full rounded-md border bg-popover shadow-md">
          {results.map((c) => (
            <button
              key={c.id}
              type="button"
              className="flex w-full flex-col items-start px-3 py-2 text-left text-sm hover:bg-accent"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(c);
                setQuery("");
                setOpen(false);
              }}
            >
              <span className="font-medium">{c.full_name}</span>
              {c.phone && <span className="text-xs text-muted-foreground">{c.phone}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
