import { Card } from "@/components/ui/card";

export function StatsSkeleton() {
  return (
    <div className="space-y-8">
      <div className="grid gap-4 md:grid-cols-2">
        <Card className="h-32 animate-pulse" />
        <Card className="h-32 animate-pulse" />
      </div>
      <Card className="h-64 animate-pulse" />
    </div>
  );
}

export function HistorySkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-96" />
    </Card>
  );
}
