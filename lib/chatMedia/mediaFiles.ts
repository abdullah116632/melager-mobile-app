import * as Crypto from "expo-crypto";
import { Directory, File, Paths } from "expo-file-system";
import { Platform } from "react-native";

import type { ApiMessageAttachment, MessageAttachmentKind } from "@/lib/api";

/** Must match MAX_ATTACHMENT_BYTES on the server. */
export const MAX_ATTACHMENT_BYTES = 50 * 1024 * 1024;

/** File sharing needs the native file system, so the web build leaves it out. */
export const isChatMediaSupported = Platform.OS !== "web";

const MEDIA_ROOT = "chat-media";
const PART_SUFFIX = ".part";

/**
 * Every shared file lives in its own folder named after the attachment id, so
 * it can be found from the id alone and keeps its original name for opening
 * and sharing.
 */
export const mediaDirectory = (fileId: string): Directory =>
  new Directory(Paths.document, MEDIA_ROOT, fileId);

export const safeFileName = (name: string): string =>
  name
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, "_")
    .trim()
    .slice(0, 120) || "file";

const ensureDirectory = (directory: Directory): void => {
  if (!directory.exists) {
    directory.create({ intermediates: true, idempotent: true });
  }
};

export const mediaFileFor = (attachment: ApiMessageAttachment): File =>
  new File(mediaDirectory(attachment.id), safeFileName(attachment.name));

/** Where a download is written until it has been verified. */
export const partialFileFor = (attachment: ApiMessageAttachment): File =>
  new File(
    mediaDirectory(attachment.id),
    `${safeFileName(attachment.name)}${PART_SUFFIX}`,
  );

/** The finished copy of a file on this phone, if there is one. */
export const findHeldFile = (fileId: string): File | null => {
  if (!isChatMediaSupported) return null;
  try {
    const directory = mediaDirectory(fileId);
    if (!directory.exists) return null;
    const held = directory
      .list()
      .find(
        (entry): entry is File =>
          entry instanceof File && !entry.name.endsWith(PART_SUFFIX),
      );
    return held ?? null;
  } catch {
    return null;
  }
};

export const deleteHeldFile = (fileId: string): void => {
  try {
    const directory = mediaDirectory(fileId);
    if (directory.exists) directory.delete();
  } catch {
    // Already gone, which is the goal.
  }
};

export const prepareDownloadTarget = (
  attachment: ApiMessageAttachment,
): File => {
  ensureDirectory(mediaDirectory(attachment.id));
  const partial = partialFileFor(attachment);
  if (partial.exists) partial.delete();
  partial.create();
  return partial;
};

export const kindForMimeType = (mimeType: string): MessageAttachmentKind => {
  if (mimeType.startsWith("image/")) return "image";
  if (mimeType.startsWith("video/")) return "video";
  if (mimeType.startsWith("audio/")) return "audio";
  return "file";
};

const KIND_LABELS: Record<MessageAttachmentKind, string> = {
  image: "Photo",
  video: "Video",
  audio: "Audio",
  file: "File",
};

/**
 * The body the server gives a file sent without a caption (see
 * attachmentFallbackBody on the server). A bubble hides it, since the file
 * card already says the same thing.
 */
export const attachmentFallbackBody = (
  attachment: ApiMessageAttachment,
): string => `📎 ${KIND_LABELS[attachment.kind]} · ${attachment.name}`;

export const formatFileSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const toHex = (buffer: ArrayBuffer): string =>
  Array.from(new Uint8Array(buffer), (byte) =>
    byte.toString(16).padStart(2, "0"),
  ).join("");

export const sha256OfFile = async (file: File): Promise<string> =>
  toHex(
    await Crypto.digest(
      Crypto.CryptoDigestAlgorithm.SHA256,
      await file.bytes(),
    ),
  );

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  const step = 0x2000;
  for (let index = 0; index < bytes.length; index += step) {
    binary += String.fromCharCode(
      ...(bytes.subarray(index, index + step) as unknown as number[]),
    );
  }
  return btoa(binary);
};

export const base64ToBytes = (value: string): Uint8Array => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

export interface PickedFile {
  uri: string;
  name?: string | null;
  mimeType?: string | null;
  width?: number | null;
  height?: number | null;
  durationMs?: number | null;
}

/**
 * Copies a picked file into chat storage and describes it for the server.
 * The copy is what this phone serves to the others, so it has to outlive the
 * picker's temporary cache.
 */
export const importPickedFile = async (
  picked: PickedFile,
): Promise<ApiMessageAttachment> => {
  const source = new File(picked.uri);
  const size = source.size;
  if (!size) throw new Error("The selected file is empty.");
  if (size > MAX_ATTACHMENT_BYTES) {
    throw new Error(
      `Files larger than ${formatFileSize(MAX_ATTACHMENT_BYTES)} cannot be sent.`,
    );
  }
  const id = Crypto.randomUUID().toLowerCase();
  const mimeType = picked.mimeType || source.type || "application/octet-stream";
  const name = safeFileName(picked.name || source.name || "file");
  const attachment: Omit<ApiMessageAttachment, "sha256"> = {
    id,
    kind: kindForMimeType(mimeType),
    name,
    mimeType,
    size,
    width: picked.width || null,
    height: picked.height || null,
    durationMs: picked.durationMs ? Math.round(picked.durationMs) : null,
  };
  const directory = mediaDirectory(id);
  ensureDirectory(directory);
  const target = new File(directory, name);
  try {
    source.copy(target);
    const sha256 = await sha256OfFile(target);
    return { ...attachment, sha256 };
  } catch (error) {
    deleteHeldFile(id);
    throw error;
  }
};
