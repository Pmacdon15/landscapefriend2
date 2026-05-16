"use client";

import imageCompression from "browser-image-compression";
import { format } from "date-fns";
import { Edit2, FileImage, Map as MapIcon, Plus, Trash2 } from "lucide-react";
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

import {
  useDeleteSiteMap,
  useSaveSiteMap,
  useUpdateSiteMap,
} from "@/mutations/clients";
import type { Address, SiteMap } from "@/zod/schemas";
import { SiteMapViewer } from "../site-map-viewer";
import { SiteMapEditor } from "./site-map-editor";

interface SiteMapContainerProps {
  address: Address;
  isAdmin: boolean;
}

export function SiteMapContainer({ address, isAdmin }: SiteMapContainerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingSiteMap, setEditingSiteMap] = useState<SiteMap | null>(null);
  const [viewingSiteMap, setViewingSiteMap] = useState<SiteMap | null>(null);
  const [siteMapToDelete, setSiteMapToDelete] = useState<SiteMap | null>(null);
  const [name, setName] = useState("");
  const [notes, setNotes] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<"upload" | "draw">("upload");
  const [isSavingLocal, setIsSavingLocal] = useState(false);

  const { mutate: saveSiteMap, isPending: isMutationPending } =
    useSaveSiteMap();
  const { mutate: updateSiteMap, isPending: isUpdatePending } =
    useUpdateSiteMap();
  const { mutate: deleteSiteMap } = useDeleteSiteMap();

  const isSaving = isMutationPending || isUpdatePending || isSavingLocal;
  const [compressionStatus, setCompressionStatus] = useState("");

  const handleSave = async (
    drawingName?: string,
    drawingNotes?: string,
    polygons?: { x: number; y: number }[][],
    drawingFile?: File,
  ) => {
    if (!name && !file && !polygons && !drawingFile && !drawingName && !notes)
      return;

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
        name: drawingName || name || (drawingFile ? "Site Area" : "Site Map"),
        notes: drawingNotes || notes || null,
        mapData: polygons || null,
        file: fileToUpload,
      },
      {
        onSuccess: () => {
          setIsAddOpen(false);
          setName("");
          setNotes("");
          setFile(null);
          setIsSavingLocal(false);
        },
        onError: () => {
          setIsSavingLocal(false);
        },
      },
    );
  };

  const handleUpdate = async (
    newName: string,
    newNotes: string,
    newPolygons: { x: number; y: number }[][],
  ) => {
    if (!editingSiteMap) return;

    updateSiteMap(
      {
        siteMapId: editingSiteMap.id,
        name: newName,
        notes: newNotes,
        mapData: newPolygons,
      },
      {
        onSuccess: () => {
          setEditingSiteMap(null);
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
        <DialogContent className="sm:max-w-175">
          {isAdmin && (
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
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Label htmlFor="notes">Notes</Label>
                            <Input
                              id="notes"
                              value={notes}
                              onChange={(e) => setNotes(e.target.value)}
                              placeholder="Optional notes..."
                            />
                          </div>
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
                              onChange={(e) =>
                                setFile(e.target.files?.[0] || null)
                              }
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
                        </div>
                      ) : (
                        <SiteMapEditor
                          address={`${address.street}, ${address.city}, ${address.state}`}
                          onSave={(newName, notes, polygons, file) =>
                            handleSave(newName, notes, polygons, file)
                          }
                        />
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </DialogHeader>
          )}

          <div className="border rounded-lg mt-4 overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Site Map</TableHead>
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
                          <div>
                            <p className="font-semibold">
                              {sm.name || "Site Map"}
                            </p>
                            {sm.notes && (
                              <p className="text-xs text-slate-500 italic line-clamp-1">
                                {sm.notes}
                              </p>
                            )}
                          </div>
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
                          {isAdmin && (
                            <>
                              {sm.map_data && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-primary"
                                  onClick={() => setEditingSiteMap(sm)}
                                >
                                  <Edit2 className="h-4 w-4" />
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
                            </>
                          )}
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
        isAdmin={true}
        viewingSiteMap={viewingSiteMap}
        onClose={() => setViewingSiteMap(null)}
      />

      <Dialog
        open={!!editingSiteMap}
        onOpenChange={(open) => !open && setEditingSiteMap(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site Map</DialogTitle>
          </DialogHeader>
          {editingSiteMap && (
            <div className="py-4">
              <SiteMapEditor
                address={`${address.street}, ${address.city}, ${address.state}`}
                initialNotes={editingSiteMap.notes || ""}
                initialPolygons={editingSiteMap.map_data}
                onSave={(newName, newNotes, newPolygons) =>
                  handleUpdate(newName, newNotes, newPolygons)
                }
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!siteMapToDelete}
        onOpenChange={(open) => !open && setSiteMapToDelete(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Site Map</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this site map? This action cannot
              be undone.
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
