import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cn,
  formatDateNaive,
  getGoogleMapsUrl,
  getNextCutDate,
  toLocalMidnight,
} from "./utils";

describe("cn utility", () => {
  it("should merge tailwind classes and resolve conflicts correctly", () => {
    expect(cn("px-2 py-1", "p-4")).toBe("p-4");
    expect(cn("text-red-500", "text-blue-500")).toBe("text-blue-500");
    expect(cn("bg-white", null, undefined, "text-black")).toBe(
      "bg-white text-black",
    );
  });
});

describe("getGoogleMapsUrl utility", () => {
  it("should compile a clean Google Maps search URL", () => {
    const address = {
      street: "123 Main St",
      city: "Salt Lake City",
      state: "UT",
      zip: "84101",
    };
    const url = getGoogleMapsUrl(address);
    expect(url).toContain("https://www.google.com/maps/search/?api=1&query=");
    expect(url).toContain("123%20Main%20St");
    expect(url).toContain("Salt%20Lake%20City");
    expect(url).toContain("UT");
    expect(url).toContain("84101");
  });

  it("should handle optional/null state and zip gracefully", () => {
    const address = {
      street: "456 Oak Ave",
      city: "Provo",
      state: null,
      zip: undefined,
    };
    const url = getGoogleMapsUrl(address);
    expect(url).toContain("456%20Oak%20Ave");
    expect(url).toContain("Provo");
    // Verify it doesn't leave "null" or "undefined" as literal strings in url
    expect(url).not.toContain("null");
    expect(url).not.toContain("undefined");
  });
});

describe("toLocalMidnight utility", () => {
  it("should convert UTC source date string to local midnight Date object", () => {
    const localDate = toLocalMidnight("2026-05-15T00:00:00.000Z");
    expect(localDate).toBeInstanceOf(Date);
    expect(localDate?.getFullYear()).toBe(2026);
    expect(localDate?.getMonth()).toBe(4); // 0-indexed May
    expect(localDate?.getDate()).toBe(15);
  });

  it("should handle Date objects correctly", () => {
    const sourceDate = new Date(Date.UTC(2026, 9, 31)); // Halloween
    const localDate = toLocalMidnight(sourceDate);
    expect(localDate?.getFullYear()).toBe(2026);
    expect(localDate?.getMonth()).toBe(9); // October
    expect(localDate?.getDate()).toBe(31);
  });

  it("should return undefined for empty, null, or invalid dates", () => {
    expect(toLocalMidnight(null)).toBeUndefined();
    expect(toLocalMidnight(undefined)).toBeUndefined();
    expect(toLocalMidnight("not-a-date")).toBeUndefined();
  });
});

describe("formatDateNaive utility", () => {
  it("should format valid dates correctly", () => {
    const result = formatDateNaive("2026-05-15T00:00:00.000Z", "yyyy-MM-dd");
    expect(result).toBe("2026-05-15");
  });

  it("should return 'Not set' for empty or null dates", () => {
    expect(formatDateNaive(null, "yyyy-MM-dd")).toBe("Not set");
    expect(formatDateNaive(undefined, "yyyy-MM-dd")).toBe("Not set");
  });

  it("should return 'Invalid Date' for malformed inputs", () => {
    expect(formatDateNaive("gibberish", "yyyy-MM-dd")).toBe("Invalid Date");
  });
});

describe("getNextCutDate - Core Scheduler Calculations", () => {
  beforeEach(() => {
    // Fake system time: set it to Friday, May 29th, 2026
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should return the start date if it is in the future", () => {
    const futureDateStr = "2026-06-15"; // Future relative to May 29
    const nextCut = getNextCutDate(futureDateStr, "weekly");
    expect(nextCut.getFullYear()).toBe(2026);
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(15);
  });

  it("should return today if frequency is 'daily' and start date is in the past", () => {
    const pastDateStr = "2026-05-10";
    const nextCut = getNextCutDate(pastDateStr, "daily");
    expect(nextCut.getFullYear()).toBe(2026);
    expect(nextCut.getMonth()).toBe(4); // May
    expect(nextCut.getDate()).toBe(29); // Today is May 29
  });

  it("should calculate correct next date for 'weekly' frequency", () => {
    // Start date is Friday, May 15 (2 weeks ago).
    // Today is Friday, May 29. Next cut is exactly today, May 29.
    const startFriday = "2026-05-15";
    let nextCut = getNextCutDate(startFriday, "weekly");
    expect(nextCut.getDate()).toBe(29);

    // Start date is Wednesday, May 20 (9 days ago).
    // Next weekly occurrences: May 27 (past), June 3 (future).
    // Since today is May 29 (Friday), the next cut is June 3.
    const startWednesday = "2026-05-20";
    nextCut = getNextCutDate(startWednesday, "weekly");
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(3);
  });

  it("should calculate correct next date for 'bi-weekly' or 'every 2 weeks' frequency", () => {
    // Start date: Monday, May 11 (18 days ago).
    // Bi-weekly occurrences: May 11 (start), May 25 (past), June 8 (future).
    // Since today is May 29, the next cut is June 8.
    const startMonday = "2026-05-11";
    let nextCut = getNextCutDate(startMonday, "bi-weekly");
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(8);

    nextCut = getNextCutDate(startMonday, "every 2 weeks");
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(8);
  });

  it("should calculate correct next date for 'monthly' or 'every month' frequency", () => {
    // Start date: April 10 (past).
    // Today is May 29. Monthly occurrences: April 10, May 10 (past), June 10 (future).
    // Next cut: June 10.
    const startPast = "2026-04-10";
    let nextCut = getNextCutDate(startPast, "monthly");
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(10);

    nextCut = getNextCutDate(startPast, "every month");
    expect(nextCut.getMonth()).toBe(5); // June
    expect(nextCut.getDate()).toBe(10);
  });

  it("should handle invalid dates gracefully by returning an invalid Date", () => {
    const nextCut = getNextCutDate("not-a-date", "weekly");
    expect(Number.isNaN(nextCut.getTime())).toBe(true);
  });
});
