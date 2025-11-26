/** @type {import('next').NextConfig} */
const nextConfig = {
  serverRuntimeConfig: {
    port: process.env.PORT || 3001,
  },
};

export default nextConfig;
