import { clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Fetch products & prices from Clerk (public data, no auth needed)
    const productsResponse = await (await clerkClient()).billing.getPlanList();

    // Structure the data properly
    const products = productsResponse.data.filter((p) => {
        if (!p.slug.endsWith("free_org")) {
            return p
        }
    });

    return NextResponse.json({ 
      products
    });
  } catch (error) {
    console.error("Error fetching pricing data:", error);
    return NextResponse.json(
      { error: "Failed to fetch pricing data" },
      { status: 500 }
    );
  }
}
