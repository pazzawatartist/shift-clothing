"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Plus, UserCog } from "lucide-react";
import { inviteUserSchema, type InviteUserInput } from "@/lib/validations/settings";
import { inviteUser, updateUser } from "@/app/(dashboard)/settings/actions";
import type { ProfileRow, UserRole, UserStatus } from "@/types/database.types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState } from "@/components/shared/empty-state";

function InviteUserDialog({ onSaved }: { onSaved: () => void }) {
  const [open, setOpen] = React.useState(false);
  const form = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
    defaultValues: { full_name: "", email: "", role: "staff" },
  });

  async function onSubmit(values: InviteUserInput) {
    const result = await inviteUser(values);
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Invitation sent");
    form.reset();
    setOpen(false);
    onSaved();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="h-4 w-4" /> Invite User
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite New User</DialogTitle>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label>Full Name</Label>
            <Input {...form.register("full_name")} />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" {...form.register("email")} />
          </div>
          <div className="space-y-2">
            <Label>Role</Label>
            <Select defaultValue={form.getValues("role")} onValueChange={(v) => form.setValue("role", v as UserRole)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="manager">Manager</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Sending..." : "Send Invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function UsersClient({ profiles, currentUserId }: { profiles: ProfileRow[]; currentUserId: string }) {
  const router = useRouter();

  async function handleRoleChange(userId: string, role: UserRole) {
    const result = await updateUser({ user_id: userId, role });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Role updated");
    router.refresh();
  }

  async function handleStatusChange(userId: string, status: UserStatus) {
    const result = await updateUser({ user_id: userId, status });
    if (result.error) {
      toast.error(result.error);
      return;
    }
    toast.success("Status updated");
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <InviteUserDialog onSaved={() => router.refresh()} />
      </div>
      {profiles.length === 0 ? (
        <EmptyState icon={UserCog} title="No users yet" />
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => {
              const isSelf = p.id === currentUserId;
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">
                    {p.full_name} {isSelf && <Badge variant="outline">You</Badge>}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>
                    <Select
                      defaultValue={p.role}
                      disabled={isSelf}
                      onValueChange={(v) => handleRoleChange(p.id, v as UserRole)}
                    >
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="staff">Staff</SelectItem>
                        <SelectItem value="manager">Manager</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>
                  </TableCell>
                  <TableCell>
                    <Select
                      defaultValue={p.status}
                      disabled={isSelf}
                      onValueChange={(v) => handleStatusChange(p.id, v as UserStatus)}
                    >
                      <SelectTrigger className="w-28">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
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
