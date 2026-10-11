import type { ReadonlyURLSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import { makeClient } from "../../../tests/helpers/fixtures";
import { handleSearch, handleSelectClient } from "./client-search-utils";

const setup = (query = "") => {
  const router = { push: vi.fn() };
  return {
    router,
    searchParams: new URLSearchParams(
      query,
    ) as unknown as ReadonlyURLSearchParams,
    setInputValue: vi.fn(),
    setIsFocused: vi.fn(),
    setOptimistic: vi.fn(),
  };
};

type Router = Parameters<typeof handleSearch>[0]["router"];

describe("handleSearch", () => {
  it("trims the query, resets to page 1 and drops a selected client", () => {
    const s = setup("clientId=c1&page=3&date=2026-06-01");
    handleSearch({
      ...s,
      router: s.router as unknown as Router,
      query: "  oak  ",
    });

    expect(s.setInputValue).toHaveBeenCalledWith("oak");
    expect(s.setIsFocused).toHaveBeenCalledWith(false);
    expect(s.router.push).toHaveBeenCalledWith(
      "?page=1&date=2026-06-01&search=oak",
    );
  });

  it("shows at most the first page of known results optimistically", () => {
    const s = setup();
    const results = Array.from({ length: 8 }, (_, i) =>
      makeClient({ name: `Client ${i}` }),
    );
    handleSearch({
      ...s,
      router: s.router as unknown as Router,
      query: "client",
      searchResults: results,
    });

    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "search-submitted",
      query: "client",
      clients: results.slice(0, 6),
    });
  });

  it("restores the default list and clears paging when the search is cleared", () => {
    const s = setup("search=old&page=2");
    const defaults = [makeClient()];
    handleSearch({
      ...s,
      router: s.router as unknown as Router,
      query: "   ",
      defaultData: { clients: defaults },
    });

    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "search-submitted",
      query: "",
      clients: defaults,
    });
    expect(s.router.push).toHaveBeenCalledWith("?");
  });

  it("leaves the list alone when nothing is known yet", () => {
    const s = setup();
    handleSearch({ ...s, router: s.router as unknown as Router, query: "new" });
    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "search-submitted",
      query: "new",
      clients: undefined,
    });
  });
});

describe("handleSelectClient", () => {
  it("selects the client and replaces the search with its id", () => {
    const s = setup("search=jan&page=4");
    const client = makeClient({ name: "Jane Doe" });
    handleSelectClient({ ...s, router: s.router as unknown as Router, client });

    expect(s.setInputValue).toHaveBeenCalledWith("Jane Doe");
    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "select-client",
      client,
    });
    expect(s.router.push).toHaveBeenCalledWith(`?page=1&clientId=${client.id}`);
    expect(s.setIsFocused).toHaveBeenCalledWith(false);
  });
});
