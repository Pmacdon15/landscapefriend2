"use client";

import { format } from "date-fns";
import { useEffect, useState } from "react";

interface LocalDateDisplayProps {
  date: string | Date;
}

export function LocalDateDisplay({ date }: LocalDateDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-col animate-pulse">
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded mb-1" />
        <div className="h-3 w-16 bg-slate-100 dark:bg-slate-900 rounded" />
      </div>
    );
  }

  const dateObj = new Date(date);

  return (
    <div className="flex flex-col">
      <span className="text-sm font-medium text-slate-600 dark:text-slate-300">
        {format(dateObj, "MMM d, yyyy")}
      </span>
      <span className="text-[11px] text-slate-400 uppercase tracking-wider mt-0.5">
        {format(dateObj, "p")}
      </span>
    </div>
  );
}
