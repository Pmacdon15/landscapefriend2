"use client";

import {
  Calendar as CalendarIcon,
  CheckCircle2,
  Clock,
  ExternalLink,
  ImageIcon,
  MapPin,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { startTransition, useState } from "react";
import { ImageViewer } from "@/components/clients/image-viewer";
import { LocalDateDisplay } from "@/components/history/local-date-display";
import { LocalDateOnlyDisplay } from "@/components/history/local-date-only-display";
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
import type { Client } from "@/types/types";
import type { SiteMap } from "@/zod/schemas";

interface HistoryListProps {
  history: PastServiceItem[];
  setOptimistic?: (
    action:
      | { type: "update-search"; value: string }
      | { type: "select-client"; client: Client }
      | { type: "clear-search"; defaultHistory?: PastServiceItem[] },
  ) => void;
}

export function HistoryList({ history, setOptimistic }: HistoryListProps) {
  const [viewingImage, setViewingImage] = useState<SiteMap | null>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleClientClick = (job: PastServiceItem) => {
    const params = new URLSearchParams(searchParams);
    params.delete("search");
    params.set("clientId", job.client_id);
    params.set("page", "1");
    startTransition(() => {
      if (setOptimistic) {
        setOptimistic({
          type: "select-client",
          client: {
            id: job.client_id,
            name: job.client_name,
            org_id: "",
            email: null,
            phone: null,
            addresses: [],
          },
        });
      }
      router.push(`?${params.toString()}`);
    });
  };

  const handleUserClick = (userName: string) => {
    const params = new URLSearchParams(searchParams);
    params.delete("clientId");
    params.set("search", userName);
    params.set("page", "1");
    startTransition(() => {
      if (setOptimistic) {
        setOptimistic({ type: "update-search", value: userName });
      }
      router.push(`?${params.toString()}`);
    });
  };

  if (history.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-950/50 p-12 text-center">
        <div className="flex flex-col items-center justify-center gap-3">
          <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-900 flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6 text-slate-300 dark:text-slate-700" />
          </div>
          <p className="text-sm font-medium text-slate-500">
            No service history found.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:hidden">
        {history.map((job) => (
          <div
            key={job.id}
            className="bg-white dark:bg-slate-950 rounded-xl border border-slate-200 dark:border-slate-800 p-4 shadow-sm space-y-4"
          >
            <div className="flex justify-between items-start gap-4">
              <div className="flex flex-col">
                <button
                  type="button"
                  onClick={() => handleClientClick(job)}
                  className="font-bold text-slate-900 dark:text-white hover:text-primary transition-colors text-left"
                >
                  {job.client_name}
                </button>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${job.street}, ${job.city}`)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-slate-500 mt-1"
                >
                  <MapPin className="h-3 w-3 shrink-0" />
                  <span className="truncate max-w-[200px] underline decoration-slate-200">
                    {job.street}
                  </span>
                </a>
              </div>
              <span className="shrink-0 inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700 uppercase">
                {job.service_type}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 pt-2 border-t border-slate-50 dark:border-slate-900">
              <div className="space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Completed By
                </span>
                <button
                  type="button"
                  onClick={() =>
                    handleUserClick(job.completed_by_name || "Unknown")
                  }
                  className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 hover:text-primary"
                >
                  <User className="h-3 w-3" />
                  {job.completed_by_name || "Unknown"}
                </button>
              </div>
              <div className="space-y-1 text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Finished
                </span>
                <div className="flex items-center justify-end gap-1.5 text-xs text-slate-900 dark:text-slate-200 font-bold">
                  <Clock className="h-3 w-3 text-emerald-500" />
                  <LocalDateDisplay date={job.completed_at} />
                </div>
              </div>
            </div>

            {job.photos?.[0] && (
              <Button
                variant="outline"
                size="sm"
                className="w-full h-9 gap-2 rounded-lg text-xs font-bold bg-slate-50/50 dark:bg-slate-900/50"
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
                View Proof Photo
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="hidden md:block rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm">
        <Table>
          <TableHeader>
            <TableRow className="bg-slate-50/50 dark:bg-slate-900/20 hover:bg-transparent">
              <TableHead className="font-bold h-12 pl-6">
                Client & Address
              </TableHead>
              <TableHead className="font-bold h-12">Completed By</TableHead>
              <TableHead className="font-bold h-12">Service Info</TableHead>
              <TableHead className="font-bold h-12">Service</TableHead>
              <TableHead className="text-right font-bold h-12 pr-6">
                Photo
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {history.map((job) => (
              <TableRow
                key={job.id}
                className="hover:bg-green-50/30 dark:hover:bg-green-900/5 transition-colors border-slate-50 dark:border-slate-900/50"
              >
                <TableCell className="pl-6 py-4">
                  <div className="flex flex-col">
                    <button
                      type="button"
                      onClick={() => handleClientClick(job)}
                      className="font-bold text-slate-900 dark:text-white hover:text-primary transition-colors text-left w-fit"
                    >
                      {job.client_name}
                    </button>
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
                      <button
                        type="button"
                        onClick={() =>
                          handleUserClick(job.completed_by_name || "Unknown")
                        }
                        className="text-sm font-semibold text-slate-700 dark:text-slate-200 hover:text-primary transition-colors text-left w-fit"
                      >
                        {job.completed_by_name || "Unknown"}
                      </button>
                      {job.assigned_to_name &&
                        job.assigned_to_name !== job.completed_by_name && (
                          <button
                            type="button"
                            onClick={() =>
                              handleUserClick(job.assigned_to_name || "")
                            }
                            className="text-[10px] text-slate-400 italic hover:text-primary transition-colors text-left w-fit"
                          >
                            Assigned to: {job.assigned_to_name}
                          </button>
                        )}
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="flex flex-col gap-1.5">
                    {job.scheduled_date && (
                      <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <CalendarIcon className="h-3 w-3" />
                        <span className="font-medium">Scheduled:</span>
                        <LocalDateOnlyDisplay date={job.scheduled_date} />
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-xs text-slate-900 dark:text-slate-200">
                      <Clock className="h-3 w-3 text-emerald-500" />
                      <span className="font-bold">Completed:</span>
                      <LocalDateDisplay date={job.completed_at} />
                    </div>
                  </div>
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
            ))}
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
