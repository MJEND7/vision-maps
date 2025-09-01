import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.ufs.sh',
        port: '',
        pathname: '/**',
      },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-eval' 'unsafe-inline' https://hcaptcha.com https://*.hcaptcha.com https://*.stripe.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://*.cloudflare.com https://js.stripe.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https: blob:",
              "font-src 'self' data:",
              "connect-src 'self' https://*.uploadthing.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://*.cloudflare.com https://*.convex.cloud wss://*.convex.cloud",
              "frame-src 'self' https://*.stripe.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:"
            ].join("; ")
          }
        ]
      }
    ];
  }
};

export default nextConfig;
