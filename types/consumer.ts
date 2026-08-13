export type Consumer = {
  id: number;
  name: string;
  userId?: number | null;
  email?: string | null;
  mobileNumber?: string | null;
  isAdmin?: boolean | null;
  accountDeletedAt?: string | null;
};
