/**
 * 校时：把设备时钟对齐到标准时间。
 *
 * 抢票场景下设备时钟偏差是致命的（安卓模拟器实测慢 56 秒），所以先用多个时间源
 * 估算「设备时间 − 标准时间」的偏移量，之后所有时间计算都走 trueNow()。
 *
 * 首选淘宝时间接口：大麦同属阿里，时间源一致，省去跨源误差。
 */

type TimeSource = {
  name: string;
  url: string;
  parse: (body: string) => number | null;
};

const TIME_SOURCES: TimeSource[] = [
  {
    name: '淘宝时间',
    url: 'https://api.m.taobao.com/rest/api3.do?api=mtop.common.getTimestamp',
    parse: (body) => {
      const m = body.match(/"t"\s*:\s*"(\d{10,})"/);
      return m ? Number(m[1]) : null;
    },
  },
  {
    name: 'WorldTimeAPI',
    url: 'https://worldtimeapi.org/api/timezone/Etc/UTC',
    parse: (body) => {
      const m = body.match(/"unixtime"\s*:\s*(\d{10,})/);
      return m ? Number(m[1]) * 1000 : null;
    },
  },
];

export type ClockSample = {
  source: string;
  /** 标准时间 − 设备时间，正值表示设备时钟偏慢。 */
  offsetMs: number;
  /** 往返时延，用于挑选最优样本。 */
  rttMs: number;
  sampledAtDeviceMs: number;
};

let offsetMs = 0;
let lastSample: ClockSample | null = null;

export function deviceNow(): number {
  return Date.now();
}

/** 校时后的标准时间。 */
export function trueNow(): number {
  return Date.now() + offsetMs;
}

export function getOffsetMs(): number {
  return offsetMs;
}

export function getLastSample(): ClockSample | null {
  return lastSample;
}

/** 把标准时间换算成设备时间，用于排期本地通知。 */
export function deviceTimeFor(trueMs: number): number {
  return trueMs - offsetMs;
}

export function restoreOffset(value: number | null): void {
  if (typeof value === 'number' && Number.isFinite(value)) offsetMs = value;
}

async function probe(source: TimeSource): Promise<ClockSample> {
  const t0 = Date.now();
  const res = await fetch(source.url, { cache: 'no-store' });
  const body = await res.text();
  const t1 = Date.now();
  const serverMs = source.parse(body);
  if (serverMs == null) throw new Error(`${source.name} 返回内容无法解析`);
  return {
    source: source.name,
    // 假设请求与响应耗时对称，用半程时延补偿
    offsetMs: serverMs + (t1 - t0) / 2 - t1,
    rttMs: t1 - t0,
    sampledAtDeviceMs: t1,
  };
}

/**
 * 多轮采样，取往返时延最小的一次作为最优估计（时延越小，半程补偿误差越小）。
 */
export async function syncClock(rounds = 5): Promise<ClockSample> {
  const samples: ClockSample[] = [];
  for (let i = 0; i < rounds; i++) {
    const source = TIME_SOURCES[i % TIME_SOURCES.length];
    try {
      samples.push(await probe(source));
    } catch {
      // 单个时间源失败不影响整体，继续下一轮
    }
  }
  if (samples.length === 0) throw new Error('所有时间源都不可用，请检查网络');
  const best = samples.reduce((a, b) => (b.rttMs < a.rttMs ? b : a));
  offsetMs = best.offsetMs;
  lastSample = best;
  return best;
}