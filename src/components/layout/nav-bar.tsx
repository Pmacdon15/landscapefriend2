"use client";

import { OrganizationSwitcher, Show, UserButton } from "@clerk/nextjs";
import { Menu } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

export function NavBar() {
  return (
    <nav className="border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight">
            Landscape Friend
          </Link>

          <Show when="signed-in">
            <div className="hidden md:flex items-center gap-3">
              <Link
                href="/client-info-list"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                Manage Clients
              </Link>
              <Link
                href="/clients-service"
                className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors"
              >
                Service List
              </Link>
            </div>
          </Show>
        </div>

        <div className="flex items-center gap-4">
          <Show when="signed-in">
            <OrganizationSwitcher />
            <UserButton />
          </Show>

          <Show when="signed-in">
            <Sheet>
              <SheetTrigger
                className={buttonVariants({
                  variant: "ghost",
                  size: "icon",
                  className: "md:hidden",
                })}
              >
                <Menu className="h-5 w-5" />
                <span className="sr-only">Toggle mobile menu</span>
              </SheetTrigger>
              <SheetContent side="right">
                <SheetTitle>Menu</SheetTitle>
                <div className="flex flex-col gap-4 mt-6">
                  <Link
                    href="/clients-service"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Service List
                  </Link>
                  <Link
                    href="/client-info-list"
                    className="text-lg font-medium text-foreground hover:text-primary transition-colors"
                  >
                    Manage Clients
                  </Link>
                </div>
              </SheetContent>
            </Sheet>
          </Show>
        </div>
      </div>
    </nav>
  );
}
