import type { NextConfig } from "next";

const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

/**
 * Hosts the app used to live on. Once NEXT_PUBLIC_SITE_URL points somewhere
 * else (https://vistiller.com), every request to an old host is redirected to
 * the same path and query on the new one, so share links (/a/<token>) and
 * private edit links (/b/<token>) that are already out there keep working.
 * While NEXT_PUBLIC_SITE_URL still is the old host, nothing is redirected.
 */
const LEGACY_HOSTS = ["korpsfix.vercel.app"];

function legacyHostRedirects() {
  let site: URL;
  try {
    site = new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "");
  } catch {
    return [];
  }
  if (site.protocol !== "https:") return [];
  return LEGACY_HOSTS.filter((host) => host !== site.host).map((host) => ({
    source: "/:path*",
    has: [{ type: "host" as const, value: host }],
    destination: `${site.origin}/:path*`,
    permanent: true,
  }));
}

const nextConfig: NextConfig = {
  // The Capacitor shell loads the dev server from another origin: 10.0.2.2 in the
  // Android emulator, the PC's LAN address on a physical phone. Without these,
  // Next refuses its dev socket for that origin and streamed content never leaves
  // the loading skeletons. Dev-only setting; covers the usual home/office ranges.
  allowedDevOrigins: ["10.*.*.*", "192.168.*.*", "172.*.*.*"],
  cacheComponents: true,
  partialPrefetching: true,
  poweredByHeader: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
  async redirects() {
    return legacyHostRedirects();
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      // Shared event lists and private edit links: never index, never leak the URL.
      {
        source: "/a/:path*",
        headers: [{ key: "X-Robots-Tag", value: "noindex, nofollow" }],
      },
      {
        source: "/b/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
          { key: "Cache-Control", value: "private, no-store" },
        ],
      },
      {
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        ],
      },
    ];
  },
};

export default nextConfig;
