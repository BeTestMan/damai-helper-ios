function pad(n: number, width = 2): string {
  return String(Math.floor(n)).padStart(width, '0');
}

/** YYYY-MM-DD HH:mm:ss */
export function formatDateTime(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes(),
  )}:${pad(d.getSeconds())}`;
}

/** HH:mm:ss.SSS，用于展示秒级时间。 */
export function formatClockWithMillis(ms: number): string {
  const d = new Date(ms);
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${pad(d.getMilliseconds(), 3)}`;
}

/** 解析 `YYYY-MM-DD HH:mm[:ss]`，也接受 `/`、`.` 分隔与 `T` 分隔。 */
export function parseDateTime(input: string): number | null {
  const normalized = input.trim().replace(/[/.]/g, '-');
  const m = normalized.match(
    /^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{1,2})(?::(\d{1,2}))?$/,
  );
  if (!m) return null;
  const [, y, mo, d, h, mi, sec] = m;
  const date = new Date(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(sec ?? '0'),
    0,
  );
  return Number.isNaN(date.getTime()) ? null : date.getTime();
}

/** 倒计时文本：`3天 02:15:30` 或 `02:15:30`。 */
export function formatCountdown(ms: number): string {
  if (ms <= 0) return '已到时间';
  const total = Math.floor(ms / 1000);
  const days = Math.floor(total / 86400);
  const h = Math.floor((total % 86400) / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const clock = `${pad(h)}:${pad(m)}:${pad(s)}`;
  return days > 0 ? `${days}天 ${clock}` : clock;
}

/** 时钟偏移文本：`+128 ms` / `-1.204 s`。 */
export function formatOffset(ms: number): string {
  const sign = ms >= 0 ? '+' : '-';
  const abs = Math.abs(Math.round(ms));
  return abs < 1000 ? `${sign}${abs} ms` : `${sign}${(abs / 1000).toFixed(3)} s`;
}

/** 提前量文本：`30 秒` / `2 分 30 秒`。 */
export function formatLead(ms: number): string {
  const total = Math.round(ms / 1000);
  if (total < 60) return `${total} 秒`;
  const m = Math.floor(total / 60);
  const s = total % 60;
  return s === 0 ? `${m} 分钟` : `${m} 分 ${s} 秒`;
}