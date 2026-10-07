import type { Metadata } from "next";
import Link from "next/link";
import { List, Map, MapPinOff } from "lucide-react";

import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";
import { getT } from "@/lib/i18n/server";

export function generateMetadata(): Metadata {
  return { title: getT().meta.notFound, robots: { index: false } };
}

export default function NotFound() {
  const t = getT().status;
  return (
    <StatusScreen
      code="404"
      icon={<MapPinOff />}
      title={t.notFoundTitle}
      description={t.notFoundDescription}
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">
              <Map aria-hidden="true" />
              {t.backToMap}
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/list">
              <List aria-hidden="true" />
              {t.viewList}
            </Link>
          </Button>
        </>
      }
    />
  );
}
