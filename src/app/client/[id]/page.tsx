import { auth } from "@clerk/nextjs/server";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SingleClientContainer } from "@/components/clients/client-info/single-client-container";
import { PageHeader } from "@/components/layout/page-header";
import { getOrganizationMembersDal } from "@/dal/clerk";
import { getClientByIdDal } from "@/dal/sitemap";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Client Profile",
    description:
      "Manage specific client information, property details, and landscaping service history.",
  };
}

export default async function ClientPage(props: PageProps<"/client/[id]">) {
  const isAdminPromise = auth
    .protect()
    .then((authData) => authData.has({ role: "org:admin" }));
  const clientPromise = props.params.then((params) =>
    getClientByIdDal(params.id),
  );
  const membersPromise = getOrganizationMembersDal();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Client Details"
        description="View and manage this specific client's information."
        backHref="/client-info-list"
        backLabel="Back to Clients"
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center col-span-full py-12">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <SingleClientLoader
          isAdminPromise={isAdminPromise}
          clientPromise={clientPromise}
          membersPromise={membersPromise}
        />
      </Suspense>
    </div>
  );
}

async function SingleClientLoader({
  isAdminPromise,
  clientPromise,
  membersPromise,
}: {
  isAdminPromise: Promise<boolean>;
  clientPromise: ReturnType<typeof getClientByIdDal>;
  membersPromise: ReturnType<typeof getOrganizationMembersDal>;
}) {
  const isAdmin = await isAdminPromise;
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

  return (
    <SingleClientContainer
      client={client}
      members={members}
      isAdmin={isAdmin}
    />
  );
}
