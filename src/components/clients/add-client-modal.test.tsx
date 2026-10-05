// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateClient } from "@/mutations/clients";
import { AddClientModal } from "./add-client-modal";

vi.mock("@/mutations/clients", () => ({ useCreateClient: vi.fn() }));

const createClient = vi.fn();
const setOptimistic = vi.fn();
const members = [
  { id: "user_1", name: "Sam" },
  { id: "user_2", name: "Alex" },
];

async function openModal() {
  const user = userEvent.setup();
  render(
    <AddClientModal members={members as never} setOptimistic={setOptimistic} />,
  );
  await user.click(screen.getByRole("button", { name: /add client/i }));
  await screen.findByRole("dialog");
  return user;
}

beforeEach(() => {
  vi.mocked(useCreateClient).mockReturnValue({
    mutate: createClient,
    isPending: false,
  } as never);
});

describe("AddClientModal", () => {
  it("requires a name, street and city", async () => {
    const user = await openModal();
    await user.click(screen.getByRole("button", { name: "Save Client" }));

    expect(await screen.findByText("Name is required")).toBeInTheDocument();
    expect(screen.getByText("Street is required")).toBeInTheDocument();
    expect(screen.getByText("City is required")).toBeInTheDocument();
    expect(createClient).not.toHaveBeenCalled();
    expect(setOptimistic).not.toHaveBeenCalled();
  });

  it("creates the client with blanks as nulls and the chosen team", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Street"), "12 Oak St");
    await user.type(screen.getByLabelText("City"), "Calgary");
    await user.click(screen.getByLabelText("Alex"));
    await user.click(screen.getByRole("button", { name: "Save Client" }));

    await vi.waitFor(() => expect(createClient).toHaveBeenCalled());
    expect(createClient).toHaveBeenCalledWith({
      name: "Jane Doe",
      email: null,
      phone: null,
      addresses: [
        {
          street: "12 Oak St",
          city: "Calgary",
          state: null,
          zip: null,
          assigned_to: null,
          assigned_member_ids: ["user_2"],
          status: "active",
        },
      ],
    });
  });

  it("shows the new client optimistically and closes", async () => {
    const user = await openModal();
    await user.type(screen.getByLabelText("Name"), "Jane Doe");
    await user.type(screen.getByLabelText("Email (Optional)"), "j@x.com");
    await user.type(screen.getByLabelText("Street"), "12 Oak St");
    await user.type(screen.getByLabelText("City"), "Calgary");
    await user.click(screen.getByRole("button", { name: "Save Client" }));

    await vi.waitFor(() => expect(setOptimistic).toHaveBeenCalled());
    expect(setOptimistic.mock.calls[0][0]).toMatchObject({
      type: "add-client",
      client: {
        name: "Jane Doe",
        email: "j@x.com",
        phone: null,
        addresses: [{ street: "12 Oak St", city: "Calgary", status: "active" }],
      },
    });
    await vi.waitFor(() =>
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument(),
    );
  });

  it("adds and removes extra addresses", async () => {
    const user = await openModal();
    expect(screen.getAllByPlaceholderText("123 Main St")).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /add address/i }));
    expect(screen.getAllByPlaceholderText("123 Main St")).toHaveLength(2);

    // A delete button only appears once there's more than one address.
    const deleteButtons = screen
      .getAllByRole("button")
      .filter((b) => b.className.includes("bg-destructive"));
    expect(deleteButtons).toHaveLength(2);
    await user.click(deleteButtons[1]);
    expect(screen.getAllByPlaceholderText("123 Main St")).toHaveLength(1);
  });
});
