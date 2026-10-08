import AsyncStorage from '@react-native-async-storage/async-storage';
import { GrabTask } from './model';

const TASKS_KEY = 'damai.tasks.v1';
const OFFSET_KEY = 'damai.clockOffsetMs.v1';

function isGrabTask(value: unknown): value is GrabTask {
  if (!value || typeof value !== 'object') return false;
  const t = value as Record<string, unknown>;
  return (
    typeof t.id === 'string' &&
    typeof t.name === 'string' &&
    typeof t.saleAtMs === 'number' &&
    typeof t.leadMs === 'number' &&
    typeof t.deepLink === 'string' &&
    typeof t.enabled === 'boolean'
  );
}

export async function loadTasks(): Promise<GrabTask[]> {
  try {
    const raw = await AsyncStorage.getItem(TASKS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter(isGrabTask) : [];
  } catch {
    return [];
  }
}

export async function saveTasks(tasks: GrabTask[]): Promise<void> {
  await AsyncStorage.setItem(TASKS_KEY, JSON.stringify(tasks));
}

export async function loadOffset(): Promise<number | null> {
  try {
    const raw = await AsyncStorage.getItem(OFFSET_KEY);
    if (raw == null) return null;
    const value = Number(raw);
    return Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

export async function saveOffset(value: number): Promise<void> {
  await AsyncStorage.setItem(OFFSET_KEY, String(value));
}