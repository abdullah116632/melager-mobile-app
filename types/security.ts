export type SecurityModalType =
  | "changePassword"
  | "updateEmail"
  | "transferAdmin"
  | "addCoAdmin"
  | "leaveAdmin"
  | null;

export type SecurityAction =
  | "change_password"
  | "update_email"
  | "add_admin"
  | "add_co_admin"
  | "remove_self_admin";

export type AdminOtpAction = Extract<
  SecurityAction,
  | "change_password"
  | "update_email"
  | "add_admin"
  | "add_co_admin"
  | "remove_self_admin"
>;

export interface PendingAdminOtpFlow {
  action: AdminOtpAction;
  userId: number;
  messId: number;
  consumerId?: number;
  memberName?: string;
  email?: string;
  requestedAt: number;
}

export interface EligibleAdmin {
  id: number;
  name: string;
  userId: number;
  isAdmin?: boolean;
  email?: string | null;
}
