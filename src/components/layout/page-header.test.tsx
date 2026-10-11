// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { PageHeader } from "./page-header";

describe("PageHeader", () => {
  it("shows the title as the page heading with its description", () => {
    render(<PageHeader title="Clients" description="Manage your clients." />);
    expect(
      screen.getByRole("heading", { level: 1, name: "Clients" }),
    ).toBeInTheDocument();
    expect(screen.getByText("Manage your clients.")).toBeInTheDocument();
  });

  it("only shows a back link when given an href", () => {
    const { rerender } = render(<PageHeader title="Invoices" />);
    expect(screen.queryByRole("link")).not.toBeInTheDocument();

    rerender(
      <PageHeader title="Invoices" backHref="/admin" backLabel="Dashboard" />,
    );
    expect(screen.getByRole("link", { name: "Dashboard" })).toHaveAttribute(
      "href",
      "/admin",
    );
  });

  it("renders actions passed as children", () => {
    render(
      <PageHeader title="Clients">
        <button type="button">Add Client</button>
      </PageHeader>,
    );
    expect(
      screen.getByRole("button", { name: "Add Client" }),
    ).toBeInTheDocument();
  });
});
