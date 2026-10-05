/** Maps common Supabase Auth error messages to friendly Filipino text. */
export function friendlyAuthError(message: string): string {
  const m = message.toLowerCase();
  if (m.includes("invalid login credentials")) return "Mali ang email o password.";
  if (m.includes("email not confirmed")) {
    return "I-confirm muna ang email mo. I-check ang inbox (o spam) para sa link.";
  }
  if (m.includes("already registered") || m.includes("already been registered")) {
    return "May account na ang email na ito. Mag-login na lang.";
  }
  if (m.includes("password should be") || m.includes("weak password")) {
    return "Masyadong mahina ang password. Gumamit ng mas mahaba o mas kumplikado.";
  }
  if (m.includes("rate limit") || m.includes("too many")) {
    return "Masyadong maraming subok. Maghintay muna ng ilang minuto.";
  }
  if (m.includes("failed to fetch") || m.includes("network")) {
    return "Walang internet connection. Subukan ulit.";
  }
  return message;
}
