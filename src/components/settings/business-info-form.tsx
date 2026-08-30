"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { updateSettings } from "@/app/(dashboard)/settings/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import type { SettingsRow } from "@/types/database.types";

type FormValues = {
  business_name: string;
  logo_url: string;
  address: string;
  contact_number: string;
  email: string;
  facebook: string;
  instagram: string;
  tiktok: string;
};

export function BusinessInfoForm({ settings }: { settings: SettingsRow }) {
  const router = useRouter();
  const socialMedia = (settings.social_media as Record<string, string>) ?? {};
  const [uploading, setUploading] = React.useState(false);
  const form = useForm<FormValues>({
    defaultValues: {
      business_name: settings.business_name,
      logo_url: settings.logo_url ?? "",
      address: settings.address ?? "",
      contact_number: settings.contact_number ?? "",
      email: settings.email ?? "",
      facebook: socialMedia.facebook ?? "",
      instagram: socialMedia.instagram ?? "",
      tiktok: socialMedia.tiktok ?? "",
    },
  });

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    const supabase = createClient();
    const path = `logo-${Date.now()}`;
    const { error } = await supabase.storage.from("business-logo").upload(path, file, { upsert: true });
    setUploading(false);
    if (error) {
      toast.error("Upload failed: " + error.message);
      return;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("business-logo").getPublicUrl(path);
    form.setValue("logo_url", publicUrl);
    toast.success("Logo uploaded");
  }

  async function onSubmit(values: FormValues) {
    const result = await updateSettings({
      business_name: values.business_name,
      logo_url: values.logo_url,
      address: values.address,
      contact_number: values.contact_number,
      email: values.email,
      social_media: { facebook: values.facebook, instagram: values.instagram, tiktok: values.tiktok },
      currency: settings.currency,
      tax_percentage: settings.tax_percentage,
      low_stock_threshold: settings.low_stock_threshold,
      auto_deduct_on: settings.auto_deduct_on,
    });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <Card className="mt-4 max-w-2xl">
      <CardContent className="space-y-4 pt-6">
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="flex items-center gap-4">
            {form.watch("logo_url") && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={form.watch("logo_url")} alt="Logo" className="h-16 w-16 rounded-md border object-contain" />
            )}
            <div>
              <Label>Business Logo</Label>
              <Input type="file" accept="image/*" onChange={handleLogoUpload} disabled={uploading} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Business Name</Label>
            <Input {...form.register("business_name")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Contact Number</Label>
              <Input {...form.register("contact_number")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea {...form.register("address")} />
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label className="text-xs">Facebook</Label>
              <Input {...form.register("facebook")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">Instagram</Label>
              <Input {...form.register("instagram")} />
            </div>
            <div className="space-y-2">
              <Label className="text-xs">TikTok</Label>
              <Input {...form.register("tiktok")} />
            </div>
          </div>
          <Button type="submit" disabled={form.formState.isSubmitting}>
            {form.formState.isSubmitting ? "Saving..." : "Save Changes"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
