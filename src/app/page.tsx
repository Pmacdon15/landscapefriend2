import { CalendarDays, Users } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl text-center space-y-8">
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-slate-900 to-slate-500 dark:from-white dark:to-slate-400 bg-clip-text text-transparent">
          Lawn Care Scheduling
          <br />
          <span className="text-primary">Made Simple</span>
        </h1>

        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          Manage your clients, plan your routes, and schedule repetitive cuts
          with total control. Set intervals based on precise start dates and let
          the system handle the rest.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/client-info-list"
            className={buttonVariants({
              size: "lg",
              className: "h-14 px-8 text-lg rounded-full",
            })}
          >
            <Users className="mr-2 h-5 w-5" />
            Manage Clients
          </Link>
          <Link
            href="/client-cut-list"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className: "h-14 px-8 text-lg rounded-full",
            })}
          >
            <CalendarDays className="mr-2 h-5 w-5" />
            Service List
          </Link>
        </div>
      </div>
    </div>
  );
}
