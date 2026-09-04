import type { SQLiteDatabase } from "expo-sqlite";
import { api } from "@/lib/api";
import type { SyncRegistry } from "../../sync/registry";
import { DailyMealsRepository } from "./DailyMealsRepository";

export const registerDailyMealsSync = (registry: SyncRegistry, database: SQLiteDatabase) => {
  const repository=new DailyMealsRepository(database);
  registry.registerProcessor("daily_meal",async(operation,context)=>{
    const payload=operation.payload as {yearMonth:string;consumerId:string;day:number;count:number;baseCount:number};
    await api.setMeal(payload.consumerId,payload.yearMonth,payload.day,payload.count,context.token,context.messId!);
    await repository.acknowledge(context.userId,context.messId!,payload);
  });
  registry.registerPuller("daily_meals",async(_cursor,context)=>{if(context.messId===null)return{cursor:null};const ym=new Date().toISOString().slice(0,7);const data=await api.getMonthData(ym,context.token,context.messId);await repository.mergeRemote(context.userId,context.messId,ym,data.meals);return{cursor:null};});
};
