"use client";

import { format } from "date-fns";

interface ServiceEmptyStateProps {
  date: Date;
  currentFilterUserId: string;
}

export function ServiceEmptyState({
  date,
  currentFilterUserId,
}: ServiceEmptyStateProps) {
  return (
    <div className="text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
      <h3 className="text-xl font-semibold mb-2">
        No cuts assigned{" "}
        {currentFilterUserId === "all"
          ? "at all"
          : currentFilterUserId
            ? "to this user"
            : "to you"}
      </h3>
      <p className="text-muted-foreground">
        There are no clients assigned for service on{" "}
        {format(date, "MMM do, yyyy")}.
      </p>
    </div>
  );
}
