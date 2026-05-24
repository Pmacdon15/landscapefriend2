"use client";

import { useState, useRef } from "react";
import { Download, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SiteMap } from "@/zod/schemas";

interface PhotoViewerProps {
  viewingSiteMap: SiteMap | null;
  onClose: () => void;
}

export function PhotoViewer({ viewingSiteMap, onClose }: PhotoViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const currentId = viewingSiteMap?.id || null;
  const lastIdRef = useRef<string | null>(null);

  if (currentId !== lastIdRef.current) {
    lastIdRef.current = currentId;
    setIsLoading(true);
  }

  const handleDownload = async () => {
    if (!viewingSiteMap) return;
    try {
      const type =
        viewingSiteMap.name === "Completion Photo" ? "photo" : "sitemap";
      const response = await fetch(
        `/api/image-view/${viewingSiteMap.id}?type=${type}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentType = response.headers.get("Content-Type");
      const ext = contentType ? contentType.split("/")[1] : "png";
      const cleanExt = ext === "jpeg" ? "jpg" : ext;
      a.download = `${viewingSiteMap.name || "photo"}.${cleanExt}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={!!viewingSiteMap} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] w-full h-full p-0 border-none bg-black/95 overflow-hidden flex flex-col items-center justify-center text-white">
        {viewingSiteMap?.blob_path && (
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 text-white transition-colors ml-auto mr-8"
            onClick={handleDownload}
          >
            <Download className="h-5 w-5" />
            <span className="sr-only">Download</span>
          </Button>
        )}
        {viewingSiteMap && (
          <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8">
            {viewingSiteMap.blob_path && (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse">
                      LOADING PROOF...
                    </p>
                  </div>
                )}
                <Image
                  key={viewingSiteMap.id}
                  src={`/api/image-view/${viewingSiteMap.id}?type=${viewingSiteMap.name === "Completion Photo" ? "photo" : "sitemap"}`}
                  alt="Viewing existing sitemap or completion photo"
                  fill
                  unoptimized
                  onLoad={() => setIsLoading(false)}
                  className={`object-contain shadow-2xl rounded-sm transition-all duration-500 ease-in-out ${
                    isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                />
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
