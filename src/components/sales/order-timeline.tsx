import { Check } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import type { OrderStatus } from "@/types/database.types";

const TIMELINE_STEPS: OrderStatus[] = ["pending", "confirmed", "processing", "ready", "completed"];
const LABELS: Record<OrderStatus, string> = {
  pending: "Order Placed",
  confirmed: "Payment Confirmed",
  processing: "Processing",
  ready: "Packed",
  completed: "Completed",
  cancelled: "Cancelled",
  refunded: "Refunded",
};

export function OrderTimeline({
  history,
}: {
  history: { id: string; status: OrderStatus; note: string | null; created_at: string }[];
}) {
  const reached = new Set(history.map((h) => h.status));
  const lastEvent = history.at(-1);
  const isCancelledOrRefunded = history.some((h) => h.status === "cancelled" || h.status === "refunded");
  const steps: OrderStatus[] = isCancelledOrRefunded
    ? [...TIMELINE_STEPS.filter((s) => reached.has(s)), ...(lastEvent ? [lastEvent.status] : [])].filter(
        (v, i, arr) => arr.indexOf(v) === i
      )
    : TIMELINE_STEPS;

  return (
    <ol className="space-y-4">
      {steps.map((step) => {
        const event = history.find((h) => h.status === step);
        const done = Boolean(event);
        return (
          <li key={step} className="flex gap-3">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30 text-muted-foreground"
              )}
            >
              {done && <Check className="h-3.5 w-3.5" />}
            </div>
            <div>
              <p className={cn("text-sm font-medium capitalize", !done && "text-muted-foreground")}>{LABELS[step]}</p>
              {event && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(event.created_at), "d MMM yyyy, h:mm a")}
                  {event.note ? ` — ${event.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
