import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import ClientInfoContainer from "@/components/clients/client-info/client-info-container";
import { ClientsSkeleton } from "@/components/clients/clients-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import PaginationButtons from "@/components/pagination-buttons";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { parseParams } from "@/lib/utils/search-params-util";

export const metadata: Metadata = {
  title: "Client Roster",
  description:
    "View and manage your entire list of landscaping clients. Keep track of service schedules and property details.",
};

export default async function ClientInfoListPage(
  props: PageProps<"/client-info-list">,
) {
  const clientsPromise = props.searchParams.then((params) =>
    getClientsForInfoDal(
      Number(parseParams(params.page) ?? 1),
      parseParams(params.search),
      parseParams(params.clientId),
    ),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Clients"
        description="Manage your clients and their recurring schedules."
      />

      <Suspense fallback={<ClientsSkeleton />}>
        <div id="client-list">
          <ClientInfoContainer
            isAdminPromise={auth
              .protect()
              .then((authData) => authData.has({ role: "org:admin" }))}
            clientsPromise={clientsPromise.then((data) => data.clients)}
            membersPromise={getOrganizationMembersDal()}
            searchPromise={props.searchParams.then(
              (p) => parseParams(p.search) ?? "",
            )}
            clientIdPromise={props.searchParams.then(
              (p) => parseParams(p.clientId) ?? "",
            )}
          />
        </div>
      </Suspense>

      <Suspense>
        <PaginationButtons
          pagePromise={props.searchParams.then((params) =>
            Number(parseParams(params.page) ?? 1),
          )}
          totalPagesPromise={clientsPromise.then((data) => data.totalPages)}
          hash="client-list"
        />
      </Suspense>
    </div>
  );
}
