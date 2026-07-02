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
      // polotno-node's client page loads dist/assets/*.js via <script src> inside its HTML —
      // invisible to nft, so without this the lambda serves the page with no JS (store undefined).
      // Real .pnpm path only: including via the node_modules symlink makes Vercel reject the
      // function package ("files in symlinked directories").
      '../../node_modules/.pnpm/polotno-node@*/node_modules/polotno-node/dist/**',
    ],
  },
  outputFileTracingRoot: new URL('../..', import.meta.url).pathname,
};

export default nextConfig;
