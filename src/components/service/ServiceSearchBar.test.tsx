// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useServiceSearchQuery } from "@/hooks/use-service-search";
import type { CutListItem } from "@/types/types";
import { makeAddress, makeClient } from "../../../tests/helpers/fixtures";
import { ServiceSearchBar } from "./ServiceSearchBar";

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock("@/hooks/use-service-search", () => ({
  useServiceSearchQuery: vi.fn(),
}));

const stop = (name: string, street: string) => {
  const address = makeAddress({ street, city: "Calgary" });
  return {
    client: makeClient({ name, addresses: [address] }),
    address,
  } as unknown as CutListItem;
};

const items = [
  stop("Jane Doe", "12 Oak St"),
  stop("Bob Smith", "99 Elm Ave"),
  stop("Oakley Jones", "5 Pine Rd"),
];

beforeEach(() => {
  vi.mocked(useServiceSearchQuery).mockReturnValue({
    data: undefined,
  } as never);
});

describe("ServiceSearchBar", () => {
  it("matches stops by client name or street, ignoring case", async () => {
    render(
      <ServiceSearchBar
        items={items}
        optimisticValue=""
        setOptimistic={vi.fn()}
        date={new Date(2026, 5, 1)}
      />,
    );
    await userEvent.type(
      screen.getByPlaceholderText("Search this route..."),
      "OAK",
    );
    expect(screen.getByText("Jane Doe")).toBeInTheDocument();
    expect(screen.getByText("Oakley Jones")).toBeInTheDocument();
    expect(screen.queryByText("Bob Smith")).not.toBeInTheDocument();
  });

  it("loads the default route for the date and user", () => {
    const date = new Date(2026, 5, 1);
    render(
      <ServiceSearchBar
        items={items}
        optimisticValue=""
        setOptimistic={vi.fn()}
        date={date}
        userId="user_1"
      />,
    );
    expect(useServiceSearchQuery).toHaveBeenCalledWith(date, "user_1");
  });
});
