import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const TONE_MAP: Record<string, "default" | "secondary" | "destructive" | "success" | "warning" | "outline"> = {
  pending: "warning",
  confirmed: "default",
  processing: "default",
  ready: "default",
  completed: "success",
  cancelled: "destructive",
  refunded: "destructive",
  draft: "secondary",
  ordered: "default",
  partially_received: "warning",
  received: "success",
  unpaid: "destructive",
  partial: "warning",
  paid: "success",
  active: "success",
  inactive: "secondary",
  archived: "secondary",
  requested: "warning",
  approved: "default",
  rejected: "destructive",
};

export function StatusBadge({ status, className }: { status: string; className?: string }) {
  const tone = TONE_MAP[status] ?? "outline";
  return (
    <Badge variant={tone} className={cn("capitalize", className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  );
}
