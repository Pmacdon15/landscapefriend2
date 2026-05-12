"use client";

import { X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "./button";

interface CameraCaptureProps {
  onCapture: (file: File, capturedAt: Date) => void;
  onClose: () => void;
}

export function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function startCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" }, // Prefer back camera
          audio: false,
        });
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
      if (stream) {
        for (const track of stream.getTracks()) {
          track.stop();
        }
      }
    };
  }, [stream]);

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;

    const context = canvas.getContext("2d");
    if (!context) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      if (blob) {
        const now = new Date();
        const file = new File([blob], `capture-${now.getTime()}.png`, {
          type: "image/png",
        });
        onCapture(file, now);
      }
    }, "image/png");
  };

  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col items-center justify-center">
      <div className="absolute top-4 right-4 z-[110]">
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
          className="text-white hover:bg-white/20"
        >
          <X className="h-6 w-6" />
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
        <>
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover max-w-4xl max-h-[80vh]"
          />
          <canvas ref={canvasRef} className="hidden" />

          <div className="absolute bottom-8 flex items-center justify-center w-full gap-6">
            <Button
              size="lg"
              className="h-20 w-20 rounded-full bg-white text-black hover:bg-slate-200 border-4 border-slate-300"
              onClick={takePhoto}
            >
              <div className="h-14 w-14 rounded-full border-2 border-black" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
