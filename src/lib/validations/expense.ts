import { z } from "zod";

export const EXPENSE_CATEGORIES = [
  "rent",
  "utilities",
  "salaries",
  "marketing",
  "packaging",
  "transportation",
  "supplies",
  "manufacturing",
  "shipping",
  "platform_fees",
  "other",
] as const;

export const expenseSchema = z.object({
  category: z.enum(EXPENSE_CATEGORIES),
  description: z.string().min(1, "Description is required").max(300),
  amount: z.coerce.number().positive("Amount must be greater than zero"),
  expense_date: z.string().min(1, "Date is required"),
  payment_method: z.enum(["cash", "gcash", "maya", "bank_transfer", "card", "other"]).default("cash"),
  receipt_url: z.string().optional().nullable(),
  notes: z.string().max(1000).optional().nullable(),
});
export type ExpenseInput = z.infer<typeof expenseSchema>;
