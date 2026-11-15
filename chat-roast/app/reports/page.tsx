import type { Metadata } from "next";
import { ReportsList } from "@/components/report/ReportsList";

export const metadata: Metadata = {
  title: "הדו״חות שלי",
  robots: { index: false, follow: false },
};

export default function ReportsPage() {
  return <ReportsList />;
}
