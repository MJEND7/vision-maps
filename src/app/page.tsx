"use client";

import { motion } from "motion/react"
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Users, Palette, Video, Globe, Upload } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { Authenticated, Unauthenticated } from "convex/react";
import LightRays from "@/backgrounds/LightRays/LightRays";
import { ROUTES } from "@/lib/constants";
import { Header } from "@/components/landing/Header";

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

                <Features />
                <About />
                <CallToAction />
                <LandingFooter />
            </motion.div>
        </>
    );
}

function Features() {
    const features = [
        {
            icon: <Palette className="w-8 h-8" />,
            title: "Visual Canvas",
            description: "Create unlimited nodes on a free-form canvas with drawing tools and connectors.",
        },
        {
            icon: <Video className="w-8 h-8" />,
            title: "Rich Media Support",
            description: "Embed YouTube videos, images, audio, 3D objects, PDFs, and more to capture your vision."
        },
        {
            icon: <Globe className="w-8 h-8" />,
            title: "Platform Integrations",
            description: "Connect with Figma, GitHub, Notion, and websites to pull in your existing work."
        },
        {
            icon: <Zap className="w-8 h-8" />,
            title: "AI Assistant",
            description: "Get help creating your vision and researching ideas with our built-in AI helper."
        },
        {
            icon: <Users className="w-8 h-8" />,
            title: "Real-time Collaboration",
            description: "Work together with team members with live updates and permission controls."
        },
        {
            icon: <Upload className="w-8 h-8" />,
            title: "Export & Share",
            description: "Export your vision maps as JSON or share with read-only access links."
        }
    ];

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            id="features"
            className="py-20 px-6"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center flex items-center flex-col mb-16"
                >
                    <h2 className="text-5xl font-display font-light mb-4 relative">Features <span className="absolute [background-image:radial-gradient(ellipse_at_bottom,_rgba(192,192,192,0.4)_0%,_rgba(192,192,192,0.2)_30%,_transparent_60%)] dark:hover:[background-image:radial-gradient(ellipse_at_bottom,_rgba(255,255,255,0.3)_0%,_rgba(255,255,255,0.15)_30%,_transparent_60%)] " /> </h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                        Everything you need to capture, communicate, and collaborate on your vision
                    </p>
                </motion.div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-15">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`group p-2 border-black hover:scale-105 transition-all ease-in-out`}
                        >
                            <div className={`${(index % 2) ? "sm:rotate-0 rotate-180" : ""} text-primary mb-4`}>{feature.icon}</div>
                            <h3 className={`${(index % 2) ? "text-right sm:text-left" : ""} text-2xl font-semibold font-gaegu mb-3`}>{feature.title}</h3>
                            <p className={`${(index % 2) ? "text-right sm:text-left" : ""} group-hover:underline group-hover:text-primary transition-all ease-in-out text-muted-foreground`}>{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}

function About() {
    const visionItems = [
        {
            title: "Core Vision",
            content: "As a founder and co-founder of three startups, I've learned that communicating early-stage ideas is both challenging and time-consuming. Vision Maps addresses this challenge by helping you quickly align priors and build shared context."
        },
        {
            title: "What We Do",
            content: "We believe that the only way to truly showcase your ideas is to build them—but building a full product takes time. Vision Maps lets you create that 'idea skeleton' quickly so you can align priors, transform scattered thoughts into coherent narratives, and accelerate the journey from idea to MVP."
        }
    ];

    const featuresItems = [
        {
            title: "Creative Platform Integration",
            content: "Universal paste mechanism and automatic content organization from common platforms (Websites, Figma, GitHub, YouTube, TikTok, Instagram, Spotify, Notion, etc.) with manual override capabilities."
        },
        {
            title: "LLM-Powered Innovation",
            content: "AI-driven brainstorming, vision validation, structured output generation, and usage credit system for scalable AI usage with flexible options for both free and premium users."
        }
    ];

    const brandItems = [
        {
            title: "Brand & Strategic Vision",
            content: "Vision Maps is more than just a tool—it's a revolutionary way of communicating ideas. Our aim is to build a brand centered around ideation and creative expression that transforms how founders and business owners convey their visions."
        },
        {
            title: "Revolutionary Communication",
            content: "When a founder steps into a VC meeting, they won't be limited to slides; they'll have a dynamic, living Vision Map that speaks to their creative process and demonstrates the full scope of their vision."
        }
    ];

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            id="about"
            className="py-20 px-40 bg-background overflow-hidden"
        >
            <div className="mx-auto space-y-16">
                {/* Section 1: Left Quote/Image */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <h3 className="text-2xl sm:text-3xl font-bold text-primary">
                            &ldquo;Align priors and share your creative vision faster&rdquo;
                        </h3>
                        <div className="rounded-lg overflow-hidden">
                            <video 
                                className="scale-105"
                                height={1080}
                                width={1920}
                                autoPlay
                                loop
                                muted
                                playsInline
                            >
                                <source src="/landing/videos/1.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Accordion items={visionItems} />
                    </div>
                </motion.div>

                {/* Section 2: Right Accordion */}
                <motion.div
                    initial={{ opacity: 0, x: 50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-4 order-2 md:order-1">
                        <Accordion items={featuresItems} />
                    </div>
                    <div className="space-y-6 order-1 md:order-2">
                        <h3 className="text-2xl sm:text-3xl font-bold text-primary">
                            &ldquo;Transform scattered thoughts into a coherent, instantly consumable narrative&rdquo;
                        </h3>
                        <div className="rounded-lg overflow-hidden">
                            <video 
                                className="scale-105"
                                autoPlay
                                loop
                                muted
                                playsInline
                            >
                                <source src="/landing/videos/2.mp4" type="video/mp4" />
                                Your browser does not support the video tag.
                            </video>
                        </div>
                    </div>
                </motion.div>

                {/* Section 3: Left Accordion */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <h3 className="text-2xl sm:text-3xl font-bold text-primary">
                            &ldquo;A dynamic, living Vision Map that speaks to your creative process&rdquo;
                        </h3>
                        <div className="w-full h-64 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <Users className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">Team Collaboration Placeholder</p>
                            </div>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <Accordion items={brandItems} />
                    </div>
                </motion.div>

                {/* Use Cases Section */}
                <motion.div
                    initial={{ opacity: 0, y: 50 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="text-center space-y-8 pt-16"
                >
                    <h2 className="text-4xl font-display font-light">Use Cases</h2>
                    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-4xl mx-auto">
                        {[
                            "Explaining the vibe of a product and feel you want to create",
                            "Application flows and user experience mapping",
                            "General idea management and creative workflows",
                            "A workspace to work with art, fragrances and your own art",
                            "Shooting of a show or movie - reference shots, vibes, lighting, coloring, music",
                            "Pitch presentations that go beyond static slides"
                        ].map((useCase, index) => (
                            <motion.div
                                key={index}
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.6, delay: index * 0.1 }}
                                viewport={{ once: true }}
                                className="p-6 bg-card border rounded-lg hover:shadow-lg transition-shadow"
                            >
                                <div className="flex items-start gap-3">
                                    <CheckCircle className="w-5 h-5 text-green-500 mt-1 flex-shrink-0" />
                                    <p className="text-sm text-muted-foreground text-left">{useCase}</p>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </motion.div>
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
