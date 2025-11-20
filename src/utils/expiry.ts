export function convertExpiryToMs(exp: string): number {
  if (!exp) return 15 * 60 * 1000;
  const lastChar = exp.slice(-1);
  const num = parseInt(exp.slice(0, -1), 10);

  if (!Number.isFinite(num)) {
    const asNum = Number(exp);
    return Number.isFinite(asNum) ? asNum * 1000 : 15 * 60 * 1000;
  }

  switch (lastChar) {
    case 's':
      return num * 1000;
    case 'm':
      return num * 60 * 1000;
    case 'h':
      return num * 60 * 60 * 1000;
    case 'd':
      return num * 24 * 60 * 60 * 1000;
    default:
      return num * 1000;
  }
}
