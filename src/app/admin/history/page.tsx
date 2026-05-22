import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { getPastServicesListDal } from "@/dal/admin";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientsForInfoDal } from "@/dal/clients";
import { HistoryContainer } from "../../../components/history/history-container";
import { HistorySkeleton } from "../../../components/history/history-skeletons";

export const metadata: Metadata = {
  title: "Service History",
  description:
    "View and analyze historical landscaping service data, team performance, and lifetime statistics.",
};

export default async function HistoryPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const authData = await auth.protect();
  const isAdmin =
    authData.orgRole === "org:admin" || authData.has({ role: "org:admin" });
  if (!authData.orgId || !isAdmin || !authData.has({ feature: "history" })) {
    throw new Error("Unauthorized");
  }
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
        description="Search through historical service data."
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
    </div>
  );
}
