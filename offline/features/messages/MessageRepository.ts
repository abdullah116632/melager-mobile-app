import * as Crypto from "expo-crypto";
import type { SQLiteDatabase } from "expo-sqlite";
import type { ApiMessage } from "@/lib/api";
import { OutboxRepository } from "../../repositories/outboxRepository";
const row = (m: ApiMessage, userId: number, status = "sent") => [
  String(m.id),
  m.id,
  userId,
  m.messId,
  m.senderUserId,
  m.senderName,
  m.body,
  m.createdAt,
  m.updatedAt,
  status,
  null,
];
export class MessageRepository {
  private outbox: OutboxRepository;
  constructor(private db: SQLiteDatabase) {
    this.outbox = new OutboxRepository(db);
  }
  async merge(userId: number, messages: ApiMessage[]) {
    for (const m of messages)
      await this.db.runAsync(
        `INSERT INTO local_messages VALUES(?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(mess_id,server_id) DO UPDATE SET sender_name=excluded.sender_name,body=excluded.body,updated_at=excluded.updated_at,status='sent'`,
        ...row(m, userId),
      );
  }
  async list(userId: number, messId: number) {
    return this.db.getAllAsync<ApiMessage & { status: string }>(
      "SELECT CASE WHEN server_id IS NULL THEN local_id ELSE server_id END AS id,mess_id AS messId,sender_user_id AS senderUserId,sender_name AS senderName,body,created_at AS createdAt,updated_at AS updatedAt,status FROM local_messages WHERE user_id=? AND mess_id=? ORDER BY created_at DESC",
      userId,
      messId,
    );
  }
  async compose(
    userId: number,
    messId: number,
    senderUserId: number,
    body: string,
  ) {
    const id = Crypto.randomUUID(),
      now = new Date().toISOString();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        "INSERT INTO local_messages VALUES(?,NULL,?,?,?,?,?,?,?,?,?,NULL)",
        id,
        userId,
        messId,
        senderUserId,
        "You",
        body,
        now,
        now,
        "pending",
      );
      await this.outbox.enqueue({
        id,
        userId,
        messId,
        entityType: "message",
        entityId: id,
        operation: "create",
        payload: { localId: id, body },
      });
    });
    return {
      id: `local:${id}`,
      messId,
      senderUserId,
      senderName: "You",
      body,
      createdAt: now,
      updatedAt: now,
      status: "pending",
    } as unknown as ApiMessage & { status: string };
  }
  async acknowledge(localId: string, message: ApiMessage) {
    await this.db.runAsync(
      "UPDATE local_messages SET server_id=?,sender_name=?,created_at=?,updated_at=?,status='sent' WHERE local_id=?",
      message.id,
      message.senderName,
      message.createdAt,
      message.updatedAt,
      localId,
    );
  }
  async failed(localId: string) {
    await this.db.runAsync(
      "UPDATE local_messages SET status='failed' WHERE local_id=?",
      localId,
    );
  }
  async markRead(userId: number, messId: number) {
    await this.db.runAsync(
      `INSERT INTO local_message_read_state(user_id,mess_id,unread_count,read_pending) VALUES(?,?,0,1) ON CONFLICT(user_id,mess_id) DO UPDATE SET unread_count=0,read_pending=1`,
      userId,
      messId,
    );
    await this.outbox.enqueue({
      userId,
      messId,
      entityType: "message_read",
      entityId: String(messId),
      operation: "command",
      dedupeKey: `message-read:${messId}`,
      payload: {},
    });
  }
}
