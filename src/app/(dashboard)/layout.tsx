import { getCurrentProfile } from "@/lib/auth/current-user";
import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/topnav";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();

  return (
    <div className="flex h-screen overflow-hidden bg-muted/20">
      <Sidebar role={profile.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <TopNav role={profile.role} fullName={profile.full_name} email={profile.email} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
