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

/**
 * Converts a date (string or object) to a Date object at local midnight
 * using the UTC year, month, and day. This is essential for components
 * like calendars that expect a "naive" date representation.
 */
export function toLocalMidnight(
  date: Date | string | null | undefined,
): Date | undefined {
  if (!date) return undefined;
  const d = typeof date === "string" ? new Date(date) : date;
  if (!isValid(d)) return undefined;
  return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate());
}

/**
 * Formats a date using local time. Assumes the date is already
 * shifted to local midnight if it originated from a UTC source.
 */
export function formatDateNaive(
  date: Date | string | null | undefined,
  formatStr: string,
) {
  if (!date) return "Not set";
  const d = date instanceof Date ? date : toLocalMidnight(date);
  if (!d || !isValid(d)) return "Invalid Date";
  return format(d, formatStr);
}

export function getNextCutDate(startDate: Date | string, frequency: string) {
  try {
    // Force to date-only string to ensure parseISO creates a local midnight date
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

// Generates a simple animated gradient shimmer SVG for next/image placeholders
const shimmer = (w: number, h: number) => `
<svg width="${w}" height="${h}" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
  <defs>
    <linearGradient id="g">
      <stop stop-color="#1e293b" offset="20%" />
      <stop stop-color="#334155" offset="50%" />
      <stop stop-color="#1e293b" offset="70%" />
    </linearGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="#1e293b" />
  <rect id="r" width="${w}" height="${h}" fill="url(#g)" />
  <animate xlink:href="#r" attributeName="x" from="-${w}" to="${w}" dur="1.2s" repeatCount="indefinite" />
</svg>`;

const toBase64 = (str: string) =>
  typeof window === "undefined"
    ? Buffer.from(str).toString("base64")
    : window.btoa(str);

export const getShimmerDataURL = (w: number, h: number) =>
  `data:image/svg+xml;base64,${toBase64(shimmer(w, h))}`;

