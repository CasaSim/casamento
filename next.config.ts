import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  async headers() {
    return [{ source: '/:path*', headers: [
      { key: 'X-Content-Type-Options', value: 'nosniff' },
      { key: 'X-Frame-Options', value: 'DENY' },
      { key: 'Referrer-Policy', value: 'no-referrer' },
      { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
      { key: 'Content-Security-Policy', value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'" },
      ...(process.env.NODE_ENV === 'production' ? [
        { key: 'Strict-Transport-Security', value: 'max-age=31536000' },
      ] : []),
    ] }, { source: '/api/:path*', headers: [
      { key: 'Cache-Control', value: 'no-store' },
    ] }, { source: '/Dashboard/:id', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }, { source: '/api/dashboards/:id', headers: [
      { key: 'X-Robots-Tag', value: 'noindex, nofollow' },
    ] }];
  },
};

export default nextConfig;
