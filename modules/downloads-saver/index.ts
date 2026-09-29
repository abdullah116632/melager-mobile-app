import { requireOptionalNativeModule } from "expo";
import { Platform } from "react-native";

interface DownloadsSaverNative {
  saveToDownloads(
    sourceUri: string,
    fileName: string,
    mimeType: string,
  ): Promise<{ uri: string; name: string }>;
}

// Optional so a build made before this module existed falls back instead of
// crashing on launch.
const native =
  Platform.OS === "android"
    ? requireOptionalNativeModule<DownloadsSaverNative>("DownloadsSaver")
    : null;

/** Android 10+ with this module built in; older phones have no MediaStore Downloads. */
export const canSaveToDownloads =
  native !== null && Number(Platform.Version) >= 29;

/**
 * Copies a local file into the public Downloads folder. Resolves with the
 * saved entry's content URI and the name it got there.
 */
export const saveToDownloads = (
  sourceUri: string,
  fileName: string,
  mimeType: string,
): Promise<{ uri: string; name: string }> => {
  if (!native) {
    return Promise.reject(new Error("Saving to Downloads is not available."));
  }
  return native.saveToDownloads(sourceUri, fileName, mimeType);
};
