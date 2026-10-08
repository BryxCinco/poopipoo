import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CodeXml, ExternalLink, FileText, Heart, Shield, Toilet } from "lucide-react";

import { format } from "@/lib/i18n/format";
import { getT } from "@/lib/i18n/server";
import { pageMetadata } from "@/lib/metadata";
import packageJson from "@/package.json";

export function generateMetadata(): Metadata {
  const { title, description } = getT().meta.about;
  return pageMetadata({ title, description, path: "/about" });
}

const GITHUB_URL = "https://github.com/BryxCinco/poopipoo";
const OSM_COPYRIGHT_URL = "https://www.openstreetmap.org/copyright";

// role = key in t.about.creditRoles
const CREDITS = [
  { name: "OpenStreetMap", role: "osm", href: OSM_COPYRIGHT_URL },
  { name: "CARTO", role: "carto", href: "https://carto.com/attributions" },
  { name: "Supabase", role: "supabase", href: "https://supabase.com" },
  { name: "Groq", role: "groq", href: "https://groq.com" },
  { name: "Hugging Face", role: "huggingface", href: "https://huggingface.co" },
] as const;

const rowClass =
  "group flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

export default function AboutPage() {
  const t = getT();
  const links = [
    { label: "GitHub", href: GITHUB_URL, icon: CodeXml, external: true },
    { label: t.about.privacy, href: "/privacy", icon: Shield, external: false },
    { label: t.about.terms, href: "/terms", icon: FileText, external: false },
  ];

  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-6">
      {/* App */}
      <section className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Toilet className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Poopipoo</h1>
          <p className="text-sm text-muted-foreground">{format(t.about.version, { version: packageJson.version })}</p>
        </div>
        <p className="max-w-md text-sm leading-relaxed">{t.about.description}</p>
      </section>

      {/* Credits */}
      <section className="flex flex-col gap-2" aria-labelledby="credits-heading">
        <h2 id="credits-heading" className="font-semibold">
          {t.about.credits}
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {CREDITS.map((credit) => (
            <li key={credit.name}>
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{credit.name}</span>
                  <span className="text-xs text-muted-foreground">{t.about.creditRoles[credit.role]}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">{t.common.newTab}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* OpenStreetMap attribution (required by the ODbL for the imported restrooms) */}
      <section className="flex flex-col gap-2" aria-labelledby="license-heading">
        <h2 id="license-heading" className="font-semibold">
          {t.about.dataLicenseHeading}
        </h2>
        <div className="flex flex-col gap-2 rounded-xl border bg-card p-3 text-sm shadow-sm">
          <p className="text-muted-foreground">{t.about.dataLicense}</p>
          <a
            href={OSM_COPYRIGHT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="link-underline inline-flex w-fit items-center gap-1 font-medium"
          >
            {t.about.dataLicenseLink}
            <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="sr-only">{t.common.newTab}</span>
          </a>
        </div>
      </section>

      {/* Links */}
      <section className="flex flex-col gap-2" aria-labelledby="links-heading">
        <h2 id="links-heading" className="font-semibold">
          {t.about.links}
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {links.map(({ label, href, icon: Icon, external }) => (
            <li key={label}>
              {external ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">{t.common.newTab}</span>
                </a>
              ) : (
                <Link href={href} className={rowClass}>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <ChevronRight
                    className="h-4 w-4 text-muted-foreground transition-transform duration-150 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
              )}
            </li>
          ))}
        </ul>
      </section>

      <p className="flex items-center justify-center gap-1.5 pb-2 text-sm text-muted-foreground">
        {t.about.madeWith}
        <Heart className="h-4 w-4 fill-red-500 text-red-500" aria-label={t.about.love} role="img" />
        {t.about.inPhilippines}
      </p>
    </div>
  );
}
