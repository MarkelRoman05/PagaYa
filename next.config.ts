import type {NextConfig} from 'next';

const isStaticExport = process.env.NEXT_STATIC_EXPORT === 'true';

const nextConfig: NextConfig = {
  outputFileTracingRoot: process.cwd(),
  output: isStaticExport ? 'export' : undefined,
  trailingSlash: isStaticExport,
  images: {
    unoptimized: isStaticExport,
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
      {
        protocol: 'https',
        hostname: 'picsum.photos',
        port: '',
        pathname: '/**',
      },
    ],
  },
  // Exclude Supabase functions from Next.js build
  typescript: {
    ignoreBuildErrors: false,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  serverExternalPackages: ['@supabase/supabase-js'],
};

export default nextConfig;
