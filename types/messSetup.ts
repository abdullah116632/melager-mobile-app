export type MessSetupStep = "choose" | "create" | "join";
export type MessSetupMode = Exclude<MessSetupStep, "choose">;
