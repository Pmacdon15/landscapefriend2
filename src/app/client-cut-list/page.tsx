import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import { getClientsForCutListDal } from "@/dal/clients";
import { CutListContent } from "./cut-list-content";

export default async function ClientCutListPage(
  props: PageProps<"/client-cut-list">,
) {
  const clientsPromise = props.searchParams.then((p) =>
    getClientsForCutListDal(
      String(
        (Array.isArray(p.date) ? p.date[0] : p.date) ??
          new Date().toISOString().split("T")[0],
      ),
    ),
  );

  const datePromise = props.searchParams.then((p) =>
    String(
      (Array.isArray(p.date) ? p.date[0] : p.date) ??
        new Date().toISOString().split("T")[0],
    ),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
          Daily Service List
        </h1>
        <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl">
          View and manage the clients scheduled for service on a specific date.
        </p>
      </div>

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <CutListContent
          clientsPromise={clientsPromise}
          datePromise={datePromise}
        />
      </Suspense>
    </div>
  );
}
