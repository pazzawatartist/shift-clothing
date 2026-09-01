import { cn } from "@/lib/utils";

/**
 * Renders the deployment's logo when one has been uploaded in Settings, and
 * falls back to a wordmark built from the business name otherwise — so a
 * brand-new deployment still looks intentional before anyone uploads a logo.
 */
export function BrandMark({
  businessName,
  logoUrl,
  size = "sm",
}: {
  businessName: string;
  logoUrl: string | null;
  size?: "sm" | "lg";
}) {
  if (logoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={businessName}
        className={cn("object-contain", size === "lg" ? "h-12 max-w-[180px]" : "h-8 max-w-[140px]")}
      />
    );
  }

  return (
    <div
      className={cn(
        "inline-block rounded-md bg-foreground font-black italic uppercase tracking-tight text-background",
        size === "lg" ? "px-3 py-1.5 text-lg" : "px-2 py-1 text-sm"
      )}
    >
      {businessName}
    </div>
  );
}
