/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // Handle environment variables
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },
  // Configure images
  images: {
    domains: ['localhost'],
    unoptimized: true,
  },
  // Handle trailing slashes
  trailingSlash: false,
  // Configure webpack for ethers.js
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      };
    }
    return config;
  },
};

module.exports = nextConfig; 