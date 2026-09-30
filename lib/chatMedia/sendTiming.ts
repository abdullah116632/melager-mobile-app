/**
 * TEMPORARY: logs how long each step of sending a chat file takes, in dev
 * builds only, to find where the time goes. Remove once that is settled.
 */
export const logFileSendStep = (
  step: string,
  startedAt: number,
  detail = "",
): void => {
  if (!__DEV__) return;
  const clock = new Date().toISOString().slice(11, 23);
  console.log(
    `[file-send ${clock}] ${step}: ${Date.now() - startedAt} ms${detail ? ` (${detail})` : ""}`,
  );
};
