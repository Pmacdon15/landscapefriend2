"use client";

import { format, parseISO } from "date-fns";
import { useEffect, useState } from "react";

interface LocalDateOnlyDisplayProps {
  date: string | Date;
}

/**
 * Handles displaying a DATE only value (yyyy-MM-dd) consistently.
 * Prevents timezone shifting by parsing as ISO string then formatting.
 */
export function LocalDateOnlyDisplay({ date }: LocalDateOnlyDisplayProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-4 w-24 bg-slate-100 dark:bg-slate-900 animate-pulse rounded" />
    );
  }

  // If it's already a Date object, it might have been shifted by UTC parsing.
  // We want to ensure we're looking at the date string representation.
  const dateStr =
    date instanceof Date ? date.toISOString().split("T")[0] : date;

  // parseISO ensures yyyy-MM-dd is treated as local midnight, or we can just
  // use the string directly if we trust date-fns format behavior with strings.
  // To be safest across all browsers, we'll parse the date-only string specifically.
  const dateObj = parseISO(dateStr);

  return <span>{format(dateObj, "MMM d, yyyy")}</span>;
}
