/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: ['@brutal/shared'],
  // @brutal/render + its native/headless deps stay OUT of the webpack bundle — consumed as the
  // built dist at runtime (polotno-node drags puppeteer; bundling it breaks).
  serverExternalPackages: ['@brutal/render', 'polotno-node', 'puppeteer', 'puppeteer-core', 'sharp'],
  webpack: (config, { isServer }) => {
    if (isServer) {
      // belt-and-suspenders: symlinked workspace imports can dodge serverExternalPackages
      config.externals.push({
        'polotno-node': 'commonjs polotno-node',
        puppeteer: 'commonjs puppeteer',
        'puppeteer-core': 'commonjs puppeteer-core',
        '@sparticuz/chromium': 'commonjs @sparticuz/chromium',
        sharp: 'commonjs sharp',
      });
    }
    return config;
  },
  experimental: { serverActions: { bodySizeLimit: '10mb' } },
  // Runtime file reads outside the app dir — the serverless tracer can't see them (docs/06 fonts pin).
  outputFileTracingIncludes: {
    '/**': [
      '../../supabase/seed.sql',
      '../../packages/render/fixtures/gradient.png',
      '../../packages/render/assets/fonts/**',
    ],
  },
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
};

export default nextConfig;
