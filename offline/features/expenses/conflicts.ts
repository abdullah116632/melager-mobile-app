import type { DayExpenseItem } from "@/types/mess";

export interface ExpenseConflict {
  yearMonth: string;
  day: number;
  localItems: DayExpenseItem[];
  serverItems: DayExpenseItem[];
}

export const sameExpenseItem = (a: DayExpenseItem, b: DayExpenseItem) =>
  String(a.id) === String(b.id) &&
  String(a.name).trim() === String(b.name).trim() &&
  Number(a.amount) === Number(b.amount);

export const sameExpenseItems = (a: DayExpenseItem[], b: DayExpenseItem[]) =>
  a.length === b.length && a.every((item, index) => sameExpenseItem(item, b[index]!));

/** Every item from both lists; an item on both keeps this device's version. */
export const mergeExpenseItems = (
  serverItems: DayExpenseItem[],
  localItems: DayExpenseItem[],
): DayExpenseItem[] => {
  const localById = new Map(localItems.map((item) => [String(item.id), item]));
  const serverIds = new Set(serverItems.map((item) => String(item.id)));
  return [
    ...serverItems.map((item) => localById.get(String(item.id)) ?? item),
    ...localItems.filter((item) => !serverIds.has(String(item.id))),
  ];
};

type ConflictListener = () => void;

const listeners = new Set<ConflictListener>();

export const subscribeToExpenseConflicts = (
  listener: ConflictListener,
): (() => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

export const emitExpenseConflictsChanged = (): void => {
  for (const listener of listeners) listener();
};
