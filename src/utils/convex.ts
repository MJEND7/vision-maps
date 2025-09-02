export function getConvexSiteUrl() {
    let convexSiteUrl;

    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
        throw new Error("Failed to get convex URL")
    }
    
    if (process.env.NEXT_PUBLIC_CONVEX_URL.includes(".cloud")) {
        convexSiteUrl = process.env.NEXT_PUBLIC_CONVEX_URL.replace(
            /\.cloud$/,
            ".site"
        );
    } else {
        const url = new URL(process.env.NEXT_PUBLIC_CONVEX_URL);
        url.port = String(Number(url.port) + 1);
        convexSiteUrl = url.toString();
    }

    return convexSiteUrl;
}
