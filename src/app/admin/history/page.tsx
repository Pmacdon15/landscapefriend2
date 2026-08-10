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
  
  return (
    <div className="container mx-auto max-w-7xl px-4 py-8 space-y-8">
      <PageHeader
        title="History"
        description="Search through historical service data."
      />

      <Suspense fallback={<HistorySkeleton />}>
        <HistoryContainer
          historyPromise={props.searchParams.then((params) =>
            getPastServicesListDal(
              Number(parseParams(params.page) ?? 1),
              parseParams(params.clientId),
              parseParams(params.search),
            ),
          )}
          pagePromise={props.searchParams.then((params) =>
            Number(parseParams(params.page) ?? 1),
          )}
          clientPromise={props.searchParams
            .then((params) => parseParams(params.clientId) ?? "")
            .then((clientId) => {
              if (!clientId) return null;
              return getClientsForInfoDal(1, undefined, clientId).then(
                (data) => data.clients.find((c) => c.id === clientId) ?? null,
              );
            })}
          searchPromise={props.searchParams.then(
            (params) => parseParams(params.search) ?? "",
          )}
          membersPromise={getOrganizationMembersDal()}
        />
      </Suspense>
    </div>
  );
}
