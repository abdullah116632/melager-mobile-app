/**
 * The day-of-month that is "today" inside `yearMonth`, or null when the month
 * is not the current one.
 *
 * The meal grid asks whether each of its ~600 cells is today. Answering that
 * per cell allocated a `Date` and re-parsed `yearMonth` every time, so callers
 * resolve this once per render and compare day numbers instead.
 */
export const getTodayDayInMonth = (yearMonth: string): number | null => {
  const now = new Date();
  const [year, month] = yearMonth.split("-").map(Number);
  if (now.getFullYear() !== year || now.getMonth() + 1 !== month) return null;
  return now.getDate();
};

// `Number.prototype.toLocaleString` builds a fresh formatter on every call,
// which is a measurable cost across a full month grid. One shared formatter
// produces the same string. Older runtimes without Intl fall back per call.
const mealValueFormatter = (() => {
  try {
    return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 3 });
  } catch {
    return null;
  }
})();

export const formatMealValue = (value: number): string =>
  value > 0
    ? (mealValueFormatter?.format(value) ??
      value.toLocaleString("en-IN", { maximumFractionDigits: 3 }))
    : "-";
