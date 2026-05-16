import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { HistorySection } from "./history-section";
import { HistorySkeleton, StatsSkeleton } from "./history-skeletons";
import { MonthlySection } from "./monthly-section";
import { StatsSection } from "./stats-section";

export default async function HistoryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const pagePromise = props.searchParams.then((params) =>
    Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
  );

  const historyPromise = pagePromise.then((page) =>
    getPastServicesListDal(page),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12 space-y-12">
      <PageHeader
        title="History"
        description="View historical service data, performance statistics, and upcoming schedules for the month."
      />

      <Suspense fallback={<StatsSkeleton />}>
        <div className="space-y-12">
          <MonthlySection />
          <StatsSection />
        </div>
      </Suspense>

      <Suspense fallback={<HistorySkeleton />}>
        <HistorySection historyPromise={historyPromise} pagePromise={pagePromise} />
      </Suspense>
    </div>
  );
}
