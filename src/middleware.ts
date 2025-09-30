import { clerkMiddleware } from '@clerk/nextjs/server'

export default clerkMiddleware(
    {
        contentSecurityPolicy: {
            directives: {
                "default-src": ["'self'"],
                "script-src": [
                    "'self'",
                    "'unsafe-eval'",
                    "https://hcaptcha.com",
                    "https://*.hcaptcha.com",
                    "https://*.stripe.com",
                    "https://*.clerk.accounts.dev",
                    "https://*.clerk.dev",
                    "https://challenges.cloudflare.com",
                    "https://*.cloudflare.com",
                    "https://js.stripe.com"
                ],
                "style-src": ["'self'", "'unsafe-inline'"],
                "img-src": ["'self'", "data:", "https:", "blob:", "t.co"],
                "font-src": ["'self'", "data:"],
                "media-src": ["'self'", "blob:", "data:"],
                "connect-src": [
                    "'self'",
                    "https://cdn.syndication.twimg.com",
                    "https://*.convex.site",
                    "https://react-tweet.vercel.app",
                    "https://*.uploadthing.com",
                    "https://*.clerk.accounts.dev",
                    "https://*.clerk.dev",
                    "https://challenges.cloudflare.com",
                    "https://*.cloudflare.com",
                    "https://*.convex.cloud",
                    "wss://*.convex.cloud",
                    "wss://*.assemblyai.com"
                ],
                "frame-src": [
                    "'self'",
                    "https://*.loom.com",
                    "https://loom.com",
                    "https://*.youtube.com",
                    "https://youtube.com",
                    "https://www.youtube.com",
                    "https://*.figma.com",
                    "https://figma.com",
                    "https://www.figma.com",
                    "https://open.spotify.com",
                    "https://*.spotify.com",
                    "https://embed.music.apple.com",
                    "https://*.apple.com",
                    "https://*.stripe.com",
                    "https://*.clerk.accounts.dev",
                    "https://*.clerk.dev",
                    "https://challenges.cloudflare.com"
                ],
                "worker-src": ["'self'", "blob:"]
            }
        }
    },
)
export const config = {
    matcher: [
        // Skip Next.js internals and all static files, unless found in search params
        '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
        // Always run for API routes
        '/(signup|api|trpc)(.*)',
    ],
}
