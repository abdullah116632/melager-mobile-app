import { useSyncExternalStore } from "react";
import type { Socket } from "socket.io-client";
import type { File, FileHandle } from "expo-file-system";

import type { ApiMessage, ApiMessageAttachment } from "@/lib/api";
import {
  getRealtimeAuthToken,
  subscribeToRealtimeSocket,
} from "@/lib/realtime";
import { getOfflineDatabase } from "@/offline/database/connection";
import { MessageMediaRepository } from "@/offline/features/messages/MessageMediaRepository";
import { MessageRepository } from "@/offline/features/messages/MessageRepository";
import { subscribeToStoredAttachmentMessages } from "@/offline/features/messages/messageAttachmentEvents";

import {
  base64ToBytes,
  bytesToBase64,
  deleteHeldFile,
  findHeldFile,
  isChatMediaSupported,
  mediaFileFor,
  prepareDownloadTarget,
  sha256OfFile,
} from "./mediaFiles";
import { downloadAttachmentFromCloud, isStoredInCloud } from "./cloudFiles";

/**
 * Moves chat files between members' phones through the server's socket relay
 * (see backend/realtime/mediaRelay.ts). This phone plays both parts: it
 * downloads every file shared in the mess, one at a time, and streams any file
 * it holds to whoever asks for it. A file still kept in cloud storage is
 * fetched from there first (see cloudFiles.ts), and from phones only when
 * that fails.
 */

export type MediaStatus =
  | { kind: "available"; uri: string }
  /** Removed from this phone, by the user or otherwise. */
  | { kind: "deleted" }
  | { kind: "idle" }
  | { kind: "queued" }
  | { kind: "searching" }
  | { kind: "downloading"; progress: number }
  /** Nobody who has the file is online right now. */
  | { kind: "waiting" }
  | { kind: "failed" };

const CHUNK_BYTES = 256 * 1024;
const SEND_WINDOW = 3;
const REQUEST_TIMEOUT_MS = 10_000;
const CHUNK_ACK_TIMEOUT_MS = 45_000;
const MAX_UPLOADS = 2;
const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 3_000;
const CATCH_UP_LIMIT = 40;
const MAX_CLOUD_DOWNLOADS = 3;

interface Job {
  messageServerId: number;
  attachment: ApiMessageAttachment;
  attempts: number;
  /** The cloud copy already failed once, so only phones are asked. */
  skipCloud?: boolean;
}

interface ActiveDownload extends Job {
  transferId: string | null;
  target: File | null;
  handle: FileHandle | null;
  nextSeq: number;
  received: number;
}

// ---- status store ------------------------------------------------------

const transient = new Map<string, MediaStatus>();
const statusCache = new Map<string, MediaStatus>();
const listeners = new Set<() => void>();
let storedStates = new Map<string, "available" | "deleted">();

const notify = (fileId?: string) => {
  if (fileId) statusCache.delete(fileId);
  else statusCache.clear();
  listeners.forEach((listener) => listener());
};

const setTransient = (fileId: string, status: MediaStatus | null) => {
  if (status) transient.set(fileId, status);
  else transient.delete(fileId);
  notify(fileId);
};

const computeStatus = (fileId: string): MediaStatus => {
  const pending = transient.get(fileId);
  if (pending) return pending;
  const held = findHeldFile(fileId);
  if (held) return { kind: "available", uri: held.uri };
  // A file this phone once kept but no longer finds is gone for good, the
  // same as one the user removed: it is not fetched again on its own.
  if (storedStates.has(fileId)) return { kind: "deleted" };
  return { kind: "idle" };
};

export const getMediaStatus = (fileId: string): MediaStatus => {
  let status = statusCache.get(fileId);
  if (!status) {
    status = computeStatus(fileId);
    statusCache.set(fileId, status);
  }
  return status;
};

const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => listeners.delete(listener);
};

/** Live status of one shared file on this phone. */
export const useMediaStatus = (fileId: string | null): MediaStatus | null =>
  useSyncExternalStore(subscribe, () =>
    fileId ? getMediaStatus(fileId) : null,
  );

// ---- repositories --------------------------------------------------------

let mediaRepository: MessageMediaRepository | null = null;
const getMediaRepository = async () => {
  if (!mediaRepository) {
    mediaRepository = new MessageMediaRepository(await getOfflineDatabase());
  }
  return mediaRepository;
};

const rememberState = async (
  fileId: string,
  state: "available" | "deleted" | null,
) => {
  if (state) storedStates.set(fileId, state);
  else storedStates.delete(fileId);
  const repository = await getMediaRepository().catch(() => null);
  if (!repository) return;
  if (state) await repository.setState(fileId, state).catch(() => undefined);
  else await repository.clear(fileId).catch(() => undefined);
};

// ---- connection ------------------------------------------------------------

let socket: Socket | null = null;
let currentMessId: number | null = null;
const queue: Job[] = [];
/** Files nobody could send yet, asked for again when a source may be online. */
const parked = new Map<string, Job>();
let active: ActiveDownload | null = null;
/**
 * Cloud downloads run in a lane of their own, a few at a time. The relay
 * handles one file at a time and may wait seconds for a holder to answer, so
 * a file that is stored must never queue behind it.
 */
const cloudActive = new Map<string, ActiveDownload>();
const uploads = new Map<string, { cancelled: boolean }>();

const isQueued = (fileId: string) =>
  active?.attachment.id === fileId ||
  cloudActive.has(fileId) ||
  queue.some((job) => job.attachment.id === fileId);

const wantsCloud = (job: Job) =>
  !job.skipCloud && isStoredInCloud(job.attachment);

const startDownload = (job: Job): ActiveDownload => ({
  ...job,
  transferId: null,
  target: null,
  handle: null,
  nextSeq: 0,
  received: 0,
});

/** Queues a file for download unless this phone has it or chose to drop it. */
const enqueue = (job: Job, force = false) => {
  const fileId = job.attachment.id;
  if (isQueued(fileId) || findHeldFile(fileId)) return;
  if (!force && storedStates.has(fileId)) return;
  parked.delete(fileId);
  queue.push(job);
  setTransient(fileId, { kind: "queued" });
  pump();
};

const park = (job: Job) => {
  // When it is asked for again the cloud copy gets another chance too.
  parked.set(job.attachment.id, { ...job, attempts: 0, skipCloud: false });
  setTransient(job.attachment.id, { kind: "waiting" });
};

const closeActive = (keepPartial = false) => {
  const current = active;
  active = null;
  if (!current) return;
  try {
    current.handle?.close();
  } catch {
    // Closing a handle that already failed is fine to skip.
  }
  if (!keepPartial) {
    try {
      if (current.target?.exists) current.target.delete();
    } catch {
      // A leftover partial file is replaced on the next attempt.
    }
  }
};

const retryOrPark = (job: Job) => {
  const attempts = job.attempts + 1;
  if (attempts >= MAX_ATTEMPTS) {
    park(job);
    return;
  }
  setTransient(job.attachment.id, { kind: "queued" });
  setTimeout(() => {
    if (!isQueued(job.attachment.id) && !findHeldFile(job.attachment.id)) {
      queue.push({ ...job, attempts });
      pump();
    }
  }, RETRY_DELAY_MS);
};

/** Takes the first queued job the predicate accepts, skipping held files. */
const takeJob = (accept: (job: Job) => boolean): Job | null => {
  for (;;) {
    const index = queue.findIndex(accept);
    if (index < 0) return null;
    const [job] = queue.splice(index, 1);
    if (!findHeldFile(job!.attachment.id)) return job!;
    setTransient(job!.attachment.id, null);
  }
};

function pump(): void {
  // The socket being connected stands in for being online in both lanes.
  if (!socket?.connected) return;
  while (cloudActive.size < MAX_CLOUD_DOWNLOADS) {
    const job = takeJob(wantsCloud);
    if (!job) break;
    const download = startDownload(job);
    cloudActive.set(job.attachment.id, download);
    void downloadFromCloud(download);
  }
  if (active) return;
  const job = takeJob((candidate) => !wantsCloud(candidate));
  if (!job) return;
  const download = startDownload(job);
  active = download;
  setTransient(job.attachment.id, { kind: "searching" });
  socket
    .timeout(REQUEST_TIMEOUT_MS)
    .emitWithAck("media:request", { messageId: job.messageServerId })
    .then((response: { ok?: boolean; transferId?: string; error?: string }) => {
      if (active !== download) return;
      if (response?.ok && response.transferId) {
        download.transferId = response.transferId;
        return;
      }
      closeActive();
      // The message is not on the server, so no one can ever send it.
      if (response?.error === "not_found")
        setTransient(job.attachment.id, {
          kind: "failed",
        });
      else retryOrPark(job);
      pump();
    })
    .catch(() => {
      if (active !== download) return;
      closeActive();
      retryOrPark(job);
      pump();
    });
}

const handleStart = (payload: { transferId?: string }) => {
  const download = active;
  if (!download || payload?.transferId !== download.transferId) return;
  try {
    download.target = prepareDownloadTarget(download.attachment);
    download.handle = download.target.open();
    setTransient(download.attachment.id, { kind: "downloading", progress: 0 });
  } catch {
    socket?.emit("media:abort", { transferId: download.transferId });
    closeActive();
    retryOrPark(download);
    pump();
  }
};

/** Verifies a finished download and keeps it as this phone's copy. */
const keepDownload = async (download: ActiveDownload) => {
  const { attachment } = download;
  const partial = download.target!;
  download.handle?.close();
  download.handle = null;
  const valid =
    partial.size === attachment.size &&
    (await sha256OfFile(partial)) === attachment.sha256;
  if (!valid) throw new Error("Checksum mismatch");
  partial.move(mediaFileFor(attachment));
  await rememberState(attachment.id, "available");
  setTransient(attachment.id, null);
};

const finishDownload = async (download: ActiveDownload) => {
  try {
    await keepDownload(download);
    active = null;
    socket?.emit("media:complete", { transferId: download.transferId });
  } catch {
    closeActive();
    retryOrPark(download);
  }
  pump();
};

const downloadFromCloud = async (download: ActiveDownload) => {
  const { attachment } = download;
  const fileId = attachment.id;
  const token = getRealtimeAuthToken();
  const messId = currentMessId;
  // False once the member removed the file meanwhile.
  const current = () => cloudActive.get(fileId) === download;
  let kept = false;
  try {
    download.target = prepareDownloadTarget(attachment);
    setTransient(fileId, { kind: "downloading", progress: 0 });
    const fetched =
      token !== null &&
      messId !== null &&
      (await downloadAttachmentFromCloud(
        token,
        messId,
        download.messageServerId,
        download.target,
        (progress) => {
          if (current()) {
            setTransient(fileId, { kind: "downloading", progress });
          }
        },
      ));
    if (fetched && current()) {
      await keepDownload(download);
      kept = true;
    }
  } catch {
    // Handled below like any other miss.
  }
  if (!current()) return;
  cloudActive.delete(fileId);
  if (!kept) {
    try {
      if (download.target?.exists) download.target.delete();
    } catch {
      // A leftover partial file is replaced on the next attempt.
    }
    // Expired, removed or unreachable: ask the members' phones right away.
    queue.unshift({
      messageServerId: download.messageServerId,
      attachment,
      attempts: download.attempts,
      skipCloud: true,
    });
    setTransient(fileId, { kind: "queued" });
  }
  pump();
};

const handleChunk = (
  payload: {
    transferId?: string;
    seq?: number;
    data?: string;
    final?: boolean;
  },
  ack?: (response: { ok: boolean }) => void,
) => {
  const reply = typeof ack === "function" ? ack : () => undefined;
  const download = active;
  if (
    !download ||
    !download.handle ||
    payload?.transferId !== download.transferId ||
    payload.seq !== download.nextSeq ||
    typeof payload.data !== "string"
  ) {
    reply({ ok: false });
    return;
  }
  try {
    const bytes = base64ToBytes(payload.data);
    download.received += bytes.length;
    if (download.received > download.attachment.size) {
      throw new Error("More data than the file holds");
    }
    download.handle.writeBytes(bytes);
    download.nextSeq += 1;
    reply({ ok: true });
  } catch {
    reply({ ok: false });
    closeActive();
    retryOrPark(download);
    pump();
    return;
  }
  if (payload.final) {
    void finishDownload(download);
    return;
  }
  setTransient(download.attachment.id, {
    kind: "downloading",
    progress: download.received / download.attachment.size,
  });
};

const handleUnavailable = (payload: { transferId?: string }) => {
  const download = active;
  if (!download || payload?.transferId !== download.transferId) return;
  closeActive();
  park(download);
  pump();
};

const handleFailed = (payload: { transferId?: string }) => {
  const download = active;
  if (!download || payload?.transferId !== download.transferId) return;
  closeActive();
  retryOrPark(download);
  pump();
};

const handleRetry = (payload: { fileId?: string }) => {
  const job = payload?.fileId ? parked.get(payload.fileId) : undefined;
  if (job) enqueue(job, true);
};

// ---- serving files to others ---------------------------------------------

const streamFile = async (
  target: Socket,
  transferId: string,
  file: File,
): Promise<void> => {
  const upload = { cancelled: false };
  uploads.set(transferId, upload);
  let handle: FileHandle | null = null;
  try {
    handle = file.open();
    const total = file.size;
    let sent = 0;
    let seq = 0;
    const inFlight: Promise<{ ok?: boolean }>[] = [];
    while (sent < total) {
      if (upload.cancelled || !target.connected) throw new Error("cancelled");
      const bytes = handle.readBytes(Math.min(CHUNK_BYTES, total - sent));
      if (bytes.length === 0) throw new Error("File ended early");
      sent += bytes.length;
      inFlight.push(
        target.timeout(CHUNK_ACK_TIMEOUT_MS).emitWithAck("media:chunk", {
          transferId,
          seq,
          data: bytesToBase64(bytes),
          final: sent >= total,
        }),
      );
      seq += 1;
      // Reading and encoding a chunk runs on the JS thread; give queued work,
      // such as a text message being sent, a turn before the next one.
      await new Promise((resolve) => setTimeout(resolve, 0));
      if (inFlight.length >= SEND_WINDOW) {
        const response = await inFlight.shift()!;
        if (!response?.ok) throw new Error("rejected");
      }
    }
    for (const pending of inFlight) {
      const response = await pending;
      if (!response?.ok) throw new Error("rejected");
    }
  } catch {
    if (target.connected) target.emit("media:abort", { transferId });
  } finally {
    try {
      handle?.close();
    } catch {
      // Nothing left to release.
    }
    uploads.delete(transferId);
  }
};

const handleQuery = (payload: { transferId?: string; fileId?: string }) => {
  const target = socket;
  if (!target || !payload?.transferId || !payload.fileId) return;
  if (uploads.size >= MAX_UPLOADS) return;
  const held = findHeldFile(payload.fileId);
  if (!held) return;
  const { transferId } = payload;
  void target
    .timeout(REQUEST_TIMEOUT_MS)
    .emitWithAck("media:offer", { transferId })
    .then((response: { accepted?: boolean }) => {
      if (response?.accepted) return streamFile(target, transferId, held);
      return undefined;
    })
    .catch(() => undefined);
};

const handleCancel = (payload: { transferId?: string }) => {
  const upload = payload?.transferId
    ? uploads.get(payload.transferId)
    : undefined;
  if (upload) upload.cancelled = true;
};

// ---- lifecycle --------------------------------------------------------------

/** Queues the newest file messages of the mess this phone has not fetched. */
const catchUp = async (messId: number) => {
  const database = await getOfflineDatabase().catch(() => null);
  if (!database || currentMessId !== messId) return;
  const recent = await new MessageRepository(database)
    .recentAttachments(messId, CATCH_UP_LIMIT)
    .catch(() => []);
  // Newest first: that is the end of the thread the member is looking at.
  for (const entry of recent) {
    enqueue({ ...entry, attempts: 0 });
  }
};

const attachSocket = (next: Socket | null, messId: number | null) => {
  if (active) {
    closeActive();
  }
  for (const upload of uploads.values()) upload.cancelled = true;
  // Everything in flight or waiting is asked for again on the new connection.
  const pendingJobs = [...queue, ...parked.values()];
  queue.length = 0;
  parked.clear();
  transient.clear();
  notify();
  socket = next;
  currentMessId = messId;
  if (!next || messId === null) return;

  next.on("media:start", handleStart);
  next.on("media:chunk", handleChunk);
  next.on("media:unavailable", handleUnavailable);
  next.on("media:failed", handleFailed);
  next.on("media:retry", handleRetry);
  next.on("media:query", handleQuery);
  next.on("media:cancel", handleCancel);
  next.on("connect", () => {
    if (socket !== next) return;
    // After a reconnect the server has forgotten this socket's requests.
    const retry = [...parked.values()];
    parked.clear();
    retry.forEach((job) => enqueue(job, true));
    pump();
  });

  pendingJobs.forEach((job) =>
    enqueue({ ...job, attempts: 0, skipCloud: false }, true),
  );
  void catchUp(messId);
};

let started = false;

/** Starts the downloader and file server. Safe to call more than once. */
export const startChatMedia = (): void => {
  if (started || !isChatMediaSupported) return;
  started = true;
  void getMediaRepository()
    .then((repository) => repository.all())
    .then((states) => {
      storedStates = states;
      notify();
    })
    .catch(() => undefined);
  subscribeToRealtimeSocket(attachSocket);
  subscribeToStoredAttachmentMessages((messages: ApiMessage[]) => {
    for (const message of messages) {
      if (!message.attachment || message.messId !== currentMessId) continue;
      enqueue({
        messageServerId: message.id,
        attachment: message.attachment,
        attempts: 0,
      });
    }
  });
};

// ---- user actions --------------------------------------------------------

/** Records a file this phone just shared, so it counts as held. */
export const registerSentFile = async (fileId: string): Promise<void> => {
  await rememberState(fileId, "available");
  notify(fileId);
};

/** Removes this phone's copy. Other members keep theirs. */
export const deleteLocalCopy = async (fileId: string): Promise<void> => {
  if (active?.attachment.id === fileId) {
    if (active.transferId) {
      socket?.emit("media:abort", { transferId: active.transferId });
    }
    closeActive();
  }
  cloudActive.delete(fileId);
  const queued = queue.findIndex((job) => job.attachment.id === fileId);
  if (queued >= 0) queue.splice(queued, 1);
  parked.delete(fileId);
  deleteHeldFile(fileId);
  transient.delete(fileId);
  await rememberState(fileId, "deleted");
  notify(fileId);
  pump();
};

/** Asks for a file again, including one this phone removed earlier. */
export const requestDownload = async (
  messageServerId: number,
  attachment: ApiMessageAttachment,
): Promise<void> => {
  await rememberState(attachment.id, null);
  enqueue({ messageServerId, attachment, attempts: 0 }, true);
};
