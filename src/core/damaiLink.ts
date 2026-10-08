/**
 * 大麦演出详情页的通用链接（Universal Link）。
 * iOS 上由系统直接交给已安装的大麦 App 打开，未安装则落到 Safari。
 */
export function damaiDetailUrl(itemId: string): string {
  return `https://m.damai.cn/damai/detail/item.html?itemId=${itemId}`;
}

/** 输入框允许直接填商品 ID，也允许粘贴完整链接。 */
export function resolveDeepLink(input: string): string {
  const value = input.trim();
  if (!value) return '';
  if (/^\d+$/.test(value)) return damaiDetailUrl(value);
  return value;
}

export function extractItemId(link: string): string | null {
  const m = link.match(/itemId=(\d+)/i) ?? link.match(/[?&]id=(\d+)/i);
  return m ? m[1] : null;
}