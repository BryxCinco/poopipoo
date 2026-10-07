import type { Metadata } from "next";
import Link from "next/link";
import { ChevronRight, CodeXml, ExternalLink, FileText, Heart, Shield, Toilet } from "lucide-react";

import { pageMetadata, SITE_DESCRIPTION } from "@/lib/metadata";
import packageJson from "@/package.json";

export const metadata: Metadata = pageMetadata({
  title: "About",
  description: "Tungkol sa Poopipoo, ang crowdsourced restroom finder para sa Pilipinas. Version, credits at mga link.",
  path: "/about",
});

const GITHUB_URL = "https://github.com/BryxCinco/poopipoo";

const CREDITS = [
  { name: "OpenStreetMap", role: "Map data, search (Nominatim) at routing (OSRM)", href: "https://www.openstreetmap.org/copyright" },
  { name: "CARTO", role: "Map tiles (Voyager at Dark Matter)", href: "https://carto.com/attributions" },
  { name: "Supabase", role: "Database, login at storage", href: "https://supabase.com" },
  { name: "Groq", role: "AI assistant (LLM)", href: "https://groq.com" },
  { name: "Hugging Face", role: "Embeddings para sa AI search", href: "https://huggingface.co" },
] as const;

const LINKS = [
  { label: "GitHub", href: GITHUB_URL, icon: CodeXml, external: true },
  { label: "Privacy Policy", href: "/privacy", icon: Shield, external: false },
  { label: "Terms of Use", href: "/terms", icon: FileText, external: false },
] as const;

const rowClass =
  "group flex items-center gap-3 px-3 py-3 text-sm transition-colors duration-150 hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none";

export default function AboutPage() {
  return (
    <div className="mx-auto flex w-full max-w-screen-md flex-col gap-6 px-4 py-6">
      {/* App */}
      <section className="flex flex-col items-center gap-3 text-center">
        <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-md">
          <Toilet className="h-8 w-8" aria-hidden="true" />
        </span>
        <div>
          <h1 className="text-2xl font-bold">Poopipoo</h1>
          <p className="text-sm text-muted-foreground">Version {packageJson.version}</p>
        </div>
        <p className="max-w-md text-sm leading-relaxed">
          Ang &quot;Waze ng CR.&quot; {SITE_DESCRIPTION} Lahat ng CR at review ay galing sa komunidad, kaya bawat
          dagdag mo ay nakakatulong sa susunod na nagmamadali.
        </p>
      </section>

      {/* Credits */}
      <section className="flex flex-col gap-2" aria-labelledby="credits-heading">
        <h2 id="credits-heading" className="font-semibold">
          Credits
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {CREDITS.map((credit) => (
            <li key={credit.name}>
              <a href={credit.href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                <span className="flex min-w-0 flex-1 flex-col">
                  <span className="font-medium">{credit.name}</span>
                  <span className="text-xs text-muted-foreground">{credit.role}</span>
                </span>
                <ExternalLink className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
                <span className="sr-only">(bubukas sa bagong tab)</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {/* Links */}
      <section className="flex flex-col gap-2" aria-labelledby="links-heading">
        <h2 id="links-heading" className="font-semibold">
          Links
        </h2>
        <ul className="divide-y overflow-hidden rounded-xl border bg-card shadow-sm">
          {LINKS.map(({ label, href, icon: Icon, external }) => (
            <li key={label}>
              {external ? (
                <a href={href} target="_blank" rel="noopener noreferrer" className={rowClass}>
                  <Icon className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="flex-1">{label}</span>
                  <ExternalLink className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
                  <span className="sr-only">(bubukas sa bagong tab)</span>
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
        Made with
        <Heart className="h-4 w-4 fill-red-500 text-red-500" aria-label="love" role="img" />
        in the Philippines
      </p>
    </div>
  );
}
