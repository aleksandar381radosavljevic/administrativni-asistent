import type { NextConfig } from "next";

// Cache Components (ADR 0017): data is dynamic by default and public reads
// opt into caching with `use cache`. partialPrefetching is set explicitly,
// as the cacheComponents docs require, so Next.js does not warn.
const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
};

export default nextConfig;
