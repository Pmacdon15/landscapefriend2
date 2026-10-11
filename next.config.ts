import type { NextConfig } from "next";

/**
 * Content-Security-Policy for the app. Shipped as Report-Only first so it can
 * be tuned against Clerk, Google Maps and Vercel Analytics without breaking
 * the app; switch the header name to `Content-Security-Policy` once the
 * browser console shows no violations.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' https://*.clerk.accounts.dev https://clerk.landscapefriend.com https://challenges.cloudflare.com https://maps.googleapis.com https://va.vercel-scripts.com",
  "connect-src 'self' https://*.clerk.accounts.dev https://clerk.landscapefriend.com https://clerk-telemetry.com https://maps.googleapis.com https://*.vercel-insights.com",
  "img-src 'self' data: blob: https://img.clerk.com https://maps.googleapis.com https://maps.gstatic.com https://*.googleusercontent.com",
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "worker-src 'self' blob:",
  "frame-src 'self' https://challenges.cloudflare.com",
  "media-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const securityHeaders = [
  // Clickjacking: the app is never meant to be framed.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  // Don't leak full URLs (search params contain client names) to other sites.
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // Camera is used to capture completion photos; nothing uses the microphone.
  {
    key: "Permissions-Policy",
    value: "camera=(self), geolocation=(self), microphone=(), payment=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains",
  },
  {
    key: "Content-Security-Policy-Report-Only",
    value: contentSecurityPolicy,
  },
];

const nextConfig: NextConfig = {
  reactCompiler: true,
  cacheComponents: true,
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
