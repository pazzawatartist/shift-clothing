"use client";

import { Menu, LogOut, User as UserIcon } from "lucide-react";
import * as React from "react";
import { NotificationBell } from "./notification-bell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logoutAction } from "@/app/(auth)/actions";
import { Sidebar } from "./sidebar";
import type { UserRole } from "@/types/database.types";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";

function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function TopNav({
  fullName,
  email,
  role,
  businessName,
  logoUrl,
}: {
  fullName: string;
  email: string;
  role: UserRole;
  businessName: string;
  logoUrl: string | null;
}) {
  const [mobileOpen, setMobileOpen] = React.useState(false);

  return (
    <header className="flex h-16 items-center justify-between border-b bg-card px-4 md:px-6">
      <div className="flex items-center gap-3">
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent>
            <Sidebar role={role} businessName={businessName} logoUrl={logoUrl} />
          </SheetContent>
        </Sheet>
        <div>
          <p className="text-sm font-semibold capitalize">{role} workspace</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <NotificationBell />
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="flex items-center gap-2 px-2">
              <Avatar className="h-8 w-8">
                <AvatarFallback>{initials(fullName)}</AvatarFallback>
              </Avatar>
              <span className="hidden text-sm font-medium sm:inline">{fullName}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>
              <p className="font-medium">{fullName}</p>
              <p className="text-xs font-normal text-muted-foreground">{email}</p>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            {role === "admin" && (
              <DropdownMenuItem asChild>
                <a href="/settings" className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4" /> Settings
                </a>
              </DropdownMenuItem>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => {
                void logoutAction();
              }}
            >
              <LogOut className="h-4 w-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
