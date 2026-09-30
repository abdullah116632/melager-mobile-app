import * as DocumentPicker from "expo-document-picker";
import { File } from "expo-file-system";
import { ImageManipulator, SaveFormat } from "expo-image-manipulator";
import * as ImagePicker from "expo-image-picker";
import { Image } from "react-native";

import { withoutForegroundRefresh } from "@/offline/runtime/foregroundRefresh";

import type { PickedFile } from "./mediaFiles";

const MAX_PICK = 10;
/** Longest side of a photo sent from the gallery, as chat apps do. */
const MAX_PHOTO_EDGE = 1600;
const PHOTO_QUALITY = 0.7;

const imageSize = (uri: string) =>
  new Promise<{ width: number; height: number }>((resolve, reject) =>
    Image.getSize(uri, (width, height) => resolve({ width, height }), reject),
  );

const jpegName = (name: string | null | undefined) =>
  name ? `${name.replace(/\.[^.]+$/, "")}.jpg` : name;

/**
 * Scales a gallery photo down to MAX_PHOTO_EDGE and re-encodes it as JPEG,
 * which turns a 3-5 MB camera photo into a few hundred KB: it uploads many
 * times faster and leaves room under the mess's daily file limit. Anything
 * else, an animated GIF, or a photo that would not get smaller, is sent as
 * it is.
 */
export const shrinkPhoto = async (file: PickedFile): Promise<PickedFile> => {
  if (!file.mimeType?.startsWith("image/") || file.mimeType === "image/gif") {
    return file;
  }
  try {
    const { width, height } =
      file.width && file.height
        ? { width: file.width, height: file.height }
        : await imageSize(file.uri);
    const context = ImageManipulator.manipulate(file.uri);
    if (Math.max(width, height) > MAX_PHOTO_EDGE) {
      context.resize(
        width >= height
          ? { width: MAX_PHOTO_EDGE }
          : { height: MAX_PHOTO_EDGE },
      );
    }
    const image = await context.renderAsync();
    const result = await image.saveAsync({
      compress: PHOTO_QUALITY,
      format: SaveFormat.JPEG,
    });
    const shrunk = new File(result.uri);
    if (!shrunk.size || shrunk.size >= new File(file.uri).size) {
      shrunk.delete();
      return file;
    }
    return {
      ...file,
      uri: result.uri,
      name: jpegName(file.name),
      mimeType: "image/jpeg",
      width: result.width,
      height: result.height,
    };
  } catch {
    // The original still goes out; the size limit decides whether it may.
    return file;
  }
};

/** Photos and videos from the gallery. Photos are re-encoded a little smaller. */
export const pickGalleryMedia = async (): Promise<PickedFile[]> => {
  const result = await withoutForegroundRefresh(() =>
    ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_PICK,
      quality: 0.8,
    }),
  );
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
  const result = await withoutForegroundRefresh(() =>
    DocumentPicker.getDocumentAsync({
      type: "*/*",
      multiple: true,
      copyToCacheDirectory: true,
    }),
  );
  if (result.canceled) return [];
  return result.assets.slice(0, MAX_PICK).map((asset) => ({
    uri: asset.uri,
    name: asset.name,
    mimeType: asset.mimeType,
  }));
};
