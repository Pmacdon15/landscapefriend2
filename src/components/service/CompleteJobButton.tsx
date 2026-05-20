"use client";
import imageCompression from "browser-image-compression";
import { CheckCircle2 } from "lucide-react";
import { startTransition, useState } from "react";
import { Button } from "@/components/ui/button";
import { CameraCapture } from "@/components/ui/camera-capture";
import { Dialog, DialogContent } from "@/components/ui/dialog";

import { useCompleteJob } from "@/mutations/jobs";
import type { Address } from "@/zod/schemas";

interface CompleteJobButtonProps {
  address: Address;
  date: Date;
  currentUserId: string | null;
  onCompleteOptimistic: (params: {
    addressId: string;
    timestamp: Date;
    currentUserId: string;
    serviceType: "grass" | "snow";
    scheduledDate: Date;
  }) => void;
}

export function CompleteJobButton({
  address,
  date,
  currentUserId,
  onCompleteOptimistic,
}: CompleteJobButtonProps) {
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const { mutate: completeJob, isPending: isCompleting } = useCompleteJob();

  const onPhotoCapture = async (file: File, timestamp: Date) => {
    // Close camera immediately for snappier feel
    setIsCameraOpen(false);

    let fileToUpload: File | Blob = file;
    if (fileToUpload.size > 1024 * 1024) {
      try {
        fileToUpload = await imageCompression(file, {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        });
      } catch (error) {
        console.error("Compression error:", error);
      }
    }

    const isSnow = address.schedule?.frequency === "daily";
    const serviceType = isSnow ? "snow" : "grass";

    startTransition(() => {
      onCompleteOptimistic({
        addressId: address.id,
        timestamp,
        currentUserId: currentUserId ?? "",
        serviceType,
        scheduledDate: date,
      });

      completeJob({
        addressId: address.id,
        serviceType: serviceType,
        assignedTo: address.assignment?.user_id || address.assigned_to || null,
        photoFile: fileToUpload as File,
        capturedAt: timestamp,
        completedAt: timestamp,
        scheduledDate: date,
      });
    });
  };

  return (
    <>
      <Button
        variant="outline"
        className="shrink-0 gap-2 border-primary/20 hover:border-primary hover:bg-primary/5 transition-all"
        disabled={isCompleting}
        onClick={() => setIsCameraOpen(true)}
      >
        {isCompleting ? (
          "Completing..."
        ) : (
          <>
            <CheckCircle2 className="h-4 w-4" />
            Mark Complete
          </>
        )}
      </Button>

      <Dialog
        open={isCameraOpen}
        onOpenChange={(open) => !open && setIsCameraOpen(false)}
      >
        <DialogContent
          className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-none w-full h-full p-0 border-none bg-black overflow-hidden flex items-center justify-center rounded-none sm:max-w-none"
          showCloseButton={false}
        >
          {isCameraOpen && (
            <CameraCapture
              onCapture={onPhotoCapture}
              onClose={() => setIsCameraOpen(false)}
              isPending={isCompleting}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
