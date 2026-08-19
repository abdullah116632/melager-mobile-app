export const isMealDayToday = (yearMonth: string, day: number): boolean => {
  const now = new Date();
  const [year, month] = yearMonth.split("-").map(Number);
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
};

export const formatMealValue = (value: number): string =>
  value > 0 ? value.toLocaleString("en-IN", { maximumFractionDigits: 3 }) : "-";
