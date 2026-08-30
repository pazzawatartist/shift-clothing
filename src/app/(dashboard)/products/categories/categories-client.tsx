"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, FolderTree } from "lucide-react";
import { categorySchema, type CategoryInput } from "@/lib/validations/catalog";
import { upsertCategory, deleteCategory } from "./actions";
import type { CategoryRow } from "@/types/database.types";
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

function CategoryDialog({ category, onSaved }: { category?: CategoryRow; onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: category?.name ?? "",
      slug: category?.slug ?? "",
      description: category?.description ?? "",
      status: category?.status ?? "active",
    },
  });

  async function onSubmit(values: CategoryInput) {
    const result = await upsertCategory(category?.id ?? null, values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success(category ? "Category updated" : "Category created");
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {category ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="h-4 w-4" /> Add Category
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{category ? "Edit Category" : "New Category"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Name</Label>
            <Input {...form.register("name")} />
            {form.formState.errors.name && (
              <p className="text-sm text-destructive">{form.formState.errors.name.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label>Slug (optional)</Label>
            <Input {...form.register("slug")} placeholder="auto-generated from name" />
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

export function CategoriesClient({ categories }: { categories: CategoryRow[] }) {
  const router = useRouter();
  const refresh = () => router.refresh();

  async function handleDelete(id: string) {
    const result = await deleteCategory(id);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Category deleted");
    refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <CategoryDialog onSaved={refresh} />
      </div>
      {categories.length === 0 ? (
        <EmptyState icon={FolderTree} title="No categories yet" description="Create your first category to start organizing products." />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-24 text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((c) => (
              <TableRow key={c.id}>
                <TableCell className="font-medium">{c.name}</TableCell>
                <TableCell className="text-muted-foreground">{c.slug}</TableCell>
                <TableCell>
                  <Badge variant={c.status === "active" ? "success" : "secondary"}>{c.status}</Badge>
                </TableCell>
                <TableCell className="flex justify-end gap-1">
                  <CategoryDialog category={c} onSaved={refresh} />
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="ghost" size="icon">
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Delete &quot;{c.name}&quot;?</AlertDialogTitle>
                        <AlertDialogDescription>
                          Products in this category will become uncategorized. This cannot be undone.
                        </AlertDialogDescription>
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
