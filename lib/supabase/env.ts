// NEXT_PUBLIC_* values must be read with literal `process.env.X` access so
// Next.js can inline them into the browser bundle.

function required(value: string | undefined, name: string): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Add it to .env.local.`);
  }
  return value;
}

export function getSupabaseUrl(): string {
  return required(process.env.NEXT_PUBLIC_SUPABASE_URL, "NEXT_PUBLIC_SUPABASE_URL");
}

/** New-format publishable key (sb_publishable_...). Safe for the browser. */
export function getSupabasePublishableKey(): string {
  return required(
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"
  );
}
