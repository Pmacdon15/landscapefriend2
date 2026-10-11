// @vitest-environment jsdom
import { act, render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it, vi } from "vitest";
import PaginationButtons from "./pagination-buttons";

vi.mock("next/navigation", () => ({
  useSearchParams: () => new URLSearchParams("search=oak&page=2"),
}));

const renderPager = async (page: number, totalPages: number) => {
  let result: ReturnType<typeof render> | undefined;
  await act(async () => {
    result = render(
      <Suspense fallback="loading">
        <PaginationButtons
          pagePromise={Promise.resolve(page)}
          totalPagesPromise={Promise.resolve(totalPages)}
          hash="client-list"
        />
      </Suspense>,
    );
  });
  return result as ReturnType<typeof render>;
};

describe("PaginationButtons", () => {
  it("renders nothing when there is only one page", async () => {
    const { container } = await renderPager(1, 1);
    expect(container).toBeEmptyDOMElement();
  });

  it("links to the neighbouring pages, keeping the other params and hash", async () => {
    await renderPager(2, 3);
    expect(screen.getByText("Page 2 of 3")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "href",
      "?search=oak&page=1#client-list",
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "href",
      "?search=oak&page=3#client-list",
    );
  });

  it("disables Previous on the first page and Next on the last", async () => {
    await renderPager(1, 2);
    expect(screen.getByRole("link", { name: /previous/i })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
    expect(screen.getByRole("link", { name: /next/i })).toHaveAttribute(
      "aria-disabled",
      "false",
    );
  });

  it("clamps an out-of-range page", async () => {
    await renderPager(9, 4);
    expect(screen.getByText("Page 4 of 4")).toBeInTheDocument();
  });
});
