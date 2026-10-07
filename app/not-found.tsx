import type { Metadata } from "next";
import Link from "next/link";
import { List, Map, MapPinOff } from "lucide-react";

import { StatusScreen } from "@/components/layout/StatusScreen";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Hindi mahanap",
  robots: { index: false },
};

export default function NotFound() {
  return (
    <StatusScreen
      code="404"
      icon={<MapPinOff />}
      title="Naligaw ka yata"
      description="Hindi mahanap ang page na ito. Baka mali ang link o wala na ito. Pero may CR pa rin sa mapa!"
      actions={
        <>
          <Button asChild size="lg">
            <Link href="/">
              <Map aria-hidden="true" />
              Bumalik sa mapa
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline">
            <Link href="/list">
              <List aria-hidden="true" />
              Tingnan ang listahan
            </Link>
          </Button>
        </>
      }
    />
  );
}
