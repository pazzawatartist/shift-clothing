import { z } from "zod";

const slugify = (value: string) =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

export const categorySchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().optional(),
  description: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type CategoryInput = z.infer<typeof categorySchema>;

export const collectionSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  slug: z.string().optional(),
  description: z.string().max(1000).optional().nullable(),
  season: z.string().max(100).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type CollectionInput = z.infer<typeof collectionSchema>;

export const supplierSchema = z.object({
  name: z.string().min(1, "Supplier name is required").max(150),
  contact_person: z.string().max(150).optional().nullable(),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Enter a valid email").max(150).optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
  status: z.enum(["active", "inactive"]).default("active"),
});
export type SupplierInput = z.infer<typeof supplierSchema>;

export { slugify };
