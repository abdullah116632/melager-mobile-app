import type { ExpenseDraftItem, ExpenseItem } from "@/types/expense";

// `Number.prototype.toLocaleString` builds a fresh formatter on every call,
// which the expense table pays for once per row plus the month total. Two
// shared formatters produce the same strings; runtimes without Intl fall back
// to the per-call form.
const buildFormatter = (options?: Intl.NumberFormatOptions) => {
  try {
    return new Intl.NumberFormat("en-IN", options);
  } catch {
    return null;
  }
};

const integerFormatter = buildFormatter();
const decimalFormatter = buildFormatter({
  minimumFractionDigits: 0,
  maximumFractionDigits: 3,
});

export const formatExpenseAmount = (amount: number): string => {
  if (amount <= 0) return "";
  if (Number.isInteger(amount)) {
    return integerFormatter?.format(amount) ?? amount.toLocaleString("en-IN");
  }
  return (
    decimalFormatter?.format(amount) ??
    amount.toLocaleString("en-IN", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    })
  );
};

export const createExpenseDraftItem = (): ExpenseDraftItem => ({
  id: `${Date.now()}${Math.random().toString(36).slice(2, 6)}`,
  name: "",
  amountString: "",
});

export const toExpenseDraftItems = (items: ExpenseItem[]): ExpenseDraftItem[] =>
  items.map((item) => ({
    id: item.id,
    name: item.name,
    amountString: item.amount > 0 ? item.amount.toString() : "",
  }));

export const toExpenseItems = (drafts: ExpenseDraftItem[]): ExpenseItem[] =>
  drafts
    .map((draft, index) => ({
      id: draft.id,
      name: draft.name.trim() || `Item ${index + 1}`,
      amount: parseFloat(draft.amountString) || 0,
      hasContent:
        Boolean(draft.name.trim()) || parseFloat(draft.amountString) > 0,
    }))
    .filter((item) => item.hasContent)
    .map(({ hasContent: _hasContent, ...item }) => item);

export const getExpenseDraftTotal = (drafts: ExpenseDraftItem[]): number =>
  drafts.reduce(
    (total, draft) => total + (parseFloat(draft.amountString) || 0),
    0,
  );
