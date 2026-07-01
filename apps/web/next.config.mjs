/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@brutal/shared', '@brutal/render'],
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
};

export default nextConfig;
