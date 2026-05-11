import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { AddClientModal } from "@/components/clients/add-client-modal";
import { ClientCard } from "@/components/clients/client-card";
import { buttonVariants } from "@/components/ui/button";
import {
  type Client,
  getClientsForInfoDal,
  getOrganizationMembersDal,
} from "@/dal/clients";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientInfoListPage(props: PageProps) {
  // Parse page number
  const page = await props.searchParams.then((params) =>
    Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
  );

  const [{ clients: paginatedClients, totalPages }, members] =
    await Promise.all([
      getClientsForInfoDal(page),
      getOrganizationMembersDal(),
    ]);

  // Ensure page is within valid range for UI links
  const safePage = Math.max(1, Math.min(page, totalPages));

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
        <AddClientModal members={members} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-3 gap-6 mb-10">
        <Suspense
          fallback={
            <div className="flex items-center justify-center col-span-full py-12">
              <Loader2 className="animate-spin h-8 w-8 text-primary" />
            </div>
          }
        >
          {paginatedClients.map((client: Client) => (
            <ClientCard key={client.id} client={client} members={members} />
          ))}
        </Suspense>

        {paginatedClients.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
            <h3 className="text-xl font-semibold mb-2">No clients found</h3>
            <p className="text-muted-foreground">
              Add a client to get started with scheduling.
            </p>
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4">
          <Link
            href={`?page=${safePage - 1}`}
            className={buttonVariants({
              variant: "outline",
              className: safePage <= 1 ? "pointer-events-none opacity-50" : "",
            })}
            aria-disabled={safePage <= 1}
          >
            <ChevronLeft className="h-4 w-4 mr-2" />
            Previous
          </Link>
          <span className="text-sm font-medium text-slate-600 dark:text-slate-400">
            Page {safePage} of {totalPages}
          </span>
          <Link
            href={`?page=${safePage + 1}`}
            className={buttonVariants({
              variant: "outline",
              className:
                safePage >= totalPages ? "pointer-events-none opacity-50" : "",
            })}
            aria-disabled={safePage >= totalPages}
          >
            Next
            <ChevronRight className="h-4 w-4 ml-2" />
          </Link>
        </div>
      )}
    </div>
  );
}
