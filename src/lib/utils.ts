import { type ClassValue, clsx } from "clsx";
import {
  addMonths,
  addWeeks,
  differenceInCalendarDays,
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

export function getNextCutDate(startDate: Date | string, frequency: string) {
  try {
    const start =
      typeof startDate === "string"
        ? parseISO(startDate)
        : startDate instanceof Date
          ? parseISO(startDate.toISOString().split("T")[0])
          : new Date(NaN);

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
