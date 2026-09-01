"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown } from "lucide-react";
import * as React from "react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, filterNavForRole, type NavItem } from "@/lib/nav-config";
import { BrandMark } from "./brand-mark";
import type { UserRole } from "@/types/database.types";

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavGroup({ item, pathname }: { item: NavItem; pathname: string }) {
  const active = isActive(pathname, item.href);
  const [open, setOpen] = React.useState(active);

  if (!item.children || item.children.length === 0) {
    return (
      <Link
        href={item.href}
        className={cn(
          "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        {item.label}
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          "flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
          active ? "text-foreground" : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        )}
      >
        {item.icon && <item.icon className="h-4 w-4 shrink-0" />}
        <span className="flex-1 text-left">{item.label}</span>
        <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div className="ml-6 mt-1 space-y-1 border-l pl-3">
          {item.children.map((child) => {
            const childActive = pathname === child.href;
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "block rounded-md px-3 py-1.5 text-sm transition-colors",
                  childActive
                    ? "bg-primary text-primary-foreground font-medium"
                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  role,
  businessName,
  logoUrl,
}: {
  role: UserRole;
  businessName: string;
  logoUrl: string | null;
}) {
  const pathname = usePathname();
  const items = filterNavForRole(NAV_ITEMS, role);

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r bg-card md:flex">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <BrandMark businessName={businessName} logoUrl={logoUrl} />
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {items.map((item) => (
          <NavGroup key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>
    </aside>
  );
}
