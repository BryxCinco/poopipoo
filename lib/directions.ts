/** Google Maps directions URL to the given coordinates (opens the app on mobile). */
export function getDirectionsUrl(latitude: number, longitude: number): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;
}
