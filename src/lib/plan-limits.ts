/** Active clients allowed when the org has no client-tier feature. */
export const DEFAULT_CLIENT_LIMIT = 50;

/** Client-tier features, highest first. Both spellings are accepted. */
const CLIENT_TIERS = [
  { limit: 200, features: ["200_clients", "200-clients"] },
  { limit: 100, features: ["100_clients", "100-clients"] },
] as const;

/**
 * Returns how many active clients an org may have.
 *
 * `hasFeature` answers whether the org's plan includes a feature. Pass Clerk's
 * `has({ feature })` in a request, or a check against the org's metadata and
 * billing subscription outside one (e.g. the rebalance cron).
 */
export function clientLimitFor(hasFeature: (feature: string) => boolean) {
  for (const tier of CLIENT_TIERS) {
    if (tier.features.some(hasFeature)) return tier.limit;
  }
  return DEFAULT_CLIENT_LIMIT;
}
