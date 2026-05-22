"use client";

import { addMonths, format, subMonths } from "date-fns";
import { Calendar, ChevronLeft, ChevronRight } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { use, useEffect } from "react";

export function MonthSelector({
  datePromise,
}: {
  datePromise: Promise<string | null>;
}) {
  const currentDate = use(datePromise);
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Redirect to set default date param if missing
  useEffect(() => {
    if (!currentDate) {
      const defaultDate = new Date().toLocaleDateString("en-CA");
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", defaultDate);
      params.delete("month");
      router.replace(`${pathname}?${params.toString()}`);
    }
  }, [currentDate, pathname, router, searchParams]);

  // Parse currentDate (format YYYY-MM-DD or YYYY-MM). Use toLocaleDateString("en-CA") fallback when not set.
  const date = currentDate ?? new Date().toLocaleDateString("en-CA");

  // Parse string safely into a local Date object to work correctly with date-fns
  const parsedParts = date.split("-").map(Number);
  const dateObj = new Date(
    parsedParts[0],
    parsedParts[1] - 1,
    parsedParts[2] || 1,
  );

  const handleMonthChange = (newDate: Date) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("date", format(newDate, "yyyy-MM-01"));
    params.delete("month");
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
