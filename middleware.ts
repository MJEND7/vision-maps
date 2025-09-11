import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher(['/auth/signin', '/auth/signup', '/'])
export default clerkMiddleware(
    async (auth, request) => {
        if (!isPublicRoute(request)) {
            return NextResponse.redirect(new URL("/auth/signin", request.url))
        }
    },
    {
        contentSecurityPolicy: {},
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
