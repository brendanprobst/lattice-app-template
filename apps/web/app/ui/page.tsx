import { UiGalleryPage } from "@client/pages/ui-gallery";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "UI kit · Lattice",
  description: "Lattice web component gallery (Tailwind + shadcn/ui + lucide-react)",
};

export default function UiKitPage() {
  return <UiGalleryPage />;
}
