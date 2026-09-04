import type { SQLiteDatabase } from "expo-sqlite";
import { api, ApiError } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DailyMealsRepository } from "./DailyMealsRepository";

export const registerDailyMealsSync = (registry: SyncRegistry, database: SQLiteDatabase) => {
  const repository=new DailyMealsRepository(database);
  registry.registerProcessor("daily_meal",async(operation,context)=>{
    const payload=operation.payload as {yearMonth:string;consumerId:string;day:number;count:number;baseCount:number};
    try { const result=await api.syncDailyMeal(operation.id,context.messId!,payload,context.token); await repository.acknowledge(context.userId,context.messId!,{...payload,count:result.count}); }
    catch(error){ if(error instanceof ApiError && error.status===409) { const month=await api.getMonthData(payload.yearMonth,context.token,context.messId!); const serverCount=month.meals[payload.consumerId]?.[String(payload.day)]??0; await repository.markConflict(context.userId,context.messId!,payload,error.message,serverCount); } throw error; }
  });
  registry.registerPuller("daily_meals",async(_cursor,context)=>{if(context.messId===null)return{cursor:null};const months=await repository.getTrackedMonths(context.userId,context.messId);for(const month of months){if(month.cursor===null){const data=await api.getMonthData(month.yearMonth,context.token,context.messId);await repository.mergeRemote(context.userId,context.messId,month.yearMonth,data.meals);}const result=await api.getDailyMealChanges(context.messId,month.yearMonth,month.cursor,context.token);await repository.applyChanges(context.userId,context.messId,month.yearMonth,result.changes.map(change=>change.payload),result.cursor);}return{cursor:null};});
};
