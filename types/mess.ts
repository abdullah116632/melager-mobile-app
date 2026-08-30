export interface Consumer {
  id: string;
  name: string;
  userId?: number | null;
  email?: string | null;
  mobileNumber?: string | null;
  isAdmin?: boolean | null;
  accountDeletedAt?: string | null;
}

export interface DayExpenseItem {
  id: string;
  name: string;
  amount: number;
}
