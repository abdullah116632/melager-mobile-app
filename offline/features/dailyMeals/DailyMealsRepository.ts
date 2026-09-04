import type { SQLiteDatabase } from "expo-sqlite";
import { OutboxRepository } from "../../repositories/outboxRepository";
import type { MealData } from "@/redux/slice/mealsSlice";

export class DailyMealsRepository {
  private outbox: OutboxRepository;
  constructor(private db: SQLiteDatabase) { this.outbox = new OutboxRepository(db); }
  async mergeRemote(userId: number, messId: number, yearMonth: string, meals: MealData[string]): Promise<MealData[string]> {
    const dirty = await this.db.getAllAsync<{consumer_id:string;day:number;count:number}>("SELECT consumer_id, day, count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND is_dirty=1", userId,messId,yearMonth);
    await this.db.withTransactionAsync(async () => {
      for (const [consumerId, days] of Object.entries(meals)) for (const [day, count] of Object.entries(days)) {
        const local = dirty.find((row)=>row.consumer_id===consumerId && row.day===Number(day));
        if (local) continue;
        await this.db.runAsync(`INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,updated_at) VALUES (?,?,?,?,?,?,?,0,?) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,base_count=excluded.base_count,is_dirty=0,updated_at=excluded.updated_at`,userId,messId,yearMonth,consumerId,Number(day),count,count,Date.now());
      }
    });
    return this.getMonth(userId,messId,yearMonth);
  }
  async getMonth(userId:number,messId:number,yearMonth:string):Promise<MealData[string]> {
    const rows=await this.db.getAllAsync<{consumer_id:string;day:number;count:number}>("SELECT consumer_id,day,count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=?",userId,messId,yearMonth);
    return rows.reduce<MealData[string]>((out,row)=>{(out[row.consumer_id]??={})[String(row.day)]=Number(row.count);return out;},{});
  }
  async update(userId:number,messId:number,yearMonth:string,consumerId:string,day:number,count:number):Promise<void>{
    const existing=await this.db.getFirstAsync<{count:number;base_count:number}>("SELECT count,base_count FROM local_daily_meals WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",userId,messId,yearMonth,consumerId,day);
    const baseCount=Number(existing?.base_count ?? existing?.count ?? 0);
    await this.db.withTransactionAsync(async()=>{ await this.db.runAsync(`INSERT INTO local_daily_meals (user_id,mess_id,year_month,consumer_id,day,count,base_count,is_dirty,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(user_id,mess_id,year_month,consumer_id,day) DO UPDATE SET count=excluded.count,is_dirty=1,updated_at=excluded.updated_at`,userId,messId,yearMonth,consumerId,day,count,baseCount,1,Date.now()); await this.outbox.enqueue({userId,messId,entityType:"daily_meal",entityId:`${yearMonth}:${consumerId}:${day}`,operation:"upsert",dedupeKey:`daily-meal:${messId}:${yearMonth}:${consumerId}:${day}`,payload:{yearMonth,consumerId,day,count,baseCount}}); });
  }
  async acknowledge(userId:number,messId:number,p:{yearMonth:string;consumerId:string;day:number;count:number}):Promise<void>{await this.db.runAsync("UPDATE local_daily_meals SET count=?,base_count=?,is_dirty=0,updated_at=? WHERE user_id=? AND mess_id=? AND year_month=? AND consumer_id=? AND day=?",p.count,p.count,Date.now(),userId,messId,p.yearMonth,p.consumerId,p.day);}
}
