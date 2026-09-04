import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { NotificationRepository } from "./NotificationRepository";
export const registerNotificationSync=(registry:SyncRegistry,database:SQLiteDatabase)=>{const repository=new NotificationRepository(database);registry.registerProcessor("notification",async(op,ctx)=>{const p=op.payload as {serverId:number};await api.markServerNotificationRead(p.serverId,ctx.token);await repository.acknowledge(ctx.userId,ctx.messId!,p.serverId);});};
