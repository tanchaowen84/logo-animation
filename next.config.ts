import { withContentCollections } from '@content-collections/next';
import type { NextConfig } from 'next';
import createNextIntlPlugin from 'next-intl/plugin';

/**
 * https://nextjs.org/docs/app/api-reference/config/next-config-js
 */
const nextConfig: NextConfig = {
  /* config options here */
  devIndicators: false,
  serverExternalPackages: [
    '@neplex/vectorizer',
    'sharp',
    'svg-path-bounds',
    'normalize-svg-path',
    'svg-arc-to-cubic-bezier',
    '@remotion/renderer',
  ],

  // https://nextjs.org/docs/architecture/nextjs-compiler#remove-console
  // Remove all console.* calls in production only
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },

  images: {
    // https://vercel.com/docs/image-optimization/managing-image-optimization-costs#minimizing-image-optimization-costs
    // https://nextjs.org/docs/app/api-reference/components/image#unoptimized
    // vercel has limits on image optimization, 1000 images per month
    unoptimized: process.env.DISABLE_IMAGE_OPTIMIZATION === 'true',
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'lh3.googleusercontent.com',
      },
      {
        protocol: 'https',
        hostname: 'randomuser.me',
      },
      {
        protocol: 'https',
        hostname: 'res.cloudinary.com',
      },
      {
        protocol: 'https',
        hostname: 'ik.imagekit.io',
      },
      {
        protocol: 'https',
        hostname: 'html.tailus.io',
      },
      {
        protocol: 'https',
        hostname: 'cdn.flowchartai.org',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      const externals = config.externals ?? [];
      const nativeModules = [
        'commonjs @neplex/vectorizer',
        'commonjs @neplex/vectorizer-darwin-arm64',
        'commonjs @neplex/vectorizer-darwin-x64',
        'commonjs @neplex/vectorizer-linux-arm64-gnu',
        'commonjs @neplex/vectorizer-linux-x64-gnu',
        'commonjs @neplex/vectorizer-win32-x64-msvc',
      ];

      if (Array.isArray(externals)) {
        config.externals = [...externals, ...nativeModules];
      } else {
        config.externals = [
          externals,
          ...nativeModules,
        ];
      }
    }
    return config;
  },
};

/**
 * You can specify the path to the request config file or use the default one (@/i18n/request.ts)
 *
 * https://next-intl.dev/docs/getting-started/app-router/with-i18n-routing#next-config
 */
const withNextIntl = createNextIntlPlugin();

/**
 * withContentCollections must be the outermost plugin
 *
 * https://www.content-collections.dev/docs/quickstart/next
 */
export default withContentCollections(withNextIntl(nextConfig));
