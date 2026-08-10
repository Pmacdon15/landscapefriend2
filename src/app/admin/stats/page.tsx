import type { Metadata } from "next";
import { Suspense } from "react";
import { StatsSkeleton } from "@/components/history/history-skeletons";
import { MonthSelector } from "@/components/history/month-selector";
import { MonthlySection } from "@/components/history/monthly-section";
import { ServiceHistoryChart } from "@/components/history/service-history-chart";
import { StatsSection } from "@/components/history/stats-section";
import { PageHeader } from "@/components/layout/page-header";
import { getMonthlyStatsDal, getPastServicesStatsDal } from "@/dal/admin";
import { parseParams } from "@/lib/utils/search-params-util";

export const metadata: Metadata = {
  title: "Service Statistics",
  description:
    "Analyze historical landscaping service data, team performance metrics, and lifetime progress indicators.",
};

export default async function StatsPage(props: PageProps<"/admin/stats">) {
  const datePromise = props.searchParams.then((params) => {
    const dateVal = parseParams(params.date);
    if (dateVal) return dateVal;

    const monthVal = parseParams(params.month);
    if (monthVal) return `${monthVal}-01`;

    return null;
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
        <ServiceHistoryChart
          cutsByDayPromise={lifetimeStatsPromise.then((data) => data.cutsByDay)}
        />
      </Suspense>

      <div className="pt-4">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<StatsSkeleton />}>
              <MonthlySection
                dataPromise={datePromise.then((dateVal) =>
                  getMonthlyStatsDal(dateVal ? dateVal.slice(0, 7) : undefined),
                )}
              />
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
