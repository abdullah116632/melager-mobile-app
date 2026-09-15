import { APP_VERSION } from "@/constants/app";

/** Served by GET /api/app/version; set through the server's environment. */
export interface AppUpdatePolicy {
  /** Hard update: versions below this cannot use the app until they update. */
  minVersion: string | null;
  /** Normal update: versions below this see a popup they can close. */
  latestVersion: string | null;
  storeUrl: string;
}

type Version = [number, number, number];

const parseVersion = (value: string | null | undefined): Version | null => {
  const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(value?.trim() ?? "");
  return match ? [Number(match[1]), Number(match[2]), Number(match[3])] : null;
};

/** True when this build is older than `target`; false when either is unknown. */
export const isAppOlderThan = (target: string | null | undefined): boolean => {
  const current = parseVersion(APP_VERSION);
  const wanted = parseVersion(target);
  if (!current || !wanted) return false;
  return (
    (current[0] - wanted[0] ||
      current[1] - wanted[1] ||
      current[2] - wanted[2]) < 0
  );
};
