import { cn } from "@/lib/utils";

/**
 * Hand-drawn map decorations in the style of the Poopipoo poster: a compass
 * rose and the curly arrow that points at the logo. Pure SVG in currentColor,
 * so a text color class (e.g. text-ink/30) tints them in light and dark mode.
 * Decorative only: hidden from screen readers.
 */

/** Points of an 8-point compass star around (cx, cy). */
function starPoints(cx: number, cy: number, r: number): string {
  const points: string[] = [];
  for (let i = 0; i < 16; i++) {
    const angle = (Math.PI / 8) * i - Math.PI / 2;
    const radius = i % 4 === 0 ? r : i % 2 === 0 ? r * 0.5 : r * 0.16;
    points.push(`${(cx + radius * Math.cos(angle)).toFixed(1)},${(cy + radius * Math.sin(angle)).toFixed(1)}`);
  }
  return points.join(" ");
}

const LABELS: [string, number, number, number][] = [
  // text, x, y, font size
  ["N", 100, 16, 16],
  ["S", 100, 186, 16],
  ["E", 186, 102, 16],
  ["W", 14, 102, 16],
  ["NE", 156, 44, 10],
  ["NW", 44, 44, 10],
  ["SE", 156, 160, 10],
  ["SW", 44, 160, 10],
];

export function CompassRose({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 200 200" fill="none" aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)}>
      <g stroke="currentColor" strokeWidth="1.4">
        <circle cx="100" cy="100" r="24" />
        <circle cx="100" cy="100" r="41" strokeDasharray="1.5 3.5" />
        <polygon points={starPoints(100, 100, 54)} transform="rotate(22.5 100 100)" fill="currentColor" fillOpacity="0.12" />
        <polygon points={starPoints(100, 100, 66)} fill="currentColor" fillOpacity="0.2" />
      </g>
      {LABELS.map(([text, x, y, size]) => (
        <text
          key={text}
          x={x}
          y={y}
          textAnchor="middle"
          dominantBaseline="middle"
          fontFamily="Georgia, 'Times New Roman', serif"
          fontSize={size}
          fill="currentColor"
        >
          {text}
        </text>
      ))}
    </svg>
  );
}

/** The poster's curly arrow: a loop with a hollow arrowhead pointing up-right. */
export function CurlyArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 160 120" fill="none" aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)}>
      <g stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 108 C 30 70, 70 104, 62 76 C 56 54, 30 62, 40 82 C 50 100, 96 92, 132 34" />
        <path d="M118 36 L136 26 L134 48" />
        <path d="M14 112 C 36 80, 74 112, 68 82" strokeOpacity="0.45" strokeDasharray="4 6" />
      </g>
    </svg>
  );
}

/** A small "CR" map pin. */
export function CrPin({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 52" aria-hidden="true" focusable="false" className={cn("pointer-events-none", className)}>
      <path
        d="M20 2 C 31 2 38 10 38 20 C 38 33 20 50 20 50 C 20 50 2 33 2 20 C 2 10 9 2 20 2 Z"
        fill="currentColor"
        fillOpacity="0.18"
        stroke="currentColor"
        strokeWidth="2"
      />
      <text x="20" y="22" textAnchor="middle" dominantBaseline="middle" fontFamily="Arial, sans-serif" fontWeight="700" fontSize="12" fill="currentColor">
        CR
      </text>
    </svg>
  );
}
