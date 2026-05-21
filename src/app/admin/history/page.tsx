import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { ClientSchedulesCard } from "./client-schedules-card";
import { HistorySearchBar } from "./history-search-bar";
import { HistorySection } from "./history-section";
import { HistorySkeleton, StatsSkeleton } from "./history-skeletons";
import { MonthlySection } from "./monthly-section";
import { StatsSection } from "./stats-section";

export default async function HistoryPage(props: PageProps<"/admin/history">) {
  const pagePromise = props.searchParams.then((params) =>
    Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
  );

  const clientIdPromise = props.searchParams.then((params) =>
    String(
      (Array.isArray(params.clientId) ? params.clientId[0] : params.clientId) ??
        "",
    ),
  );

  const searchPromise = props.searchParams.then((params) =>
    String(
      (Array.isArray(params.search) ? params.search[0] : params.search) ?? "",
    ),
  );

  const historyPromise = props.searchParams.then((params) =>
    getPastServicesListDal(
      Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
      Array.isArray(params.clientId)
        ? params.clientId[0]
        : (params.clientId ?? undefined),
      Array.isArray(params.search)
        ? params.search[0]
        : (params.search ?? undefined),
    ),
  );

  const clientPromise = clientIdPromise.then((clientId) => {
    if (!clientId) return null;
    return getClientsForInfoDal(1, undefined, clientId).then(
      (data) => data.clients.find((c) => c.id === clientId) || null,
    );
  });

  const membersPromise = getOrganizationMembersDal();

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

      <div className="space-y-6">
        <Suspense
          fallback={
            <div className="flex h-12 w-full max-w-xl mx-auto rounded-xl border border-slate-200 dark:border-slate-800 bg-white/60 dark:bg-slate-950/60 backdrop-blur-md items-center pl-4">
              <Loader2 className="animate-spin h-4 w-4 text-slate-400 mr-2" />
              <span className="text-sm text-slate-400">Loading search...</span>
            </div>
          }
        >
          <HistorySearchBar
            clientPromise={clientPromise}
            searchPromise={searchPromise}
            membersPromise={membersPromise}
          />
        </Suspense>

        <Suspense>
          <ClientSchedulesCard
            clientPromise={clientPromise}
            membersPromise={membersPromise}
          />
        </Suspense>
      </div>

      <Suspense fallback={<HistorySkeleton />}>
        <HistorySection
          historyPromise={historyPromise}
          pagePromise={pagePromise}
        />
      </Suspense>
    </div>
  );
}
