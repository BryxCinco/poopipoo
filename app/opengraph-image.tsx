import { ImageResponse } from "next/og";

/**
 * Social share image (1200x630) for every page, drawn with Next's built-in
 * next/og (no extra package): the app logo on a cream "paper map" background.
 * The logo PNG (app/logo-og.png) is generated from the brand logo.
 */

// Edge runtime: the Node.js build of next/og fails to load its font on Windows
// ("Invalid URL" at build time); the edge (WASM) build works everywhere.
export const runtime = "edge";

export const alt = "Poopipoo — Saan ang CR? Crowdsourced restroom finder para sa Pilipinas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const BROWN = "#5C3317";
const BROWN_SOFT = "#7A4A26";
const PAPER = "#F6F0E6";

/** ArrayBuffer → data: URL (works in the edge runtime, where Buffer isn't available). */
function toDataUrl(buffer: ArrayBuffer, type: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) {
    binary += String.fromCharCode(...Array.from(bytes.subarray(i, i + 0x8000)));
  }
  return `data:${type};base64,${btoa(binary)}`;
}

export default async function OpenGraphImage() {
  const logo = toDataUrl(await fetch(new URL("./logo-og.png", import.meta.url)).then((r) => r.arrayBuffer()), "image/png");

  // Faint street lines in the background (like a paper map)
  const roads = [
    "M0 120 C 260 80, 420 200, 700 150 S 1050 60, 1200 120",
    "M0 520 C 220 470, 480 600, 760 540 S 1060 450, 1200 500",
    "M180 0 C 220 160, 120 320, 200 470 S 260 600, 240 630",
    "M1010 0 C 960 150, 1060 300, 990 450 S 980 600, 1020 630",
  ];

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          gap: 64,
          padding: "0 96px",
          background: `linear-gradient(135deg, ${PAPER} 0%, #EBDDCA 100%)`,
          color: BROWN,
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        <svg width="1200" height="630" viewBox="0 0 1200 630" style={{ position: "absolute", left: 0, top: 0 }}>
          {roads.map((d) => (
            <path key={d} d={d} fill="none" stroke={BROWN_SOFT} strokeOpacity={0.14} strokeWidth={4} />
          ))}
          <path
            d="M560 600 C 640 520, 760 560, 820 470"
            fill="none"
            stroke={BROWN_SOFT}
            strokeOpacity={0.25}
            strokeWidth={4}
            strokeDasharray="12 14"
          />
        </svg>

        {/* eslint-disable-next-line @next/next/no-img-element -- next/og renders plain <img> */}
        <img src={logo} width={330} height={330} alt="" style={{ borderRadius: 64, boxShadow: "0 18px 40px rgba(92,51,23,0.25)" }} />

        <div style={{ display: "flex", flexDirection: "column", maxWidth: 640 }}>
          <div style={{ fontSize: 104, fontWeight: 800, letterSpacing: -3, lineHeight: 1 }}>Poopipoo</div>
          <div style={{ marginTop: 22, fontSize: 52, fontWeight: 700, color: BROWN_SOFT }}>Saan ang CR?</div>
          <div style={{ marginTop: 18, fontSize: 30, lineHeight: 1.35, color: "#6B4A35" }}>
            Hanapin ang pinakamalapit na malinis na CR sa Pilipinas. Mapa, reviews, direksyon at AI assistant.
          </div>
          <div style={{ marginTop: 30, display: "flex", gap: 14, fontSize: 26, color: BROWN_SOFT }}>
            <span>Libre</span>
            <span>·</span>
            <span>Crowdsourced</span>
            <span>·</span>
            <span>Waze ng CR</span>
          </div>
        </div>
      </div>
    ),
    size
  );
}
