import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Suspense } from "react";
import InvoicesContainer from "@/components/invoices/InvoicesContainer";
import { InvoicesSkeleton } from "@/components/invoices/invoices-skeleton";
import { PageHeader } from "@/components/layout/page-header";
import PaginationButtons from "@/components/pagination-buttons";
  getInvoicesDal,
  getNextInvoiceNumberDal,
  getOrganizationInfoDal,
  getRevenueStatsDal,
} from "@/dal/invoices";
import { parseParams } from "@/lib/utils/search-params-util";

export const metadata: Metadata = {
  title: "Invoices",
  description: "Create, manage, and dispatch billing invoices for clients.",
};

export default function InvoicesPage(props: PageProps<"/admin/invoices">) {
 
  const invoicesPromise = props.searchParams.then(async (params) =>
    getInvoicesDal(
      Number(parseParams(params.page) ?? 1),
      parseParams(params.search) ||
        parseParams(params.invoice) ||
        parseParams(params.invoiceId) ||
        parseParams(params.clientId),
      parseParams(params.status),
    ),
  );

  return (
    <div className="container mx-auto max-w-7xl px-4 py-4 md:py-8">
      <PageHeader
        title="Invoices & Billing"
        description="Create, monitor, and send professional invoices to your clients."
      />

      <Suspense fallback={<InvoicesSkeleton />}>
        <div id="invoice-list">
          <Suspense fallback={<InvoicesSkeleton />}>
            <InvoicesContainer
              invoicesPromise={invoicesPromise.then((data) => data.data)}
              revenueStatsPromise={getRevenueStatsDal()}
              nextInvoiceNumberPromise={getNextInvoiceNumberDal()}
              organizationInfoPromise={getOrganizationInfoDal()}
              searchPromise={props.searchParams.then(
                async (params) =>
                  parseParams(params.search) ||
                  parseParams(params.invoice) ||
                  parseParams(params.invoiceId) ||
                  "",
              )}
              statusPromise={props.searchParams.then(
                (params) => parseParams(params.status) ?? "all",
              )}
              hasSendInvoicesPromise={auth
                .protect()
                .then((a) => a.has({ feature: "send_invoices" }) || false)}
            />
          </Suspense>
        </div>
      </Suspense>

      <Suspense>
        <PaginationButtons
          pagePromise={props.searchParams.then((params) =>
            Number(parseParams(params.page) ?? 1),
          )}
          totalPagesPromise={invoicesPromise.then((data) => data.totalPages)}
          hash="invoice-list"
        />
      </Suspense>
    </div>
  );
}
