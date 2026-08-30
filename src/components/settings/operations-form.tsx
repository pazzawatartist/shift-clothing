"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { SettingsRow } from "@/types/database.types";

type FormValues = {
  tax_percentage: number;
  low_stock_threshold: number;
  auto_deduct_on: string;
};

export function OperationsForm({ settings }: { settings: SettingsRow }) {
  const router = useRouter();
  const form = useForm<FormValues>({
    defaultValues: {
      tax_percentage: settings.tax_percentage,
      low_stock_threshold: settings.low_stock_threshold,
      auto_deduct_on: settings.auto_deduct_on,
    },
  });

  async function onSubmit(values: FormValues) {
    const result = await updateSettings({
      business_name: settings.business_name,
      logo_url: settings.logo_url,
      address: settings.address,
      contact_number: settings.contact_number,
      email: settings.email,
      social_media: settings.social_media,
      currency: settings.currency,
      tax_percentage: values.tax_percentage,
      low_stock_threshold: values.low_stock_threshold,
      auto_deduct_on: values.auto_deduct_on,
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <Card className="mt-4 max-w-xl">
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Currency</Label>
            <Input value="PHP (₱)" disabled />
          </div>
          <div className="space-y-2">
            <Label>Tax Percentage (%)</Label>
            <Input type="number" step="0.01" {...form.register("tax_percentage", { valueAsNumber: true })} />
          </div>
          <div className="space-y-2">
            <Label>Low Stock Threshold</Label>
            <Input type="number" {...form.register("low_stock_threshold", { valueAsNumber: true })} />
            <p className="text-xs text-muted-foreground">Default reorder level suggested for new variants.</p>
          </div>
          <div className="space-y-2">
            <Label>Automatically deduct inventory when order status becomes:</Label>
            <Select
              defaultValue={form.getValues("auto_deduct_on")}
              onValueChange={(v) => form.setValue("auto_deduct_on", v)}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="confirmed">Confirmed</SelectItem>
                <SelectItem value="processing">Processing</SelectItem>
                <SelectItem value="ready">Ready</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
