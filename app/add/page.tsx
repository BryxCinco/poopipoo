import type { Metadata } from "next";

import { AddRestroomForm } from "@/components/add/AddRestroomForm";

export const metadata: Metadata = {
  title: "Poopipoo — Magdagdag ng CR",
};

export default function AddPage() {
  return <AddRestroomForm />;
}
