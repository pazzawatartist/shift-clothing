import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";

export interface Branding {
  businessName: string;
  logoUrl: string | null;
}

/** Fallback used before Settings has been filled in, or if the lookup fails. */
const DEFAULT_BRANDING: Branding = { businessName: "Business Management System", logoUrl: null };

/**
 * Branding for the current deployment, read from its own database so a single
 * codebase can serve multiple businesses. Cached per request.
 *
 * Uses the public RPC rather than selecting from `settings` directly, because
 * this also runs on the signed-out login screen.
 */
export const getBranding = cache(async (): Promise<Branding> => {
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_public_branding");
    if (error || !data?.[0]) return DEFAULT_BRANDING;
    return {
      businessName: data[0].business_name || DEFAULT_BRANDING.businessName,
      logoUrl: data[0].logo_url,
    };
  } catch {
    // Never let a branding lookup take down the page it decorates.
    return DEFAULT_BRANDING;
  }
});
