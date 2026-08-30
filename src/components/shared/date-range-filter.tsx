"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";

export type RangePreset = "today" | "week" | "month" | "year" | "custom";

export function getDateRangeFromPreset(preset: RangePreset, from?: string, to?: string) {
  const now = new Date();
  const toDate = (d: Date) => d.toISOString().slice(0, 10);

  if (preset === "custom" && from && to) return { from, to };

  const end = toDate(now);
  switch (preset) {
    case "today":
      return { from: end, to: end };
    case "week": {
      const start = new Date(now);
      start.setDate(start.getDate() - 6);
      return { from: toDate(start), to: end };
    }
    case "year": {
      const start = new Date(now.getFullYear(), 0, 1);
      return { from: toDate(start), to: end };
    }
    case "month":
    default: {
      const start = new Date(now.getFullYear(), now.getMonth(), 1);
      return { from: toDate(start), to: end };
    }
  }
}

export function DateRangeFilter() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const preset = (searchParams.get("range") as RangePreset) ?? "month";

  function updateParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={preset} onValueChange={(v) => updateParam("range", v)}>
        <SelectTrigger className="w-44">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="today">Today</SelectItem>
          <SelectItem value="week">This Week</SelectItem>
          <SelectItem value="month">This Month</SelectItem>
          <SelectItem value="year">This Year</SelectItem>
          <SelectItem value="custom">Custom Range</SelectItem>
        </SelectContent>
      </Select>
      {preset === "custom" && (
        <>
          <Input
            type="date"
            className="w-40"
            defaultValue={searchParams.get("from") ?? ""}
            onChange={(e) => updateParam("from", e.target.value)}
          />
          <Input
            type="date"
            className="w-40"
            defaultValue={searchParams.get("to") ?? ""}
            onChange={(e) => updateParam("to", e.target.value)}
          />
        </>
      )}
    </div>
  );
}
