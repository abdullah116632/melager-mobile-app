/**
 * The day-of-month that is "today" inside `yearMonth`, or null when the month
 * is not the current one.
 *
 * Month grids ask this once per row or cell. Answering it per item allocated a
 * `Date` and re-parsed `yearMonth` every time, so callers resolve it once per
 * render and compare day numbers instead.
 */
export const getTodayDayInMonth = (yearMonth: string): number | null => {
  const now = new Date();
  const [year, month] = yearMonth.split("-").map(Number);
  if (now.getFullYear() !== year || now.getMonth() + 1 !== month) return null;
  return now.getDate();
};
