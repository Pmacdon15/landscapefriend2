"use client";

import { format } from "date-fns";
import {
  CheckCircle2,
  ExternalLink,
  ImageIcon,
  MapPin,
  User,
} from "lucide-react";
import { useState } from "react";
import { ImageViewer } from "@/components/clients/image-viewer";
import { LocalDateDisplay } from "@/components/history/local-date-display";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { PastServiceItem } from "@/dal/admin";
import type { SiteMap } from "@/zod/schemas";

interface HistoryListProps {
  history: PastServiceItem[];
}

export function HistoryList({ history }: HistoryListProps) {
  const [viewingImage, setViewingImage] = useState<SiteMap | null>(null);

  return (
    <>
      <div className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/20">
              <TableHead className="font-bold h-12 pl-6">
                Client & Address
              </TableHead>
              <TableHead className="font-bold h-12">Completed By</TableHead>
              <TableHead className="font-bold h-12">Date & Time</TableHead>
              <TableHead className="font-bold h-12">Service</TableHead>
              <TableHead className="text-right font-bold h-12 pr-6">
                Photo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.length > 0 ? (
              history.map((job) => (
                <TableRow
                  key={job.id}
                  className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-colors border-slate-50 dark:border-slate-900"
                >
                  <TableCell className="pl-6 py-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {job.client_name}
                      </span>
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.street}, ${job.city}`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-xs text-slate-500 mt-1 hover:text-primary transition-colors group w-fit"
                      >
                        <MapPin className="h-3.5 w-3.5 text-slate-400 group-hover:text-primary" />
                        <span className="underline decoration-slate-200 underline-offset-2 group-hover:decoration-primary">
                          {job.street}, {job.city}
                        </span>
                        <ExternalLink className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2.5">
                      <div className="h-8 w-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/50">
                        <User className="h-4 w-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                          {job.completed_by_name || "Unknown"}
                        </span>
                        {job.assigned_to_name &&
                          job.assigned_to_name !== job.completed_by_name && (
                            <span className="text-[10px] text-slate-400 italic">
                              Assigned to: {job.assigned_to_name}
                            </span>
                          )}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <LocalDateDisplay date={job.completed_at} />
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase tracking-tight">
                      {job.service_type}
                    </span>
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    {job.photos?.[0] ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 gap-2 text-slate-500 hover:text-primary hover:bg-primary/5 rounded-full px-3 transition-all"
                        onClick={() =>
                          setViewingImage({
                            id: job.photos[0].id,
                            address_id: job.address_id,
                            blob_path: job.photos[0].blob_path,
                            map_data: null,
                            name: `Completion - ${job.client_name}`,
                            created_at: job.photos[0].created_at
                              ? new Date(job.photos[0].created_at)
                              : new Date(job.completed_at),
                          })
                        }
                      >
                        <ImageIcon className="h-3.5 w-3.5" />
                        <span className="text-xs font-bold">View</span>
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic pr-2">
                        No photo
                      </span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5}
                  className="h-40 text-center text-slate-400"
                >
                  <div className="flex flex-col items-center justify-center gap-2">
                    <CheckCircle2 className="h-8 w-8 text-slate-200" />
                    <p className="text-sm">No service history found.</p>
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <ImageViewer
        isAdmin={true}
        viewingImage={viewingImage}
        onClose={() => setViewingImage(null)}
      />
    </>
  );
}
