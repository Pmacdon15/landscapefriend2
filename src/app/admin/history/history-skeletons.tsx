import { Card } from "@/components/ui/card";

export function StatsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="h-6 w-48 bg-slate-200 dark:bg-slate-800 animate-pulse rounded" />
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="h-32 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" />
        <Card className="h-32 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" />
        <Card className="h-32 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" />
        <Card className="h-32 animate-pulse bg-slate-50/50 dark:bg-slate-900/50" />
      </div>
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="h-12 w-full max-w-md bg-slate-200 dark:bg-slate-800 rounded-xl" />
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div className="h-6 w-32 bg-slate-200 dark:bg-slate-800 rounded" />
          <div className="h-4 w-24 bg-slate-100 dark:bg-slate-900 rounded" />
        </div>
        <Card className="overflow-hidden border-slate-200 dark:border-slate-800">
          <div className="h-[400px] bg-slate-50/50 dark:bg-slate-900/50" />
        </Card>
      </div>
    </div>
  );
}
