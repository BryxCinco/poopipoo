import { ImageResponse } from "next/og";

/**
 * Social share image (1200x630) for every page, drawn with Next's built-in
 * next/og (no extra package). The logo is plain boxes because only a subset
 * of CSS is supported here.
 */

// Edge runtime: the Node.js build of next/og fails to load its font on Windows
// ("Invalid URL" at build time); the edge (WASM) build works everywhere.
export const runtime = "edge";

export const alt = "Poopipoo — Saan ang CR? Crowdsourced restroom finder para sa Pilipinas";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 88px",
          background: "linear-gradient(135deg, #FDF8F3 0%, #F3E3D3 100%)",
          color: "#3B2314",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          {/* Logo: brown circle with a simple pin */}
          <div
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              background: "#8B4513",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <div style={{ width: 44, height: 44, borderRadius: 22, background: "#FDF8F3" }} />
          </div>
          <div style={{ fontSize: 96, fontWeight: 800, letterSpacing: -2 }}>Poopipoo</div>
        </div>
        <div style={{ marginTop: 40, fontSize: 56, fontWeight: 700 }}>Saan ang CR?</div>
        <div style={{ marginTop: 16, fontSize: 34, color: "#6B4A35", maxWidth: 960 }}>
          Hanapin ang pinakamalapit na malinis na CR sa Pilipinas. Mapa, reviews, direksyon at AI assistant.
        </div>
        <div style={{ marginTop: "auto", display: "flex", gap: 16, fontSize: 26, color: "#8B4513" }}>
          <span>Libre</span>
          <span>·</span>
          <span>Crowdsourced</span>
          <span>·</span>
          <span>Waze ng CR</span>
        </div>
      </div>
    ),
    size
  );
}
