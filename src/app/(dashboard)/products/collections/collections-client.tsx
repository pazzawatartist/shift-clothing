"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Layers } from "lucide-react";
import { collectionSchema, type CollectionInput } from "@/lib/validations/catalog";
import { upsertCollection, deleteCollection } from "./actions";
import type { CollectionRow } from "@/types/database.types";
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

function CollectionDialog({ collection, onSaved }: { collection?: CollectionRow; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<CollectionInput>({
    resolver: zodResolver(collectionSchema),
    defaultValues: {
      name: collection?.name ?? "",
      slug: collection?.slug ?? "",
      description: collection?.description ?? "",
      season: collection?.season ?? "",
      status: collection?.status ?? "active",
    },
  });

  async function onSubmit(values: CollectionInput) {
    const result = await upsertCollection(collection?.id ?? null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(collection ? "Collection updated" : "Collection created");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {collection ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Collection
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{collection ? "Edit Collection" : "New Collection"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
          </div>
          <div className="space-y-2">
            <Label>Season</Label>
            <Input {...form.register("season")} placeholder="e.g. Summer 2026" />
          </div>
          <div className="space-y-2">
            <Label>Description</Label>
            <Textarea {...form.register("description")} />
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

export function CollectionsClient({ collections }: { collections: CollectionRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  async function handleDelete(id: string) {
    const result = await deleteCollection(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Collection deleted");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CollectionDialog onSaved={refresh} />
      </div>
      {collections.length === 0 ? (
        <EmptyState icon={Layers} title="No collections yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Season</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {collections.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.season ?? "—"}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <CollectionDialog collection={c} onSaved={refresh} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{c.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>This cannot be undone.</AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handleDelete(c.id)}>Delete</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
