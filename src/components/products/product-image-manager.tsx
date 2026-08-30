"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Star, Trash2, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { uploadProductImage } from "@/app/(dashboard)/products/actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { ProductImageRow } from "@/types/database.types";

type ProductImageSummary = Pick<ProductImageRow, "id" | "url" | "is_primary">;

export function ProductImageManager({ productId, images }: { productId: string; images: ProductImageSummary[] }) {
  const router = useRouter();
  const [uploading, setUploading] = React.useState(false);
  const inputRef = React.useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be smaller than 5MB");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const path = `${productId}/${Date.now()}-${file.name.replace(/\s+/g, "-")}`;
      const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file);
      if (uploadError) {
        toast.error("Upload failed: " + uploadError.message);
        return;
      }
      const {
        data: { publicUrl },
      } = supabase.storage.from("product-images").getPublicUrl(path);

      const result = await uploadProductImage(productId, publicUrl, images.length === 0);
      if (result.error) {
        toast.error(result.error);
        return;
      }
      toast.success("Image uploaded");
      router.refresh();
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  async function setPrimary(imageId: string) {
    const supabase = createClient();
    await supabase.from("product_images").update({ is_primary: false }).eq("product_id", productId);
    await supabase.from("product_images").update({ is_primary: true }).eq("id", imageId);
    router.refresh();
  }

  async function deleteImage(imageId: string) {
    const supabase = createClient();
    await supabase.from("product_images").delete().eq("id", imageId);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Product Images</CardTitle>
        <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={uploading}>
          <Upload className="h-4 w-4" /> {uploading ? "Uploading..." : "Upload Image"}
        </Button>
        <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
      </CardHeader>
      <CardContent>
        {images.length === 0 ? (
          <p className="text-sm text-muted-foreground">No images yet.</p>
        ) : (
          <div className="flex flex-wrap gap-3">
            {images.map((img) => (
              <div key={img.id} className="group relative h-24 w-24 overflow-hidden rounded-md border">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={img.url} alt="" className="h-full w-full object-cover" />
                <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/50 opacity-0 transition-opacity group-hover:opacity-100">
                  <Button
                    type="button"
                    size="icon"
                    variant={img.is_primary ? "default" : "secondary"}
                    className="h-7 w-7"
                    onClick={() => setPrimary(img.id)}
                  >
                    <Star className="h-3.5 w-3.5" />
                  </Button>
                  <Button type="button" size="icon" variant="destructive" className="h-7 w-7" onClick={() => deleteImage(img.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
                {img.is_primary && <div className="absolute left-1 top-1 rounded bg-primary px-1 text-[10px] text-primary-foreground">Primary</div>}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
