/**
 * Spearman rank correlation: Pearson correlation of the value ranks. Chosen
 * over Pearson because the corpus is small and the metric->score relationships
 * are expected to be monotonic rather than linear. Ties get average ranks.
 * Returns 0 when undefined (n < 2 or zero variance).
 */
export function spearman(xs: number[], ys: number[]): number {
  if (xs.length !== ys.length || xs.length < 2) {
    return 0;
  }
  return pearson(rank(xs), rank(ys));
}

function rank(values: number[]): number[] {
  const order = values
    .map((v, i) => ({ v, i }))
    .sort((a, b) => a.v - b.v);
  const ranks = new Array<number>(values.length).fill(0);
  let i = 0;
  while (i < order.length) {
    let j = i;
    while (j + 1 < order.length && order[j + 1].v === order[i].v) {
      j += 1;
    }
    const averageRank = (i + j) / 2 + 1; // 1-based average rank for the tie group
    for (let k = i; k <= j; k++) {
      ranks[order[k].i] = averageRank;
    }
    i = j + 1;
  }
  return ranks;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  const ma = a.reduce((s, v) => s + v, 0) / n;
  const mb = b.reduce((s, v) => s + v, 0) / n;
  let num = 0;
  let da = 0;
  let db = 0;
  for (let i = 0; i < n; i++) {
    const x = a[i] - ma;
    const y = b[i] - mb;
    num += x * y;
    da += x * x;
    db += y * y;
  }
  if (da === 0 || db === 0) {
    return 0;
  }
  return num / Math.sqrt(da * db);
}
