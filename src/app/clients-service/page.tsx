import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { ServiceListSkeleton } from "@/components/service/service-skeleton";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForCutListDal } from "@/dal/clients";
import { parseParams } from "@/lib/utils/search-params-util";
import { ServiceListContent } from "../../components/clients/service-list-content";

export const metadata: Metadata = {
  title: "Daily Service Routes",
  description:
    "View your daily landscaping service lists and optimize your lawn care routes.",
};

export default async function ClientsServicePage(
  props: PageProps<"/clients-service">,
) {
  const authPromise = auth.protect();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Daily Service List"
        description="View and manage the clients scheduled for service on a specific date."
      />

      <Suspense fallback={<ServiceListSkeleton />}>
        <ServiceListContent
          currentUserIdPromise={authPromise.then((authData) => authData.userId)}
          isAdminPromise={authPromise.then((authData) =>
            authData.has({ role: "org:admin" }),
          )}
          clientsPromise={props.searchParams.then((p) =>
            getClientsForCutListDal(
              parseParams(p.date) ?? "",
              parseParams(p.search) ?? "",
              parseParams(p.userId) ?? "",
              parseParams(p.clientId) ?? "",
            ),
          )}
          datePromise={props.searchParams.then(
            (p) => parseParams(p.date) ?? null,
          )}
          userIdPromise={props.searchParams.then(
            (p) => parseParams(p.userId) ?? "",
          )}
          searchPromise={props.searchParams.then(
            (p) => parseParams(p.search) ?? "",
          )}
          clientIdPromise={props.searchParams.then(
            (p) => parseParams(p.clientId) ?? "",
          )}
          membersPromise={getOrganizationMembersDal()}
        />
      </Suspense>
    </div>
  );
}
