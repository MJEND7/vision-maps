import type { Metadata } from "next";
import "./globals.css";
import "./fonts.css";
import { ClerkProvider } from "@clerk/nextjs";
import ConvexClientProvider from "../components/ConvexClientProvider";
import FaviconSwitcher from "../components/FaviconSwitcher";
import { Toaster } from "../components/ui/sonner";
import { shadcn } from "@clerk/themes";
import { NextSSRPlugin } from "@uploadthing/react/next-ssr-plugin";
import { extractRouterConfig } from "uploadthing/server";
import { uploadThingFileRouter } from "./api/uploadthing/core";

export const metadata: Metadata = {
    title: "Vision",
    description: "The Essence of Vision. A way of thinking, communicating and building",
    icons: {
        icon: "/light_favicon.ico",
    },
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className="dark">
            <head>
                <script
                    dangerouslySetInnerHTML={{
                        __html: `
                            (function() {
                                try {
                                    const savedTheme = localStorage.getItem('theme');
                                    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                                    const shouldBeDark = savedTheme === 'dark' || (!savedTheme && systemDark);
                                    
                                    document.documentElement.className = shouldBeDark ? 'dark' : 'light';
                                } catch (e) {
                                    document.documentElement.className = 'light';
                                }
                            })();
                        `,
                    }}
                />
                <meta
                    name="viewport"
                    content="width=device-width, initial-scale=1, viewport-fit=cover"
                />
                
                {/* PWA Manifest */}
                <link rel="manifest" href="/site.webmanifest" />
                
                {/* iOS PWA Meta Tags */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="default" />
                <meta name="apple-mobile-web-app-title" content="Vision" />
                <meta name="mobile-web-app-capable" content="yes" />
                
                {/* iOS Icons */}
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                
                {/* iOS Splash Screens */}
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <link rel="apple-touch-startup-image" href="/splash-2048x2732.png" media="(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-1668x2388.png" media="(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-1536x2048.png" media="(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-1284x2778.png" media="(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-1170x2532.png" media="(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-1125x2436.png" media="(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-828x1792.png" media="(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-750x1334.png" media="(device-width: 375px) and (device-height: 667px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                <link rel="apple-touch-startup-image" href="/splash-640x1136.png" media="(device-width: 320px) and (device-height: 568px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)" />
                
                {/* Theme Colors */}
                <meta name="theme-color" content="#000000" />
                <meta name="msapplication-TileColor" content="#000000" />
                <meta name="msapplication-navbutton-color" content="#000000" />
            </head>
            <body
                className="antialiased"
            >
                <NextSSRPlugin
                    routerConfig={extractRouterConfig(uploadThingFileRouter)}
                />
                <FaviconSwitcher />
                <ClerkProvider dynamic appearance={{
                    theme: shadcn
                }}>
                    <ConvexClientProvider>{children}</ConvexClientProvider>
                </ClerkProvider>
                <Toaster />
            </body>
        </html>
    );
}
