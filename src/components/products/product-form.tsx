"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Trash2, Wand2 } from "lucide-react";
import { productSchema, type ProductInput, STANDARD_SIZES, STANDARD_COLORS } from "@/lib/validations/product";
import { createProduct, updateProduct } from "@/app/(dashboard)/products/actions";
import { suggestVariantSku, generateBarcode } from "@/lib/utils/sku";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/utils/currency";

type LookupOption = { id: string; name: string };

export function ProductForm({
  mode,
  initialProduct,
  categories,
  collections,
  suppliers,
}: {
  mode: "create" | "edit";
  initialProduct?: ProductInput & { id: string; variantStock?: Record<string, number> };
  categories: LookupOption[];
  collections: LookupOption[];
  suppliers: LookupOption[];
}) {
  const router = useRouter();
  const [selectedSizes, setSelectedSizes] = React.useState<string[]>([]);
  const [selectedColors, setSelectedColors] = React.useState<string[]>([]);

  const form = useForm<ProductInput>({
    resolver: zodResolver(productSchema),
    defaultValues: initialProduct ?? {
      sku: "",
      name: "",
      description: "",
      status: "draft",
      cost_price: 0,
      selling_price: 0,
      manufacturing_cost: 0,
      packaging_cost: 0,
      other_cost: 0,
      variants: [],
    },
  });

  // keyName avoids RHF overwriting our own `variants[].id` (the real DB variant id) with its
  // internal per-row tracking key — that id is what update logic uses to tell existing vs. new rows apart.
  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "variants",
    keyName: "fieldId",
  });

  const productSku = form.watch("sku");
  const totalCost =
    Number(form.watch("manufacturing_cost") || 0) +
    Number(form.watch("packaging_cost") || 0) +
    Number(form.watch("other_cost") || 0);
  const grossProfit = Number(form.watch("selling_price") || 0) - totalCost;
  const margin = form.watch("selling_price") > 0 ? (grossProfit / Number(form.watch("selling_price"))) * 100 : 0;

  function toggle(list: string[], setList: (v: string[]) => void, value: string) {
    setList(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  }

  function generateVariants() {
    if (selectedSizes.length === 0 || selectedColors.length === 0) {
      toast.error("Select at least one size and one color");
      return;
    }
    const existing = new Set(fields.map((f) => `${f.size}::${f.color}`));
    let sequence = fields.length + 1;
    selectedColors.forEach((color) => {
      selectedSizes.forEach((size) => {
        const key = `${size}::${color}`;
        if (existing.has(key)) return;
        append({
          sku: suggestVariantSku(productSku || "PROD", color, size, sequence),
          size,
          color,
          barcode: generateBarcode(sequence),
          cost_price: form.getValues("cost_price") || 0,
          selling_price: form.getValues("selling_price") || 0,
          reorder_level: 5,
          status: "active",
          initial_stock: 0,
        });
        sequence += 1;
      });
    });
  }

  async function onSubmit(values: ProductInput) {
    const result =
      mode === "create" ? await createProduct(values) : await updateProduct(initialProduct!.id, values);

    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(mode === "create" ? "Product created" : "Product updated");
    router.push(mode === "create" ? `/products/${result.id}` : `/products/${initialProduct!.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Product Name</Label>
                <Input {...form.register("name")} />
                {form.formState.errors.name && (
                  <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>SKU</Label>
                <Input {...form.register("sku")} placeholder="TEE-OVERSIZED-001" />
                {form.formState.errors.sku && (
                  <p className="text-sm text-destructive">{form.formState.errors.sku.message}</p>
                )}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea rows={4} {...form.register("description")} />
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Category</Label>
                <Select
                  defaultValue={form.getValues("category_id") ?? undefined}
                  onValueChange={(v) => form.setValue("category_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Collection</Label>
                <Select
                  defaultValue={form.getValues("collection_id") ?? undefined}
                  onValueChange={(v) => form.setValue("collection_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select collection" />
                  </SelectTrigger>
                  <SelectContent>
                    {collections.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Supplier</Label>
                <Select
                  defaultValue={form.getValues("supplier_id") ?? undefined}
                  onValueChange={(v) => form.setValue("supplier_id", v)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select supplier" />
                  </SelectTrigger>
                  <SelectContent>
                    {suppliers.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Brand</Label>
                <Input {...form.register("brand")} placeholder="SHIFT" />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  defaultValue={form.getValues("status")}
                  onValueChange={(v) => form.setValue("status", v as ProductInput["status"])}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="archived">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pricing &amp; Costing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cost Price</Label>
                <Input type="number" step="0.01" {...form.register("cost_price", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label>Selling Price</Label>
                <Input type="number" step="0.01" {...form.register("selling_price", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Discount Price (optional)</Label>
              <Input type="number" step="0.01" {...form.register("discount_price", { valueAsNumber: true })} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label className="text-xs">Manufacturing</Label>
                <Input type="number" step="0.01" {...form.register("manufacturing_cost", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Packaging</Label>
                <Input type="number" step="0.01" {...form.register("packaging_cost", { valueAsNumber: true })} />
              </div>
              <div className="space-y-2">
                <Label className="text-xs">Other</Label>
                <Input type="number" step="0.01" {...form.register("other_cost", { valueAsNumber: true })} />
              </div>
            </div>
            <div className="rounded-md bg-muted p-3 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total Product Cost</span>
                <span className="font-medium">{formatCurrency(totalCost)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Gross Profit / Unit</span>
                <span className="font-medium">{formatCurrency(grossProfit)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Margin</span>
                <span className="font-medium">{margin.toFixed(2)}%</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Variants</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-2 text-sm font-medium">Sizes</p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_SIZES.map((size) => (
                  <button
                    type="button"
                    key={size}
                    onClick={() => toggle(selectedSizes, setSelectedSizes, size)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-sm",
                      selectedSizes.includes(size) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    {size}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className="mb-2 text-sm font-medium">Colors</p>
              <div className="flex flex-wrap gap-2">
                {STANDARD_COLORS.map((color) => (
                  <button
                    type="button"
                    key={color}
                    onClick={() => toggle(selectedColors, setSelectedColors, color)}
                    className={cn(
                      "rounded-md border px-3 py-1 text-sm",
                      selectedColors.includes(color) ? "border-primary bg-primary text-primary-foreground" : "hover:bg-accent"
                    )}
                  >
                    {color}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <Button type="button" variant="secondary" onClick={generateVariants}>
            <Wand2 className="h-4 w-4" /> Generate Variants
          </Button>
          {form.formState.errors.variants?.message && (
            <p className="text-sm text-destructive">{form.formState.errors.variants.message}</p>
          )}

          {fields.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>Size</TableHead>
                  <TableHead>Color</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Reorder</TableHead>
                  <TableHead>{mode === "edit" ? "In Stock" : "Initial Stock"}</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field, index) => {
                  const isExisting = Boolean(field.id && initialProduct?.variantStock?.[field.id] !== undefined);
                  return (
                    <TableRow key={field.fieldId}>
                      <TableCell>
                        <Input className="w-32" {...form.register(`variants.${index}.sku` as const)} />
                      </TableCell>
                      <TableCell>
                        <Input className="w-20" {...form.register(`variants.${index}.size` as const)} />
                      </TableCell>
                      <TableCell>
                        <Input className="w-24" {...form.register(`variants.${index}.color` as const)} />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          {...form.register(`variants.${index}.cost_price` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          step="0.01"
                          className="w-24"
                          {...form.register(`variants.${index}.selling_price` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20"
                          {...form.register(`variants.${index}.reorder_level` as const, { valueAsNumber: true })}
                        />
                      </TableCell>
                      <TableCell>
                        {isExisting ? (
                          <Badge variant="outline">{initialProduct?.variantStock?.[field.id!]} on hand</Badge>
                        ) : (
                          <Input
                            type="number"
                            className="w-20"
                            {...form.register(`variants.${index}.initial_stock` as const, { valueAsNumber: true })}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Select
                          defaultValue={field.status}
                          onValueChange={(v) => form.setValue(`variants.${index}.status`, v as "active" | "inactive")}
                        >
                          <SelectTrigger className="w-28">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">Active</SelectItem>
                            <SelectItem value="inactive">Inactive</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        {!isExisting && (
                          <Button type="button" variant="ghost" size="icon" onClick={() => remove(index)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? "Saving..." : mode === "create" ? "Create Product" : "Save Changes"}
        </Button>
      </div>
    </form>
  );
}
