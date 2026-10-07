import type { Metadata } from "next";
import { List } from "lucide-react";

import { RestroomList } from "@/components/restroom/RestroomList";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Mga CR Malapit Sa'yo",
  description: "Listahan ng mga CR na malapit sa'yo, naka-sort mula sa pinakamalapit. I-filter ayon sa bidet, PWD access at iba pa.",
  path: "/list",
});

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
