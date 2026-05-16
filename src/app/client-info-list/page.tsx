import { auth } from "@clerk/nextjs/server";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import ClientInfoContainer from "@/components/clients/client-info/client-info-container";
import { PageHeader } from "@/components/layout/page-header";
import PaginationButtons from "@/components/pagination-buttons";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";

export const metadata: Metadata = {
  title: "Client Roster",
  description:
    "View and manage your entire list of landscaping clients. Keep track of service schedules and property details.",
};

export default async function ClientInfoListPage(
  props: PageProps<"/client-info-list">,
) {
  const isAdminPromise = auth
    .protect()
    .then((authData) => authData.has({ role: "org:admin" }));
  const clientsPromise = props.searchParams.then((params) =>
    getClientsForInfoDal(
      Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
      Array.isArray(params.search)
        ? params.search[0]
        : (params.search ?? undefined),
    ).then((data) => data.clients),
  );
  const membersPromise = getOrganizationMembersDal();
  const pagePromise = props.searchParams.then((params) =>
    Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
  );

  const totalPagesPromise = props.searchParams.then((params) =>
    getClientsForInfoDal(
      Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
      Array.isArray(params.search)
        ? params.search[0]
        : (params.search ?? undefined),
    ).then((data) => data.totalPages),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Clients"
        description="Manage your clients and their recurring schedules."
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center col-span-full py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <ClientInfoContainer
          isAdminPromise={isAdminPromise}
          clientsPromise={clientsPromise}
          membersPromise={membersPromise}
        />
      </Suspense>

      <Suspense>
        <PaginationButtons
          pagePromise={pagePromise}
          totalPagesPromise={totalPagesPromise}
        />
      </Suspense>
    </div>
  );
}
