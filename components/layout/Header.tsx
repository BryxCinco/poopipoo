import Link from "next/link";
import { Toilet } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-md items-center px-4">
        <Link href="/" className="flex items-center gap-2 text-lg font-bold tracking-tight">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-[#8B4513] text-white">
            <Toilet className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          Poopipoo
        </Link>
      </div>
    </header>
  );
}
