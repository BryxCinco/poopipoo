import type { Metadata } from "next";
import { List } from "lucide-react";

import { RestroomList } from "@/components/restroom/RestroomList";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.list;
  return pageMetadata({ title, description, path: "/list" });
}

export default function ListPage() {
  const t = getT();
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-3 px-4 py-4">
      <h1 className="flex items-center gap-2 text-xl font-bold">
        <List className="h-5 w-5" aria-hidden="true" />
        {t.list.heading}
      </h1>
      <RestroomList />
    </div>
  );
}
