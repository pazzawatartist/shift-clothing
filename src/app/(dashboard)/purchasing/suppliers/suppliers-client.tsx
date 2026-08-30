"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Truck } from "lucide-react";
import { supplierSchema, type SupplierInput } from "@/lib/validations/catalog";
import { upsertSupplier, deleteSupplier } from "./actions";
import type { SupplierWithStats } from "@/services/purchasing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils/currency";

function SupplierDialog({ supplier, onSaved }: { supplier?: SupplierWithStats; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<SupplierInput>({
    resolver: zodResolver(supplierSchema),
    defaultValues: {
      name: supplier?.name ?? "",
      contact_person: supplier?.contact_person ?? "",
      phone: supplier?.phone ?? "",
      email: supplier?.email ?? "",
      address: "",
      notes: "",
      status: (supplier?.status as "active" | "inactive") ?? "active",
    },
  });

  async function onSubmit(values: SupplierInput) {
    const result = await upsertSupplier(supplier?.id ?? null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(supplier ? "Supplier updated" : "Supplier created");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {supplier ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Supplier
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{supplier ? "Edit Supplier" : "New Supplier"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Supplier Name</Label>
              <Input {...form.register("name")} />
            </div>
            <div className="space-y-2">
              <Label>Contact Person</Label>
              <Input {...form.register("contact_person")} />
            </div>
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
          <div className="space-y-2">
            <Label>Address</Label>
            <Textarea {...form.register("address")} />
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

export function SuppliersClient({ suppliers }: { suppliers: SupplierWithStats[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  async function handleDelete(id: string) {
    const result = await deleteSupplier(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Supplier deleted");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <SupplierDialog onSaved={refresh} />
      </div>
      {suppliers.length === 0 ? (
        <EmptyState icon={Truck} title="No suppliers yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Total Purchased</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers.map((s) => {
              const total = s.purchases.reduce((sum, p) => sum + p.total_cost, 0);
              return (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {s.contact_person}
                    {s.phone ? ` — ${s.phone}` : ""}
                  </TableCell>
                  <TableCell>
                    <Badge variant={s.status === "active" ? "success" : "secondary"}>{s.status}</Badge>
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(total)}</TableCell>
                  <TableCell className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" asChild>
                      <Link href={`/purchasing/purchases?supplier=${s.id}`}>
                        <Truck className="h-4 w-4" />
                      </Link>
                    </Button>
                    <SupplierDialog supplier={s} onSaved={refresh} />
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete &quot;{s.name}&quot;?</AlertDialogTitle>
                          <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction onClick={() => handleDelete(s.id)}>Delete</AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
