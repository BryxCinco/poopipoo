import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="mx-auto flex h-14 max-w-screen-md items-center px-4">
        <Link href="/" className="text-lg font-bold tracking-tight">
          Poopipoo 🚽
        </Link>
      </div>
    </header>
  );
}
