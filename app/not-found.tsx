import Link from "next/link";
import { Home, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/EmptyState";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center px-4">
      <EmptyState
        icon={<MapPinOff />}
        titleAs="h1"
        title="Hindi mahanap ang page"
        description="Baka mali ang link o wala na ang page na ito."
        action={
          <Button asChild>
            <Link href="/">
              <Home aria-hidden="true" />
              Bumalik sa mapa
            </Link>
          </Button>
        }
      />
    </div>
  );
}
