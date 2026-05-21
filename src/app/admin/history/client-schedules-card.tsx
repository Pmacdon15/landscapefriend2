"use client";

import { isValid } from "date-fns";
import {
  Calendar,
  CalendarDays,
  ExternalLink,
  MapPin,
  User2,
} from "lucide-react";
import { use } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDateNaive, getGoogleMapsUrl, getNextCutDate } from "@/lib/utils";
import type { Client } from "@/types/types";

interface ClientSchedulesCardProps {
  clientPromise: Promise<Client | null>;
  membersPromise: Promise<{ id: string; name: string }[]>;
}

export function ClientSchedulesCard({
  clientPromise,
  membersPromise,
}: ClientSchedulesCardProps) {
  const client = use(clientPromise);
  const members = use(membersPromise);

  if (!client) return null;

  const activeAddresses =
    client.addresses?.filter((a) => a.status !== "deleted") || [];

  return (
    <Card className="border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md shadow-lg rounded-xl overflow-hidden transition-all duration-300">
      <CardHeader className="bg-slate-50/50 dark:bg-slate-900/20 border-b border-slate-100 dark:border-slate-900 px-6 py-4">
        <CardTitle className="text-lg font-bold flex items-center gap-2 text-slate-800 dark:text-slate-100">
          <Calendar className="h-5 w-5 text-primary" />
          Active Schedule Details for {client.name}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-6">
        {activeAddresses.length === 0 ? (
          <p className="text-sm text-muted-foreground italic text-center py-4">
            No active addresses found for this client.
          </p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {activeAddresses.map((address) => {
              const schedule = address.schedule;
              const assigneeName =
                members.find((m) => m.id === address.assigned_to)?.name ||
                (address.assigned_to ? "Unknown Assignee" : "Unassigned");

              const nextCut = schedule
                ? getNextCutDate(schedule.first_cut_date, schedule.frequency)
                : null;

              return (
                <div
                  key={address.id}
                  className="p-5 rounded-xl border border-slate-100 dark:border-slate-900 bg-white/40 dark:bg-slate-950/40 hover:bg-white/80 dark:hover:bg-slate-900/60 transition-all duration-300 space-y-4 shadow-sm"
                >
                  <div className="flex justify-between items-start gap-4">
                    <a
                      href={getGoogleMapsUrl(address)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-start gap-2 hover:text-primary transition-colors group"
                    >
                      <MapPin className="h-4.5 w-4.5 mt-0.5 text-primary shrink-0 group-hover:scale-110 transition-transform" />
                      <span className="text-sm font-semibold leading-snug underline decoration-slate-200 underline-offset-4 group-hover:decoration-primary">
                        {address.street}, {address.city} {address.state}{" "}
                        {address.zip}
                      </span>
                      <ExternalLink className="h-3 w-3 mt-1 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </a>
                  </div>

                  <div className="border-t border-slate-100 dark:border-slate-900 pt-3 flex flex-col gap-2.5">
                    {schedule ? (
                      <>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/10 text-primary border border-primary/20 uppercase tracking-wider">
                            {schedule.frequency} SERVICE
                          </span>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                              Next Date
                            </span>
                            <div className="flex items-center gap-1.5 font-bold text-emerald-600 dark:text-emerald-400">
                              <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                              <span>
                                {nextCut && isValid(nextCut)
                                  ? formatDateNaive(nextCut, "MMM do, yyyy")
                                  : "Not set"}
                              </span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-1">
                            <span className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                              Assignee
                            </span>
                            <div className="flex items-center gap-1.5 text-slate-700 dark:text-slate-300 font-medium">
                              <User2 className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                              <span>{assigneeName}</span>
                            </div>
                          </div>
                        </div>

                        {schedule.notes && (
                          <div className="bg-slate-50/50 dark:bg-slate-900/30 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800/80 text-xs">
                            <span className="font-semibold text-[10px] text-slate-400 uppercase tracking-wider block mb-1">
                              Schedule Notes
                            </span>
                            <p className="text-slate-600 dark:text-slate-300 italic">
                              {schedule.notes}
                            </p>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="text-xs text-slate-400 dark:text-slate-500 italic py-2 flex items-center gap-1.5">
                        <CalendarDays className="h-3.5 w-3.5 shrink-0" />
                        No schedule set for this address
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
