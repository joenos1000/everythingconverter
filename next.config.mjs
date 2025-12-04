/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack: (config, { isServer }) => {
    // Fix for face-api.js and tensorflow trying to import Node.js modules in browser
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        encoding: false,
        'node-fetch': false,
      };
    }

    // Ignore encoding module warnings globally
    config.ignoreWarnings = [
      { module: /node_modules\/node-fetch\/lib\/index\.js/ },
      { module: /node_modules\/@tensorflow/ },
      { module: /node_modules\/face-api\.js/ },
    ];

    return config;
  },
};

export default nextConfig;
