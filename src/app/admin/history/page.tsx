import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { HistoryContainer } from "./history-container";
import { HistorySkeleton, StatsSkeleton } from "./history-skeletons";
import { MonthlySection } from "./monthly-section";
import { StatsSection } from "./stats-section";

export default async function HistoryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
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

  const historyPromise = props.searchParams.then((params) => {
    const page = Number(
      Array.isArray(params.page) ? params.page[0] : (params.page ?? 1),
    );
    const clientId = Array.isArray(params.clientId)
      ? params.clientId[0]
      : (params.clientId ?? undefined);
    const search = Array.isArray(params.search)
      ? params.search[0]
      : (params.search ?? undefined);
    return getPastServicesListDal(page, clientId, search);
  });

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

      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContainer
          historyPromise={historyPromise}
          pagePromise={pagePromise}
          clientPromise={clientPromise}
          searchPromise={searchPromise}
          membersPromise={membersPromise}
        />
      </Suspense>
    </div>
  );
}
