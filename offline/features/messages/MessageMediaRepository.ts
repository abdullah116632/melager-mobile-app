import type { SQLiteDatabase } from "expo-sqlite";

export type StoredMediaState = "available" | "deleted";

/** What this phone did with each shared file, keyed by attachment id. */
export class MessageMediaRepository {
  constructor(private readonly db: SQLiteDatabase) {}

  async all(): Promise<Map<string, StoredMediaState>> {
    const rows = await this.db.getAllAsync<{
      file_id: string;
      state: StoredMediaState;
    }>("SELECT file_id,state FROM local_message_media");
    return new Map(rows.map((row) => [row.file_id, row.state]));
  }

  async setState(fileId: string, state: StoredMediaState): Promise<void> {
    await this.db.runAsync(
      `INSERT INTO local_message_media (file_id,state,updated_at) VALUES(?,?,?)
       ON CONFLICT(file_id) DO UPDATE SET state=excluded.state,updated_at=excluded.updated_at`,
      fileId,
      state,
      Date.now(),
    );
  }

  async clear(fileId: string): Promise<void> {
    await this.db.runAsync(
      "DELETE FROM local_message_media WHERE file_id=?",
      fileId,
    );
  }
}
