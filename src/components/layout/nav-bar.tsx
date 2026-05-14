"use client";

import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import { LayoutDashboard, Menu, Users } from "lucide-react";
import Link from "next/link";
import * as React from "react";
import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

const navLinks = [
  {
    href: "/client-info-list",
    label: "Manage Clients",
    icon: Users,
    roles: ["org:admin"],
  },
  {
    href: "/clients-service",
    label: "Service List",
    icon: LayoutDashboard,
    // roles: ["org:admin", "org:member"],
  },
];

export function NavBar() {
  const [open, setOpen] = React.useState(false);
  const { has, isLoaded } = useAuth();

  const visibleLinks = isLoaded
    ? navLinks.filter(
        (link) => !link.roles || link.roles.some((role) => has({ role })),
      )
    : [];

  return (
    <nav className="border-b border-slate-200/50 dark:border-slate-800/50 bg-white/50 dark:bg-slate-950/50 backdrop-blur-md sticky top-0 z-50 w-full">
      <div className="flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="font-bold text-xl tracking-tight">
            Landscape Friend
          </Link>

          <Show when="signed-in">
            <div className="hidden md:flex items-center gap-3">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-slate-600 dark:text-slate-300 hover:text-primary transition-colors flex items-center gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </Show>
        </div>

        <div className="flex items-center gap-4">
          <Show when="signed-in">
            <div className="flex items-center gap-4">
              <OrganizationSwitcher />
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <div className="hidden md:flex items-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className={buttonVariants({ variant: "ghost", size: "sm" })}
                >
                  Sign In
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button
                  type="button"
                  className={buttonVariants({ variant: "default", size: "sm" })}
                >
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </Show>

          {/* Mobile Menu */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "md:hidden",
              })}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>
            <SheetContent side="right" className="w-[300px]">
              <SheetHeader>
                <SheetTitle className="text-left">Navigation</SheetTitle>
              </SheetHeader>
              <div className="flex flex-col gap-2 mt-4">
                <Show when="signed-in">
                  {visibleLinks.map((link) => (
                    <Link
                      key={link.href}
                      href={link.href}
                      onClick={() => setOpen(false)}
                      className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md hover:bg-accent transition-colors"
                    >
                      <link.icon className="h-5 w-5" />
                      {link.label}
                    </Link>
                  ))}
                </Show>
                {/* Sign in/up buttons omitted for brevity, keep your original ones here */}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
