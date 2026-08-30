import { createClient } from "@/lib/supabase/server";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BusinessInfoForm } from "@/components/settings/business-info-form";
import { OperationsForm } from "@/components/settings/operations-form";
import { PromoCodesClient } from "@/components/settings/promo-codes-client";
import { AuditLogTable } from "@/components/settings/audit-log-table";

export default async function SettingsPage() {
  const supabase = await createClient();
  const [{ data: settings }, { data: promoCodes }, { data: auditLogs }] = await Promise.all([
    supabase.from("settings").select("*").single(),
    supabase.from("promo_codes").select("*").order("created_at", { ascending: false }),
    supabase
      .from("audit_logs")
      .select("id, action, module, record_id, details, created_at, profiles(full_name)")
      .order("created_at", { ascending: false })
      .limit(100),
  ]);

  if (!settings) return null;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">Business information, operational rules, and system logs.</p>
      </div>

      <Tabs defaultValue="business">
        <TabsList>
          <TabsTrigger value="business">Business Info</TabsTrigger>
          <TabsTrigger value="operations">Inventory &amp; Orders</TabsTrigger>
          <TabsTrigger value="promos">Promo Codes</TabsTrigger>
          <TabsTrigger value="audit">Audit Log</TabsTrigger>
        </TabsList>
        <TabsContent value="business">
          <BusinessInfoForm settings={settings} />
        </TabsContent>
        <TabsContent value="operations">
          <OperationsForm settings={settings} />
        </TabsContent>
        <TabsContent value="promos">
          <PromoCodesClient promoCodes={promoCodes ?? []} />
        </TabsContent>
        <TabsContent value="audit">
          <AuditLogTable
            logs={
              (auditLogs ?? []) as unknown as {
                id: string;
                action: string;
                module: string;
                record_id: string | null;
                created_at: string;
                profiles: { full_name: string } | null;
              }[]
            }
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
