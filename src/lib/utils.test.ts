import { format } from "date-fns";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  cn,
  formatCurrency,
  formatDateNaive,
  formatLongDate,
  formatStandardDate,
  getGoogleMapsUrl,
  getNextCutDate,
  getShimmerDataURL,
  toLocalMidnight,
} from "./utils";

const ymd = (d: Date) => format(d, "yyyy-MM-dd");

describe("cn", () => {
  it("merges class names and resolves Tailwind conflicts", () => {
    expect(cn("p-2", "p-4")).toBe("p-4");
    expect(cn("text-sm", false && "hidden", undefined, "font-bold")).toBe(
      "text-sm font-bold",
    );
  });
});

describe("getGoogleMapsUrl", () => {
  it("builds an encoded search URL from a full address", () => {
    const url = getGoogleMapsUrl({
      street: "123 Main St",
      city: "Calgary",
      state: "AB",
      zip: "T2P 1J9",
    });
    expect(url).toBe(
      `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
        "123 Main St, Calgary, AB T2P 1J9",
      )}`,
    );
  });

  it("handles a missing state and zip", () => {
    const url = getGoogleMapsUrl({ street: "1 Elm", city: "Banff" });
    expect(url).toContain(encodeURIComponent("1 Elm, Banff,"));
    expect(url).not.toContain("undefined");
    expect(url).not.toContain("null");
  });
});

describe("toLocalMidnight", () => {
  it("returns undefined for empty or invalid input", () => {
    expect(toLocalMidnight(null)).toBeUndefined();
    expect(toLocalMidnight(undefined)).toBeUndefined();
    expect(toLocalMidnight("")).toBeUndefined();
    expect(toLocalMidnight("not a date")).toBeUndefined();
  });

  it("keeps the UTC calendar day instead of shifting to the previous local day", () => {
    // Midnight UTC is 6pm the day before in Edmonton; the calendar day must not change.
    const result = toLocalMidnight("2026-06-15T00:00:00.000Z");
    expect(result).toBeDefined();
    expect(ymd(result as Date)).toBe("2026-06-15");
    expect(result?.getHours()).toBe(0);
  });

  it("accepts Date objects", () => {
    const result = toLocalMidnight(new Date("2026-01-02T00:00:00.000Z"));
    expect(ymd(result as Date)).toBe("2026-01-02");
  });
});

describe("formatDateNaive", () => {
  it("returns 'Not set' when there is no date", () => {
    expect(formatDateNaive(null, "yyyy-MM-dd")).toBe("Not set");
    expect(formatDateNaive(undefined, "yyyy-MM-dd")).toBe("Not set");
  });

  it("returns 'Invalid Date' for unparseable strings", () => {
    expect(formatDateNaive("garbage", "yyyy-MM-dd")).toBe("Invalid Date");
  });

  it("formats UTC date strings without a timezone shift", () => {
    expect(formatDateNaive("2026-06-15T00:00:00.000Z", "MMM d, yyyy")).toBe(
      "Jun 15, 2026",
    );
  });

  it("formats Date objects as-is", () => {
    expect(formatDateNaive(new Date(2026, 5, 15), "yyyy-MM-dd")).toBe(
      "2026-06-15",
    );
  });
});

describe("getNextCutDate", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Monday, June 15 2026, mid-morning local time
    vi.setSystemTime(new Date(2026, 5, 15, 10, 30));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns the start date when it is today or in the future", () => {
    expect(ymd(getNextCutDate("2026-06-15", "weekly"))).toBe("2026-06-15");
    expect(ymd(getNextCutDate("2026-07-01", "weekly"))).toBe("2026-07-01");
  });

  it("ignores the time part of ISO strings", () => {
    expect(ymd(getNextCutDate("2026-07-01T00:00:00.000Z", "weekly"))).toBe(
      "2026-07-01",
    );
  });

  it("accepts Date objects", () => {
    expect(ymd(getNextCutDate(new Date(2026, 6, 1), "weekly"))).toBe(
      "2026-07-01",
    );
  });

  it("daily: past start dates resolve to today", () => {
    expect(ymd(getNextCutDate("2026-01-01", "daily"))).toBe("2026-06-15");
  });

  it.each([
    ["2026-06-01", "2026-06-15"], // exactly 2 weeks ago -> today
    ["2026-06-02", "2026-06-16"], // 13 days ago -> tomorrow
    ["2026-06-08", "2026-06-15"], // 1 week ago -> today
    ["2026-06-14", "2026-06-21"], // yesterday -> next week
  ])("weekly: start %s -> next cut %s", (start, expected) => {
    expect(ymd(getNextCutDate(start, "weekly"))).toBe(expected);
  });

  it("is case-insensitive about the frequency", () => {
    expect(ymd(getNextCutDate("2026-06-14", "Weekly"))).toBe("2026-06-21");
  });

  it.each([
    ["bi-weekly", "2026-06-02", "2026-06-16"],
    ["bi-weekly", "2026-05-20", "2026-06-17"],
    ["bi-weekly", "2026-06-01", "2026-06-15"],
    ["every 2 weeks", "2026-06-02", "2026-06-16"],
  ])("%s: start %s -> next cut %s", (frequency, start, expected) => {
    expect(ymd(getNextCutDate(start, frequency))).toBe(expected);
  });

  it.each([
    ["monthly", "2026-03-10", "2026-07-10"],
    ["monthly", "2026-03-15", "2026-06-15"],
    ["every month", "2026-05-20", "2026-06-20"],
  ])("%s: start %s -> next cut %s", (frequency, start, expected) => {
    expect(ymd(getNextCutDate(start, frequency))).toBe(expected);
  });

  // Known bug: stepping one month at a time keeps the clamped day, so a
  // Jan 31 start becomes Feb 28 and then stays on the 28th forever.
  // When this is fixed, change `it.fails` to `it`.
  it.fails("monthly: keeps month-end schedules on the original day", () => {
    expect(ymd(getNextCutDate("2026-01-31", "monthly"))).toBe("2026-06-30");
  });

  it("returns the start date for unknown frequencies", () => {
    expect(ymd(getNextCutDate("2026-01-01", "yearly"))).toBe("2026-01-01");
  });

  it("returns an invalid date for unparseable input", () => {
    expect(Number.isNaN(getNextCutDate("nope", "weekly").getTime())).toBe(true);
  });
});

describe("formatCurrency", () => {
  it("formats USD with two decimals and separators", () => {
    expect(formatCurrency(1234.5)).toBe("$1,234.50");
    expect(formatCurrency(0)).toBe("$0.00");
  });
});

describe("formatStandardDate / formatLongDate", () => {
  it("formats dates in en-US short and long styles", () => {
    const d = new Date(2026, 5, 15);
    expect(formatStandardDate(d)).toBe("Jun 15, 2026");
    expect(formatLongDate(d)).toBe("June 15, 2026");
  });

  it("does not throw on invalid dates", () => {
    expect(formatStandardDate("garbage")).toBe("Invalid Date");
    expect(formatLongDate("garbage")).toBe("Invalid Date");
  });
});

describe("getShimmerDataURL", () => {
  it("returns a base64 SVG data URL sized to the inputs", () => {
    const url = getShimmerDataURL(320, 200);
    expect(url.startsWith("data:image/svg+xml;base64,")).toBe(true);
    const svg = Buffer.from(url.split(",")[1], "base64").toString("utf8");
    expect(svg).toContain('width="320"');
    expect(svg).toContain('height="200"');
  });
});
