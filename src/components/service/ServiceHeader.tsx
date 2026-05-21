"use client";

import { format } from "date-fns";
import { CalendarIcon, UserIcon } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
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
import { cn } from "@/lib/utils";

interface ServiceHeaderProps {
  date: Date;
  isAdmin: boolean;
  members: { id: string; name: string }[];
  currentFilterUserId: string;
  currentUserId: string;
  searchComponent?: React.ReactNode;
  stats?: {
    total: number;
    completed: number;
    remaining: number;
  };
}

export function ServiceHeader({
  date,
  isAdmin,
  members,
  currentFilterUserId,
  currentUserId,
  searchComponent,
  stats,
}: ServiceHeaderProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleDateChange = (newDate: Date | undefined) => {
    if (newDate) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("date", format(newDate, "yyyy-MM-dd"));
      router.push(`/clients-service?${params.toString()}`);
    }
  };

  const handleUserChange = (val: string | null) => {
    if (!val) return;
    const params = new URLSearchParams(searchParams.toString());
    if (val === currentUserId) {
      params.delete("userId");
    } else {
      params.set("userId", val);
    }
    router.push(`/clients-service?${params.toString()}`);
  };

  return (
    <div className="flex flex-col lg:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
      <div className="flex flex-col gap-2 text-center md:text-left">
        <div>
          <h2 className="text-xl font-semibold">
            Showing services for:{" "}
            <span className="text-primary">{format(date, "PPPP")}</span>
          </h2>
          {isAdmin && (
            <p className="text-sm text-slate-500">
              Admin View: Filtering by{" "}
              {members.find(
                (m) => m.id === (currentFilterUserId || currentUserId),
              )?.name || "Yourself"}
            </p>
          )}
        </div>

        {stats && stats.total > 0 && (
          <div className="flex items-center justify-center md:justify-start gap-2 text-xs font-medium">
            <div className="flex items-center px-2.5 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
              <span className="opacity-70 mr-1.5 text-[10px] uppercase tracking-wider">
                Total:
              </span>
              <span className="font-bold">{stats.total}</span>
            </div>
            <div className="flex items-center px-2.5 py-0.5 rounded-full bg-green-50 dark:bg-emerald-950/30 text-green-600 dark:text-emerald-400 border border-green-100 dark:border-emerald-900/50">
              <span className="opacity-70 mr-1.5 text-[10px] uppercase tracking-wider">
                Done:
              </span>
              <span className="font-bold">{stats.completed}</span>
            </div>
            <div className="flex items-center px-2.5 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50">
              <span className="opacity-70 mr-1.5 text-[10px] uppercase tracking-wider">
                Left:
              </span>
              <span className="font-bold">{stats.remaining}</span>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row items-center gap-3 w-full lg:w-auto">
        {searchComponent && (
          <div className="w-full lg:w-auto">{searchComponent}</div>
        )}
        {isAdmin && (
          <div className="w-full sm:w-50">
            <Select
              value={
                members.find(
                  (m) => m.id === (currentFilterUserId || currentUserId),
                )?.name || ""
              }
              onValueChange={(selectedName) => {
                const member = members.find((m) => m.name === selectedName);
                if (member) {
                  handleUserChange(member.id);
                }
              }}
            >
              <SelectTrigger className="w-full">
                <UserIcon className="mr-2 h-4 w-4 opacity-50" />
                <SelectValue placeholder="Select User" />
              </SelectTrigger>
              <SelectContent>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.name}>
                    {member.name} {member.id === currentUserId && "(You)"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        <Popover>
          <PopoverTrigger
            render={
              <Button
                variant="outline"
                className={cn(
                  "w-full sm:w-60 justify-start text-left font-normal",
                  !date && "text-muted-foreground",
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            }
          />
          <PopoverContent className="w-auto p-0" align="end">
            <Calendar
              mode="single"
              selected={date}
              onSelect={handleDateChange}
            />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
