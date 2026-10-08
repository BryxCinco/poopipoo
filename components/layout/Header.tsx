import Image from "next/image";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-md items-center px-4">
        <Link
          href="/"
          className="group flex items-center gap-2 rounded-lg text-lg font-bold tracking-tight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {/* alt="" because the link already says "Poopipoo": screen readers
              would otherwise read the name twice */}
          <Image
            src="/logo.png"
            alt=""
            width={36}
            height={36}
            priority
            className="h-9 w-9 rounded-lg shadow-sm ring-1 ring-primary/15 transition-transform duration-200 group-hover:-rotate-6 group-hover:scale-105"
          />
          <span className="font-brand text-xl font-bold tracking-normal text-ink">Poopipoo</span>
        </Link>
      </div>
    </header>
  );
}
