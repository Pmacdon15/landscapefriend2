"use client";

import { Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SiteMap } from "@/zod/schemas";

interface PhotoViewerProps {
  viewingSiteMap: SiteMap | null;
  onClose: () => void;
}

export function PhotoViewer({ viewingSiteMap, onClose }: PhotoViewerProps) {
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
      a.download = `${viewingSiteMap.name || "photo"}.png`;
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
              <Image
                src={`/api/image-view/${viewingSiteMap.id}?type=${viewingSiteMap.name === "Completion Photo" ? "photo" : "sitemap"}`}
                alt="Viewing existing sitemap or completion photo"
                fill
                unoptimized
                className="object-contain shadow-2xl rounded-sm transition-all duration-300"
              />
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
