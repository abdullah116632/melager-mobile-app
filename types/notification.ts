export type AppNotification = {
  id: string;
  type:
    | "member_request"
    | "member_request_accepted"
    | "meal_opt_out"
    | "notice"
    | "message"
    | "menu"
    | "manager_role_transferred"
    | "manager_role_added";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  route:
    | "/member-requests"
    | "/"
    | "/meal-status"
    | "/notice-board"
    | "/bazar-list"
    | "/messages";
};

/** "You are now a manager": opening one leaves the mess for Mess Hub. */
export const isManagerRoleNotification = (
  type: unknown,
): type is "manager_role_transferred" | "manager_role_added" =>
  type === "manager_role_transferred" || type === "manager_role_added";
