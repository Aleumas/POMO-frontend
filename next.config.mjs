import { fileURLToPath } from "url";
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

// @splinetool/react-spline v4 ships pure ESM with only an `import` condition
// (no `require`/`default` fallback) in its `exports` map, which webpack's
// resolver rejects ("Package path . is not exported"). `import.meta.resolve`
// respects the `import` condition (unlike webpack's resolver here), so use
// it to get the real dist path and alias straight to it.
const splineEntry = fileURLToPath(
  import.meta.resolve("@splinetool/react-spline"),
);

/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  webpack: (config) => {
    config.resolve.alias["@splinetool/react-spline"] = splineEntry;
    return config;
  },
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
