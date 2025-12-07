import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  turbopack: {
    // Exclude DesignTeacherDashboard from build
    rules: {
      '/DesignTeacherDashboard/.*': {
        loaders: ['ignore-loader']
      }
    }
  },
  typescript: {
    // Ignore build errors for DesignTeacherDashboard
    ignoreBuildErrors: true,
  },
};

export default nextConfig;

