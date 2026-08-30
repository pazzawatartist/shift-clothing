import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getOrderDetail } from "@/services/orders";
import { NewReturnForm } from "@/components/sales/new-return-form";

export default async function NewReturnPage({
  searchParams,
}: {
  searchParams: Promise<{ order_id?: string }>;
}) {
  const { order_id } = await searchParams;
  if (!order_id) notFound();

  const supabase = await createClient();
  const order = await getOrderDetail(supabase, order_id);
  if (!order) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold">New Return — {order.order_number}</h1>
        <p className="text-muted-foreground">Select items, choose refund or exchange, and submit for approval.</p>
      </div>
      <NewReturnForm order={order} />
    </div>
  );
}
