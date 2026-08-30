"use client";

import { FileText } from "lucide-react";
import { toast } from "sonner";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

export function ViewReceiptButton({ path }: { path: string }) {
  async function open() {
    const supabase = createClient();
    const { data, error } = await supabase.storage.from("expense-receipts").createSignedUrl(path, 60);
    if (error || !data) {
      toast.error("Could not open receipt");
      return;
    }
    window.open(data.signedUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <Button variant="ghost" size="icon" onClick={open}>
      <FileText className="h-4 w-4" />
    </Button>
  );
}
