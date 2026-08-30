import { format } from "date-fns";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { ScrollText } from "lucide-react";

export function AuditLogTable({
  logs,
}: {
  logs: {
    id: string;
    action: string;
    module: string;
    record_id: string | null;
    created_at: string;
    profiles: { full_name: string } | null;
  }[];
}) {
  if (logs.length === 0) {
    return (
      <div className="mt-4">
        <EmptyState icon={ScrollText} title="No audit events yet" />
      </div>
    );
  }

  return (
    <Table className="mt-4">
      <TableHeader>
        <TableRow>
          <TableHead>Date</TableHead>
          <TableHead>User</TableHead>
          <TableHead>Action</TableHead>
          <TableHead>Module</TableHead>
          <TableHead>Record</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {logs.map((log) => (
          <TableRow key={log.id}>
            <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
              {format(new Date(log.created_at), "d MMM yyyy, h:mm a")}
            </TableCell>
            <TableCell>{log.profiles?.full_name ?? "System"}</TableCell>
            <TableCell>
              <Badge variant="outline" className="capitalize">
                {log.action.replace(/_/g, " ")}
              </Badge>
            </TableCell>
            <TableCell className="capitalize text-muted-foreground">{log.module}</TableCell>
            <TableCell className="font-mono text-xs text-muted-foreground">
              {log.record_id?.slice(0, 8) ?? "—"}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
