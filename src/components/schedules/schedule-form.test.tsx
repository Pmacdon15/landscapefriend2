// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useDeleteSchedule, useUpsertSchedule } from "@/mutations/schedules";
import { ScheduleForm } from "./schedule-form";

vi.mock("@/mutations/schedules", () => ({
  useUpsertSchedule: vi.fn(),
  useDeleteSchedule: vi.fn(),
}));

const upsertSchedule = vi.fn();
const deleteSchedule = vi.fn();
const setOptimistic = vi.fn();
const onSuccess = vi.fn();

function renderForm(props: Partial<Parameters<typeof ScheduleForm>[0]> = {}) {
  render(
    <ScheduleForm
      addressId="addr_1"
      setOptimistic={setOptimistic}
      onSuccess={onSuccess}
      {...props}
    />,
  );
  return userEvent.setup();
}

beforeEach(() => {
  vi.mocked(useUpsertSchedule).mockReturnValue({
    mutateAsync: upsertSchedule,
    isPending: false,
  } as never);
  vi.mocked(useDeleteSchedule).mockReturnValue({
    mutateAsync: deleteSchedule,
    isPending: false,
  } as never);
});

describe("ScheduleForm", () => {
  it("saves the local calendar date, not a UTC shifted one", async () => {
    // 11pm local on May 31 is already June 1 in UTC.
    const user = renderForm({
      initialFrequency: "monthly",
      initialDate: new Date(2026, 4, 31, 23, 0),
      initialNotes: "Gate code 1234",
    });
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));

    await vi.waitFor(() => expect(upsertSchedule).toHaveBeenCalled());
    expect(upsertSchedule).toHaveBeenCalledWith({
      addressId: "addr_1",
      frequency: "monthly",
      firstCutDate: "2026-05-31",
      notes: "Gate code 1234",
    });
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "update-schedule",
      addressId: "addr_1",
      frequency: "monthly",
      firstCutDate: "2026-05-31T00:00:00.000Z",
      notes: "Gate code 1234",
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("defaults new schedules to weekly", async () => {
    const user = renderForm({ initialDate: new Date(2026, 5, 1) });
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    await vi.waitFor(() =>
      expect(upsertSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ frequency: "weekly", notes: "" }),
      ),
    );
  });

  it("sends edited notes", async () => {
    const user = renderForm({ initialDate: new Date(2026, 5, 1) });
    await user.type(screen.getByLabelText("Service Notes"), "Dog in yard");
    await user.click(screen.getByRole("button", { name: "Save Schedule" }));
    await vi.waitFor(() =>
      expect(upsertSchedule).toHaveBeenCalledWith(
        expect.objectContaining({ notes: "Dog in yard" }),
      ),
    );
  });

  it("only offers to turn off an existing schedule", () => {
    renderForm();
    expect(
      screen.queryByRole("button", { name: /turn off schedule/i }),
    ).not.toBeInTheDocument();
  });

  it("turns off an existing schedule", async () => {
    const user = renderForm({ initialFrequency: "weekly" });
    await user.click(
      screen.getByRole("button", { name: /turn off schedule/i }),
    );

    await vi.waitFor(() =>
      expect(deleteSchedule).toHaveBeenCalledWith("addr_1"),
    );
    expect(setOptimistic).toHaveBeenCalledWith({
      type: "delete-schedule",
      addressId: "addr_1",
    });
    expect(onSuccess).toHaveBeenCalled();
  });

  it("disables both buttons while saving", () => {
    vi.mocked(useUpsertSchedule).mockReturnValue({
      mutateAsync: upsertSchedule,
      isPending: true,
    } as never);
    renderForm({ initialFrequency: "weekly" });
    expect(screen.getByRole("button", { name: "Saving..." })).toBeDisabled();
    expect(
      screen.getByRole("button", { name: /turn off schedule/i }),
    ).toBeDisabled();
  });
});
