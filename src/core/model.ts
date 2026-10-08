/** 一个抢票任务：在真实开售时间前 leadMs 触发提醒，并跳转到大麦抢购页。 */
export type GrabTask = {
  id: string;
  /** 演出名称，仅用于展示 */
  name: string;
  /** 真实开售时间（以校时后的标准时间为准，毫秒时间戳） */
  saleAtMs: number;
  /** 提前量（毫秒）：比开售时间早多久提醒 */
  leadMs: number;
  /** 大麦深链或商品 ID */
  deepLink: string;
  /** 观演人 / 票档备注 */
  note?: string;
  enabled: boolean;
  /** 已排期的本地通知 id，用于取消或重排 */
  notificationId?: string;
  createdAt: number;
};

export function createEmptyTask(nowMs: number): GrabTask {
  return {
    id: `task_${nowMs}_${Math.random().toString(36).slice(2, 8)}`,
    name: '',
    saleAtMs: nowMs + 10 * 60 * 1000,
    leadMs: 30 * 1000,
    deepLink: '',
    note: '',
    enabled: true,
    createdAt: nowMs,
  };
}

/** 需要提醒的真实时刻。 */
export function fireAtMs(task: GrabTask): number {
  return task.saleAtMs - task.leadMs;
}