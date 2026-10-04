import type { Metadata } from "next";
import { List } from "lucide-react";

import { RestroomList } from "@/components/restroom/RestroomList";

export const metadata: Metadata = {
  title: "Poopipoo — Mga CR Malapit Sa'yo",
};

export default function ListPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-3 px-4 py-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <List className="h-5 w-5" aria-hidden="true" />
        Mga CR Malapit Sa&apos;yo
      </h1>
      <RestroomList />
    </div>
  );
}
