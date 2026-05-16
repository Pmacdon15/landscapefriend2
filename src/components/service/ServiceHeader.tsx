"use client";

import { format } from "date-fns";
import { CalendarIcon, UserIcon } from "lucide-react";
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
  onDateChange: (date: Date | undefined) => void;
  isAdmin: boolean;
  members: { id: string; name: string }[];
  currentFilterUserId: string;
  currentUserId: string;
  handleUserChange: (val: string | null) => void;
  searchComponent?: React.ReactNode;
}

export function ServiceHeader({
  date,
  onDateChange,
  isAdmin,
  members,
  currentFilterUserId,
  currentUserId,
  handleUserChange,
  searchComponent,
}: ServiceHeaderProps) {
  return (
    <div className="flex flex-col lg:flex-row items-center justify-between bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 gap-4">
      <div className="flex flex-col gap-1 text-center md:text-left">
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
            <Calendar mode="single" selected={date} onSelect={onDateChange} />
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
}
