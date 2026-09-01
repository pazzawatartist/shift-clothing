import type { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { getBranding } from "@/lib/branding";

export async function generateMetadata(): Promise<Metadata> {
  const { businessName } = await getBranding();
  return {
    title: `${businessName} | Business Management System`,
    description: `Business Management System for ${businessName}`,
  };
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
