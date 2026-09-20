import { DECIMAL_FORMAT_OPTIONS } from "@/utils/number";

// `Number.prototype.toLocaleString` builds a fresh formatter on every call,
// which is a measurable cost across a full month grid. One shared formatter
// produces the same string. Older runtimes without Intl fall back per call.
const mealValueFormatter = (() => {
  try {
    return new Intl.NumberFormat("en-IN", DECIMAL_FORMAT_OPTIONS);
  } catch {
    return null;
  }
})();

export const formatMealValue = (value: number): string =>
  value > 0
    ? (mealValueFormatter?.format(value) ??
      value.toLocaleString("en-IN", DECIMAL_FORMAT_OPTIONS))
    : "-";
