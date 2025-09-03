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
              "img-src 'self' data: https: blob: t.co",
              "font-src 'self' data:",
              "media-src 'self' blob: data:",
              "connect-src 'self' https://cdn.syndication.twimg.com https://*.convex.site https://react-tweet.vercel.app https://*.uploadthing.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com https://*.cloudflare.com https://*.convex.cloud wss://*.convex.cloud",
              "frame-src 'self' https://*.loom.com https://loom.com https://*.youtube.com https://youtube.com https://www.youtube.com https://*.figma.com https://figma.com https://www.figma.com https://open.spotify.com https://*.spotify.com https://embed.music.apple.com https://*.apple.com https://*.stripe.com https://*.clerk.accounts.dev https://*.clerk.dev https://challenges.cloudflare.com",
              "worker-src 'self' blob:"
            ].join("; ")
          }
        ]
      }
    ];
  }
};

export default nextConfig;
