export type SecurityModalType =
  | "transferAdmin"
  | "addCoAdmin"
  | "leaveAdmin"
  | "deleteMess"
  | "viewAdmins"
  | null;

export type ProfileSecurityModalType = "changePassword" | "updateEmail" | null;

export type SecurityAction =
  "update_email" | "add_admin" | "add_co_admin" | "remove_self_admin";

export type AdminOtpAction = Extract<
  SecurityAction,
  "update_email" | "add_admin" | "add_co_admin" | "remove_self_admin"
>;

export interface PendingAdminOtpFlow {
  action: AdminOtpAction;
  userId: number;
  messId: number;
  consumerId?: number;
  memberName?: string;
  email?: string;
  /**
   * Which mailbox holds the code for an email change. Absent means the v1
   * flow, which sent it to the address on the account; a flow saved before an
   * app update can still be in that state.
   */
  otpTarget?: "current_email" | "new_email";
  requestedAt: number;
}

export interface EligibleAdmin {
  id: number;
  name: string;
  userId: number;
  isAdmin?: boolean;
  email?: string | null;
}

export interface MessAdmin {
  id: number;
  name: string;
  userId: number | null;
  email?: string | null;
  isPrimaryAdmin: boolean;
}
