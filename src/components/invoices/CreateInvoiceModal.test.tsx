// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useCreateInvoice } from "@/mutations/invoices";
import { CreateInvoiceModal } from "./CreateInvoiceModal";

vi.mock("@/mutations/invoices", () => ({ useCreateInvoice: vi.fn() }));

const client = {
  id: "client_1",
  name: "Jane Doe",
  email: "jane@example.com",
  addresses: [
    { id: "addr_1", street: "12 Oak St", city: "Calgary" },
    { id: "addr_2", street: "9 Elm Ave", city: "Calgary" },
  ],
};

const mutateAsync = vi.fn();
const onClose = vi.fn();
const onInvoiceCreated = vi.fn();

function renderModal(isOpen = true) {
  return render(
    <CreateInvoiceModal
      isOpen={isOpen}
      onClose={onClose}
      nextInvoiceNumber="INV-0007"
      onInvoiceCreated={onInvoiceCreated}
    />,
  );
}

const amount = (label: string) =>
  screen.getByText(label).parentElement?.querySelector("span:last-child")
    ?.textContent;

async function pickClient(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText("Client Selection"), "jan");
  await user.click(
    await screen.findByRole("button", {
      name: /Jane Doe \(jane@example.com\)/,
    }),
  );
}

beforeEach(() => {
  vi.mocked(useCreateInvoice).mockReturnValue({
    mutateAsync,
    isPending: false,
  } as never);
  mutateAsync.mockResolvedValue({ id: "inv_1", invoice_number: "INV-0007" });
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => Response.json({ clients: [client] })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe("CreateInvoiceModal", () => {
  it("renders nothing when closed", () => {
    const { container } = renderModal(false);
    expect(container).toBeEmptyDOMElement();
  });

  it("defaults the dates to local today and 30 days out", () => {
    // 9pm in Calgary is already the next day in UTC.
    vi.useFakeTimers({
      now: new Date("2026-06-02T03:00:00Z"),
      toFake: ["Date"],
    });
    renderModal();
    expect(screen.getByLabelText("Issue Date")).toHaveValue("2026-06-01");
    expect(screen.getByLabelText("Due Date")).toHaveValue("2026-07-01");
  });

  it("searches clients and fills every line with their first address", async () => {
    const user = userEvent.setup();
    renderModal();
    await pickClient(user);

    expect(fetch).toHaveBeenLastCalledWith("/api/clients/search?q=jan");
    expect(screen.getByText("Selected Client:")).toBeInTheDocument();
    const [, location] = screen.getAllByRole("combobox");
    expect(location).toHaveValue("addr_1");
  });

  it("totals line items with tax", async () => {
    const user = userEvent.setup();
    renderModal();
    await pickClient(user);
    await user.click(screen.getByRole("button", { name: /add service/i }));

    // Spinbuttons per line: unit price, quantity (after the tax rate).
    // Line 1: 2 x $45. Line 2: 1 x $30.
    const [, , qty1, price2] = screen.getAllByRole("spinbutton");
    await user.clear(qty1);
    await user.type(qty1, "2");
    await user.clear(price2);
    await user.type(price2, "30");

    await user.clear(screen.getByLabelText("Tax Rate (%)"));
    await user.type(screen.getByLabelText("Tax Rate (%)"), "5");

    expect(amount("Subtotal")).toBe("$120.00");
    expect(amount("Tax (5.00%)")).toBe("$6.00");
    expect(amount("Calculated Total")).toBe("$126.00");
  });

  it("submits the invoice, closes and bumps the invoice number", async () => {
    const user = userEvent.setup();
    renderModal();
    await pickClient(user);
    await user.type(screen.getByLabelText("Invoice Notes / Terms"), "Net 30");
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    expect(mutateAsync).toHaveBeenCalledWith(
      expect.objectContaining({
        clientId: "client_1",
        invoiceNumber: "INV-0007",
        notes: "Net 30",
        taxRate: 0,
        items: [
          {
            service_type: "grass",
            address_id: "addr_1",
            description: null,
            quantity: 1,
            unit_price: 45,
          },
        ],
      }),
    );
    expect(onInvoiceCreated).toHaveBeenCalledWith({
      id: "inv_1",
      invoice_number: "INV-0007",
    });
    expect(onClose).toHaveBeenCalled();
    expect(screen.getByLabelText("Invoice Number")).toHaveValue("INV-0008");
  });

  it("can't be submitted before a client is chosen", () => {
    renderModal();
    expect(
      screen.getByRole("button", { name: "Create Invoice" }),
    ).toBeDisabled();
  });

  it("keeps the form open when saving fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mutateAsync.mockRejectedValue(new Error("Invoice number taken"));
    const user = userEvent.setup();
    renderModal();
    await pickClient(user);
    await user.click(screen.getByRole("button", { name: "Create Invoice" }));

    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByLabelText("Invoice Number")).toHaveValue("INV-0007");
  });

  it("only allows removing lines when there is more than one", async () => {
    const user = userEvent.setup();
    renderModal();
    await pickClient(user);
    const lines = () =>
      screen.getAllByPlaceholderText("Notes or itemized details...");
    expect(lines()).toHaveLength(1);

    await user.click(screen.getByRole("button", { name: /add service/i }));
    expect(lines()).toHaveLength(2);

    const firstLine = lines()[0].closest("div.relative") as HTMLElement;
    const remove = within(firstLine).getAllByRole("button")[0];
    await user.click(remove);
    expect(lines()).toHaveLength(1);
  });
});
