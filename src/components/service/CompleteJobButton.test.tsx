// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import imageCompression from "browser-image-compression";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useCompleteJob } from "@/mutations/jobs";
import { makeAddress } from "../../../tests/helpers/fixtures";
import { CompleteJobButton } from "./CompleteJobButton";

vi.mock("@/mutations/jobs", () => ({ useCompleteJob: vi.fn() }));
vi.mock("browser-image-compression", () => ({ default: vi.fn() }));

// The real camera needs getUserMedia. This stand-in "takes" a photo on click.
const TAKEN_AT = new Date("2026-06-01T15:00:00Z");
let photo: File;
vi.mock("@/components/ui/camera-capture", () => ({
  CameraCapture: ({
    onCapture,
  }: {
    onCapture: (file: File, at: Date) => void;
  }) => (
    <button type="button" onClick={() => onCapture(photo, TAKEN_AT)}>
      Take photo
    </button>
  ),
}));

const mutate = vi.fn();
const DATE = new Date(2026, 5, 1);

function renderButton(
  props: Partial<Parameters<typeof CompleteJobButton>[0]> = {},
) {
  render(
    <CompleteJobButton
      address={makeAddress({ id: "addr_1" })}
      date={DATE}
      _currentUserId="user_1"
      _onCompleteOptimistic={vi.fn()}
      {...props}
    />,
  );
}

async function completeWithPhoto() {
  const user = userEvent.setup();
  await user.click(screen.getByRole("button", { name: /mark complete/i }));
  await user.click(await screen.findByRole("button", { name: "Take photo" }));
  await vi.waitFor(() => expect(mutate).toHaveBeenCalled());
  return mutate.mock.calls[0][0];
}

beforeEach(() => {
  photo = new File(["small"], "photo.jpg", { type: "image/jpeg" });
  vi.mocked(useCompleteJob).mockReturnValue({
    mutate,
    isPending: false,
  } as never);
});

describe("CompleteJobButton", () => {
  it("completes a grass cut with the photo and its timestamp", async () => {
    renderButton();
    const job = await completeWithPhoto();
    expect(job).toMatchObject({
      addressId: "addr_1",
      serviceType: "grass",
      photoFile: photo,
      capturedAt: TAKEN_AT,
      completedAt: TAKEN_AT,
      scheduledDate: DATE,
    });
  });

  it("marks daily schedules as snow jobs", async () => {
    renderButton({
      address: makeAddress({
        schedule: { frequency: "daily" } as never,
      }),
    });
    expect((await completeWithPhoto()).serviceType).toBe("snow");
  });

  it("uses the one-time service's own type and id", async () => {
    renderButton({ customServiceType: "aeration", oneTimeServiceId: "ots_1" });
    expect(await completeWithPhoto()).toMatchObject({
      serviceType: "aeration",
      oneTimeServiceId: "ots_1",
    });
  });

  it.each([
    [
      "the day's assignment",
      { assignment: { user_ids: ["u_day"] } },
      ["u_day"],
    ],
    [
      "the default team",
      { assignment: null, assigned_member_ids: ["u_team"] },
      ["u_team"],
    ],
    [
      "the legacy single assignee",
      {
        assignment: null,
        assigned_member_ids: undefined,
        assigned_to: "u_old",
      },
      ["u_old"],
    ],
    [
      "nobody",
      { assignment: null, assigned_member_ids: undefined, assigned_to: null },
      null,
    ],
  ])("credits %s", async (_label, overrides, expected) => {
    renderButton({ address: makeAddress(overrides as never) });
    expect((await completeWithPhoto()).assignedMemberIds).toEqual(expected);
  });

  it("compresses photos over 1MB before uploading", async () => {
    photo = new File([new Uint8Array(1024 * 1024 + 1)], "big.jpg", {
      type: "image/jpeg",
    });
    vi.mocked(imageCompression).mockResolvedValue(
      new Blob(["tiny"], { type: "image/jpeg" }) as File,
    );
    renderButton();

    const job = await completeWithPhoto();

    expect(imageCompression).toHaveBeenCalledWith(
      photo,
      expect.objectContaining({ maxSizeMB: 0.9 }),
    );
    expect(job.photoFile.name).toBe("big.jpg");
    expect(job.photoFile.size).toBe(4);
  });

  it("uploads the original if compression fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    photo = new File([new Uint8Array(1024 * 1024 + 1)], "big.jpg");
    vi.mocked(imageCompression).mockRejectedValue(new Error("worker"));
    renderButton();
    expect((await completeWithPhoto()).photoFile).toBe(photo);
  });

  it("leaves small photos alone", async () => {
    renderButton();
    await completeWithPhoto();
    expect(imageCompression).not.toHaveBeenCalled();
  });

  it("is disabled while the job is being saved", () => {
    vi.mocked(useCompleteJob).mockReturnValue({
      mutate,
      isPending: true,
    } as never);
    renderButton();
    expect(
      screen.getByRole("button", { name: "Completing..." }),
    ).toBeDisabled();
  });
});
