"use client";

import {
  OrganizationSwitcher,
  Show,
  SignInButton,
  SignOutButton,
  SignUpButton,
  UserButton,
  useAuth,
} from "@clerk/nextjs";
import {
  BarChart3,
  CheckCircle2,
  LayoutDashboard,
  LogOut,
  Menu,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import * as React from "react";
import { use } from "react";

import { buttonVariants } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

type NavLink = {
  href: string;
  label: string;
  icon: React.ElementType;

  permissions?: {
    roles?: string[];
    features?: string[];
  };
};

export function NavBar({
  datePromise,
}: {
  datePromise: Promise<string | null>;
}) {
  const [open, setOpen] = React.useState(false);

  const { has, isLoaded, orgRole } = useAuth();

  const searchParams = useSearchParams();

  const dateParam = use(datePromise);

  const defaultDate = new Date().toLocaleDateString("en-CA");

  const date = dateParam ?? defaultDate;

  // clone current search params
  const params = new URLSearchParams(searchParams.toString());

  // ensure date exists
  if (!params.get("date")) {
    params.set("date", date);
  }

  // remove month parameter to avoid sync issues, consolidate on date parameter
  params.delete("month");

  const buildHref = (path: string) => {
    const query = params.toString();

    return query ? `${path}?${query}` : path;
  };

  const navLinks: NavLink[] = [
    {
      href: buildHref("/client-info-list"),
      label: "Manage Clients",
      icon: Users,
      permissions: {
        roles: ["org:admin"],
      },
    },

    {
      href: buildHref("/admin/stats"),
      label: "Stats",
      icon: BarChart3,
      permissions: {
        roles: ["org:admin"],
        features: ["stats"],
      },
    },

    {
      href: buildHref("/admin/history"),
      label: "History",
      icon: CheckCircle2,
      permissions: {
        roles: ["org:admin"],
        features: ["history"],
      },
    },

    {
      href: buildHref("/clients-service"),
      label: "Service List",
      icon: LayoutDashboard,
    },
  ];

  const hasPermission = (link: NavLink) => {
    if (!link.permissions) {
      return true;
    }

    const { roles = [], features = [] } = link.permissions;

    const hasAllRoles = roles.every(
      (role) => has({ role }) || orgRole === role,
    );

    // user must have ALL features
    const hasAllFeatures = features.every((feature) => has({ feature }));

    return hasAllRoles && hasAllFeatures;
  };

  const visibleLinks = isLoaded ? navLinks.filter(hasPermission) : [];

  return (
    <nav className="border-b border-green-200/50 dark:border-green-800/50 bg-white/80 dark:bg-slate-950/80 backdrop-blur-md sticky top-0 z-50 w-full overflow-hidden">
      <div
        className="absolute inset-0 z-0 opacity-10 dark:opacity-5 pointer-events-none"
        style={{
          backgroundImage: 'url("/lawn.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      />

      <div className="relative z-10 flex h-16 items-center px-4 md:px-8 max-w-7xl mx-auto justify-between">
        {/* LEFT SIDE */}
        <div className="flex items-center gap-6">
          <Link
            href={buildHref("/")}
            className="font-bold text-xl tracking-tight text-green-900 dark:text-green-50"
          >
            Landscape Friend
          </Link>

          <Show when="signed-in">
            <div className="hidden md:flex items-center gap-3">
              {visibleLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-semibold text-green-700 dark:text-green-300 hover:text-green-900 dark:hover:text-green-100 transition-colors flex items-center gap-2"
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>
          </Show>
        </div>

        {/* RIGHT SIDE */}
        <div className="flex items-center gap-1">
          <Show when="signed-in">
            <div className="flex items-center md:gap-4">
              <OrganizationSwitcher />
              <UserButton />
            </div>
          </Show>

          <Show when="signed-out">
            <div className="hidden md:flex items-center gap-3">
              <SignInButton mode="modal">
                <button
                  type="button"
                  className={buttonVariants({
                    variant: "ghost",
                    size: "sm",
                    className:
                      "text-green-700 dark:text-green-300 hover:bg-green-100/50 dark:hover:bg-green-900/50",
                  })}
                >
                  Sign In
                </button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button
                  type="button"
                  className={buttonVariants({
                    variant: "default",
                    size: "sm",
                    className:
                      "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/20",
                  })}
                >
                  Sign Up
                </button>
              </SignUpButton>
            </div>
          </Show>

          {/* MOBILE MENU */}
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger
              className={buttonVariants({
                variant: "ghost",
                size: "icon",
                className: "md:hidden text-green-700 dark:text-green-300",
              })}
            >
              <Menu className="h-5 w-5" />
            </SheetTrigger>

            <SheetContent
              side="right"
              className="w-75 border-green-200/50 dark:border-green-800/50 p-0 overflow-hidden"
            >
              <div
                className="absolute inset-0 z-0 opacity-20 dark:opacity-10 pointer-events-none"
                style={{
                  backgroundImage: 'url("/lawn.png")',
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />

              <div className="relative z-10 flex flex-col h-full bg-green-50/90 dark:bg-green-950/90 backdrop-blur-sm p-6">
                <SheetHeader>
                  <SheetTitle className="text-left text-green-900 dark:text-green-50">
                    Navigation
                  </SheetTitle>
                </SheetHeader>

                <div className="flex flex-col gap-2 mt-4">
                  <Show when="signed-in">
                    {visibleLinks.map((link) => (
                      <Link
                        key={link.href}
                        href={link.href}
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md text-green-700 dark:text-green-300 hover:bg-green-200/50 dark:hover:bg-green-800/50 transition-colors"
                      >
                        <link.icon className="h-5 w-5" />
                        {link.label}
                      </Link>
                    ))}

                    <div className="h-px bg-green-200 dark:bg-green-800 my-2" />

                    <SignOutButton>
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md text-red-600 dark:text-red-400 hover:bg-red-100/50 dark:hover:bg-red-900/30 transition-colors w-full text-left"
                      >
                        <LogOut className="h-5 w-5" />
                        Sign Out
                      </button>
                    </SignOutButton>
                  </Show>

                  <Show when="signed-out">
                    <SignInButton mode="modal">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md text-green-700 dark:text-green-300 hover:bg-green-200/50 dark:hover:bg-green-800/50 transition-colors w-full text-left"
                      >
                        Sign In
                      </button>
                    </SignInButton>

                    <SignUpButton mode="modal">
                      <button
                        type="button"
                        onClick={() => setOpen(false)}
                        className="flex items-center gap-3 px-3 py-2 text-lg font-medium rounded-md bg-green-600 text-white hover:bg-green-700 transition-colors w-full text-left shadow-lg shadow-green-600/20"
                      >
                        Sign Up
                      </button>
                    </SignUpButton>
                  </Show>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </nav>
  );
}
