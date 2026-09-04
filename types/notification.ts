export type AppNotification = {
  id: string;
  type:
    | "member_request"
    | "meal_opt_out"
    | "notice"
    | "bazar_assignment"
    | "message"
    | "menu";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  route:
    | "/member-requests"
    | "/meal-status"
    | "/notice-board"
    | "/bazar-list"
    | "/messages";
};
