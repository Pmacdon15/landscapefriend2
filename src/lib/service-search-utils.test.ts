import type { ReadonlyURLSearchParams } from "next/navigation";
import { describe, expect, it, vi } from "vitest";
import type { CutListItem } from "@/types/types";
import { makeAddress, makeClient } from "../../tests/helpers/fixtures";
import {
  handleServiceSearch,
  handleServiceSelect,
} from "./service-search-utils";

const setup = (query = "") => ({
  router: { push: vi.fn() },
  searchParams: new URLSearchParams(
    query,
  ) as unknown as ReadonlyURLSearchParams,
  setInputValue: vi.fn(),
  setIsFocused: vi.fn(),
  setOptimistic: vi.fn(),
});

const stop = (clientId: string, name: string) =>
  ({
    client: { id: clientId, name },
    address: makeAddress({ client_id: clientId }),
  }) as unknown as CutListItem;

describe("handleServiceSelect", () => {
  it("narrows the route to every stop for the chosen client", () => {
    const s = setup("date=2026-06-01&search=ja");
    const jane1 = stop("c1", "Jane Doe");
    const jane2 = stop("c1", "Jane Doe");
    const bob = stop("c2", "Bob Smith");

    handleServiceSelect({ ...s, item: jane1, items: [jane1, bob, jane2] });

    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "select-client",
      value: "Jane Doe",
      cuts: [jane1, jane2],
    });
    expect(s.setInputValue).toHaveBeenCalledWith("Jane Doe");
    expect(s.router.push).toHaveBeenCalledWith(
      "/clients-service?date=2026-06-01&clientId=c1",
    );
    expect(s.setIsFocused).toHaveBeenCalledWith(false);
  });
});

describe("handleServiceSearch", () => {
  it("filters by the query and drops a selected client", () => {
    const s = setup("date=2026-06-01&clientId=c1");
    handleServiceSearch({ ...s, query: "oak" });

    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "update-search",
      value: "oak",
    });
    expect(s.router.push).toHaveBeenCalledWith(
      "/clients-service?date=2026-06-01&search=oak",
    );
  });

  it("restores the full default route when the search is cleared", () => {
    const s = setup("date=2026-06-01&search=oak");
    const a1 = makeAddress();
    const a2 = makeAddress();
    const client = makeClient({ name: "Jane Doe", addresses: [a1, a2] });

    handleServiceSearch({
      ...s,
      query: "",
      defaultData: { clients: [client] },
    });

    expect(s.setOptimistic).toHaveBeenCalledWith({
      type: "select-client",
      value: "",
      cuts: [
        { client: { id: client.id, name: "Jane Doe" }, address: a1 },
        { client: { id: client.id, name: "Jane Doe" }, address: a2 },
      ],
    });
    expect(s.router.push).toHaveBeenCalledWith(
      "/clients-service?date=2026-06-01",
    );
  });
});
