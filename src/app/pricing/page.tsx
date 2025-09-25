"use client";

import { PricingComponent } from "@/components/landing/PricingPage";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { ClerkLoaded } from "@clerk/clerk-react";
import LightRays from "@/backgrounds/LightRays/LightRays";

export default function PricingPage() {
    return (
        <>
            <div className="w-screen dark:inline hidden overflow-none sm:h-screen bg-transparent absolute sm:top-0 top-15">
                <LightRays
                    raysOrigin="top-center"
                    raysSpeed={1.5}
                    lightSpread={0.8}
                    rayLength={0.8}
                    followMouse={true}
                    mouseInfluence={0.1}
                    noiseAmount={0.1}
                    distortion={0.05}
                    className="custom-rays"
                />

            </div>
            <LandingNav showLandingSections={false} />
            <div className="mt-10 min-h-screen bg-background">
                <ClerkLoaded>
                    <PricingComponent />
                </ClerkLoaded>
            </div>
            <LandingFooter />
        </>
    );
}
