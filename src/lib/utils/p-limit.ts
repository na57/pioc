/**
 * 简单的并发控制函数（p-limit 的轻量替代）
 *
 * 限制同时执行的任务数不超过 concurrency。
 * 返回结果保持原始顺序。
 */
export async function pLimit<T>(
  items: T[],
  concurrency: number,
  fn: (item: T, index: number) => Promise<unknown>
): Promise<unknown[]> {
  if (items.length === 0) return [];
  if (concurrency <= 0) concurrency = 1;

  const results: unknown[] = new Array(items.length);
  let nextIndex = 0;

  async function worker(): Promise<void> {
    while (nextIndex < items.length) {
      const i = nextIndex++;
      results[i] = await fn(items[i], i);
    }
  }

  const workers: Promise<void>[] = [];
  const poolSize = Math.min(concurrency, items.length);
  for (let w = 0; w < poolSize; w++) {
    workers.push(worker());
  }
  await Promise.all(workers);

  return results;
}