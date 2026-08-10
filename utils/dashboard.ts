import type {
  DashboardAccounting,
  DashboardConsumer,
  DashboardDateRange,
  MonthData,
} from "@/types/dashboard";

export const localDateString = (date: Date): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getCurrentDate = (): string => localDateString(new Date());

export const addDashboardDays = (dateString: string, days: number): string => {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(year!, month! - 1, day!);
  date.setDate(date.getDate() + days);
  return localDateString(date);
};

export const formatDashboardDateLabel = (
  dateString: string,
  today: string,
): string => {
  if (dateString === today) return "Today";
  const date = new Date(`${dateString}T00:00:00`);
  const difference = Math.round(
    (date.getTime() - new Date(`${today}T00:00:00`).getTime()) / 86_400_000,
  );
  if (difference === 1) return "Tomorrow";
  if (difference === -1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
};

export const formatDashboardFullDate = (dateString: string): string => {
  try {
    return new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } catch {
    return dateString;
  }
};

export const formatDashboardShortDate = (dateString: string): string =>
  new Date(`${dateString}T00:00:00`).toLocaleDateString("en-US", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export const formatDashboardAmount = (amount: number): string => {
  if (amount === 0) return "0";
  return amount.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  });
};

export const formatDashboardRate = (rate: number): string => {
  if (rate === 0) return "—";
  return rate.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

export const getDashboardMonthRange = (
  startDate: string,
  endDate: string,
): string[] => {
  const [startYear, startMonth] = startDate.slice(0, 7).split("-").map(Number);
  const [endYear, endMonth] = endDate.slice(0, 7).split("-").map(Number);
  const months: string[] = [];
  let year = startYear!;
  let month = startMonth!;

  while (year < endYear! || (year === endYear && month <= endMonth!)) {
    months.push(`${year}-${String(month).padStart(2, "0")}`);
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
  return months;
};

export const getDefaultDashboardRange = (
  yearMonth: string,
): DashboardDateRange => {
  const [year, month] = yearMonth.split("-").map(Number);
  const lastDay = new Date(year!, month!, 0).getDate();
  return {
    startDate: `${yearMonth}-01`,
    endDate: `${yearMonth}-${String(lastDay).padStart(2, "0")}`,
  };
};

const getMonthBounds = (yearMonth: string, range: DashboardDateRange) => {
  const [year, month] = yearMonth.split("-").map(Number);
  return {
    firstDay:
      yearMonth === range.startDate.slice(0, 7)
        ? Number(range.startDate.slice(8, 10))
        : 1,
    lastDay:
      yearMonth === range.endDate.slice(0, 7)
        ? Number(range.endDate.slice(8, 10))
        : new Date(year!, month!, 0).getDate(),
  };
};

interface CalculateDashboardAccountingOptions {
  consumers: DashboardConsumer[];
  currentYearMonth: string;
  appliedRange: DashboardDateRange | null;
  rangeData: Record<string, MonthData>;
  getGrandTotal: (yearMonth: string) => number;
  getMonthExpenseTotal: (yearMonth: string) => number;
  getGrandDepositTotal: (yearMonth: string) => number;
  getConsumerTotal: (yearMonth: string, consumerId: string) => number;
  getConsumerDepositTotal: (yearMonth: string, consumerId: string) => number;
}

export const calculateDashboardAccounting = ({
  consumers,
  currentYearMonth,
  appliedRange,
  rangeData,
  getGrandTotal,
  getMonthExpenseTotal,
  getGrandDepositTotal,
  getConsumerTotal,
  getConsumerDepositTotal,
}: CalculateDashboardAccountingOptions): DashboardAccounting => {
  const activeMonths = appliedRange
    ? getDashboardMonthRange(appliedRange.startDate, appliedRange.endDate)
    : [currentYearMonth];
  const includesDay = (yearMonth: string, day: number) => {
    if (!appliedRange) return true;
    const { firstDay, lastDay } = getMonthBounds(yearMonth, appliedRange);
    return day >= firstDay && day <= lastDay;
  };

  const sumMeals = (yearMonth: string) => {
    if (!appliedRange && yearMonth === currentYearMonth) {
      return getGrandTotal(yearMonth);
    }
    const data = rangeData[yearMonth];
    if (!data) return 0;
    return consumers.reduce((total, consumer) => {
      const days = data.meals[consumer.id] ?? {};
      return (
        total +
        Object.entries(days).reduce(
          (sum, [day, count]) =>
            sum + (includesDay(yearMonth, Number(day)) ? count : 0),
          0,
        )
      );
    }, 0);
  };

  const sumExpenses = (yearMonth: string) => {
    if (!appliedRange && yearMonth === currentYearMonth) {
      return getMonthExpenseTotal(yearMonth);
    }
    const data = rangeData[yearMonth];
    if (!data) return 0;
    return Object.entries(data.expenses).reduce((total, [day, expense]) => {
      if (!includesDay(yearMonth, Number(day))) return total;
      return total + expense.items.reduce((sum, item) => sum + item.amount, 0);
    }, 0);
  };

  const sumDeposits = (yearMonth: string) => {
    if (!appliedRange && yearMonth === currentYearMonth) {
      return getGrandDepositTotal(yearMonth);
    }
    const data = rangeData[yearMonth];
    if (!data) return 0;
    return consumers.reduce((total, consumer) => {
      const days = data.deposits[consumer.id] ?? {};
      return (
        total +
        Object.entries(days).reduce(
          (sum, [day, amount]) =>
            sum + (includesDay(yearMonth, Number(day)) ? amount : 0),
          0,
        )
      );
    }, 0);
  };

  const sumConsumerMeals = (yearMonth: string, consumerId: string) => {
    if (!appliedRange && yearMonth === currentYearMonth) {
      return getConsumerTotal(yearMonth, consumerId);
    }
    return Object.entries(rangeData[yearMonth]?.meals[consumerId] ?? {}).reduce(
      (sum, [day, count]) =>
        sum + (includesDay(yearMonth, Number(day)) ? count : 0),
      0,
    );
  };

  const sumConsumerDeposits = (yearMonth: string, consumerId: string) => {
    if (!appliedRange && yearMonth === currentYearMonth) {
      return getConsumerDepositTotal(yearMonth, consumerId);
    }
    return Object.entries(
      rangeData[yearMonth]?.deposits[consumerId] ?? {},
    ).reduce(
      (sum, [day, amount]) =>
        sum + (includesDay(yearMonth, Number(day)) ? amount : 0),
      0,
    );
  };

  const totalMeals = activeMonths.reduce(
    (sum, yearMonth) => sum + sumMeals(yearMonth),
    0,
  );
  const totalExpenses = activeMonths.reduce(
    (sum, yearMonth) => sum + sumExpenses(yearMonth),
    0,
  );
  const totalDeposits = activeMonths.reduce(
    (sum, yearMonth) => sum + sumDeposits(yearMonth),
    0,
  );
  const mealRate = totalMeals > 0 ? totalExpenses / totalMeals : 0;
  const consumerRows = consumers.map((consumer) => {
    const meals = activeMonths.reduce(
      (sum, yearMonth) => sum + sumConsumerMeals(yearMonth, consumer.id),
      0,
    );
    const deposits = activeMonths.reduce(
      (sum, yearMonth) => sum + sumConsumerDeposits(yearMonth, consumer.id),
      0,
    );
    const cost = meals * mealRate;
    return {
      ...consumer,
      meals,
      cost,
      deposits,
      balance: deposits - cost,
    };
  });

  return {
    totalMeals,
    totalExpenses,
    totalDeposits,
    mealRate,
    netBalance: totalDeposits - totalExpenses,
    consumerRows,
  };
};
