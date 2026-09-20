import { getDhakaDate } from "@/utils/dashboard";

export type ManagerTrendMetric = "rate" | "expenses" | "deposits" | "meals";

export interface TrendPoint {
  day: number;
  value: number;
}

export interface ManagerTrendSeries {
  points: TrendPoint[];
  /** Value on the last plotted day. */
  current: number;
  /** How far the value moved from the day before. */
  change: number;
  max: number;
  min: number;
}

export type ManagerTrends = Record<ManagerTrendMetric, ManagerTrendSeries>;

/** `meals[consumerId][day]` for one month, as the meals slice stores it. */
export type MealMonth = Record<string, Record<string, number>>;
/** `expenses[day]` for one month, as the expense slice stores it. */
export type ExpenseMonth = Record<string, { items?: { amount: number }[] }>;
/** `deposits[consumerId][day]` for one month, as the deposits slice stores it. */
export type DepositMonth = Record<string, Record<string, number>>;

const EMPTY_SERIES: ManagerTrendSeries = {
  points: [],
  current: 0,
  change: 0,
  max: 0,
  min: 0,
};

const EMPTY_TRENDS: ManagerTrends = {
  rate: EMPTY_SERIES,
  expenses: EMPTY_SERIES,
  deposits: EMPTY_SERIES,
  meals: EMPTY_SERIES,
};

/**
 * Every figure that reaches the chart passes through here.
 *
 * A single NaN or Infinity in a series becomes a NaN coordinate, and an SVG
 * path with a NaN in it fails at the native layer rather than in JavaScript,
 * which is far harder to trace back. Treating a broken figure as 0 keeps the
 * chart drawable.
 */
const finite = (value: number): number => (Number.isFinite(value) ? value : 0);

/**
 * @param summaryIndex Which point the headline figure and its arrow describe.
 *   A daily series runs to the end of the month so the whole month can be
 *   drawn, but the figure worth naming is today's, not the empty 31st.
 */
const toSeries = (
  points: TrendPoint[],
  summaryIndex: number,
): ManagerTrendSeries => {
  if (points.length === 0) return EMPTY_SERIES;

  const values = points.map((point) => point.value);
  const index = Math.min(Math.max(summaryIndex, 0), values.length - 1);
  const current = values[index]!;

  // Yesterday is not always a useful comparison. On a day with nothing recorded
  // the running rate repeats the previous figure exactly, which would read as
  // "no movement" while the rate is in fact still falling. Comparing against
  // the last day the figure actually differed keeps the direction meaningful;
  // only a genuinely flat series ends up with no direction at all.
  let previous = current;
  for (let step = index - 1; step >= 0; step -= 1) {
    if (values[step] !== current) {
      previous = values[step]!;
      break;
    }
  }

  return {
    points,
    current,
    change: current - previous,
    max: Math.max(...values),
    min: Math.min(...values),
  };
};

/** The day-of-month that is "today" in `yearMonth`, on the mess's calendar. */
const getDhakaDayInMonth = (yearMonth: string): number | null => {
  const today = getDhakaDate();
  if (today.slice(0, 7) !== yearMonth) return null;
  const day = Number(today.slice(8, 10));
  return Number.isInteger(day) ? day : null;
};

const highestDayKey = (days: Record<string, unknown> | undefined): number => {
  let highest = 0;
  for (const key of Object.keys(days ?? {})) {
    const day = Number(key);
    if (Number.isInteger(day) && day > highest) highest = day;
  }
  return highest;
};

/** Highest recorded day across a per-consumer month. */
const highestNestedDayKey = (
  month: Record<string, Record<string, unknown>> | undefined,
): number => {
  let highest = 0;
  for (const days of Object.values(month ?? {})) {
    const day = highestDayKey(days);
    if (day > highest) highest = day;
  }
  return highest;
};

/** Sums one day across every consumer the month holds. */
const sumDayAcrossConsumers = (
  month: Record<string, Record<string, number>> | undefined,
  dayKey: string,
): number => {
  let total = 0;
  for (const days of Object.values(month ?? {})) {
    total += finite(days[dayKey] ?? 0);
  }
  return finite(total);
};

interface BuildManagerTrendsOptions {
  yearMonth: string;
  daysInMonth: number;
  /**
   * The month's own slices of raw state, not accessors that read them.
   *
   * The hooks hand out cached getters whose identity is refreshed on their own
   * schedule, so a caller that memoises on the raw slices but reads through the
   * getters can show one figure updating while another stays stale.
   */
  meals: MealMonth | undefined;
  expenses: ExpenseMonth | undefined;
  deposits: DepositMonth | undefined;
}

/**
 * The day-by-day figures behind the manager summary.
 *
 * Expenses, deposits and meals are each day's own total — what was spent,
 * collected and eaten on the 1st, the 2nd, and so on — so the line rises and
 * falls with the month.
 *
 * The rate is the exception: it is the rate charged *up to* each day, not the
 * day's own expense divided by its own meals. Bazar happens a few times a week,
 * so a per-day rate would be zero on most days and spike on the rest, showing
 * nothing about whether the month is getting cheaper or dearer.
 *
 * Meals and deposits are summed across every consumer the month holds, not just
 * the current member list, because that is how the totals beside the chart are
 * counted. Filtering here would leave a mess that has removed a member showing
 * one meal rate in the chart and a different one in the box above it.
 *
 * The three daily series cover the whole month, because entries can be made on
 * a date that has not arrived yet and cutting the month at today would hide
 * them. The rate stops at today instead: it divides by meals, and meals are
 * often filled in ahead of the bazar that pays for them, so carrying it into
 * those days would drag the line down for a shortfall that is not real.
 */
export const buildManagerTrends = ({
  yearMonth,
  daysInMonth,
  meals,
  expenses,
  deposits,
}: BuildManagerTrendsOptions): ManagerTrends => {
  if (!yearMonth || daysInMonth <= 0) return EMPTY_TRENDS;

  // The mess keeps its books on Dhaka time, so "today" follows that calendar
  // rather than whatever the device clock says.
  const todayDay = getDhakaDayInMonth(yearMonth);
  const summaryDay = Math.min(todayDay ?? daysInMonth, daysInMonth);
  // Only a recorded expense extends the rate line past today. Meals booked for
  // a future day would otherwise grow the divisor with no bazar behind it and
  // send the line diving for a shortfall that has not happened.
  const rateLastDay = Math.min(
    daysInMonth,
    Math.max(summaryDay, highestDayKey(expenses)),
  );

  const ratePoints: TrendPoint[] = [];
  const expensePoints: TrendPoint[] = [];
  const depositPoints: TrendPoint[] = [];
  const mealPoints: TrendPoint[] = [];

  let mealsSoFar = 0;
  let expenseSoFar = 0;

  for (let day = 1; day <= daysInMonth; day += 1) {
    const key = day.toString();
    const dayMeals = sumDayAcrossConsumers(meals, key);
    const dayDeposit = sumDayAcrossConsumers(deposits, key);
    const dayExpense = finite(
      (expenses?.[key]?.items ?? []).reduce(
        (sum, item) => sum + finite(item.amount),
        0,
      ),
    );

    expensePoints.push({ day, value: dayExpense });
    depositPoints.push({ day, value: dayDeposit });
    mealPoints.push({ day, value: dayMeals });

    if (day <= rateLastDay) {
      mealsSoFar += dayMeals;
      expenseSoFar += dayExpense;
      ratePoints.push({
        day,
        value: mealsSoFar > 0 ? finite(expenseSoFar / mealsSoFar) : 0,
      });
    }
  }

  // Before the first meal the running rate is a meaningless zero that would
  // drag the line down, so the rate line starts where the month really starts.
  const firstRatedIndex = ratePoints.findIndex((point) => point.value > 0);
  const ratePlotted =
    firstRatedIndex === -1 ? [] : ratePoints.slice(firstRatedIndex);
  const dailySummaryIndex = summaryDay - 1;

  return {
    rate: toSeries(ratePlotted, ratePlotted.length - 1),
    expenses: toSeries(expensePoints, dailySummaryIndex),
    deposits: toSeries(depositPoints, dailySummaryIndex),
    meals: toSeries(mealPoints, dailySummaryIndex),
  };
};
