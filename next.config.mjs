/** @type {import('next').NextConfig} */
const nextConfig = {
  trailingSlash: false,
  async headers() {
    return [];
  },
};

export default nextConfig;
