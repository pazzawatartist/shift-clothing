"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export default function DashboardError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <Card className="mx-auto mt-12 max-w-md">
      <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
        <AlertTriangle className="h-8 w-8 text-destructive" />
        <div>
          <p className="font-medium">Couldn&apos;t load this page</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Something went wrong loading this data. Please try again.
          </p>
        </div>
        <Button onClick={reset}>Try Again</Button>
      </CardContent>
    </Card>
  );
}
