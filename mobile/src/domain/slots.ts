// The 2-hour slots a customer can pick for a booked job.

const SLOTS: { hour: number; label: string }[] = [
  { hour: 8, label: '8 to 10am' },
  { hour: 10, label: '10am to 12pm' },
  { hour: 12, label: '12 to 2pm' },
  { hour: 14, label: '2 to 4pm' },
  { hour: 16, label: '4 to 6pm' },
];

export type BookingDay = { key: string; label: string; slots: { start: string; label: string }[] };

/** Slots starting at least 2 hours from now, over the next `days` days. Days with none left are skipped. */
export function bookingDays(now: Date, days = 7): BookingDay[] {
  const earliest = now.getTime() + 2 * 3_600_000;
  const out: BookingDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slots = SLOTS.map((s) => ({ at: new Date(day.getFullYear(), day.getMonth(), day.getDate(), s.hour), label: s.label }))
      .filter((s) => s.at.getTime() >= earliest)
      .map((s) => ({ start: s.at.toISOString(), label: s.label }));
    if (!slots.length) continue;
    const label =
      i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
    out.push({ key: day.toDateString(), label, slots });
  }
  return out;
}
