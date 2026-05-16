import { CheckCircle2, Image as ImageIcon, Users } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  getPastServicesListDal,
  getPastServicesStatsDal,
  type PastServicesStats,
} from "@/dal/admin";
import { HistoryList } from "../history/history-list";

export default async function PastServicesPage() {
  const statsPromise = getPastServicesStatsDal();
  const historyPromise = getPastServicesListDal();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <PageHeader
        title="Past Services"
        description="View historical service data and performance statistics for your organization."
      />

      <Suspense fallback={<StatsSkeleton />}>
        <StatsSection statsPromise={statsPromise} />
      </Suspense>

      <Suspense fallback={<HistorySkeleton />}>
        <HistorySection historyPromise={historyPromise} />
      </Suspense>
    </div>
  );
}

async function StatsSection({
  statsPromise,
}: {
  statsPromise: ReturnType<typeof getPastServicesStatsDal>;
}) {
  const stats = await statsPromise;

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total Cuts</CardTitle>
          <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats.totalCuts}</div>
          <p className="text-xs text-muted-foreground">
            Lifetime completed jobs
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cuts by Service</CardTitle>
          <ImageIcon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="space-y-1">
            {stats.cutsByServiceType.map(
              (s: PastServicesStats["cutsByServiceType"][0]) => (
                <div
                  key={s.service_type}
                  className="flex items-center justify-between"
                >
                  <span className="text-xs capitalize">{s.service_type}</span>
                  <span className="text-sm font-bold">{s.count}</span>
                </div>
              ),
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="md:col-span-2">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Cuts per User</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            {stats.cutsByUser.map((u: PastServicesStats["cutsByUser"][0]) => (
              <div
                key={u.user_name}
                className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-1"
              >
                <span className="text-xs truncate max-w-[100px]">
                  {u.user_name || "Unknown"}
                </span>
                <span className="text-sm font-bold">{u.count}</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

async function HistorySection({
  historyPromise,
}: {
  historyPromise: ReturnType<typeof getPastServicesListDal>;
}) {
  const { data: history } = await historyPromise;

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">Service History</h2>
      <Card>
        <CardContent className="p-0">
          <HistoryList history={history} />
        </CardContent>
      </Card>
    </div>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {[...Array(4)].map((_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: stable IDs not available for skeleton items
        <Card key={i} className="animate-pulse">
          <CardHeader className="h-20" />
          <CardContent className="h-10" />
        </Card>
      ))}
    </div>
  );
}

function HistorySkeleton() {
  return (
    <Card className="animate-pulse">
      <div className="h-96" />
    </Card>
  );
}
