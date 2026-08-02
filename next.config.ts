import type { NextConfig } from 'next';

// API_URL and the MAPTILER_* keys are inlined into the client bundle at build
// time. Next loads .env before evaluating this file, so reading process.env is
// enough — in Docker the values come from the build args instead.
const nextConfig: NextConfig = {
  env: {
    API_URL: process.env.API_URL,
    MAPTILER_API_KEY: process.env.NEXT_PUBLIC_MAPTILER_API_KEY || process.env.MAPTILER_API_KEY,
    MAPTILER_MAP_ID: process.env.NEXT_PUBLIC_MAPTILER_MAP_ID || process.env.MAPTILER_MAP_ID,
  },
};

export default nextConfig;
