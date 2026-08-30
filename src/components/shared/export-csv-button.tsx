"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toCsv, downloadCsv } from "@/lib/utils/csv";

export function ExportCsvButton({
  filename,
  columns,
  rows,
}: {
  filename: string;
  columns: { key: string; label: string }[];
  rows: Record<string, string | number>[];
}) {
  return (
    <Button
      variant="outline"
      onClick={() => downloadCsv(filename, toCsv(rows, columns))}
      disabled={rows.length === 0}
    >
      <Download className="h-4 w-4" /> Export CSV
    </Button>
  );
}
