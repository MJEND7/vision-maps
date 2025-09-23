"use client";

import { motion } from "motion/react"
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Users, Palette, Video, Globe, Upload } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import LightRays from "@/backgrounds/LightRays/LightRays";
import { ROUTES } from "@/lib/constants";
import { Header } from "@/components/landing/Header";
import { About } from "@/components/landing/About";

export default function Home() {
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <div className="w-screen h-[300px] dark:inline hidden overflow-none sm:h-screen bg-transparent absolute sm:top-0 top-15">
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
                <LandingNav showLandingSections />

                <div
                    id="home"
                    className="relative h-[750px] w-full bg-gradient bg-no-repeat bg-[center_120px] lg:bg-[65%_center] lg:bg-[length:35%]"
                >

                    <Header />
                </div>

                <About />
                <Features />
                <CallToAction />
                <LandingFooter />
            </motion.div>
        </>
    );
}

export function Features() {
    const features = [
        {
            label: "Accounts",
            tag: "EUR & GBP Soon",
            title: "Multi-currency accounts",
            description:
                "Hold and manage multiple currencies in one place and swap between them instantly.",
            icon: Palette,
            bullets: ["Pay in any currency", "Unlimited accounts", "Instant swaps"],
            size: "md:col-span-2 md:row-span-2", // big feature card
        },
        {
            label: "Cards",
            title: "Virtual cards",
            description:
                "Create virtual cards to spend online or in-store. Securely, in any currency and in any place.",
            icon: Video,
            bullets: ["Pay in any currency", "Unlimited cards", "Spending limits"],
            size: "md:col-span-1 md:row-span-1",
        },
        {
            label: "Pay-ins",
            tag: "Soon",
            title: "Invoices",
            description:
                "Easily send professional invoices to your contacts and get paid directly into your account.",
            icon: Upload,
            bullets: ["Product catalogue", "Custom branding", "Multiple payment methods"],
            size: "md:col-span-1",
        },
        {
            label: "Pay-ins",
            tag: "Soon",
            title: "Receive",
            description:
                "Easily request payments from anyone. Share a link or generate an invoice to get paid instantly.",
            icon: Globe,
            bullets: ["Local currency support", "QR payment links", "Instant settlement"],
            size: "md:col-span-1",
        },
        {
            label: "Payouts",
            title: "Send",
            description:
                "Send money across borders. Fast, secure, and with support for multiple currencies and assets.",
            icon: Users,
            bullets: ["Cross-border support", "Low FX fees", "Fast payment rails"],
            size: "md:col-span-2  md:row-span-2",
        },
        {
            label: "AI",
            title: "AI Assistant",
            description:
                "Get real-time help ideating, researching, and structuring your projects using our AI.",
            icon: Zap,
            bullets: ["Brainstorm with AI", "Context-aware help", "Export structured outputs"],
            size: "md:col-span-1",
        },
    ];

    return (
        <motion.section
            id="features"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="py-20 px-6 bg-background relative"
        >
            <div className="max-w-7xl mx-auto space-y-16">
                {/* Section Header */}
                <motion.div
                    initial={{ y: 40, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center"
                >
                    <h2 className="text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
                        The Place for ideation and Shareing
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
                        Quickly input any form of media, keep track of all your ideations and have ideations sessions with you team.
                        Collaborate, share and build with a single visions at any scale.
                    </p>
                </motion.div>

                {/* Feature Grid */}
                <div className="grid md:grid-cols-3 grid-cols-1 auto-rows-[220px] md:auto-rows-[280px] gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ y: 40, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.5, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`flex flex-col justify-between rounded-xl border border-border 
                         bg-gradient-to-b from-background/40 to-background/20 
                         p-6 relative overflow-hidden hover:shadow-lg 
                         transition-all duration-300 ease-in-out ${feature.size}`}
                        >
                            {/* Top label */}
                            <div className="flex items-center gap-3 text-xs font-medium mb-2">
                                <span className="px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                    {feature.label}
                                </span>
                                {feature.tag && (
                                    <span className="px-2 py-0.5 rounded-full bg-green-600/20 text-green-500 text-[11px]">
                                        {feature.tag}
                                    </span>
                                )}
                            </div>

                            {/* Title + description */}
                            <div className="flex flex-col gap-2 flex-grow">
                                <h3 className="text-lg md:text-xl font-semibold text-foreground">
                                    {feature.title}
                                </h3>
                                <p className="text-sm text-muted-foreground leading-relaxed">
                                    {feature.description}
                                </p>
                            </div>

                            {/* Bullets */}
                            {feature.bullets && (
                                <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                                    {feature.bullets.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {/* Decorative background icon */}
                            <div className="absolute right-3 bottom-3 opacity-10 pointer-events-none">
                                <feature.icon className="w-20 h-20 md:w-28 md:h-28 text-foreground" />
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}


function CallToAction() {
    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            className="py-20 px-6 bg-gradient-to-r from-primary/5 to-primary/10"
        >
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="space-y-8"
                >
                    <h2 className="text-5xl md:text-6xl font-display font-light">
                        <span className="text-muted-foreground">Build clearer—</span>
                        <br />
                        <span className="text-primary font-semibold">with Vision Maps</span>
                    </h2>

                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Ready to transform how you communicate your ideas?
                    </p>

                    <motion.div
                        initial={{ y: 20, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="flex flex-col sm:flex-row gap-4 justify-center items-center"
                    >
                        <Authenticated>
                            <Button size="xl" className="w-full sm:w-auto" onClick={() => window.location.href = ROUTES.PROFILE.VISIONS}>
                                Start Creating
                            </Button>
                        </Authenticated>
                        <Unauthenticated>
                            <Button size="xl" className="w-full sm:w-auto" onClick={() => window.location.href = ROUTES.SIGNUP}>
                                Get Started Free
                            </Button>
                        </Unauthenticated>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Contact us:</span>
                            <a
                                href="mailto:support@visionmaps.com"
                                className="text-primary hover:underline font-medium"
                            >
                                support@visionmaps.com
                            </a>
                        </div>
                    </motion.div>

                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        whileInView={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.4 }}
                        viewport={{ once: true }}
                        className="pt-8"
                    >
                        <div className="flex items-center justify-center gap-8 text-sm text-muted-foreground">
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Free forever plan</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>No credit card required</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-500" />
                                <span>Start in seconds</span>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            </div>
        </motion.section>
    );
}
