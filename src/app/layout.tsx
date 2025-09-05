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
