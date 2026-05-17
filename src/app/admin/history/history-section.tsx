import PaginationButtons from "@/components/pagination-buttons";
import { Card, CardContent } from "@/components/ui/card";
import type { PastServiceItem } from "@/dal/admin";
import { HistoryList } from "./history-list";

export async function HistorySection({
  historyPromise,
  pagePromise,
}: {
  historyPromise: Promise<{ data: PastServiceItem[]; totalPages: number }>;
  pagePromise: Promise<number>;
}) {
  const { data: history, totalPages } = await historyPromise;

  return (
    <div className="space-y-4" id="history-section">
      <h2 className="text-xl font-bold">Service History</h2>
      <Card>
        <CardContent className="p-0">
          <HistoryList history={history} />
        </CardContent>
      </Card>
      <PaginationButtons
        pagePromise={pagePromise}
        totalPagesPromise={Promise.resolve(totalPages)}
        hash="history-section"
      />
    </div>
  );
}
