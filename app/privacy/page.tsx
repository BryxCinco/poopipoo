import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.privacy;
  return pageMetadata({ title, description, path: "/privacy" });
}

export default function PrivacyPage() {
  const { title, intro, sections } = getT().privacy;
  return <LegalPage title={title} intro={intro} sections={sections} />;
}
