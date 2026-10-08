import { Fredoka } from "next/font/google";

/**
 * Rounded display font for the "Poopipoo" wordmark (header, login), matching
 * the logo's friendly style. Downloaded at build time by next/font and served
 * from our own domain (no request to Google from the visitor's browser).
 * Only the bold weight and Latin letters are included, so it stays small.
 */
export const brandFont = Fredoka({
  subsets: ["latin"],
  weight: ["600", "700"],
  variable: "--font-brand",
  display: "swap",
});
