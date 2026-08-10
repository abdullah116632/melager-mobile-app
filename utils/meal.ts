export const isMealDayToday = (yearMonth: string, day: number): boolean => {
  const now = new Date();
  const [year, month] = yearMonth.split("-").map(Number);
  return (
    now.getFullYear() === year &&
    now.getMonth() + 1 === month &&
    now.getDate() === day
  );
};
