"use client";

import { addMonths, format, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";

export function MonthSelector({
  monthPromise,
}: {
  monthPromise: Promise<string | null>;
}) {
  const currentMonth = use(monthPromise);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Redirect to set default month param if missing
  useEffect(() => {
    if (!currentMonth) {
      const defaultMonth = new Date().toLocaleDateString("en-CA").slice(0, 7);
      const params = new URLSearchParams(searchParams.toString());
      params.set("month", defaultMonth);
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [currentMonth, pathname, router, searchParams]);

  // Parse currentMonth (format YYYY-MM). Use toLocaleDateString("en-CA") fallback when not set.
  const date = currentMonth ?? new Date().toLocaleDateString("en-CA");

  // Parse string safely into a local Date object to work correctly with date-fns
  const parsedParts = date.split("-").map(Number);
  const dateObj = new Date(
    parsedParts[0],
    parsedParts[1] - 1,
    parsedParts[2] || 1,
  );

  const handleMonthChange = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("month", format(newDate, "yyyy-MM"));
    router.push(`${pathname}?${params.toString()}`);
  };

  const handlePrev = () => handleMonthChange(subMonths(dateObj, 1));
  const handleNext = () => handleMonthChange(addMonths(dateObj, 1));

  return (
    <div className="flex items-center gap-2 bg-white/50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 rounded-lg p-1.5 backdrop-blur-xs shadow-xs">
      <button
        type="button"
        onClick={handlePrev}
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
        aria-label="Previous month"
      >
        <ChevronLeft className="h-5 w-5" />
      </button>
      <div className="flex items-center gap-2 px-3 font-semibold text-sm text-slate-700 dark:text-slate-300">
        <Calendar className="h-4 w-4 text-green-600 dark:text-green-400" />
        <span>{format(dateObj, "MMMM yyyy")}</span>
      </div>
      <button
        type="button"
        onClick={handleNext}
        className="p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400 transition-colors cursor-pointer"
        aria-label="Next month"
      >
        <ChevronRight className="h-5 w-5" />
      </button>
    </div>
  );
}
