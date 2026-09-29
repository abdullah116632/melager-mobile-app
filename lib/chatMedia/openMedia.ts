import { File } from "expo-file-system";
import * as IntentLauncher from "expo-intent-launcher";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { ApiMessageAttachment } from "@/lib/api";

// Intent.FLAG_GRANT_READ_URI_PERMISSION: the viewer app may read the file.
const GRANT_READ_URI_PERMISSION = 1;

/** Offers the file to other apps, which is also how a member saves it. */
export const shareMediaFile = async (
  uri: string,
  attachment: ApiMessageAttachment,
): Promise<void> => {
  if (!(await Sharing.isAvailableAsync())) {
    throw new Error("Sharing is not available on this device.");
  }
  await Sharing.shareAsync(uri, {
    mimeType: attachment.mimeType,
    dialogTitle: attachment.name,
  });
};

/**
 * Opens the file in whichever app handles its type. Android hands it to a
 * viewer directly; iOS has no such intent, so it goes through the share
 * sheet, which previews the file too.
 */
export const openMediaFile = async (
  uri: string,
  attachment: ApiMessageAttachment,
): Promise<void> => {
  if (Platform.OS === "android") {
    try {
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: new File(uri).contentUri,
        flags: GRANT_READ_URI_PERMISSION,
        type: attachment.mimeType,
      });
      return;
    } catch {
      // No app for this type; the share sheet still lets the member pick one.
    }
  }
  await shareMediaFile(uri, attachment);
};
