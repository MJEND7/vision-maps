"use client";

import { motion } from "motion/react"
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Users, Palette, Globe, Upload, Brain } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import LightRays from "@/backgrounds/LightRays/LightRays";
import { ROUTES } from "@/lib/constants";
import { Header } from "@/components/landing/Header";
import { About } from "@/components/landing/About";
import { DemoPasteBin } from "@/components/landing/DemoPasteBin";
import Image from "next/image";

export default function Home() {

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                {/* LightRays disabled for performance - WebGL animation was causing lag */}
                {/* <div className="w-screen h-[300px] dark:inline hidden overflow-none sm:h-screen bg-transparent absolute sm:top-0 top-15">
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
                </div> */}
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

function Features() {
    const features = [
        {
            label: "Paste Bin",
            tag: "Live Feature",
            title: "Creative Platform Integration",
            description:
                "Simply paste your idea snippets and diverse media into the platform and share them in channels. Build context for a \"channel\" of ideation",
            icon: Palette,
            component: "pastebin-preview",
            bullets: ["Paste any content type", "Organize in ideation into channels", "Share with team and invision together"],
            size: "md:col-span-2 md:row-span-2", // big feature card
        },
        {
            label: "Collaborate",
            title: "Collaborate and build a vision",
            description:
                "Easily and quickly describe you idea's to others and get notified when others commit ideas",
            icon: Users,
            emoji: "/landing/White_Guy_Thinking.png",
            bullets: ["Comment and disscues", "Ideate in realtime", "Get notified on ideation", "Invite and manage members"],
            size: "md:col-span-1 md:row-span-1",
        },
        {
            label: "DataFlow",
            title: "Export and Import",
            description:
                "Shareing context between platforms and LLM's is very import, with vision maps you can do that easily",
            icon: Upload,
            bullets: ["Export CSV, JSON, LLM spesific", "Export to LLM's and App builders"],
            size: "md:col-span-1",
        },
        {
            label: "Sessions",
            tag: "Soon",
            title: "Ideation Sessions & Tracking",
            description:
                "Create an Ideation session for recording, researching and discussions",
            icon: Globe,
            bullets: ["Audio and Voice Notes", "Transcribe Audio", "Environment for tracking research"],
            size: "md:col-span-1",
        },
        {
            label: "Frame",
            title: "Build ideation maps in a frame",
            description:
                "Build ideation flows, describe how to come to a conculstion through a group of priors.",
            image: "/landing/Frame.png",
            bullets: ["Build knowlage maps", "Connect nodes and use them to prompt AI", "Export frames for usage as context"],
            size: "md:col-span-2  md:row-span-2",
        },
        {
            label: "AI",
            title: "AI Assistant",
            description:
                "Get real-time help ideating, researching, and structuring your projects using our AI.",
            icon: Brain,
            bullets: ["Brainstorm with GPT-5", "Context-aware help", "Export structured outputs"],
            size: "md:col-span-1",
        },
    ];

    return (
        <motion.section
            id="features"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            viewport={{ once: true }}
            className="py-20 px-2 sm:px-6 bg-background relative"
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
                    <h2 className="text-2xl sm:text-4xl md:text-5xl font-display font-bold mb-4 text-foreground">
                        The Place for ideation and Shareing
                    </h2>
                    <p className="text-lg md:text-xl text-muted-foreground max-w-3xl mx-auto">
                        This isn’t just a product—it’s a new way of communication. In a world where rapid,
                        clear ideation can determine success, Vision Maps removes the barriers between raw
                        idea and executed vision. By streamlining the process and aligning creative priors,
                        we empower you to share your idea with clarity and impact.
                    </p>
                </motion.div>

                {/* Feature Grid */}
                <div className="space-y-2 sm:grid md:grid-cols-3 grid-cols-1 auto-rows-[220px] md:auto-rows-[280px] gap-6">
                    {features.map((feature, index) => (
                        <motion.div
                            key={index}
                            initial={{ opacity: 0 }}
                            whileInView={{ opacity: 1 }}
                            transition={{ duration: 0.3, delay: index * 0.02 }}
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
                                    <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-700 text-[11px]">
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
                                <ul className="mt-3 z-[15] space-y-1 text-sm text-muted-foreground">
                                    {feature.bullets.map((item, i) => (
                                        <li key={i} className="flex items-center gap-2">
                                            <span className="w-1.5 h-1.5 rounded-full bg-primary" />
                                            {item}
                                        </li>
                                    ))}
                                </ul>
                            )}

                            {feature.emoji && (
                                <div>
                                    <div className="absolute right-3 bottom-15 pointer-events-none">
                                        <Image
                                            className="w-17 h-17"
                                            width={30}
                                            height={30}
                                            quality={60}
                                            src={"/landing/Olive_Wipper_Snapper.png"}
                                            alt=""
                                        />
                                    </div>
                                    <div className="absolute right-23 bottom-15 pointer-events-none">
                                        <Image
                                            className="w-17 h-17"
                                            width={30}
                                            height={30}
                                            quality={60}
                                            src={feature.emoji}
                                            alt=""
                                        />
                                    </div>
                                    <div className="absolute right-13 bottom-3 pointer-events-none">
                                        <Image
                                            className="w-17 h-17"
                                            width={30}
                                            height={30}
                                            quality={60}
                                            src={"/landing/Black_Chick_Happy.png"}
                                            alt=""
                                        />
                                    </div>
                                </div>
                            )}

                            {/* DemoPasteBin disabled for performance - heavy spring animations */}
                            {/* {feature.component === "pastebin-preview" && (
                                <div className="sm:absolute w-full opacity-90 -bottom-3 scale-90 flex justify-end z-[10]  pointer-events-none">
                                    <DemoPasteBin />
                                </div>
                            )} */}

                            {feature.image && (
                                <div className="sm:inline sm:absolute w-full opacity-90 -bottom-3 scale-90 -right-35 z-[10] pointer-events-none">
                                    <Image
                                        className="w-full"
                                        width={850}
                                        height={620}
                                        quality={70}
                                        src={feature.image}
                                        alt=""
                                        style={{
                                            WebkitMaskImage: `
      radial-gradient(circle, rgba(0,0,0,1) 25%, rgba(0,0,0,0) 85%),
      linear-gradient(to bottom, rgba(0,0,0,0) 3%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)
    `,
                                            WebkitMaskComposite: "destination-in",
                                            WebkitMaskRepeat: "no-repeat",
                                            WebkitMaskSize: "100% 100%",

                                            maskImage: `
      radial-gradient(circle, rgba(0,0,0,1) 35%, rgba(0,0,0,0) 85%),
      linear-gradient(to bottom, rgba(0,0,0,0) 5%, rgba(0,0,0,1) 20%, rgba(0,0,0,1) 80%, rgba(0,0,0,0) 100%)
    `,
                                            maskComposite: "intersect", // fallback
                                            maskRepeat: "no-repeat",
                                            maskSize: "100% 100%",
                                        }}
                                    />
                                </div>
                            )}

                            {!feature.image && !feature.component && !feature.emoji && feature.icon && (
                                <div className="absolute right-3 bottom-3 opacity-10 pointer-events-none">
                                    {(() => {
                                        const Icon = feature.icon;
                                        return <Icon className="w-15 h-15 md:w-28 md:h-28 text-foreground" />;
                                    })()}
                                </div>
                            )}
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
            transition={{ duration: 0.3 }}
            viewport={{ once: true }}
            className="py-20 px-6 bg-gradient-to-r from-primary/5 to-primary/10"
        >
            <div className="max-w-4xl mx-auto text-center">
                <motion.div
                    initial={{ opacity: 0 }}
                    whileInView={{ opacity: 1 }}
                    transition={{ duration: 0.3 }}
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
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.05 }}
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
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        transition={{ duration: 0.3, delay: 0.1 }}
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
