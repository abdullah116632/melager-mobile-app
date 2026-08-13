import AsyncStorage from "@react-native-async-storage/async-storage";
import { api } from "./api";

const QUEUE_KEY = "@mess_offline_queue";

interface DayExpenseItemLike {
  id: string;
  name: string;
  amount: number;
}

interface SetMealOp {
  type: "SET_MEAL";
  key: string;
  payload: {
    consumerId: string;
    yearMonth: string;
    day: number;
    count: number;
    messId: number;
  };
  token: string;
}

interface SetExpenseOp {
  type: "SET_EXPENSE";
  key: string;
  payload: {
    yearMonth: string;
    day: number;
    items: DayExpenseItemLike[];
    messId: number;
  };
  token: string;
}

interface AddDepositEntryOp {
  type: "ADD_DEPOSIT_ENTRY";
  key: string;
  payload: {
    messId: number;
    consumerId: number;
    amount: number;
    depositedAt: string;
    note?: string;
  };
  token: string;
}

type QueuedOp = SetMealOp | SetExpenseOp | AddDepositEntryOp;

type Listener = (count: number) => void;
const listeners = new Set<Listener>();

let _queue: QueuedOp[] = [];
let _initialized = false;
let _initPromise: Promise<void> | null = null;

function ensureInit(): Promise<void> {
  if (_initialized) return Promise.resolve();
  if (_initPromise) return _initPromise;
  _initPromise = AsyncStorage.getItem(QUEUE_KEY)
    .then((raw) => {
      _queue = raw ? (JSON.parse(raw) as QueuedOp[]) : [];
    })
    .catch(() => {
      _queue = [];
    })
    .finally(() => {
      _initialized = true;
      notify();
    });
  return _initPromise;
}

async function persist(): Promise<void> {
  try {
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(_queue));
  } catch {}
  notify();
}

function notify() {
  listeners.forEach((l) => l(_queue.length));
}

export function subscribeQueueSize(listener: Listener): () => void {
  ensureInit().then(() => listener(_queue.length));
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getQueueSize(): number {
  return _queue.length;
}

export async function clearOfflineQueue(): Promise<void> {
  await ensureInit();
  _queue = [];
  await persist();
}

export async function enqueue(op: QueuedOp): Promise<void> {
  await ensureInit();
  const idx = _queue.findIndex((o) => o.key === op.key);
  if (idx >= 0) {
    _queue[idx] = op;
  } else {
    _queue.push(op);
  }
  await persist();
}

export async function flushQueue(): Promise<number> {
  await ensureInit();
  if (_queue.length === 0) return 0;

  const ops = [..._queue];
  let succeeded = 0;
  const failed: QueuedOp[] = [];

  for (const op of ops) {
    try {
      if (op.type === "SET_MEAL") {
        const { consumerId, yearMonth, day, count, messId } = op.payload;
        await api.setMeal(consumerId, yearMonth, day, count, op.token, messId);
      } else if (op.type === "SET_EXPENSE") {
        const { yearMonth, day, items, messId } = op.payload;
        await api.setExpense(yearMonth, day, items, op.token, messId);
      } else if (op.type === "ADD_DEPOSIT_ENTRY") {
        await api.addDepositEntry(op.payload, op.token);
      }
      succeeded++;
    } catch {
      failed.push(op);
    }
  }

  _queue = failed;
  await persist();
  return succeeded;
}

ensureInit();
