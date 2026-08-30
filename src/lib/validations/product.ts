import { z } from "zod";

export const STANDARD_SIZES = ["XS", "S", "M", "L", "XL", "XXL", "XXXL", "Custom"] as const;
export const STANDARD_COLORS = ["Black", "White", "Red", "Blue", "Beige", "Brown", "Custom"] as const;

export const variantSchema = z.object({
  id: z.string().uuid().optional(),
  sku: z.string().min(1, "SKU is required").max(60),
  size: z.string().min(1, "Size is required").max(30),
  color: z.string().min(1, "Color is required").max(30),
  barcode: z.string().max(60).optional().nullable(),
  cost_price: z.coerce.number().min(0, "Cost price cannot be negative"),
  selling_price: z.coerce.number().min(0, "Selling price cannot be negative"),
  reorder_level: z.coerce.number().int().min(0).default(5),
  status: z.enum(["active", "inactive"]).default("active"),
  initial_stock: z.coerce.number().int().min(0).default(0),
});
export type VariantInput = z.infer<typeof variantSchema>;

export const productSchema = z
  .object({
    sku: z.string().min(1, "SKU is required").max(60),
    name: z.string().min(1, "Product name is required").max(200),
    slug: z.string().optional(),
    description: z.string().max(4000).optional().nullable(),
    category_id: z.string().uuid().optional().nullable(),
    collection_id: z.string().uuid().optional().nullable(),
    supplier_id: z.string().uuid().optional().nullable(),
    brand: z.string().max(100).optional().nullable(),
    status: z.enum(["active", "draft", "archived"]).default("draft"),
    cost_price: z.coerce.number().min(0),
    selling_price: z.coerce.number().min(0),
    discount_price: z.coerce.number().min(0).optional().nullable(),
    manufacturing_cost: z.coerce.number().min(0).default(0),
    packaging_cost: z.coerce.number().min(0).default(0),
    other_cost: z.coerce.number().min(0).default(0),
    variants: z.array(variantSchema).min(1, "Add at least one size/color variant"),
  })
  .refine((data) => !data.discount_price || data.discount_price <= data.selling_price, {
    message: "Discount price cannot exceed the selling price",
    path: ["discount_price"],
  })
  .refine(
    (data) => {
      const keys = data.variants.map((v) => `${v.size}::${v.color}`);
      return new Set(keys).size === keys.length;
    },
    { message: "Each size/color combination must be unique", path: ["variants"] }
  );
export type ProductInput = z.infer<typeof productSchema>;
