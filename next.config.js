/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  swcMinify: true,
  experimental: {
    optimizePackageImports: ['framer-motion', 'recharts', 'd3'],
  },
  webpack: (config, { isServer }) => {
    if (!isServer && config.optimization?.splitChunks) {
      if (!config.optimization.splitChunks.cacheGroups) {
        config.optimization.splitChunks.cacheGroups = {};
      }
      config.optimization.splitChunks.cacheGroups.ethers = {
        test: /[\\/]node_modules[\\/]ethers/,
        name: 'ethers',
        chunks: 'all',
        priority: 10,
      };
    }
    return config;
  },
};

module.exports = nextConfig;
