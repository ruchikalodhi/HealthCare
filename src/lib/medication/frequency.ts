/**
 * Parses a free-text prescription frequency (e.g. "twice a day", "every 6 hours")
 * into a structured `timesPerDay` integer that the reminder cron can reason about.
 *
 * This is intentionally conservative: if the text can't be confidently parsed,
 * it falls back to 1 (once daily) rather than guessing something that could
 * over- or under-remind a patient.
 */
export function parseFrequencyToTimesPerDay(frequency: string): number {
  if (!frequency || !frequency.trim()) return 1;

  const text = frequency.toLowerCase().trim();

  // "every N hours" / "every N hrs" / "q6h" style
  const everyNHoursMatch = text.match(/every\s+(\d+)\s*(?:hours?|hrs?)/) || text.match(/q(\d+)h/);
  if (everyNHoursMatch) {
    const hours = parseInt(everyNHoursMatch[1], 10);
    if (hours > 0) {
      return Math.max(1, Math.round(24 / hours));
    }
  }

  // "N times a day" / "N times daily" / "Nx daily" / "N times per day"
  const nTimesMatch = text.match(/(\d+)\s*x?\s*times?\s*(?:a|per)?\s*day/) || text.match(/(\d+)\s*x\s*(?:a|per)?\s*day/);
  if (nTimesMatch) {
    const n = parseInt(nTimesMatch[1], 10);
    if (n > 0) return n;
  }

  // Word-based counts
  if (/\bonce\b/.test(text) || /\bone time\b/.test(text) || /\bdaily\b/.test(text) && !/twice|three|four|times/.test(text)) {
    return 1;
  }
  if (/\btwice\b/.test(text) || /\btwo times\b/.test(text) || /\bbid\b/.test(text)) {
    return 2;
  }
  if (/\bthrice\b/.test(text) || /\bthree times\b/.test(text) || /\btid\b/.test(text)) {
    return 3;
  }
  if (/\bfour times\b/.test(text) || /\bqid\b/.test(text)) {
    return 4;
  }

  // "as needed" / PRN medications: treat as once-daily reminder cadence
  // (we still want a gentle daily reminder, but never more than that)
  if (/as needed|prn/.test(text)) {
    return 1;
  }

  // Default: assume once daily if nothing else matched
  return 1;
}

/**
 * Minimum number of milliseconds that must elapse between reminders for a
 * schedule with the given `timesPerDay`.
 */
export function getReminderIntervalMs(timesPerDay: number): number {
  const safeTimesPerDay = timesPerDay && timesPerDay > 0 ? timesPerDay : 1;
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return ONE_DAY_MS / safeTimesPerDay;
}
