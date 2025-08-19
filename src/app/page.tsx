"use client";

import { motion, AnimatePresence } from "motion/react"
import { useState, useEffect } from "react"
import LandingNav from "@/components/landing/LandingNav";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Users, Palette, Video, Globe, Upload } from "lucide-react";
import { SignedIn } from '@clerk/nextjs';
import { CheckoutButton, usePlans } from '@clerk/nextjs/experimental'
import WastedTimeTimer from "@/components/WastedTimeTimer";
import { Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

export default function Home() {
    const router = useRouter();

    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <LandingNav showLandingSections />

                <Header router={router} />
                <Features />
                <About />
                <Pricing router={router} />
            </motion.div>
        </>
    );
}

function Header({ router }: { router: AppRouterInstance }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
        >
            <div className="flex flex-col h-[300px] text-center gap-2 mx-auto mb-[100px]">
                <motion.h1
                    initial={{ y: 100, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    transition={{
                        duration: 1.2,
                        delay: 0.8,
                        type: "spring",
                        stiffness: 100,
                        damping: 12
                    }}
                    className="mt-[180px] text-[60px] cursor-default font-light "
                >
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                    >
                        The Essence of{" "}
                    </motion.span>
                    <motion.span>
                        <motion.span
                            className="z-10 font-bold moving-gradient font-display tracking-tight"
                        >
                            Vision
                        </motion.span>
                    </motion.span>
                </motion.h1>
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: 0.8,
                        delay: 1.6,
                        type: "spring",
                        stiffness: 120
                    }}
                    className="space-y-3"
                >
                    <WastedTimeTimer />
                    <Button size={"lg"} onClick={() => {
                        router.push("/signup")
                    }}>
                        Build Your Vision
                    </Button>
                </motion.div>
            </div>
        </motion.div>
    );
}

function Features() {
    const features = [
        {
            icon: <Palette className="w-8 h-8" />,
            title: "Visual Canvas",
            description: "Create unlimited nodes on a free-form canvas with drawing tools and connectors."
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
            description: "Get help creating nodes and researching ideas with our built-in AI helper."
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

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map((feature, index) => (
                        <motion.div
                            key={feature.title}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className="p-6 rounded-xl border bg-card hover:shadow-lg transition-shadow"
                        >
                            <div className="text-primary mb-4">{feature.icon}</div>
                            <h3 className="text-xl font-semibold mb-3">{feature.title}</h3>
                            <p className="text-muted-foreground">{feature.description}</p>
                        </motion.div>
                    ))}
                </div>
            </div>
        </motion.section>
    );
}

function About() {
    const words = [
        { text: "idea", color: "text-blue-500" },
        { text: "vibe", color: "text-purple-500" },
        { text: "spec", color: "text-green-500" },
        { text: "brand", color: "text-orange-500" }
    ];

    const [currentWordIndex, setCurrentWordIndex] = useState(0);

    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentWordIndex((prev) => (prev + 1) % words.length);
        }, 2000);

        return () => clearInterval(interval);
    }, [words.length]);

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            id="about"
            className="py-20 px-6 bg-muted/30"
        >
            <div className="max-w-4xl mx-auto">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2
                        className="text-4xl mb-10 cursor-default font-display font-light"
                    >
                        <span
                        >
                            Never Explain a{" "}
                        </span>
                        <span className="inline-block min-w-[110px]">
                            <AnimatePresence mode="wait">
                                <motion.span
                                    key={currentWordIndex}
                                    initial={{ y: 20, opacity: 0, rotateX: -90 }}
                                    animate={{ y: 0, opacity: 1, rotateX: 0 }}
                                    exit={{ y: -20, opacity: 0, rotateX: 90 }}
                                    transition={{
                                        duration: 0.5,
                                        type: "spring",
                                        stiffness: 300,
                                        damping: 20
                                    }}
                                    className={`inline-block font-semibold ${words[currentWordIndex].color}`}
                                >
                                    {words[currentWordIndex].text}
                                </motion.span>
                            </AnimatePresence>
                        </span>
                        <span>
                            {" "}again
                        </span>
                    </h2>
                    <div className="space-y-6 text-lg text-muted-foreground">
                        <p>
                            Vision Maps is more than just a product—it&apos;s a new way of thinking and communicating.
                            We believe that building great things requires fast, clear communication that cuts through
                            complexity and gets straight to the essence of your idea.
                        </p>
                        <p>
                            Whether you&apos;re explaining the vibe of a product, mapping application flows, managing
                            creative projects, or shooting a film, Vision Maps helps you transfer your vision from
                            your mind to others without losing the nuance that makes ideas powerful.
                        </p>
                        <p>
                            Stop explaining—start showing. Create visual canvases that capture not just what you&apos;re
                            building, but the feeling, mood, and inspiration behind it.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-8 mt-16"
                >
                    <div className="space-y-4">
                        <h3 className="text-2xl font-semibold">Perfect For</h3>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                Product teams defining brand identity and user experience
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                Filmmakers collecting reference shots, vibes, and inspiration
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                Creative agencies presenting concepts to clients
                            </li>
                            <li className="flex items-start gap-3">
                                <CheckCircle className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                                Entrepreneurs pitching their vision to investors
                            </li>
                        </ul>
                    </div>
                    <div className="space-y-4">
                        <h3 className="text-2xl font-semibold">How It Works</h3>
                        <ul className="space-y-3 text-muted-foreground">
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">1</span>
                                Create a new vision map or &quot;sheet&quot;
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">2</span>
                                Add nodes with rich media content
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">3</span>
                                Connect ideas and draw relationships
                            </li>
                            <li className="flex items-start gap-3">
                                <span className="w-6 h-6 bg-primary text-primary-foreground rounded-full flex items-center justify-center text-sm font-semibold flex-shrink-0">4</span>
                                Share with your team or present to stakeholders
                            </li>
                        </ul>
                    </div>
                </motion.div>
            </div>
        </motion.section>
    );
}

function Pricing({ router }: { router: AppRouterInstance }) {
    const [isAnnual, setIsAnnual] = useState(false);
    const { data, isLoading } = usePlans({
        for: 'user',
        pageSize: 3,
    })

    if (isLoading) {
        return (
            <motion.section
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                transition={{ duration: 0.8 }}
                viewport={{ once: true }}
                id="pricing"
                className="py-20 px-6"
            >
                <div className="max-w-6xl mx-auto">
                    <motion.div
                        initial={{ y: 50, opacity: 0 }}
                        whileInView={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6 }}
                        viewport={{ once: true }}
                        className="text-center mb-16"
                    >
                        <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                            Choose the plan that fits your creative needs
                        </p>
                    </motion.div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[1, 2, 3].map((i) => (
                            <div key={i} className="border rounded-xl p-8 animate-pulse">
                                <div className="h-6 bg-muted rounded mb-4"></div>
                                <div className="h-10 bg-muted rounded mb-6"></div>
                                <div className="space-y-3 mb-8">
                                    {[1, 2, 3, 4].map((j) => (
                                        <div key={j} className="h-4 bg-muted rounded"></div>
                                    ))}
                                </div>
                                <div className="h-10 bg-muted rounded"></div>
                            </div>
                        ))}
                    </div>
                </div>
            </motion.section>
        );
    }

    return (
        <motion.section
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.8 }}
            viewport={{ once: true }}
            id="pricing"
            className="py-20 px-6"
        >
            <div className="max-w-6xl mx-auto">
                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6 }}
                    viewport={{ once: true }}
                    className="text-center mb-16"
                >
                    <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
                    <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                        Choose the plan that fits your creative needs
                    </p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        whileInView={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.2 }}
                        viewport={{ once: true }}
                        className="flex items-center justify-center gap-4 mb-8"
                    >
                        <span className={`text-sm font-medium ${!isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Monthly
                        </span>
                        <button
                            onClick={() => setIsAnnual(!isAnnual)}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? 'bg-primary' : 'bg-muted'
                                }`}
                        >
                            <span
                                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? 'translate-x-6' : 'translate-x-1'
                                    }`}
                            />
                        </button>
                        <span className={`text-sm font-medium ${isAnnual ? 'text-foreground' : 'text-muted-foreground'}`}>
                            Annual
                        </span>
                    </motion.div>
                </motion.div>

                <div className="grid md:grid-cols-3 gap-8">
                    {data.map((plan, index) => (
                        <motion.div
                            key={plan.name + index}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative justify-between flex flex-col p-8 rounded-xl border bg-card hover:shadow-lg transition-all
                            ${plan.name == "Pro" ? 'border-primary shadow-lg scale-105' : ''}`}
                        >
                            <div className="space-y-3">
                                {plan.name == "Pro" && (
                                    <div className="absolute -top-4 left-1/2 transform -translate-x-1/2">
                                        <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                            Most Popular
                                        </span>
                                    </div>
                                )}

                                <div className="text-center">
                                    <h3 className="text-2xl font-semibold mb-2">{plan.name}</h3>
                                    <div className="mb-2">
                                        <div className="flex items-center justify-center gap-2">
                                            <span className="text-4xl font-bold">{isAnnual ? plan.annualFee.amountFormatted : plan.fee.amountFormatted}</span>
                                            <span className="text-muted-foreground">{isAnnual ? "Yearly" : "Monthly"}</span>
                                        </div>
                                        {isAnnual && plan.name !== "Free" && (
                                            <p className="text-xs text-muted-foreground mt-2">
                                                {`(${plan.annualMonthlyFee.amountFormatted}/month billed annually)`}
                                            </p>
                                        )}
                                    </div>
                                    <p className="text-muted-foreground text-xs">{plan.description}</p>
                                </div>
                                <hr />
                                <div className="space-y-4 mb-8">
                                    {plan.features.map((feature) => (
                                        <div key={feature.slug} className="flex items-center gap-3">
                                            <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                            <span>{feature.name}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>



                            <SignedIn>
                                <CheckoutButton planId={plan.id} planPeriod={isAnnual ? "annual" : "month"} >
                                    <Button
                                        className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                        variant={plan.name == "Pro" ? 'default' : 'outline'}
                                        size="lg"
                                    >
                                        Subscribe to {plan.name}
                                    </Button>
                                </CheckoutButton>
                            </SignedIn>
                            <Unauthenticated>
                                <Button
                                    className={`w-full ${plan.name == "Pro" ? 'bg-primary hover:bg-primary/90' : ''}`}
                                    variant={plan.name == "Pro" ? 'default' : 'outline'}
                                    size="lg"
                                    onClick={() => {
                                        if (plan.id && plan.name !== 'Free') {
                                            router.push("/signup")
                                        }
                                    }}
                                >
                                    Subscribe to {plan.name}
                                </Button>
                            </Unauthenticated>
                        </motion.div>
                    ))}
                </div>

                <motion.div
                    initial={{ y: 50, opacity: 0 }}
                    whileInView={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    viewport={{ once: true }}
                    className="text-center mt-16"
                >
                    <p className="text-sm text-muted-foreground">
                        Questions? <a href="mailto:support@visionmaps.com" className="text-primary hover:underline">Contact our team</a>
                    </p>
                </motion.div>
            </div>
        </motion.section >
    );
}
