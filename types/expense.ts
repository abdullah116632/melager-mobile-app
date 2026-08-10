export interface ExpenseItem {
  id: string;
  name: string;
  amount: number;
}

export interface ExpenseDraftItem {
  id: string;
  name: string;
  amountString: string;
}

export interface DayExpenseSummary {
  items: ExpenseItem[];
  total: number;
}
