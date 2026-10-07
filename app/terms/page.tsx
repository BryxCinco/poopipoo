import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.terms;
  return pageMetadata({ title, description, path: "/terms" });
}

export default function TermsPage() {
  const { title, intro, sections } = getT().terms;
  return <LegalPage title={title} intro={intro} sections={sections} />;
}
