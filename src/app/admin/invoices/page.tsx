import { auth } from "@clerk/nextjs/server";
import { Loader2 } from "lucide-react";
import type { Metadata } from "next";
import { Suspense } from "react";
import InvoicesContainer from "@/components/invoices/InvoicesContainer";
import { PageHeader } from "@/components/layout/page-header";
import PaginationButtons from "@/components/pagination-buttons";
import { getClientsForInfoDal } from "@/dal/clients";
import {
  getInvoicesDal,
  getNextInvoiceNumberDal,
  getOrganizationInfoDal,
  getRevenueStatsDal,
} from "@/dal/invoices";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Create, manage, and dispatch billing invoices for clients.",
};

export default async function InvoicesPage(props: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const hasSendInvoicesPromise = auth
    .protect()
    .then((a) => a.has({ feature: "send_invoices" }) || false);

  const invoicesPromise = props.searchParams.then(async (params) => {
    const page = Number(
      Array.isArray(params.page) ? params.page[0] : (params.page ?? 1),
    );
    let search = Array.isArray(params.search)
      ? params.search[0]
      : (params.search ?? undefined);
    const invoiceParam = params.invoice || params.invoiceId;
    if (!search && invoiceParam) {
      search = Array.isArray(invoiceParam)
        ? invoiceParam[0]
        : (invoiceParam ?? undefined);
    }

    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    if (!search && clientId) {
      const clientData = await getClientsForInfoDal(1, undefined, clientId);
      const client = clientData.clients.find((c) => c.id === clientId);
      if (client) {
        search = client.name;
      }
    }

    const status = Array.isArray(params.status)
      ? params.status[0]
      : (params.status ?? undefined);
    return getInvoicesDal(page, search, status).then((data) => data.data);
  });

  const totalPagesPromise = props.searchParams.then(async (params) => {
    const page = Number(
      Array.isArray(params.page) ? params.page[0] : (params.page ?? 1),
    );
    let search = Array.isArray(params.search)
      ? params.search[0]
      : (params.search ?? undefined);
    const invoiceParam = params.invoice || params.invoiceId;
    if (!search && invoiceParam) {
      search = Array.isArray(invoiceParam)
        ? invoiceParam[0]
        : (invoiceParam ?? undefined);
    }

    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    if (!search && clientId) {
      const clientData = await getClientsForInfoDal(1, undefined, clientId);
      const client = clientData.clients.find((c) => c.id === clientId);
      if (client) {
        search = client.name;
      }
    }

    const status = Array.isArray(params.status)
      ? params.status[0]
      : (params.status ?? undefined);
    return getInvoicesDal(page, search, status).then((data) => data.totalPages);
  });

  const pagePromise = props.searchParams.then((params) =>
    Number(Array.isArray(params.page) ? params.page[0] : (params.page ?? 1)),
  );

  const searchPromise = props.searchParams.then(async (params) => {
    const search =
      (Array.isArray(params.search) ? params.search[0] : params.search) ?? "";
    const invoiceParam = params.invoice || params.invoiceId;
    if (!search && invoiceParam) {
      return (
        (Array.isArray(invoiceParam) ? invoiceParam[0] : invoiceParam) ?? ""
      );
    }

    const clientId = Array.isArray(params.clientId) ? params.clientId[0] : params.clientId;
    if (!search && clientId) {
      const clientData = await getClientsForInfoDal(1, undefined, clientId);
      const client = clientData.clients.find((c) => c.id === clientId);
      if (client) {
        return client.name;
      }
    }
    return search;
  });

  const statusPromise = props.searchParams.then((params) =>
    String(
      (Array.isArray(params.status) ? params.status[0] : params.status) ??
        "all",
    ),
  );

  const revenueStatsPromise = getRevenueStatsDal();
  const nextInvoiceNumberPromise = getNextInvoiceNumberDal();
  const organizationInfoPromise = getOrganizationInfoDal();

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Invoices & Billing"
        description="Create, monitor, and send professional invoices to your clients."
      />

      <Suspense
        fallback={
          <div className="flex items-center justify-center py-20">
            <Loader2 className="animate-spin h-8 w-8 text-primary" />
          </div>
        }
      >
        <div id="invoice-list">
          <Suspense>
            <InvoicesContainer
              invoicesPromise={invoicesPromise}
              revenueStatsPromise={revenueStatsPromise}
              nextInvoiceNumberPromise={nextInvoiceNumberPromise}
              organizationInfoPromise={organizationInfoPromise}
              searchPromise={searchPromise}
              statusPromise={statusPromise}
              hasSendInvoicesPromise={hasSendInvoicesPromise}
            />
          </Suspense>
        </div>
      </Suspense>

      <Suspense>
        <PaginationButtons
          pagePromise={pagePromise}
          totalPagesPromise={totalPagesPromise}
          hash="invoice-list"
        />
      </Suspense>
    </div>
  );
}
