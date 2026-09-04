import { ConsumersContent } from "@/components/consumers/ConsumersContent";

const ConsumersScreen = ({
  returnTo,
}: {
  returnTo?: "dashboard" | "manager";
}) => <ConsumersContent returnTo={returnTo} />;

export default ConsumersScreen;
