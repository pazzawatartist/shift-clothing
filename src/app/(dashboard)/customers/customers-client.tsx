"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Users } from "lucide-react";
import { customerSchema, type CustomerInput } from "@/lib/validations/customer";
import { upsertCustomer } from "./actions";
import type { CustomerRow } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";
import { format } from "date-fns";

function CustomerDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<CustomerInput>({
    resolver: zodResolver(customerSchema),
    defaultValues: { full_name: "", phone: "", email: "", address: "", birthday: "", notes: "" },
  });

  async function onSubmit(values: CustomerInput) {
    const result = await upsertCustomer(null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Customer added");
    form.reset();
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Add Customer
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>New Customer</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input {...form.register("full_name")} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input {...form.register("phone")} />
            </div>
            <div className="space-y-2">
              <Label>Email</Label>
              <Input type="email" {...form.register("email")} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Address</Label>
              <Input {...form.register("address")} />
            </div>
            <div className="space-y-2">
              <Label>Birthday</Label>
              <Input type="date" {...form.register("birthday")} />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Notes</Label>
            <Textarea {...form.register("notes")} />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function CustomersClient({ customers }: { customers: CustomerRow[] }) {
  const router = useRouter();

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CustomerDialog onSaved={() => router.refresh()} />
      </div>
      {customers.length === 0 ? (
        <EmptyState icon={Users} title="No customers yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead className="text-right">Total Orders</TableHead>
              <TableHead className="text-right">Total Spent</TableHead>
              <TableHead>Last Purchase</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {customers.map((c) => (
              <TableRow key={c.id}>
                <TableCell>
                  <Link href={`/customers/${c.id}`} className="font-medium text-primary hover:underline">
                    {c.full_name}
                  </Link>
                </TableCell>
                <TableCell className="text-muted-foreground">{c.phone ?? "—"}</TableCell>
                <TableCell className="text-right">{c.total_orders}</TableCell>
                <TableCell className="text-right">{formatCurrency(c.total_spent)}</TableCell>
                <TableCell className="text-muted-foreground">
                  {c.last_purchase_at ? format(new Date(c.last_purchase_at), "d MMM yyyy") : "—"}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
