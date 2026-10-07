import { formatDistance } from "@/lib/distance";
import { INTL_LOCALE, type Locale } from "@/lib/i18n/config";

/**
 * Turns OSRM maneuvers into short instructions in Tagalog or English.
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

type TurnManeuver = Exclude<Maneuver, "depart" | "arrive" | "roundabout">;

const VERBS: Record<Locale, Record<TurnManeuver, string>> = {
  tl: {
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
  },
  en: {
    "turn-left": "Turn left",
    "turn-right": "Turn right",
    "slight-left": "Bear left",
    "slight-right": "Bear right",
    "sharp-left": "Turn sharp left",
    "sharp-right": "Turn sharp right",
    uturn: "Make a U-turn",
    continue: "Continue straight",
    "keep-left": "Keep left",
    "keep-right": "Keep right",
  },
};

const HEADINGS: Record<Locale, string[]> = {
  tl: ["pahilaga", "pahilagang-silangan", "pasilangan", "patimog-silangan", "patimog", "patimog-kanluran", "pakanluran", "pahilagang-kanluran"],
  en: ["north", "northeast", "east", "southeast", "south", "southwest", "west", "northwest"],
};

/** Compass direction from a bearing in degrees (0 = north). */
function heading(bearing: number, locale: Locale): string {
  return HEADINGS[locale][Math.round((((bearing % 360) + 360) % 360) / 45) % 8];
}

/** Ordinal for roundabout exits: 1 → "una" / "1st", 2 → "ikalawa" / "2nd", ... */
function ordinal(n: number, locale: Locale): string {
  if (locale === "en") {
    const suffix = n % 100 >= 11 && n % 100 <= 13 ? "th" : ({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[n % 10] ?? "th";
    return `${n}${suffix}`;
  }
  const words = ["", "una", "ikalawa", "ikatlo", "ikaapat", "ikalima", "ikaanim", "ikapito", "ikawalo"];
  return words[n] ?? `ika-${n}`;
}

/**
 * One OSRM step as a short instruction in the given language, e.g.
 * "Kumanan sa Ayala Avenue" / "Turn right onto Ayala Avenue".
 */
export function translateInstruction(
  input: OsrmManeuverInput,
  streetName: string,
  profile: RouteProfile,
  locale: Locale
): string {
  const maneuver = toManeuver(input);
  const street = streetName.trim();
  const en = locale === "en";

  switch (maneuver) {
    case "depart": {
      const verb = en ? (profile === "foot" ? "Walk" : "Drive") : profile === "foot" ? "Maglakad" : "Magmaneho";
      const direction = input.bearingAfter !== undefined ? ` ${heading(input.bearingAfter, locale)}` : "";
      const on = street ? (en ? ` on ${street}` : ` sa ${street}`) : "";
      return `${verb}${direction}${on}`;
    }
    case "arrive": {
      if (en) {
        if (input.modifier?.includes("left")) return "You've arrived. The restroom is on your left";
        if (input.modifier?.includes("right")) return "You've arrived. The restroom is on your right";
        return "You've arrived";
      }
      if (input.modifier?.includes("left")) return "Nakarating ka na. Nasa kaliwa mo ang CR";
      if (input.modifier?.includes("right")) return "Nakarating ka na. Nasa kanan mo ang CR";
      return "Nakarating ka na";
    }
    case "roundabout": {
      if (en) {
        const exit = input.exit ? `take the ${ordinal(input.exit, locale)} exit` : "exit";
        return `At the roundabout, ${exit}${street ? ` onto ${street}` : ""}`;
      }
      const exit = input.exit ? `lumabas sa ${ordinal(input.exit, locale)} exit` : "lumabas";
      return `Sa rotonda, ${exit}${street ? ` papuntang ${street}` : ""}`;
    }
    default: {
      // "Continue on X" vs "Turn left onto X"
      const on = street ? (en ? (maneuver === "continue" ? ` on ${street}` : ` onto ${street}`) : ` sa ${street}`) : "";
      return `${VERBS[locale][maneuver]}${on}`;
    }
  }
}

// ---------- formatting ----------

/** "200 m" / "1.2 km" */
export function formatMeters(meters: number): string {
  return formatDistance(meters / 1000);
}

/** For voice: "200 metro" / "200 meters", "1.2 kilometro" / "1.2 kilometers" */
export function formatSpokenMeters(meters: number, locale: Locale): string {
  const en = locale === "en";
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} ${en ? "meters" : "metro"}`;
  return `${(meters / 1000).toFixed(1)} ${en ? "kilometers" : "kilometro"}`;
}

/** "wala pang 1 minuto" / "5 minuto" / "1 oras 10 minuto" (English: "under 1 min", "5 min", "1 hr 10 min") */
export function formatDuration(seconds: number, locale: Locale): string {
  const en = locale === "en";
  const minutes = Math.round(seconds / 60);
  if (minutes < 1) return en ? "under 1 min" : "wala pang 1 minuto";
  const min = en ? "min" : "minuto";
  const hr = en ? "hr" : "oras";
  if (minutes < 60) return `${minutes} ${min}`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} ${hr}` : `${hours} ${hr} ${rest} ${min}`;
}

/** Clock time of arrival, e.g. "3:45 PM". */
export function formatArrivalTime(secondsFromNow: number, locale: Locale, now: number = Date.now()): string {
  return new Intl.DateTimeFormat(INTL_LOCALE[locale], { hour: "numeric", minute: "2-digit" }).format(
    new Date(now + secondsFromNow * 1000)
  );
}

/** Lowercases the first letter so an instruction can follow "Sa loob ng 200 metro, ..." / "In 200 meters, ...". */
export function lowerFirst(text: string): string {
  return text.charAt(0).toLowerCase() + text.slice(1);
}
