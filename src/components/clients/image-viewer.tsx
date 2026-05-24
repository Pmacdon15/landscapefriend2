"use client";

import { useState, useRef } from "react";
import { format } from "date-fns";
import { Download, X, Loader2 } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SiteMap } from "@/zod/schemas";
import { SiteMapEditor } from "./site-maps/site-map-editor";

interface ImageViewerProps {
  viewingImage: SiteMap | null;
  onClose: () => void;
  isAdmin: boolean;
}

export function ImageViewer({
  viewingImage,
  onClose,
  isAdmin,
}: ImageViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const currentId = viewingImage?.id || null;
  const lastIdRef = useRef<string | null>(null);

  if (currentId !== lastIdRef.current) {
    lastIdRef.current = currentId;
    setIsLoading(true);
  }

  const _handleDownload = async () => {
    if (!viewingImage) return;
    try {
      const type = viewingImage.name?.startsWith("Completion")
        ? "photo"
        : "sitemap";

      const response = await fetch(
        `/api/image-view/${viewingImage.id}?type=${type}`,
      );
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;

      const contentType = response.headers.get("Content-Type");
      const ext = contentType ? contentType.split("/")[1] : "png";
      const cleanExt = ext === "jpeg" ? "jpg" : ext;
      a.download = `${viewingImage.name || "photo"}.${cleanExt}`;

      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  return (
    <Dialog open={!!viewingImage} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="fixed inset-0 top-0 left-0 translate-x-0 translate-y-0 max-w-none w-full h-full p-0 border-none bg-black/95 overflow-hidden flex flex-col items-center justify-center text-white rounded-none sm:max-w-none"
      >
        <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-b from-black/60 to-transparent z-50 flex items-center justify-between px-4 md:px-8">
          <div className="flex flex-col">
            <h3 className="text-lg font-semibold truncate max-w-[200px] md:max-w-md">
              {viewingImage?.name || "Viewing Photo"}
            </h3>
            {viewingImage?.created_at && (
              <p className="text-xs text-slate-300">
                {format(new Date(viewingImage.created_at), "PPP p")}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {viewingImage?.blob_path && (
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 text-white hover:bg-white/20 transition-colors rounded-full focus-visible:ring-0"
                onClick={_handleDownload}
              >
                <Download className="h-5 w-5" />
                <span className="sr-only">Download</span>
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 text-white hover:bg-white/20 transition-colors rounded-full focus-visible:ring-0"
              onClick={onClose}
            >
              <X className="h-5 w-5" />
              <span className="sr-only">Close</span>
            </Button>
          </div>
        </div>

        {viewingImage && (
          <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8 pt-16">
            {viewingImage.blob_path ? (
              <>
                {isLoading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/40">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p className="text-xs text-slate-400 font-semibold tracking-wider animate-pulse">
                      LOADING PHOTO...
                    </p>
                  </div>
                )}
                <Image
                  key={viewingImage.id}
                  src={`/api/image-view/${viewingImage.id}?type=${viewingImage.name?.startsWith("Completion") ? "photo" : "sitemap"}`}
                  alt={viewingImage.name || "Viewing photo"}
                  fill
                  unoptimized
                  onLoad={() => setIsLoading(false)}
                  className={`object-contain shadow-2xl transition-all duration-500 ease-in-out ${
                    isLoading ? "opacity-0 scale-95" : "opacity-100 scale-100"
                  }`}
                />
              </>
            ) : viewingImage.map_data && isAdmin ? (
              <div className="w-full max-w-5xl aspect-12/8 bg-white rounded-lg overflow-hidden shadow-2xl">
                <SiteMapEditor
                  address={"Site Area"}
                  readOnlyPolygons={viewingImage.map_data}
                />
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
