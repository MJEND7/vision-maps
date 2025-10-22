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
import { OrganizationProvider } from "../contexts/OrganizationContext";
import { WorkspaceProvider } from "../contexts/WorkspaceContext";

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
                
                {/* iOS PWA Meta Tags - Enable fullscreen mode */}
                <meta name="apple-mobile-web-app-capable" content="yes" />
                <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
                <meta name="apple-mobile-web-app-title" content="Vision" />
                <meta name="mobile-web-app-capable" content="yes" />

                {/* Disable Safari UI elements */}
                <meta name="format-detection" content="telephone=no" />
                
                {/* iOS Icons */}
                <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
                <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
                
                
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
                    <ConvexClientProvider>
                        <WorkspaceProvider>
                            <OrganizationProvider>
                                {children}
                            </OrganizationProvider>
                        </WorkspaceProvider>
                    </ConvexClientProvider>
                </ClerkProvider>
                <Toaster />
            </body>
        </html>
    );
}
