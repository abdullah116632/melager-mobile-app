import type { SQLiteDatabase } from "expo-sqlite";
import { api, type DepositEntry } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DepositRepository } from "./DepositRepository";

export const registerDepositSync=(registry:SyncRegistry,database:SQLiteDatabase)=>{
 const repository=new DepositRepository(database);
 registry.registerProcessor("deposit",async(operation,context)=>{
  const p=operation.payload as {operation:"create"|"update"|"delete";serverId?:number;localId?:string;consumerId?:number;amount?:number;depositedAt?:string;note?:string};
  const result=await api.syncDepositMutation<{entry?:DepositEntry;success?:boolean}>(operation.id,context.messId!,p.operation,p,context.token);
  if(p.operation==="create"&&p.localId&&result.entry) await repository.acknowledgeCreate(p.localId,result.entry);
  if(p.operation==="update"&&p.localId&&result.entry) await repository.acknowledgeUpdate(p.localId,result.entry);
  if(p.operation==="delete"&&p.localId) await repository.acknowledgeDelete(p.localId);
 });
 registry.registerPuller("deposits",async(_cursor,context)=>{if(context.messId===null)return{cursor:null};const yearMonth=new Date().toISOString().slice(0,7);const result=await api.getDepositEntries(context.messId,yearMonth,context.token);await repository.replace(context.userId,context.messId,result.entries);return{cursor:null};});
};
