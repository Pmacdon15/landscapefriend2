import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import ClientInfoContainer from "@/components/clients/client-info/client-info-container";
import PaginationButtons from "@/components/pagination-buttons";
import { getClientsForInfoDal, getOrganizationMembersDal } from "@/dal/clients";

export default async function ClientInfoListPage(
  props: PageProps<"/client-info-list">,
) {
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
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
            Clients
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl">
            Manage your clients and their recurring schedules.
          </p>
        </div>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center col-span-full py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <ClientInfoContainer
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
