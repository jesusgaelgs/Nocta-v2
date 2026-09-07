import type { Metadata } from "next";
import { PanelApp } from "@/components/panel/PanelApp";

export const metadata: Metadata = {
  title: "NOCTA — Panel",
  robots: { index: false, follow: false },
};

export default function PanelPage() {
  return <PanelApp />;
}
