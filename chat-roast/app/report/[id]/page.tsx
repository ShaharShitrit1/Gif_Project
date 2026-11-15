import type { Metadata } from "next";
import { ReportScreen } from "@/components/report/ReportScreen";

export const metadata: Metadata = {
  title: "ChatRoast · הדו״ח",
  robots: { index: false, follow: false },
};

/** Reports live only in the browser (IndexedDB), so the page itself renders on the client. */
export default async function ReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ReportScreen id={decodeURIComponent(id)} />;
}
