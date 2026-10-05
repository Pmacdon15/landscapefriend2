// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import {
  GenericSearchBar,
  type GenericSearchBarProps,
} from "./generic-search-bar";

type Item = { id: string; name: string };
const items: Item[] = [
  { id: "1", name: "Oak Street" },
  { id: "2", name: "Elm Avenue" },
  { id: "3", name: "Oakridge Drive" },
];

function setup(props: Partial<GenericSearchBarProps<Item>> = {}) {
  const onSearch = vi.fn();
  const onSelect = vi.fn();
  const onInputChange = vi.fn();
  render(
    <div>
      <GenericSearchBar<Item>
        items={items}
        filterPredicate={(item, q) =>
          item.name.toLowerCase().includes(q.toLowerCase())
        }
        renderItem={(item) => <span>{item.name}</span>}
        getItemKey={(item) => item.id}
        onSearch={onSearch}
        onSelect={onSelect}
        onInputChange={onInputChange}
        placeholder="Search..."
        {...props}
      />
      <p>outside</p>
    </div>,
  );
  return {
    user: userEvent.setup(),
    input: screen.getByPlaceholderText("Search..."),
    onSearch,
    onSelect,
    onInputChange,
  };
}

describe("GenericSearchBar", () => {
  it("shows no dropdown until something is typed", async () => {
    const { user, input } = setup();
    await user.click(input);
    expect(screen.queryByText("Oak Street")).not.toBeInTheDocument();
  });

  it("filters the dropdown as the user types", async () => {
    const { user, input, onInputChange } = setup();
    await user.type(input, "oak");
    expect(screen.getByText("Oak Street")).toBeInTheDocument();
    expect(screen.getByText("Oakridge Drive")).toBeInTheDocument();
    expect(screen.queryByText("Elm Avenue")).not.toBeInTheDocument();
    expect(onInputChange).toHaveBeenLastCalledWith("oak");
  });

  it("shows the empty message when nothing matches", async () => {
    const { user, input } = setup({ emptyMessage: "Nothing here." });
    await user.type(input, "zzz");
    expect(screen.getByText("Nothing here.")).toBeInTheDocument();
  });

  it("shows a spinner instead of results while loading", async () => {
    const { user, input } = setup({ isLoading: true });
    await user.type(input, "oak");
    expect(screen.getByText("Searching...")).toBeInTheDocument();
    expect(screen.queryByText("Oak Street")).not.toBeInTheDocument();
  });

  it("searches with the query and filtered items on Enter", async () => {
    const { user, input, onSearch } = setup();
    await user.type(input, "elm{Enter}");
    expect(onSearch).toHaveBeenCalledTimes(1);
    const [query, filtered] = onSearch.mock.calls[0];
    expect(query).toBe("elm");
    expect(filtered).toEqual([items[1]]);
  });

  it("selects the clicked item", async () => {
    const { user, input, onSelect } = setup();
    await user.type(input, "oak");
    await user.click(screen.getByText("Oakridge Drive"));
    expect(onSelect.mock.calls[0][0]).toEqual(items[2]);
  });

  it("clears the query and searches with every item", async () => {
    const { user, input, onSearch } = setup();
    await user.type(input, "oak");
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(input).toHaveValue("");
    expect(onSearch).toHaveBeenCalledWith(
      "",
      items,
      expect.any(Function),
      expect.any(Function),
    );
  });

  it("closes the dropdown on an outside click", async () => {
    const { user, input } = setup();
    await user.type(input, "oak");
    await user.click(screen.getByText("outside"));
    expect(screen.queryByText("Oak Street")).not.toBeInTheDocument();
  });

  it("shows the committed value while not focused", () => {
    setup({ optimisticValue: "Elm" });
    expect(screen.getByPlaceholderText("Search...")).toHaveValue("Elm");
  });
});
