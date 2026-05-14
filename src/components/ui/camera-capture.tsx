"use client";

import { Check, RotateCcw, X } from "lucide-react";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface CameraCaptureProps {
  onCapture: (file: File, capturedAt: Date) => void;
  onClose: () => void;
  isPending?: boolean;
}

export function CameraCapture({
  onCapture,
  onClose,
  isPending,
}: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [_stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [capturedFile, setCapturedFile] = useState<File | null>(null);
  const [capturedAt, setCapturedAt] = useState<Date | null>(null);
  const [isVideoReady, setIsVideoReady] = useState(false);

  useEffect(() => {
    let currentStream: MediaStream | null = null;

    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Prefer back camera
          audio: false,
        });
        currentStream = mediaStream;
        setStream(mediaStream);
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      } catch (err) {
        console.error("Camera error:", err);
        setError(
          "Could not access camera. Please ensure permissions are granted.",
        );
      }
    }

    startCamera();

    return () => {
      if (currentStream) {
        for (const track of currentStream.getTracks()) {
          track.stop();
        }
      }
    };
  }, []);

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas || !isVideoReady) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    // Use the video's actual resolution
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const now = new Date();
          const file = new File([blob], `capture-${now.getTime()}.png`, {
            type: "image/png",
          });
          setCapturedFile(file);
          setCapturedAt(now);
          setPreviewUrl(URL.createObjectURL(blob));
        }
      },
      "image/png",
      0.9,
    );
  };

  const handleRetake = () => {
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
    }
    setPreviewUrl(null);
    setCapturedFile(null);
    setCapturedAt(null);
  };

  const handleConfirm = () => {
    if (capturedFile && capturedAt) {
      onCapture(capturedFile, capturedAt);
    }
  };

  return (
    <div className="relative w-full h-full bg-black flex flex-col items-center justify-center overflow-hidden">
      <div className="absolute top-4 right-4 z-[110]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20 h-12 w-12 rounded-full"
        >
          <X className="h-8 w-8" />
        </Button>
      </div>

      {error ? (
        <div className="text-white text-center p-8 space-y-4">
          <p className="text-lg font-medium">{error}</p>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </div>
      ) : (
        <div className="relative w-full h-full flex flex-col items-center justify-center">
          {/* Video always stays in the DOM to prevent hardware release/flash */}
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => setIsVideoReady(true)}
            className="w-full h-full object-cover max-w-4xl max-h-[100vh]"
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Preview Overlay */}
          {previewUrl && (
            <div className="absolute inset-0 z-[100] bg-black">
              <Image
                src={previewUrl}
                alt="Captured preview"
                fill
                unoptimized
                className="object-cover max-w-4xl mx-auto"
              />
            </div>
          )}

          {/* Controls Overlay */}
          <div className="absolute bottom-8 flex items-center justify-center w-full gap-8 z-[120]">
            {previewUrl ? (
              <>
                <Button
                  size="lg"
                  variant="outline"
                  className="h-16 w-16 rounded-full bg-white/10 text-white hover:bg-white/20 border-2 border-white"
                  onClick={handleRetake}
                  disabled={isPending}
                >
                  <RotateCcw className="h-8 w-8" />
                </Button>
                <Button
                  size="lg"
                  className="h-20 w-20 rounded-full bg-emerald-500 text-white hover:bg-emerald-600 border-4 border-white"
                  onClick={handleConfirm}
                  disabled={isPending}
                >
                  {isPending ? (
                    <span className="text-xs font-bold">Saving...</span>
                  ) : (
                    <Check className="h-10 w-10" />
                  )}
                </Button>
              </>
            ) : (
              <Button
                size="lg"
                className="h-20 w-20 rounded-full bg-white text-black hover:bg-slate-200 border-4 border-slate-300"
                onClick={takePhoto}
                disabled={!isVideoReady}
              >
                <div className="h-14 w-14 rounded-full border-2 border-black" />
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
