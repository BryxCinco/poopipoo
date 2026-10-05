import { NextResponse, type NextRequest } from "next/server";

import { createClient } from "@/lib/supabase/server";

/**
 * Signs out and clears the session cookies. POST only, so a link or image on
 * another site can't log people out. The profile page's logout button calls
 * this as a plain form submit when JavaScript isn't available.
 */
export async function POST(request: NextRequest) {
  await createClient().auth.signOut();
  // 303 so the browser follows with a GET
  return NextResponse.redirect(new URL("/", request.url), { status: 303 });
}
