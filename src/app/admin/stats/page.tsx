import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsSkeleton } from "@/components/history/history-skeletons";
import { MonthSelector } from "@/components/history/month-selector";
import { MonthlySection } from "@/components/history/monthly-section";
import { ServiceHistoryChart } from "@/components/history/service-history-chart";
import { StatsSection } from "@/components/history/stats-section";
import { PageHeader } from "@/components/layout/page-header";
import {
  getMonthlyStatsDal,
  getPastServicesStatsDal,
  type PastServicesStats,
} from "@/dal/admin";

export const metadata: Metadata = {
  title: "Service Statistics",
  description:
    "Analyze historical landscaping service data, team performance metrics, and lifetime progress indicators.",
};

async function ChartWrapper({
  statsPromise,
}: {
  statsPromise: Promise<PastServicesStats>;
}) {
  const stats = await statsPromise;
  return <ServiceHistoryChart data={stats.cutsByDay} />;
}

export default async function StatsPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const datePromise = props.searchParams.then((params) => {
    const d = params.date;
    const dateVal = Array.isArray(d) ? d[0] : d;
    if (dateVal) {
      return dateVal;
    }
    const m = params.month;
    const monthVal = Array.isArray(m) ? m[0] : m;
    if (monthVal) {
      return `${monthVal}-01`;
    }
    return null;
  });

  const monthlyStatsPromise = datePromise.then((dateVal) => {
    const monthVal = dateVal ? dateVal.slice(0, 7) : undefined;
    return getMonthlyStatsDal(monthVal || undefined);
  });

  const lifetimeStatsPromise = getPastServicesStatsDal();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <PageHeader
          title="Analytics"
          description="Analyze historical landscaping service data, team performance metrics, and lifetime progress indicators."
        />
        <Suspense>
          <MonthSelector datePromise={datePromise} />
        </Suspense>
      </div>

      <Suspense fallback={<StatsSkeleton />}>
        <ChartWrapper statsPromise={lifetimeStatsPromise} />
      </Suspense>

      <div className="pt-4">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<StatsSkeleton />}>
              <MonthlySection dataPromise={monthlyStatsPromise} />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<StatsSkeleton />}>
              <StatsSection statsPromise={lifetimeStatsPromise} />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
