"use client";

import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, X, PackageCheck } from "lucide-react";
import { resolveReturn } from "@/app/(dashboard)/sales/actions";
import { Button } from "@/components/ui/button";
import type { ReturnStatus } from "@/types/database.types";

export function ResolveReturnButtons({ returnId, status }: { returnId: string; status: ReturnStatus }) {
  const router = useRouter();

  async function apply(next: ReturnStatus) {
    const result = await resolveReturn({ return_id: returnId, status: next });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(`Return ${next}`);
    router.refresh();
  }

  if (status === "requested") {
    return (
      <div className="flex gap-2">
        <Button size="sm" variant="outline" onClick={() => apply("rejected")}>
          <X className="h-3.5 w-3.5" /> Reject
        </Button>
        <Button size="sm" onClick={() => apply("approved")}>
          <Check className="h-3.5 w-3.5" /> Approve
        </Button>
      </div>
    );
  }

  if (status === "approved") {
    return (
      <Button size="sm" onClick={() => apply("completed")}>
        <PackageCheck className="h-3.5 w-3.5" /> Complete &amp; Restock
      </Button>
    );
  }

  return null;
}
