// Postcode to map point, so the dispatcher can find the nearest pros.
// postcodes.io is free and needs no key.

/** The postcode's centre as a PostGIS point, or null if it can't be found. */
export async function postcodePoint(postcode: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api.postcodes.io/postcodes/${encodeURIComponent(postcode.replace(/\s+/g, ''))}`);
    if (!res.ok) return null;
    const { result } = (await res.json()) as { result?: { longitude: number; latitude: number } };
    return result ? `SRID=4326;POINT(${result.longitude} ${result.latitude})` : null;
  } catch {
    return null;
  }
}
