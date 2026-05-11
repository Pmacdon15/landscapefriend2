import { auth } from "@clerk/nextjs/server";
import { format } from "date-fns";
import { Loader2 } from "lucide-react";
import { Suspense } from "react";
import {
  getClientsForCutListDal,
  getOrganizationMembersDal,
} from "@/dal/clients";
import { CutListContent } from "./cut-list-content";

interface PageProps {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function ClientCutListPage({ searchParams }: PageProps) {
  const { userId } = await auth();
  const resolvedParams = await searchParams;
  const dateParam =
    typeof resolvedParams.date === "string"
      ? resolvedParams.date
      : format(new Date(), "yyyy-MM-dd");

  // Fetch data in parallel
  const [clients, _members] = await Promise.all([
    getClientsForCutListDal(dateParam),
    getOrganizationMembersDal(),
  ]);

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10">
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
          Daily Cut List
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
          initialClients={clients}
          defaultDate={dateParam}
          currentUserId={userId}
        />
      </Suspense>
    </div>
  );
}
