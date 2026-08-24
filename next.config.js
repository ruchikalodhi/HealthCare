/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config) => {
    // bullmq optionally supports Valkey via @valkey/valkey-glide, which this
    // project doesn't install (it uses ioredis/standard Redis instead). This
    // alias silences the resulting "module not found" build warning.
    config.resolve.alias['@valkey/valkey-glide'] = false;
    return config;
  },
};

module.exports = nextConfig;
