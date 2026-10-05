import Link from "next/link";
import { Home, MapPinOff } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-1 flex-col items-center justify-center gap-2 px-4 py-12 text-center">
      <MapPinOff className="h-12 w-12 text-muted-foreground" aria-hidden="true" />
      <h1 className="text-xl font-bold">Hindi mahanap ang page</h1>
      <p className="text-sm text-muted-foreground">Baka mali ang link o wala na ang page na ito.</p>
      <Button asChild className="mt-2">
        <Link href="/">
          <Home aria-hidden="true" />
          Bumalik sa mapa
        </Link>
      </Button>
    </div>
  );
}
