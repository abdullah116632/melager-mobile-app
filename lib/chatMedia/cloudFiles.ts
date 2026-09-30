import { useSyncExternalStore } from "react";
import {
  createDownloadResumable,
  createUploadTask,
  FileSystemUploadType,
} from "expo-file-system/legacy";
import type { File } from "expo-file-system";

import { api, ApiError, type ApiMessageAttachment } from "@/lib/api";

import { findHeldFile, formatFileSize } from "./mediaFiles";
import { logFileSendStep } from "./sendTiming";

/**
 * Chat files kept in cloud storage for a few days (see
 * backend/controllers/messageFileController.ts). The sender uploads once, so
 * a member can fetch the file while every phone holding it is offline. The
 * phone-to-phone relay stays the fallback: a file the server declines to
 * store, or one whose days are over, still travels between phones.
 *
 * Every file counts against its mess's daily limit; one past it is refused
 * outright, by this phone when it can tell and by the server regardless.
 */

/** Bytes the mess may still send today, or null when that is unknown. */
export const fetchRemainingFileQuota = async (
  token: string,
  messId: number,
): Promise<{ remaining: number; limit: number } | null> => {
  try {
    const quota = await api.getFileQuota(token, messId);
    return {
      remaining: Math.max(0, quota.limitBytes - quota.usedBytes),
      limit: quota.limitBytes,
    };
  } catch {
    // Offline or an older server: the server still enforces the limit.
    return null;
  }
};

export const messFileLimitMessage = (limit: number): string =>
  `This mess has used today's ${formatFileSize(limit)} file limit. Try again tomorrow.`;

/** 413 and 422 mean the server will never accept this file. */
const isFileRefused = (error: unknown): boolean =>
  error instanceof ApiError &&
  error.hasErrorBody &&
  (error.status === 413 || error.status === 422);

/** Leaves time for the request itself, so a link is never used as it lapses. */
const EXPIRY_MARGIN_MS = 60_000;

export const isStoredInCloud = (attachment: ApiMessageAttachment): boolean => {
  if (!attachment.storedUntil) return false;
  const storedUntil = Date.parse(attachment.storedUntil);
  return (
    Number.isFinite(storedUntil) && storedUntil - EXPIRY_MARGIN_MS > Date.now()
  );
};

/** Files already uploaded in this session, so a retried send skips the upload. */
const uploaded = new Set<string>();

// ---- upload progress, shown on the sender's own bubble --------------------

const uploadProgress = new Map<string, number>();
const progressListeners = new Set<() => void>();

const setUploadProgress = (fileId: string, progress: number | null) => {
  if (progress === null) uploadProgress.delete(fileId);
  else uploadProgress.set(fileId, progress);
  progressListeners.forEach((listener) => listener());
};

const subscribeToUploadProgress = (listener: () => void) => {
  progressListeners.add(listener);
  return () => progressListeners.delete(listener);
};

/** 0 to 1 while this phone uploads the file, otherwise null. */
export const useUploadProgress = (fileId: string | null): number | null =>
  useSyncExternalStore(subscribeToUploadProgress, () =>
    fileId === null ? null : (uploadProgress.get(fileId) ?? null),
  );

/**
 * Uploads a file this phone is about to send, when the server allows it, and
 * resolves true once it is in cloud storage; the message then tells the
 * server so. Throws only when the file may not be sent at all (too large, or
 * the mess's daily limit is used up). Any other failure only means the file
 * is shared phone to phone, and the message itself must still go out.
 */
export const uploadAttachmentToCloud = async (
  token: string,
  messId: number,
  attachment: ApiMessageAttachment,
): Promise<boolean> => {
  if (uploaded.has(attachment.id)) return true;
  const held = findHeldFile(attachment.id);
  if (!held) return false;
  try {
    let stepAt = Date.now();
    const grant = await api.requestFileUpload(token, messId, attachment);
    logFileSendStep("server: upload permission", stepAt, grant.storage);
    if (grant.storage !== "cloud") return false;
    stepAt = Date.now();
    setUploadProgress(attachment.id, 0);
    const task = createUploadTask(
      grant.uploadUrl,
      held.uri,
      {
        httpMethod: "PUT",
        uploadType: FileSystemUploadType.BINARY_CONTENT,
        headers: { "Content-Type": attachment.mimeType },
      },
      (event) => {
        if (event.totalBytesExpectedToSend > 0) {
          setUploadProgress(
            attachment.id,
            event.totalBytesSent / event.totalBytesExpectedToSend,
          );
        }
      },
    );
    const result = await task.uploadAsync();
    logFileSendStep(
      "upload to R2",
      stepAt,
      `${Math.round(attachment.size / 1024)} KB, status ${result?.status}`,
    );
    if (result && result.status >= 200 && result.status < 300) {
      uploaded.add(attachment.id);
      return true;
    }
    return false;
  } catch (error) {
    if (isFileRefused(error)) throw error;
    // An older server without this endpoint, no connection, or a failed
    // upload: the relay still delivers the file.
    return false;
  } finally {
    setUploadProgress(attachment.id, null);
  }
};

/**
 * Downloads a stored file into `target`. Resolves false when the cloud copy
 * cannot be had, so the caller asks other members' phones instead.
 */
export const downloadAttachmentFromCloud = async (
  token: string,
  messId: number,
  messageServerId: number,
  target: File,
  onProgress: (progress: number) => void,
): Promise<boolean> => {
  try {
    const { url } = await api.getFileDownloadUrl(
      token,
      messId,
      messageServerId,
    );
    const download = createDownloadResumable(url, target.uri, {}, (event) => {
      if (event.totalBytesExpectedToWrite > 0) {
        onProgress(event.totalBytesWritten / event.totalBytesExpectedToWrite);
      }
    });
    const result = await download.downloadAsync();
    return !!result && result.status >= 200 && result.status < 300;
  } catch {
    return false;
  }
};
