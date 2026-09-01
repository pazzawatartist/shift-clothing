import { getCurrentProfile } from "@/lib/auth/current-user";
import { getBranding } from "@/lib/branding";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [profile, { businessName, logoUrl }] = await Promise.all([getCurrentProfile(), getBranding()]);

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar role={profile.role} businessName={businessName} logoUrl={logoUrl} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav
          role={profile.role}
          fullName={profile.full_name}
          email={profile.email}
          businessName={businessName}
          logoUrl={logoUrl}
        />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
