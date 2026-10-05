/**
 * Vercel Cron sends `Authorization: Bearer <CRON_SECRET>`. Outside production
 * the check is skipped so the endpoints can be hit locally.
 *
 * A missing secret must never authorize: without the explicit check,
 * `Bearer undefined` would match an unset CRON_SECRET.
 */
export function isAuthorizedCronRequest(request: Request): boolean {
  if (process.env.NODE_ENV !== "production") return true;

  const secret = process.env.CRON_SECRET;
  if (!secret) return false;

  return request.headers.get("authorization") === `Bearer ${secret}`;
}
