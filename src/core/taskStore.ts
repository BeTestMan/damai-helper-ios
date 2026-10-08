import { useSyncExternalStore } from 'react';
import { deviceTimeFor } from './clock';
import { fireAtMs, GrabTask } from './model';
import { cancelNotification, scheduleGrabNotification } from './notifications';
import { loadTasks, saveTasks } from './storage';

/**
 * 任务的内存态 + 本地通知排期。
 *
 * 用模块级 store 而不是 Context：expo-router 的每个路由都是独立组件，
 * 模块级 store 让两个页面共享同一份数据，不必层层套 Provider。
 */

let tasks: GrabTask[] = [];
let hydrated = false;
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

function commit(next: GrabTask[]): void {
  tasks = next;
  emit();
  void saveTasks(next).catch(() => {});
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getSnapshot(): GrabTask[] {
  return tasks;
}

export function useTasks(): GrabTask[] {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function getTasks(): GrabTask[] {
  return tasks;
}

export async function hydrate(): Promise<void> {
  if (hydrated) return;
  hydrated = true;
  commit(await loadTasks());
}

/**
 * 重排某个任务的通知。先取消旧通知，再按当前校时偏移计算触发时刻。
 * 触发时刻必须换算成设备时间——通知由系统按设备时钟触发。
 */
async function reschedule(task: GrabTask): Promise<GrabTask> {
  if (task.notificationId) {
    await cancelNotification(task.notificationId).catch(() => {});
  }
  const next: GrabTask = { ...task, notificationId: undefined };
  if (!task.enabled) return next;

  const fireAtDeviceMs = deviceTimeFor(fireAtMs(task));
  // 留 1 秒余量，已经过去的时间点排期没有意义
  if (fireAtDeviceMs <= Date.now() + 1000) return next;

  next.notificationId = await scheduleGrabNotification({
    fireAtDeviceMs,
    title: '抢票提醒',
    body: `${task.name || '目标演出'} 即将开抢，点击进入`,
    deepLink: task.deepLink,
  }).catch(() => undefined);
  return next;
}

export async function upsertTask(task: GrabTask): Promise<void> {
  const prepared = await reschedule(task);
  const exists = tasks.some((t) => t.id === prepared.id);
  commit(
    exists ? tasks.map((t) => (t.id === prepared.id ? prepared : t)) : [...tasks, prepared],
  );
}

export async function removeTask(id: string): Promise<void> {
  const target = tasks.find((t) => t.id === id);
  if (target?.notificationId) {
    await cancelNotification(target.notificationId).catch(() => {});
  }
  commit(tasks.filter((t) => t.id !== id));
}

/** 校时偏移变化后，所有已排期通知的触发时刻都要按新偏移重算。 */
export async function rescheduleAll(): Promise<void> {
  const next: GrabTask[] = [];
  for (const task of tasks) next.push(await reschedule(task));
  commit(next);
}