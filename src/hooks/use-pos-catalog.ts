"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";

export type PosProduct = {
  id: string;
  name: string;
  selling_price: number;
  image_url: string | null;
  variants: {
    id: string;
    sku: string;
    size: string;
    color: string;
    selling_price: number;
    available: number;
  }[];
};

export function usePosCatalog(search: string, categoryId: string | null) {
  return useQuery({
    queryKey: ["pos-catalog", search, categoryId],
    queryFn: async (): Promise<PosProduct[]> => {
      const supabase = createClient();
      let query = supabase
        .from("products")
        .select(
          "id, name, selling_price, category_id, product_images(url, is_primary), product_variants(id, sku, size, color, selling_price, status, inventory(quantity_on_hand, quantity_reserved))"
        )
        .eq("status", "active")
        .order("name")
        .limit(60);

      if (search) query = query.ilike("name", `%${search}%`);
      if (categoryId) query = query.eq("category_id", categoryId);

      const { data, error } = await query;
      if (error) throw error;

      type Raw = {
        id: string;
        name: string;
        selling_price: number;
        product_images: { url: string; is_primary: boolean }[];
        product_variants: {
          id: string;
          sku: string;
          size: string;
          color: string;
          selling_price: number;
          status: string;
          // Singular, not an array: product_variant_id is UNIQUE on inventory,
          // so PostgREST treats this as a one-to-one embed.
          inventory: { quantity_on_hand: number; quantity_reserved: number } | null;
        }[];
      };

      return ((data ?? []) as unknown as Raw[])
        .map((p) => {
          const primaryImage = p.product_images.find((i) => i.is_primary) ?? p.product_images[0];
          return {
            id: p.id,
            name: p.name,
            selling_price: p.selling_price,
            image_url: primaryImage?.url ?? null,
            variants: p.product_variants
              .filter((v) => v.status === "active")
              .map((v) => ({
                id: v.id,
                sku: v.sku,
                size: v.size,
                color: v.color,
                selling_price: v.selling_price,
                available: (v.inventory?.quantity_on_hand ?? 0) - (v.inventory?.quantity_reserved ?? 0),
              })),
          };
        })
        .filter((p) => p.variants.length > 0);
    },
    staleTime: 15_000,
  });
}
