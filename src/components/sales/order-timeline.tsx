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
  placedAt,
}: {
  history: { id: string; status: OrderStatus; note: string | null; created_at: string }[];
  /** Order creation time, used for "Order Placed" when the order skipped that status. */
  placedAt: string;
}) {
  const terminalEvent = history.find((h) => h.status === "cancelled" || h.status === "refunded");

  // An order can jump straight to a later status (a paid POS sale goes directly
  // to "completed"), so a step counts as done when the order has reached *or
  // passed* it — not only when it has its own history row.
  const furthestReached = history.reduce((max, h) => Math.max(max, TIMELINE_STEPS.indexOf(h.status)), -1);

  const steps: OrderStatus[] = terminalEvent
    ? [...TIMELINE_STEPS.slice(0, furthestReached + 1), terminalEvent.status]
    : TIMELINE_STEPS;

  return (
    <ol className="space-y-4">
      {steps.map((step, index) => {
        const event = history.find((h) => h.status === step);
        const isTerminal = step === "cancelled" || step === "refunded";
        const done = isTerminal || index <= furthestReached;
        // Steps the order passed through implicitly have no row of their own;
        // only "Order Placed" has a reliable stand-in timestamp.
        const timestamp = event?.created_at ?? (step === "pending" ? placedAt : null);

        return (
          <li key={step} className="flex gap-3">
            <div
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 text-xs",
                !done && "border-muted-foreground/30 text-muted-foreground",
                done && isTerminal && "border-destructive bg-destructive text-destructive-foreground",
                done && !isTerminal && "border-primary bg-primary text-primary-foreground"
              )}
            >
              {done && <Check className="h-3.5 w-3.5" />}
            </div>
            <div>
              <p className={cn("text-sm font-medium", !done && "text-muted-foreground")}>{LABELS[step]}</p>
              {timestamp && (
                <p className="text-xs text-muted-foreground">
                  {format(new Date(timestamp), "d MMM yyyy, h:mm a")}
                  {event?.note ? ` — ${event.note}` : ""}
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
