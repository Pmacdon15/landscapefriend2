import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { parseParams } from "@/lib/utils/search-params-util";
import { HistoryContainer } from "../../../components/history/history-container";
import { HistorySkeleton } from "../../../components/history/history-skeletons";

export const metadata: Metadata = {
  title: "Service History",
  description:
    "View and analyze historical landscaping service data, team performance, and lifetime statistics.",
};

export default async function HistoryPage(props: PageProps<"/admin/history">) {
  const pagePromise = props.searchParams.then(
    (params) => parseParams(params.page) ?? 1,
  );

  const clientIdPromise = props.searchParams.then(
    (params) => parseParams(params.clientId) ?? "",
  );

  const searchPromise = props.searchParams.then(
    (params) => parseParams(params.search) ?? "",
  );

  const historyPromise = props.searchParams.then((params) => {
    const page = Number(parseParams(params.page) ?? 1);
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

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <PageHeader
        title="History"
        description="Search through historical service data."
      />

      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContainer
          historyPromise={historyPromise}
          pagePromise={pagePromise}
          clientPromise={clientPromise}
          searchPromise={searchPromise}
          membersPromise={getOrganizationMembersDal()}
        />
      </Suspense>
    </div>
  );
}
