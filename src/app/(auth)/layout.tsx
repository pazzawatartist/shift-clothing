import { getBranding } from "@/lib/branding";
import { BrandMark } from "@/components/layout/brand-mark";

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  const { businessName, logoUrl } = await getBranding();

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center text-center">
          <BrandMark businessName={businessName} logoUrl={logoUrl} size="lg" />
          <p className="mt-2 text-sm text-muted-foreground">Business Management System</p>
        </div>
        {children}
      </div>
    </div>
  );
}
