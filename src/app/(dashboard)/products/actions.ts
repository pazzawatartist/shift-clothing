"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { toFriendlyError } from "@/lib/errors";
import { productSchema } from "@/lib/validations/product";
import { slugify } from "@/lib/utils/sku";

export type FormResult = { error?: string; success?: boolean; id?: string };

export async function createProduct(input: unknown): Promise<FormResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: product, error: productError } = await supabase
    .from("products")
    .insert({
      sku: data.sku,
      name: data.name,
      slug: data.slug ? slugify(data.slug) : slugify(`${data.name}-${data.sku}`),
      description: data.description ?? null,
      category_id: data.category_id ?? null,
      collection_id: data.collection_id ?? null,
      supplier_id: data.supplier_id ?? null,
      brand: data.brand ?? null,
      status: data.status,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      discount_price: data.discount_price ?? null,
      manufacturing_cost: data.manufacturing_cost,
      packaging_cost: data.packaging_cost,
      other_cost: data.other_cost,
      created_by: user?.id ?? null,
    })
    .select("id")
    .single();

  if (productError || !product) {
    return { error: toFriendlyError(productError) };
  }

  const variantRows = data.variants.map((v) => ({
    product_id: product.id,
    sku: v.sku,
    size: v.size,
    color: v.color,
    barcode: v.barcode || null,
    cost_price: v.cost_price,
    selling_price: v.selling_price,
    reorder_level: v.reorder_level,
    status: v.status,
  }));

  const { data: insertedVariants, error: variantError } = await supabase
    .from("product_variants")
    .insert(variantRows)
    .select("id, sku");

  if (variantError) {
    await supabase.from("products").delete().eq("id", product.id);
    return { error: toFriendlyError(variantError) };
  }

  const initialStockBySku = new Map(data.variants.map((v) => [v.sku, v.initial_stock]));
  for (const variant of insertedVariants ?? []) {
    const initialStock = initialStockBySku.get(variant.sku) ?? 0;
    if (initialStock > 0) {
      await supabase.rpc("record_manual_stock_movement", {
        p_variant_id: variant.id,
        p_type: "stock_in",
        p_quantity: initialStock,
        p_notes: "Initial stock on product creation",
      });
    } else {
      // Ensure an inventory row exists even with zero initial stock.
      await supabase.from("inventory").insert({ product_variant_id: variant.id }).select().maybeSingle();
    }
  }

  revalidatePath("/products");
  return { success: true, id: product.id };
}

export async function updateProduct(id: string, input: unknown): Promise<FormResult> {
  const parsed = productSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const data = parsed.data;
  const supabase = await createClient();

  const { error: productError } = await supabase
    .from("products")
    .update({
      sku: data.sku,
      name: data.name,
      description: data.description ?? null,
      category_id: data.category_id ?? null,
      collection_id: data.collection_id ?? null,
      supplier_id: data.supplier_id ?? null,
      brand: data.brand ?? null,
      status: data.status,
      cost_price: data.cost_price,
      selling_price: data.selling_price,
      discount_price: data.discount_price ?? null,
      manufacturing_cost: data.manufacturing_cost,
      packaging_cost: data.packaging_cost,
      other_cost: data.other_cost,
    })
    .eq("id", id);

  if (productError) {
    return { error: toFriendlyError(productError) };
  }

  const existingVariants = data.variants.filter((v) => v.id);
  const newVariants = data.variants.filter((v) => !v.id);

  for (const variant of existingVariants) {
    const { error } = await supabase
      .from("product_variants")
      .update({
        sku: variant.sku,
        size: variant.size,
        color: variant.color,
        barcode: variant.barcode || null,
        cost_price: variant.cost_price,
        selling_price: variant.selling_price,
        reorder_level: variant.reorder_level,
        status: variant.status,
      })
      .eq("id", variant.id!);
    if (error) return { error: toFriendlyError(error) };
  }

  if (newVariants.length > 0) {
    const { data: inserted, error } = await supabase
      .from("product_variants")
      .insert(newVariants.map((v) => ({ product_id: id, sku: v.sku, size: v.size, color: v.color, barcode: v.barcode || null, cost_price: v.cost_price, selling_price: v.selling_price, reorder_level: v.reorder_level, status: v.status })))
      .select("id, sku");
    if (error) return { error: toFriendlyError(error) };

    const initialStockBySku = new Map(newVariants.map((v) => [v.sku, v.initial_stock]));
    for (const variant of inserted ?? []) {
      const initialStock = initialStockBySku.get(variant.sku) ?? 0;
      if (initialStock > 0) {
        await supabase.rpc("record_manual_stock_movement", {
          p_variant_id: variant.id,
          p_type: "stock_in",
          p_quantity: initialStock,
          p_notes: "Initial stock for new variant",
        });
      }
    }
  }

  revalidatePath("/products");
  revalidatePath(`/products/${id}`);
  return { success: true, id };
}

export async function archiveProduct(id: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("products").update({ status: "archived" }).eq("id", id);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/products");
  return { success: true };
}

export async function deleteProductVariant(variantId: string): Promise<FormResult> {
  const supabase = await createClient();
  const { error } = await supabase.from("product_variants").update({ status: "inactive" }).eq("id", variantId);
  if (error) return { error: toFriendlyError(error) };
  revalidatePath("/products");
  return { success: true };
}

export async function uploadProductImage(productId: string, url: string, isPrimary: boolean): Promise<FormResult> {
  const supabase = await createClient();
  if (isPrimary) {
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
  }
  const { error } = await supabase.from("product_images").insert({ product_id: productId, url, is_primary: isPrimary });
  if (error) return { error: toFriendlyError(error) };
  revalidatePath(`/products/${productId}`);
  return { success: true };
}
