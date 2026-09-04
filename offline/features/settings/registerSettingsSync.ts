import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
export const registerSettingsSync=(registry:SyncRegistry,_db:SQLiteDatabase)=>{registry.registerProcessor("profile_setting",async(op,ctx)=>{const p=op.payload as {kind:"name"|"phone"|"mess";value:string|null};if(p.kind==="name")await api.updateProfile(String(p.value),ctx.token);else if(p.kind==="phone")await api.updatePhone(p.value,ctx.token);else await api.updateMessName(String(p.value),ctx.token,ctx.messId!);});};
