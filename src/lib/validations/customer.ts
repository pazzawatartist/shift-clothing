import { z } from "zod";

export const customerSchema = z.object({
  full_name: z.string().min(1, "Full name is required").max(150),
  phone: z.string().max(30).optional().nullable(),
  email: z.string().email("Enter a valid email").optional().nullable().or(z.literal("")),
  address: z.string().max(500).optional().nullable(),
  birthday: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type CustomerInput = z.infer<typeof customerSchema>;
