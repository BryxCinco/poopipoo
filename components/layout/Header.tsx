import Link from "next/link";
import { Toilet } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-md items-center px-4">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm transition-transform duration-200 group-hover:-rotate-12 group-hover:scale-110">
            <Toilet className="h-[18px] w-[18px]" aria-hidden="true" />
          </span>
          Poopipoo
        </Link>
      </div>
    </header>
  );
}
