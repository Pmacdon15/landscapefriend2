"use client";

import imageCompression from "browser-image-compression";
import { format } from "date-fns";
import { Edit2, FileImage, Map as MapIcon, Plus, Trash2 } from "lucide-react";
import { startTransition, useOptimistic, useState } from "react";
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
import { ImageViewer } from "../image-viewer";
import { SiteMapDetailsForm } from "./site-map-details-form";
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

  const [optimisticAddress, setOptimisticAction] = useOptimistic(
    address,
    (
      state,
      action:
        | { type: "ADD"; payload: SiteMap }
        | { type: "UPDATE"; payload: Partial<SiteMap> & { id: string } }
        | { type: "DELETE"; payload: string },
    ) => {
      if (!state.site_maps) return state;

      switch (action.type) {
        case "ADD":
          return {
            ...state,
            site_maps: [action.payload, ...state.site_maps],
          };
        case "UPDATE":
          return {
            ...state,
            site_maps: state.site_maps.map((map) =>
              map.id === action.payload.id
                ? { ...map, ...action.payload }
                : map,
            ),
          };
        case "DELETE":
          return {
            ...state,
            site_maps: state.site_maps.filter(
              (map) => map.id !== action.payload,
            ),
          };
        default:
          return state;
      }
    },
  );

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

    const optimisticName =
      drawingName || name || (drawingFile ? "Site Area" : "Site Map");
    const optimisticNotes = drawingNotes || notes || null;
    setIsAddOpen(false);
    startTransition(() => {
      setOptimisticAction({
        type: "ADD",
        payload: {
          id: crypto.randomUUID(),
          address_id: optimisticAddress.id,
          name: optimisticName,
          notes: optimisticNotes,
          map_data: polygons || null,
          blob_path: fileToUpload ? "pending" : null,
          created_at: new Date(),
        },
      });

      saveSiteMap(
        {
          addressId: optimisticAddress.id,
          name: optimisticName,
          notes: optimisticNotes,
          mapData: polygons || null,
          file: fileToUpload,
        },
        {
          onSuccess: () => {
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
    });
  };

  const handleUpdate = async (
    newName: string,
    newNotes: string,
    newPolygons: { x: number; y: number }[][],
  ) => {
    if (!editingSiteMap) return;
    setEditingSiteMap(null);
    startTransition(() => {
      setOptimisticAction({
        type: "UPDATE",
        payload: {
          id: editingSiteMap.id,
          name: newName,
          notes: newNotes,
          map_data: newPolygons,
        },
      });

      updateSiteMap({
        siteMapId: editingSiteMap.id,
        name: newName,
        notes: newNotes,
        mapData: newPolygons,
      });
    });
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
              Site Maps ({optimisticAddress.site_maps?.length || 0})
            </Button>
          }
        />
        <DialogContent className="sm:max-w-175">
          {isAdmin && (
            <DialogHeader>
              <div className="flex items-center justify-between">
                <DialogTitle>
                  Site Maps for {optimisticAddress.street}
                </DialogTitle>
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
                            <Label htmlFor="name">Area Name</Label>
                            <Input
                              id="name"
                              value={name}
                              onChange={(e) => setName(e.target.value)}
                              placeholder="e.g. Front Lawn..."
                            />
                          </div>
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
                          address={`${optimisticAddress.street}, ${optimisticAddress.city}, ${optimisticAddress.state}`}
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
                  <TableHead>Notes</TableHead>
                  <TableHead>Date Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {optimisticAddress.site_maps &&
                optimisticAddress.site_maps.length > 0 ? (
                  [...optimisticAddress.site_maps]
                    .sort((a, b) => {
                      const timeB = b.created_at
                        ? new Date(b.created_at).getTime()
                        : 0;
                      const timeA = a.created_at
                        ? new Date(a.created_at).getTime()
                        : 0;
                      return timeB - timeA;
                    })
                    .map((sm) => (
                      <TableRow key={sm.id}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2">
                            {sm.map_data ? (
                              <MapIcon className="h-4 w-4 text-emerald-500" />
                            ) : sm.blob_path ? (
                              <FileImage className="h-4 w-4 text-primary" />
                            ) : null}
                            <p className="font-semibold">
                              {sm.name || "Site Map"}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {sm.notes && (
                            <p className="text-xs text-slate-500 italic line-clamp-1">
                              {sm.notes}
                            </p>
                          )}
                        </TableCell>
                        <TableCell>
                          {sm.created_at
                            ? format(new Date(sm.created_at), "MMM d, yyyy")
                            : "Pending..."}
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
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-slate-500 hover:text-primary"
                                  onClick={() => setEditingSiteMap(sm)}
                                >
                                  <Edit2 className="h-4 w-4" />
                                </Button>
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
                      colSpan={4}
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

      <ImageViewer
        isAdmin={true}
        viewingImage={viewingSiteMap}
        onClose={() => setViewingSiteMap(null)}
      />

      <Dialog
        open={!!editingSiteMap}
        onOpenChange={(open) => !open && setEditingSiteMap(null)}
      >
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Site Map Details</DialogTitle>
          </DialogHeader>
          {editingSiteMap && (
            <div className="py-4">
              {editingSiteMap.map_data ? (
                <SiteMapEditor
                  address={`${optimisticAddress.street}, ${optimisticAddress.city}, ${optimisticAddress.state}`}
                  initialName={editingSiteMap.name || ""}
                  initialNotes={editingSiteMap.notes || ""}
                  initialPolygons={editingSiteMap.map_data}
                  onSave={(newName, newNotes, newPolygons) =>
                    handleUpdate(newName, newNotes, newPolygons)
                  }
                />
              ) : (
                <SiteMapDetailsForm
                  initialName={editingSiteMap.name || ""}
                  initialNotes={editingSiteMap.notes || ""}
                  isPending={isUpdatePending}
                  onCancel={() => setEditingSiteMap(null)}
                  onSubmit={(newName, newNotes) =>
                    handleUpdate(newName, newNotes, [])
                  }
                />
              )}
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
                  startTransition(() => {
                    setOptimisticAction({
                      type: "DELETE",
                      payload: siteMapToDelete.id,
                    });
                    deleteSiteMap(siteMapToDelete.id);
                  });
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
