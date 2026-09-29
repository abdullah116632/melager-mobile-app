import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";

import type { PickedFile } from "./mediaFiles";

const MAX_PICK = 10;

/** Photos and videos from the gallery. Photos are re-encoded a little smaller. */
export const pickGalleryMedia = async (): Promise<PickedFile[]> => {
  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ["images", "videos"],
    allowsMultipleSelection: true,
    selectionLimit: MAX_PICK,
    quality: 0.8,
  });
  if (result.canceled) return [];
  return result.assets.map((asset) => ({
    uri: asset.uri,
    name: asset.fileName,
    mimeType: asset.mimeType,
    width: asset.width,
    height: asset.height,
    durationMs: asset.duration,
  }));
};

/** Any file: PDFs, documents, audio, archives, or media from a file manager. */
export const pickDocuments = async (): Promise<PickedFile[]> => {
  const result = await DocumentPicker.getDocumentAsync({
    type: "*/*",
    multiple: true,
    copyToCacheDirectory: true,
  });
  if (result.canceled) return [];
  return result.assets.slice(0, MAX_PICK).map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
  }));
};
