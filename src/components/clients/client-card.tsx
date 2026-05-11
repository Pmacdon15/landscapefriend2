"use client";
import { format } from "date-fns";
import { CalendarDays, Mail, MapPin, Phone, User } from "lucide-react";
import { EditClientModal } from "@/components/clients/edit-client-modal";
import { ScheduleForm } from "@/components/schedules/schedule-form";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Address, Client } from "@/dal/clients";
import { useUpdateAddressAssignee } from "@/mutations/clients";

interface ClientCardProps {
  client: Client;
  members: { id: string; name: string }[];
}

export function ClientCard({ client, members }: ClientCardProps) {
  const addresses = client.addresses || [];
  const { mutate: updateAssignee } = useUpdateAddressAssignee();

  return (
    <Card className="hover:shadow-lg transition-shadow duration-300 border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
        <CardTitle className="text-xl font-bold flex items-center justify-between">
          <span>{client.name}</span>
          <EditClientModal client={client} members={members} />
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-4 grid gap-4">
        <div className="space-y-2">
          {client.email && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{client.email}</span>
            </div>
          )}
          {client.phone && (
            <div className="flex items-center gap-3 text-muted-foreground text-sm">
              <Phone className="h-4 w-4 shrink-0" />
              <span>{client.phone}</span>
            </div>
          )}
        </div>

        {addresses.length > 0 && (
          <div className="mt-2 space-y-3">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100 uppercase tracking-wider">
              Addresses & Schedules
            </h4>
            {addresses.map((address: Address) => (
              <div
                key={address.id}
                className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800 space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2">
                    <MapPin className="h-4 w-4 mt-0.5 text-primary shrink-0" />
                    <span className="text-sm font-medium leading-tight">
                      {address.street}, {address.city} {address.state}{" "}
                      {address.zip}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2 pl-6 text-xs text-slate-500">
                  <User className="h-3 w-3" />
                  <Select
                    value={address.assigned_to || "unassigned"}
                    onValueChange={(val) =>
                      updateAssignee({
                        addressId: address.id,
                        userId: val === "unassigned" ? null : val,
                      })
                    }
                  >
                    <SelectTrigger className="h-7 w-[140px] text-[10px] bg-transparent border-none p-0 focus:ring-0">
                      <SelectValue placeholder="Assignee" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="unassigned">Unassigned</SelectItem>
                      {members.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between pl-6">
                  <div className="text-xs text-muted-foreground">
                    {address.schedule ? (
                      <span className="flex flex-col gap-0.5">
                        <span className="font-medium text-slate-700 dark:text-slate-300 capitalize">
                          {address.schedule.frequency}
                        </span>
                        <span>
                          Next:{" "}
                          {format(
                            new Date(address.schedule.next_cut_date),
                            "MMM do",
                          )}
                        </span>
                      </span>
                    ) : (
                      <span className="italic">No schedule set</span>
                    )}
                  </div>

                  <Popover>
                    <PopoverTrigger
                      className={buttonVariants({
                        variant: "outline",
                        size: "sm",
                        className: "h-7 text-xs",
                      })}
                    >
                      <CalendarDays className="h-3 w-3 mr-1.5" />
                      {address.schedule ? "Edit" : "Schedule"}
                    </PopoverTrigger>
                    <PopoverContent className="w-80" align="end">
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-medium leading-none">
                            Manage Schedule
                          </h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Set the cut frequency for {address.street}
                          </p>
                        </div>
                        <ScheduleForm
                          addressId={address.id}
                          initialFrequency={address.schedule?.frequency}
                          initialDate={
                            address.schedule
                              ? new Date(address.schedule.next_cut_date)
                              : undefined
                          }
                        />
                      </div>
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
