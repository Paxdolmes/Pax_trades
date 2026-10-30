// The arrival times a customer can pick for a booked job. The pro is due at that
// exact time, with PILOT.lateGraceMinutes of grace before the job goes to the next pro.

const HOURS = [8, 10, 12, 14, 16];

export type BookingDay = { key: string; label: string; slots: { start: string; label: string }[] };

/** "8am", "12pm", "2pm". */
export function clockLabel(at: Date): string {
  const h = at.getHours();
  const m = at.getMinutes();
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}${m ? `:${String(m).padStart(2, '0')}` : ''}${h < 12 ? 'am' : 'pm'}`;
}

function dayLabel(day: Date, now: Date): string {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const diff = Math.round((new Date(day.getFullYear(), day.getMonth(), day.getDate()).getTime() - today.getTime()) / 86_400_000);
  if (diff === 0) return 'Today';
  if (diff === 1) return 'Tomorrow';
  return day.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' });
}

/** Arrival times at least 2 hours from now, over the next `days` days. Days with none left are skipped. */
export function bookingDays(now: Date, days = 7): BookingDay[] {
  const earliest = now.getTime() + 2 * 3_600_000;
  const out: BookingDay[] = [];
  for (let i = 0; i < days; i++) {
    const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i);
    const slots = HOURS.map((hour) => new Date(day.getFullYear(), day.getMonth(), day.getDate(), hour))
      .filter((at) => at.getTime() >= earliest)
      .map((at) => ({ start: at.toISOString(), label: clockLabel(at) }));
    if (!slots.length) continue;
    out.push({ key: day.toDateString(), label: dayLabel(day, now), slots });
  }
  return out;
}

/** When a booked pro arrives, e.g. "Tomorrow at 2pm" or "Sun 1 Nov at 10am". */
export function arrivalLabel(start: string | Date, now = new Date()): string {
  const at = new Date(start);
  return `${dayLabel(at, now)} at ${clockLabel(at)}`;
}

/** The same inside a sentence: "tomorrow at 2pm" or "Sun 1 Nov at 10am". */
export function arrivalPhrase(start: string | Date, now = new Date()): string {
  return arrivalLabel(start, now).replace(/^(Today|Tomorrow)/, (day) => day.toLowerCase());
}
