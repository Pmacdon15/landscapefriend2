import { auth } from "@clerk/nextjs/server";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForCutListDal } from "@/dal/clients";
import { ServiceListContent } from "./service-list-content";

export const metadata: Metadata = {
  title: "Daily Service Routes",
  description:
    "View your daily landscaping service lists and optimize your lawn care routes.",
};

export default async function ClientsServicePage(
  props: PageProps<"/clients-service">,
) {
  const clientsPromise = props.searchParams.then((p) =>
    getClientsForCutListDal(
      String(
        (Array.isArray(p.date) ? p.date[0] : p.date) ??
          new Date().toLocaleDateString("en-CA"),
      ),
      String((Array.isArray(p.search) ? p.search[0] : p.search) ?? ""),
      String((Array.isArray(p.userId) ? p.userId[0] : p.userId) ?? ""),
      String((Array.isArray(p.clientId) ? p.clientId[0] : p.clientId) ?? ""),
    ),
  );

  const datePromise = props.searchParams.then((p) =>
    p.date ? String(Array.isArray(p.date) ? p.date[0] : p.date) : null,
  );

  const userIdPromise = props.searchParams.then((p) =>
    String((Array.isArray(p.userId) ? p.userId[0] : p.userId) ?? ""),
  );

  const searchPromise = props.searchParams.then((p) =>
    String((Array.isArray(p.search) ? p.search[0] : p.search) ?? ""),
  );

  const clientIdPromise = props.searchParams.then((p) =>
    String((Array.isArray(p.clientId) ? p.clientId[0] : p.clientId) ?? ""),
  );

  const membersPromise = getOrganizationMembersDal();

  const isAdminPromise = auth
    .protect()
    .then((authData) => authData.has({ role: "org:admin" }));

  const currentUserIdPromise = auth
    .protect()
    .then((authData) => authData.userId);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Daily Service List"
        description="View and manage the clients scheduled for service on a specific date."
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <ServiceListContent
          currentUserIdPromise={currentUserIdPromise}
          isAdminPromise={isAdminPromise}
          clientsPromise={clientsPromise}
          datePromise={datePromise}
          userIdPromise={userIdPromise}
          searchPromise={searchPromise}
          clientIdPromise={clientIdPromise}
          membersPromise={membersPromise}
        />
      </Suspense>
    </div>
  );
}
