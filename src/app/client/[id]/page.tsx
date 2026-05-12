import { ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import { getClientByIdDal, getOrganizationMembersDal } from "@/dal/clients";
import { buttonVariants } from "@/components/ui/button";
import { SingleClientContainer } from "@/components/clients/client-info/single-client-container";
import { PageProps } from "@/types/types";

export default async function ClientPage(props: PageProps<"/client/[id]">) {
  const { id } = await props.params;

  const clientPromise = getClientByIdDal(id);
  const membersPromise = getOrganizationMembersDal();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-12">
      <div className="mb-10 flex flex-col items-start gap-4">
        <Link 
          href="/client-info-list" 
          className={buttonVariants({ variant: "ghost", className: "mb-2 -ml-4" })}
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Clients
        </Link>
        <div>
          <h1 className="text-4xl font-extrabold tracking-tight text-slate-900 dark:text-slate-50 mb-3">
            Client Details
          </h1>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-3xl">
            View and manage this specific client's information.
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
        <SingleClientLoader
          clientPromise={clientPromise}
          membersPromise={membersPromise}
        />
      </Suspense>
    </div>
  );
}

async function SingleClientLoader({
  clientPromise,
  membersPromise,
}: {
  clientPromise: ReturnType<typeof getClientByIdDal>;
  membersPromise: ReturnType<typeof getOrganizationMembersDal>;
}) {
  const client = await clientPromise;
  const members = await membersPromise;

  if (!client) {
    return (
      <div className="col-span-full text-center py-20 bg-white/50 dark:bg-slate-900/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
        <h3 className="text-xl font-semibold mb-2">Client not found</h3>
        <p className="text-muted-foreground">
          The requested client does not exist or you do not have access.
        </p>
      </div>
    );
  }

  return <SingleClientContainer client={client} members={members} />;
}
