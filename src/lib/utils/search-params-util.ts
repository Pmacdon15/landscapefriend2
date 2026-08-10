export function parseParams(
  p: string | string[] | undefined,
): string | undefined {
  return Array.isArray(p) ? p[0] : p;
}
