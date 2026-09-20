import { ConsumersContent } from "@/components/consumers/ConsumersContent";

const ConsumersScreen = ({
  returnTo,
  autoOpenAddMember,
}: {
  returnTo?: "dashboard" | "manager";
  autoOpenAddMember?: boolean;
}) => (
  <ConsumersContent returnTo={returnTo} autoOpenAddMember={autoOpenAddMember} />
);

export default ConsumersScreen;
