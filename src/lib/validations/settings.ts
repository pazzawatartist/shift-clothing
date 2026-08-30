import { z } from "zod";

export const settingsSchema = z.object({
  business_name: z.string().min(1, "Business name is required").max(150),
  logo_url: z.string().optional().nullable(),
  address: z.string().max(500).optional().nullable(),
  contact_number: z.string().max(30).optional().nullable(),
  email: z.string().email("Enter a valid email").optional().nullable().or(z.literal("")),
  social_media: z.record(z.string()).optional().default({}),
  currency: z.string().min(1).max(10).default("PHP"),
  tax_percentage: z.coerce.number().min(0).max(100).default(0),
  low_stock_threshold: z.coerce.number().int().min(0).default(5),
  auto_deduct_on: z
    .enum(["pending", "confirmed", "processing", "ready", "completed", "cancelled", "refunded"])
    .default("completed"),
});
export type SettingsInput = z.infer<typeof settingsSchema>;

export const inviteUserSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(150),
  email: z.string().min(1, "Email is required").email("Enter a valid email"),
  role: z.enum(["admin", "manager", "staff"]),
});
export type InviteUserInput = z.infer<typeof inviteUserSchema>;

export const updateUserSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["admin", "manager", "staff"]).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});
export type UpdateUserInput = z.infer<typeof updateUserSchema>;
