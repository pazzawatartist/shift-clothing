"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "@/hooks/use-debounced-callback";

export function SearchBox({ placeholder, paramKey = "search" }: { placeholder: string; paramKey?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const debouncedSearch = useDebouncedCallback((value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(paramKey, value);
    else params.delete(paramKey);
    params.delete("page");
    router.push(`${pathname}?${params.toString()}`);
  }, 350);

  return (
    <div className="relative max-w-sm">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder}
        className="pl-9"
        defaultValue={searchParams.get(paramKey) ?? ""}
        onChange={(e) => debouncedSearch(e.target.value)}
      />
    </div>
  );
}
