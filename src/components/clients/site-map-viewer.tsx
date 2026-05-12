"use client";

import { Download } from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { SiteMap } from "@/zod/schemas";
import { SiteMapEditor } from "./site-maps/site-map-editor";

interface SiteMapViewerProps {
  viewingSiteMap: SiteMap | null;
  onClose: () => void;
}

export function SiteMapViewer({ viewingSiteMap, onClose }: SiteMapViewerProps) {
  const handleDownload = async () => {
    if (!viewingSiteMap) return;
    try {
      const response = await fetch(`/api/site-maps/image/${viewingSiteMap.id}`);
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
            size="icon-sm"
            className="absolute top-2 right-10 h-8 w-8 text-white hover:bg-white/20 transition-colors z-50"
            onClick={handleDownload}
          >
            <Download className="h-4 w-4" />
            <span className="sr-only">Download</span>
          </Button>
        )}
        {viewingSiteMap && (
          <div className="relative w-full h-full flex items-center justify-center p-2 md:p-8">
            {viewingSiteMap.blob_path ? (
              <Image
                src={`/api/site-maps/image/${viewingSiteMap.id}`}
                alt="Viewing site map or photo"
                fill
                unoptimized
                className="object-contain shadow-2xl rounded-sm transition-all duration-300"
              />
            ) : viewingSiteMap.map_data ? (
              <div className="w-full max-w-5xl aspect-[12/8] bg-white rounded-lg overflow-hidden shadow-2xl">
                <SiteMapEditor
                  address={"Site Area"}
                  readOnlyPoints={viewingSiteMap.map_data}
                />
              </div>
            ) : null}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
