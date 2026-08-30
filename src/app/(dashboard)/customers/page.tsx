import { createClient } from "@/lib/supabase/server";
import { listCustomers } from "@/services/customers";
import { CustomersClient } from "./customers-client";
import { Pagination } from "@/components/shared/pagination";
import { SearchBox } from "@/components/shared/search-box";

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; page?: string }>;
}) {
  const params = await searchParams;
  const supabase = await createClient();
  const { customers, count, page, pageSize } = await listCustomers(supabase, {
    search: params.search,
    page: params.page ? Number(params.page) : 1,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Customers</h1>
          <p className="text-muted-foreground">{count} customer{count === 1 ? "" : "s"}</p>
        </div>
      </div>
      <SearchBox placeholder="Search by name or phone..." />
      <CustomersClient customers={customers} />
      <Pagination total={count} page={page} pageSize={pageSize} />
    </div>
  );
}
