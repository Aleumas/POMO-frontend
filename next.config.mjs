import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async headers() {
    return [];
  },
};

// Only for `next dev` — calling this during `next build` (e.g. under
// `opennextjs-cloudflare build`) spins up a real local Miniflare/workerd
// instance at build time, which is unsupported and crashes with an
// unhandled EPIPE rejection. See:
// https://github.com/opennextjs/opennextjs-cloudflare/issues/502
if (process.env.NODE_ENV === "development") {
  initOpenNextCloudflareForDev();
}

export default nextConfig;
