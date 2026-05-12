import { CalendarDays, Leaf, Users } from "lucide-react";
import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-4 min-h-[calc(100vh-4rem)]">
      <div className="max-w-3xl text-center space-y-8">
        <div className="flex justify-center mb-4">
          <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
            <Leaf className="w-12 h-12 text-green-600 dark:text-green-400" />
          </div>
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight bg-gradient-to-br from-green-900 to-green-500 dark:from-white dark:to-green-400 bg-clip-text text-transparent">
          Landscape Friend
          <br />
          <span className="text-primary text-4xl md:text-5xl">
            Lawn Care Made Simple
          </span>
        </h1>

        <p className="text-xl text-slate-500 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
          The all-in-one platform for landscaping professionals. Manage your
          clients, plan your daily routes, and schedule repetitive cuts with
          total control. Let Landscape Friend handle the scheduling so you can
          focus on the lawns.
        </p>

        <div className="pt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <Link
            href="/client-info-list"
            className={buttonVariants({
              size: "lg",
              className:
                "h-14 px-8 text-lg rounded-full shadow-lg hover:shadow-xl transition-all",
            })}
          >
            <Users className="mr-2 h-5 w-5" />
            Manage Clients
          </Link>
          <Link
            href="/clients-service"
            className={buttonVariants({
              variant: "outline",
              size: "lg",
              className:
                "h-14 px-8 text-lg rounded-full bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm hover:bg-white dark:hover:bg-slate-900 transition-all",
            })}
          >
            <CalendarDays className="mr-2 h-5 w-5" />
            Service Routes
          </Link>
        </div>
      </div>
    </div>
  );
}
