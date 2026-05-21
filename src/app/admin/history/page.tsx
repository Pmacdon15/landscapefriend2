import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { HistoryContainer } from "../../../components/history/history-container";
import {
  HistorySkeleton,
  StatsSkeleton,
} from "../../../components/history/history-skeletons";
import { MonthlySection } from "../../../components/history/monthly-section";
import { StatsSection } from "./stats-section";

export const metadata: Metadata = {
  title: "Service History",
  description:
    "View and analyze historical landscaping service data, team performance, and lifetime statistics.",
};

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
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <PageHeader
        title="History"
        description="Search through historical service data and view performance statistics."
      />

      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContainer
          historyPromise={historyPromise}
          pagePromise={pagePromise}
          clientPromise={clientPromise}
          searchPromise={searchPromise}
          membersPromise={membersPromise}
        />
      </Suspense>

      <div className="pt-8 border-t border-slate-200 dark:border-slate-800">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Suspense fallback={<StatsSkeleton />}>
              <MonthlySection />
            </Suspense>
          </div>
          <div>
            <Suspense fallback={<StatsSkeleton />}>
              <StatsSection />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}
