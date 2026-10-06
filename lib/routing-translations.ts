import { formatDistance } from "@/lib/distance";

/**
 * Turns OSRM maneuvers into short Filipino instructions.
 * OSRM docs: https://project-osrm.org/docs/v5.24.0/api/#stepmaneuver-object
 */

export type RouteProfile = "foot" | "car";

/** Simplified maneuver, used for icons and wording. */
export type Maneuver =
  | "depart"
  | "arrive"
  | "turn-left"
  | "turn-right"
  | "slight-left"
  | "slight-right"
  | "sharp-left"
  | "sharp-right"
  | "uturn"
  | "continue"
  | "keep-left"
  | "keep-right"
  | "roundabout";

/** Raw OSRM maneuver fields we use. */
export interface OsrmManeuverInput {
  type: string;
  modifier?: string;
  exit?: number;
  bearingAfter?: number;
}

export function toManeuver({ type, modifier }: OsrmManeuverInput): Maneuver {
  if (type === "depart") return "depart";
  if (type === "arrive") return "arrive";
  if (type === "roundabout" || type === "rotary" || type === "roundabout turn") return "roundabout";

  // Forks: "keep left/right" rather than a full turn
  if (type === "fork") {
    if (modifier?.includes("left")) return "keep-left";
    if (modifier?.includes("right")) return "keep-right";
    return "continue";
  }

  switch (modifier) {
    case "left":
      return "turn-left";
    case "right":
      return "turn-right";
    case "slight left":
      return "slight-left";
    case "slight right":
      return "slight-right";
    case "sharp left":
      return "sharp-left";
    case "sharp right":
      return "sharp-right";
    case "uturn":
      return "uturn";
    default:
      return "continue";
  }
}

const VERBS: Record<Exclude<Maneuver, "depart" | "arrive" | "roundabout">, string> = {
  "turn-left": "Kumaliwa",
  "turn-right": "Kumanan",
  "slight-left": "Bahagyang kumaliwa",
  "slight-right": "Bahagyang kumanan",
  "sharp-left": "Kumaliwa nang todo",
  "sharp-right": "Kumanan nang todo",
  uturn: "Mag-U-turn",
  continue: "Diretso lang",
  "keep-left": "Manatili sa kaliwa",
  "keep-right": "Manatili sa kanan",
};

/** Compass direction from a bearing in degrees (0 = north). */
function heading(bearing: number): string {
  const directions = ["pahilaga", "pahilagang-silangan", "pasilangan", "patimog-silangan", "patimog", "patimog-kanluran", "pakanluran", "pahilagang-kanluran"];
  return directions[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

/** Ordinal for roundabout exits: 1 → "una", 2 → "ikalawa", ... */
function ordinal(n: number): string {
  const words = ["", "una", "ikalawa", "ikatlo", "ikaapat", "ikalima", "ikaanim", "ikapito", "ikawalo"];
  return words[n] ?? `ika-${n}`;
}

/** e.g. "Kumanan sa Ayala Avenue", "Diretso lang", "Nakarating ka na (nasa kanan mo)". */
export function translateInstruction(input: OsrmManeuverInput, streetName: string, profile: RouteProfile): string {
  const maneuver = toManeuver(input);
  const street = streetName.trim();
  const onStreet = street ? ` sa ${street}` : "";

  switch (maneuver) {
    case "depart": {
      const verb = profile === "foot" ? "Maglakad" : "Magmaneho";
      const direction = input.bearingAfter !== undefined ? ` ${heading(input.bearingAfter)}` : "";
      return `${verb}${direction}${onStreet}`;
    }
    case "arrive": {
      if (input.modifier?.includes("left")) return "Nakarating ka na. Nasa kaliwa mo ang CR";
      if (input.modifier?.includes("right")) return "Nakarating ka na. Nasa kanan mo ang CR";
      return "Nakarating ka na";
    }
    case "roundabout": {
      const exit = input.exit ? `lumabas sa ${ordinal(input.exit)} exit` : "lumabas";
      return `Sa rotonda, ${exit}${street ? ` papuntang ${street}` : ""}`;
    }
    default:
      return `${VERBS[maneuver]}${onStreet}`;
  }
}

// ---------- formatting ----------

/** "200 m" / "1.2 km" */
export function formatMeters(meters: number): string {
  return formatDistance(meters / 1000);
}

/** For voice: "200 metro" / "1.2 kilometro" */
export function formatSpokenMeters(meters: number): string {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} metro`;
  return `${(meters / 1000).toFixed(1)} kilometro`;
}

/** "wala pang 1 minuto" / "5 minuto" / "1 oras 10 minuto" */
export function formatDuration(seconds: number): string {
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return "wala pang 1 minuto";
  if (minutes < 60) return `${minutes} minuto`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} oras` : `${hours} oras ${rest} minuto`;
}

/** Clock time of arrival, e.g. "3:45 PM". */
export function formatArrivalTime(secondsFromNow: number, now: number = Date.now()): string {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(
    new Date(now + secondsFromNow * 1000)
  );
}

/** Lowercases the first letter so an instruction can follow "Sa loob ng 200 metro, ...". */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
