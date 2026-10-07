import type { Metadata } from "next";

import { LegalPage } from "@/components/layout/LegalPage";
import { pageMetadata } from "@/lib/metadata";

export const metadata: Metadata = pageMetadata({
  title: "Privacy Policy",
  description: "Anong data ang kinokolekta ng Poopipoo, saan ito ginagamit, at paano ito i-export o burahin.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="Oktubre 2026">
      <p>
        Simple lang: kinokolekta lang namin ang kailangan para gumana ang Poopipoo. Hindi namin ibinebenta ang data
        mo.
      </p>

      <h2>Anong data ang naka-save</h2>
      <ul>
        <li>Account: email, username at profile photo (kung nag-upload ka).</li>
        <li>Mga CR na in-add mo, mga review, at mga helpful vote mo. Public ang mga CR at review, kasama ang username mo.</li>
        <li>Points, level at badges (public sa leaderboard).</li>
        <li>Kung kailan ka nagtanong sa AI assistant (oras lang, para sa rate limit at stats).</li>
      </ul>

      <h2>Location</h2>
      <p>
        Ginagamit ang location mo sa browser para sa &quot;Near Me&quot;, sorting ng listahan at direksyon. Hindi ito
        sine-save sa account mo. Para sa direksyon, ipinapadala ang simula at dulo ng ruta sa OSRM routing server ng
        OpenStreetMap. Kapag nagtanong ka sa AI assistant, kasama ang location mo sa tanong para mahanap ang malapit.
      </p>

      <h2>Mga serbisyong ginagamit</h2>
      <ul>
        <li>Supabase: database, login at storage ng photo.</li>
        <li>OpenStreetMap Nominatim: ang tina-type mo sa search bar ng mapa.</li>
        <li>CARTO / OpenStreetMap: map tiles.</li>
        <li>Groq at Hugging Face: pinoproseso ang mga tanong sa AI assistant.</li>
      </ul>

      <h2>Sa device mo</h2>
      <p>
        May ilang setting na naka-save lang sa device (dark mode, AI on/off, recent searches). Mabubura mo ang mga ito
        sa Settings, &quot;I-clear ang local data&quot;.
      </p>

      <h2>Ang mga karapatan mo</h2>
      <p>
        Pwede mong i-export ang lahat ng data mo bilang JSON sa Settings. Pwede mong i-edit o burahin ang mga CR at
        review mo anumang oras. Ang pag-delete ng buong account ay paparating sa susunod na update.
      </p>
    </LegalPage>
  );
}
