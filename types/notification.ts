export type AppNotification = {
  id: string;
  type: "member_request" | "meal_opt_out";
  title: string;
  body: string;
  timestamp: number;
  read: boolean;
  route: "/member-requests" | "/meal-status";
};
