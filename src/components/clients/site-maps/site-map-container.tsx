"use client";

import imageCompression from "browser-image-compression";
import { format } from "date-fns";
import { FileImage, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import { useDeleteSiteMap, useSaveSiteMap } from "@/mutations/clients";
import type { Address, SiteMap } from "@/zod/schemas";
import { SiteMapViewer } from "../site-map-viewer";
import { SiteMapEditor } from "./site-map-editor";

interface SiteMapContainerProps {
  address: Address;
}

export function SiteMapContainer({ address }: SiteMapContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [viewingSiteMap, setViewingSiteMap] = useState<SiteMap | null>(null);
  const [siteMapToDelete, setSiteMapToDelete] = useState<SiteMap | null>(null);
  const [name, setName] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [mapData, setMapData] = useState<{ x: number; y: number }[] | null>(
    null,
  );
  const [activeTab, setActiveTab] = useState<"upload" | "draw">("upload");
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  const { mutate: saveSiteMap, isPending: isMutationPending } =
    useSaveSiteMap();
  const { mutate: deleteSiteMap } = useDeleteSiteMap();

  const isSaving = isMutationPending || isSavingLocal;
  const [compressionStatus, setCompressionStatus] = useState("");

  const handleSave = async (
    finalMapData?: { x: number; y: number }[],
    drawingFile?: File,
  ) => {
    if (!name && !file && !finalMapData && !drawingFile) return;

    setIsSavingLocal(true);
    let fileToUpload = file || drawingFile || undefined;

    if (fileToUpload && fileToUpload.size > 1024 * 1024) {
      setCompressionStatus("Compressing...");
      try {
        const options = {
          maxSizeMB: 0.9,
          maxWidthOrHeight: 1920,
          useWebWorker: true,
        };
        fileToUpload = await imageCompression(fileToUpload, options);
      } catch (error) {
        console.error("Compression error:", error);
      } finally {
        setCompressionStatus("");
      }
    }

    saveSiteMap(
      {
        addressId: address.id,
        name: name || (drawingFile ? "Drawn Area" : null),
        mapData: finalMapData || mapData,
        file: fileToUpload,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setName("");
          setFile(null);
          setMapData(null);
          setIsSavingLocal(false);
        },
        onError: () => {
          setIsSavingLocal(false);
        },
      },
    );
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogTrigger
          render={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-[10px] gap-1.5 text-slate-500 hover:text-primary"
            >
              <MapIcon className="h-3 w-3" />
              Site Maps ({address.site_maps?.length || 0})
            </Button>
          }
        />
        <DialogContent className="sm:max-w-[700px]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle>Site Maps for {address.street}</DialogTitle>
              <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                <DialogTrigger
                  render={
                    <Button size="sm" className="h-8 gap-1.5">
                      <Plus className="h-4 w-4" />
                      Add Site Map
                    </Button>
                  }
                />
                <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Site Map</DialogTitle>
                  </DialogHeader>
                  <div className="grid gap-6 py-4">
                    <div className="grid gap-2">
                      <Label htmlFor="name">Name / Description</Label>
                      <Input
                        id="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g., Front Yard Area"
                      />
                    </div>

                    <div className="flex gap-4 border-b">
                      <button
                        type="button"
                        className={`pb-2 px-1 text-sm font-medium transition-colors ${
                          activeTab === "upload"
                            ? "border-b-2 border-primary text-primary"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setActiveTab("upload")}
                      >
                        Upload Image
                      </button>
                      <button
                        type="button"
                        className={`pb-2 px-1 text-sm font-medium transition-colors ${
                          activeTab === "draw"
                            ? "border-b-2 border-primary text-primary"
                            : "text-slate-500 hover:text-slate-700"
                        }`}
                        onClick={() => setActiveTab("draw")}
                      >
                        Draw Area
                      </button>
                    </div>

                    {activeTab === "upload" ? (
                      <div className="grid gap-2">
                        <Label htmlFor="file">
                          Upload Image{" "}
                          <span className="text-[10px] font-normal text-muted-foreground">
                            (Max 1MB, will be compressed)
                          </span>
                        </Label>
                        <Input
                          id="file"
                          type="file"
                          accept="image/*"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        <Button
                          onClick={() => handleSave()}
                          disabled={isSaving || !file}
                        >
                          {isSaving
                            ? compressionStatus || "Saving..."
                            : "Save Upload"}
                        </Button>
                      </div>
                    ) : (
                      <SiteMapEditor
                        address={`${address.street}, ${address.city}, ${address.state}`}
                        onSave={(data, file) => handleSave(data, file)}
                      />
                    )}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </DialogHeader>

          <div className="border rounded-lg mt-4 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {address.site_maps && address.site_maps.length > 0 ? (
                  address.site_maps.map((sm) => (
                    <TableRow key={sm.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          {sm.map_data ? (
                            <MapIcon className="h-4 w-4 text-emerald-500" />
                          ) : sm.blob_path ? (
                            <FileImage className="h-4 w-4 text-primary" />
                          ) : null}
                          {sm.name || "Unnamed Site Map"}
                        </div>
                      </TableCell>
                      <TableCell>
                        {format(new Date(sm.created_at), "MMM d, yyyy")}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {(sm.blob_path || sm.map_data) && (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              onClick={() => setViewingSiteMap(sm)}
                            >
                              View
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setSiteMapToDelete(sm)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={3}
                      className="h-24 text-center text-muted-foreground"
                    >
                      No site maps found for this address.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </DialogContent>
      </Dialog>

      <SiteMapViewer
        viewingSiteMap={viewingSiteMap}
        onClose={() => setViewingSiteMap(null)}
      />

      <Dialog
        open={!!siteMapToDelete}
        onOpenChange={(open) => !open && setSiteMapToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Site Map</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete{" "}
              <span className="font-semibold">
                {siteMapToDelete?.name || "this site map"}
              </span>
              ? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSiteMapToDelete(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                if (siteMapToDelete) {
                  deleteSiteMap(siteMapToDelete.id);
                  setSiteMapToDelete(null);
                }
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
