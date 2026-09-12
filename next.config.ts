import type { NextConfig } from "next";
import withPWAInit from "@ducanh2912/next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  disable: process.env.NODE_ENV === "development",
  workboxOptions: {
    disableDevLogs: true,
  },
});

const nextConfig: NextConfig = { allowedDevOrigins: ['10.1.136.102', '0.0.0.0', 'localhost', '192.168.1.5', 'http://10.1.136.102:3000'],
  /* config options here */
};

export default withPWA(nextConfig);
