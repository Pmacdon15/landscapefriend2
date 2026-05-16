import { type ClassValue, clsx } from "clsx";
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
  format,
  isBefore,
  isValid,
  parseISO,
  startOfDay,
} from "date-fns";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getGoogleMapsUrl(address: {
  street: string;
  city: string;
  state?: string | null;
  zip?: string | null;
}) {
  const query = encodeURIComponent(
    `${address.street}, ${address.city}, ${address.state || ""} ${
      address.zip || ""
    }`.trim(),
  );
  return `https://www.google.com/maps/search/?api=1&query=${query}`;
}

export function formatDateUtc(
  date: Date | string | null | undefined,
  formatStr: string,
) {
  if (!date) return "Not set";
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return "Invalid Date";

  // Create a local date that has the same YMD as the UTC date
  const localDate = new Date(
    d.getUTCFullYear(),
    d.getUTCMonth(),
    d.getUTCDate(),
  );
  return format(localDate, formatStr);
}

export function getNextCutDate(startDate: Date | string, frequency: string) {
  try {
    // Force to date-only string to avoid timezone shifting during parseISO
    const dateStr =
      typeof startDate === "string"
        ? startDate.split("T")[0]
        : startDate instanceof Date
          ? startDate.toISOString().split("T")[0]
          : "";

    const start = parseISO(dateStr);

    if (!isValid(start)) {
      return new Date(NaN);
    }

    const today = startOfDay(new Date());

    if (!isBefore(start, today)) {
      return start;
    }

    const freq = frequency.toLowerCase();
    if (freq === "daily") {
      return today;
    }

    if (freq === "weekly") {
      const diff = differenceInCalendarDays(today, start);
      const weeksSince = Math.ceil(diff / 7);
      return addWeeks(start, weeksSince);
    }

    if (freq === "bi-weekly" || freq === "every 2 weeks") {
      const diff = differenceInCalendarDays(today, start);
      const periodsSince = Math.ceil(diff / 14);
      return addWeeks(start, periodsSince * 2);
    }

    if (freq === "monthly" || freq === "every month") {
      let next = start;
      while (isBefore(next, today)) {
        next = addMonths(next, 1);
      }
      return next;
    }

    return start;
  } catch (_e) {
    return new Date(NaN);
  }
}
