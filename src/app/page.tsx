"use client";

import { motion } from "motion/react"
import { useState, useEffect } from "react"
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { Button } from "@/components/ui/button";
import { CheckCircle, Zap, Users, Palette, Video, Globe, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import { Accordion } from "@/components/ui/accordion";
import { SignedIn } from '@clerk/nextjs';
import { CheckoutButton, usePlans } from '@clerk/nextjs/experimental'
import WastedTimeTimer from "@/components/WastedTimeTimer";
import { Authenticated, Unauthenticated } from "convex/react";
import { useRouter } from "next/navigation";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import LightRays from "@/backgrounds/LightRays/LightRays";
import { ROUTES } from "@/lib/constants";
import FramePreview from "@/components/landing/FramePreview";

export default function Home() {
    const router = useRouter();

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

                <Header router={router} />

                {/* Preview Section - Behind header on desktop, under header on mobile */}
                <motion.section
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                    className="absolute sm:absolute top-0 left-0 right-0 w-full -mt-0 mb-0 px-0 z-0 sm:z-0 hidden sm:block"
                >
                    <div className="w-full h-screen flex items-center justify-center">
                            <FramePreview />
                    </div>
                </motion.section>

                {/* Mobile Preview - under header */}
                <motion.section
                    initial={{ opacity: 0, y: 50 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 1.8 }}
                    className="relative block sm:hidden"
                >
                    <FramePreview />
                </motion.section>

                <Features />
                <About />
                <CallToAction />
                <LandingFooter />
            </motion.div>
        </>
    );
}

function Header({ router }: { router: AppRouterInstance }) {
    return (
        <motion.section
            id="home"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="relative z-10 text-left flex justify-center flex-col h-[650px] px-40"
        >

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
                className="text-[40px] sm:text-[60px] cursor-default font-light "
            >
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 2 }}
                >
                    The {" "}
                </motion.span>
                <motion.span
                    className="z-10 font-bold moving-gradient font-display tracking-tight"
                >
                    Visions {" "}
                </motion.span>
                <motion.span
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8, delay: 2 }}
                >
                    Platform.
                </motion.span>
            </motion.h1>
            <motion.h2 className="max-w-[300px] sm:max-w-[700px] text-lg sm:text-2xl text-primary/80 mb-1">
                The best way to tack your ideation.
            </motion.h2>
            <WastedTimeTimer />

            <motion.div
                initial={{ y: 50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{
                    duration: 0.8,
                    delay: 1.6,
                    type: "spring",
                    stiffness: 120
                }}
                className="space-y-3 mt-4"
            >
                <div className="relative">
                    <motion.div className="absolute -left-8">
                        {/* Stars */}
                        <motion.div className="absolute -top-3 left-4">
                            <svg className="fill-primary" width="20" height="20" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path fillRule="evenodd" clipRule="evenodd" d="M6.74892 23.4418C9.11353 22.5993 11.6019 21.4794 13.5207 19.8582C15.7997 17.9325 16.7266 15.4524 17.349 12.8419C18.1481 9.48791 18.4674 5.91512 19.4363 2.55574C19.7951 1.3082 20.4855 0.836625 20.7818 0.627343C21.5305 0.0987022 22.2874 -0.0426033 22.9995 0.0103967C23.8435 0.0715506 25.0027 0.390888 25.7651 1.80558C25.8738 2.00807 26.0151 2.31657 26.1102 2.73921C26.1795 3.04906 26.2244 4.01799 26.2978 4.41752C26.4812 5.40142 26.6348 6.38535 26.7789 7.37469C27.2586 10.6675 27.5345 13.4642 29.0497 16.4893C31.1059 20.5961 33.1661 23.1089 35.9601 24.2219C38.6618 25.2982 41.892 25.0957 46.0192 24.2518C46.412 24.1567 46.8006 24.0751 47.1852 24.0085C49.0049 23.6905 50.7444 24.8851 51.1018 26.6979C51.4592 28.5095 50.3027 30.2747 48.4994 30.6729C48.123 30.7558 47.7519 30.8346 47.385 30.9067C41.8078 32.2874 35.3513 37.215 31.5991 41.5298C30.4426 42.8602 28.7494 46.5797 27.0221 48.9525C25.7474 50.7028 24.315 51.8566 23.1123 52.2643C22.3065 52.5388 21.627 52.4967 21.0658 52.3581C20.2504 52.157 19.5736 51.7153 19.0545 51.0127C18.7718 50.6281 18.5095 50.113 18.3845 49.4553C18.3247 49.1386 18.3179 48.3342 18.3193 47.97C17.9673 46.7591 17.5365 45.5768 17.2226 44.3551C16.4738 41.4401 15.0047 39.5946 13.2598 37.1566C11.6277 34.8749 9.87464 33.4412 7.30482 32.2969C6.97051 32.2154 4.27294 31.5549 3.32029 31.1757C1.9287 30.6199 1.26549 29.689 1.02495 29.1875C0.6159 28.3368 0.573809 27.5935 0.655347 26.9738C0.776296 26.0592 1.18671 25.2765 1.91512 24.6445C2.3663 24.2518 3.04036 23.8699 3.94272 23.6837C4.63987 23.5383 6.48935 23.4541 6.74892 23.4418ZM22.5742 18.6908C22.6992 18.9694 22.8324 19.2494 22.9737 19.5321C25.9852 25.5469 29.3528 28.9049 33.446 30.5343L33.5833 30.5873C30.8449 32.6203 28.3661 34.8925 26.4717 37.071C25.6917 37.9679 24.6589 39.8311 23.5432 41.7418C22.5294 38.4463 20.8714 36.117 18.7868 33.202C17.194 30.9774 15.5252 29.3031 13.4745 27.9387C15.0659 27.122 16.5838 26.1652 17.9061 25.0482C20.1077 23.1877 21.5631 21.0323 22.5742 18.6908Z" />
                            </svg>
                        </motion.div>
                        <svg className="fill-primary" width="20" height="20" viewBox="0 0 70 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M27.7275 13.7946C27.54 12.6821 27.3988 11.5822 27.3075 10.4822C27.17 8.83223 27.255 7.16961 27.2063 5.51961C27.185 4.81961 27.1013 2.99464 27.135 2.73214C27.4413 0.444639 29.2875 0.0945963 29.8275 0.0320963C30.0887 -0.00540372 32.7712 -0.30527 33.35 2.66973C34.06 6.30723 34.2875 9.96968 34.0363 13.5572C34.6225 16.6072 35.625 19.6446 36.9488 22.3946C42.2163 33.3321 52.2537 34.3946 63.1287 34.2946C64.8012 34.2696 66.19 35.5821 66.2775 37.2446C66.365 38.9196 65.12 40.3696 63.455 40.5196C57.3763 41.1071 46.5912 45.9822 42.8625 51.0572C42.0825 52.1197 41.6287 54.6822 41.0287 57.1947C40.1912 60.6822 39.195 64.1322 38.0788 65.5822C37.9113 65.8072 35.875 68.1072 35.2675 68.4447C33.8075 69.2447 32.6388 68.7821 31.975 68.3571C31.3113 67.9321 30.56 67.0946 30.26 65.7071C29.9463 64.2571 30.2113 61.2821 30.1625 60.6446C29.985 58.3321 29.5225 53.7946 28.5788 49.8946C28.07 47.7946 27.5275 45.8571 26.63 44.8946C23.3075 41.3321 17.995 41.8572 13.5213 42.4447C13.0075 42.5072 12.4938 42.5822 11.9813 42.6447C10.16 43.1822 8.22622 43.5821 6.18247 43.8196C3.09622 44.1821 2.58876 41.3446 2.56126 41.1571C2.50376 40.7446 2.28999 38.6197 4.61624 37.7697C4.86999 37.6822 6.74251 37.2696 7.46376 37.1071C8.46876 36.8821 9.48498 36.7072 10.505 36.5447C21.0412 33.2697 26.7638 24.0696 27.7275 13.7946ZM31.3438 25.1572C35.3213 33.3822 41.3575 37.3572 48.5125 39.1572H48.5113C44.0438 41.4947 39.98 44.4197 37.8262 47.3572C37.0087 48.4697 36.2588 50.7072 35.5825 53.2197C35.2163 50.8822 34.7213 48.3946 34.0675 46.2696C33.3238 43.8446 32.3225 41.8322 31.205 40.6322C29.0475 38.3197 26.34 37.0322 23.4287 36.3947C26.9137 33.3072 29.5563 29.4572 31.3438 25.1572Z" />
                        </svg>

                    </motion.div>
                </div>
                <Authenticated>
                    <Button size={"xl"} onClick={() => {
                        router.push(ROUTES.PROFILE.VISIONS)
                    }}>
                        Your Visions
                    </Button>
                </Authenticated>
                <Unauthenticated>
                    <Button size={"xl"} onClick={() => {
                        router.push(ROUTES.SIGNUP)
                    }}>
                        Join for free
                    </Button>
                </Unauthenticated>
                <div className="relative">
                    <motion.div className="absolute left-20">
                        <svg className="fill-primary" width="130" height="130" viewBox="0 0 130 130" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path fillRule="evenodd" clipRule="evenodd" d="M69.6566 75.8736C69.5481 75.3104 69.3311 74.7484 69.1141 74.1874C68.1375 71.1589 67.0523 67.627 65.0991 65.0196C62.495 61.6005 59.5655 60.2789 56.6358 60.3082C52.5125 60.3527 48.2811 63.3942 45.677 67.5619C43.0728 71.6917 41.9873 76.8631 43.6149 81.0287C44.7 83.8836 47.0871 86.3196 51.2104 87.6477C55.8762 89.1798 60.325 87.9266 64.2313 85.2258C65.7504 84.2123 67.0523 82.9927 68.3543 81.6494C68.6799 83.417 69.0058 85.2019 69.3313 87.0118C70.1994 92.9374 70.4166 99.1657 70.0911 105.139C69.7656 113.041 68.1373 120.599 65.0991 127.902C64.8821 128.577 65.2078 129.349 65.8589 129.627C66.5099 129.904 67.2691 129.582 67.5946 128.908C70.7413 121.317 72.4782 113.462 72.8038 105.25C73.0208 99.1028 72.9114 92.6944 71.9349 86.5963C71.5008 84.0702 71.067 81.5908 70.5245 79.1396C73.0201 75.9235 74.9735 72.3504 76.1671 69.3122C83.7626 48.9877 73.8888 21.6189 64.1232 3.20197C63.7977 2.55744 63.0375 2.3122 62.3864 2.65291C61.7354 2.99471 61.5184 3.79441 61.8439 4.43894C71.284 22.2645 81.0501 48.7077 73.6716 68.379C72.8036 70.6924 71.3928 73.3475 69.6566 75.8736ZM67.5946 78.5038C67.3776 77.3428 67.0527 76.1893 66.6186 75.0392C65.6421 72.2635 64.7742 69.0018 63.0381 66.6136C61.085 64.0322 58.914 62.9287 56.7439 62.9504C53.2716 62.9862 50.0168 65.6012 47.9552 68.9725C45.7851 72.3807 44.6998 76.6277 46.1104 80.0663C46.9784 82.2798 48.8235 84.106 51.9702 85.1357C55.8764 86.3977 59.565 85.2779 62.7118 83.0524C64.5564 81.8144 66.184 80.2366 67.5946 78.5038Z" />
                            <path fillRule="evenodd" clipRule="evenodd" d="M62.8228 3.00067C63.3654 3.3837 63.9079 3.95663 64.4504 4.53063C65.5355 5.63415 66.5123 6.80385 67.3804 7.42017C72.5887 11.2158 78.8819 15.7025 85.0668 17.6926C85.7179 17.9172 86.4774 17.5363 86.6944 16.8418C86.9114 16.1485 86.5861 15.403 85.8266 15.1784C79.9672 13.2687 73.9987 8.92298 68.8988 5.28039C68.0308 4.61416 66.8378 3.20357 65.7527 2.07293C64.7762 1.11372 63.7994 0.348745 62.8228 0.0709669C62.2803 -0.124346 61.3037 0.092664 60.6527 1.31446C59.7846 3.04623 59.0245 7.85527 58.9159 8.32077C57.8309 13.0365 56.746 17.1858 52.6227 20.1632C52.0802 20.5918 51.9719 21.4198 52.2974 22.009C52.7315 22.5982 53.5997 22.7284 54.1423 22.2987C58.8081 18.9046 60.327 14.2572 61.5205 8.88175C61.5205 8.53886 61.9546 5.66451 62.6056 3.66689C62.7141 3.45096 62.7143 3.21335 62.8228 3.00067Z" />
                        </svg>

                    </motion.div>
                </div>
            </motion.div>
        </motion.section>
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
            className="py-20 px-6 bg-background overflow-hidden"
        >
            <div className="max-w-6xl mx-auto space-y-16">
                {/* Section 1: Left Quote/Image */}
                <motion.div
                    initial={{ opacity: 0, x: -50 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.8 }}
                    viewport={{ once: true }}
                    className="grid md:grid-cols-2 gap-12 items-center"
                >
                    <div className="space-y-6">
                        <h3 className="text-3xl font-bold text-primary">
                            &ldquo;Align priors and share your creative vision faster&rdquo;
                        </h3>
                        <div className="w-full h-64 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <Palette className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">Brand Image Placeholder</p>
                            </div>
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
                        <h3 className="text-3xl font-bold text-primary">
                            &ldquo;Transform scattered thoughts into a coherent, instantly consumable narrative&rdquo;
                        </h3>
                        <div className="w-full h-64 bg-muted rounded-lg border-2 border-dashed border-muted-foreground/20 flex items-center justify-center">
                            <div className="text-center space-y-2">
                                <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
                                    <Video className="w-8 h-8 text-primary" />
                                </div>
                                <p className="text-sm text-muted-foreground">Product Demo Placeholder</p>
                            </div>
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
                        <h3 className="text-3xl font-bold text-primary">
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

function Pricing({ router }: { router: AppRouterInstance }) {
    const [isAnnual, setIsAnnual] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(1);
    const [touchStart, setTouchStart] = useState<number | null>(null);
    const [touchEnd, setTouchEnd] = useState<number | null>(null);
    const { data, isLoading } = usePlans({
        for: 'user',
        pageSize: 3,
    })

    const minSwipeDistance = 50;

    const onTouchStart = (e: React.TouchEvent) => {
        setTouchEnd(null);
        setTouchStart(e.targetTouches[0].clientX);
    };

    const onTouchMove = (e: React.TouchEvent) => setTouchEnd(e.targetTouches[0].clientX);

    const onTouchEnd = () => {
        if (!touchStart || !touchEnd) return;
        const distance = touchStart - touchEnd;
        const isLeftSwipe = distance > minSwipeDistance;
        const isRightSwipe = distance < -minSwipeDistance;

        if (isLeftSwipe && data) {
            nextCard();
        }
        if (isRightSwipe && data) {
            prevCard();
        }
    };

    const nextCard = () => {
        if (!data) return;
        setCurrentIndex((prev) => (prev + 1) % data.length);
    };

    const prevCard = () => {
        if (!data) return;
        setCurrentIndex((prev) => (prev - 1 + data.length) % data.length);
    };



    useEffect(() => {
        if (!data) return;

        const proIndex = data.findIndex(plan => plan.name === "Pro");
        if (proIndex !== -1) {
            setCurrentIndex(proIndex);
        }
    }, [data]);

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

                    <div className="md:grid md:grid-cols-3 md:gap-8">
                        <div className="relative md:hidden h-96 mb-8">
                            {[1, 2, 3].map((i) => (
                                <div key={i} className={`absolute inset-0 border rounded-xl p-8 animate-pulse max-w-xs mx-auto
                                    ${i === 2 ? 'z-30 scale-100 opacity-100' : i === 1 ? 'z-20 scale-95 opacity-60 translate-y-4' : 'z-10 scale-90 opacity-30 translate-y-8'}`}>
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
                        {[1, 2, 3].map((i) => (
                            <div key={i + 'desktop'} className="border rounded-xl p-8 animate-pulse hidden md:block">
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
            className="pt-20 px-6"
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

                <div className="md:grid md:grid-cols-3 md:gap-8">
                    <div className="relative md:hidden h-[500px] mb-8">
                        <button
                            onClick={prevCard}
                            className="absolute -left-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <button
                            onClick={nextCard}
                            className="absolute -right-4 top-1/2 transform -translate-y-1/2 z-40 bg-white dark:bg-background border rounded-full p-2 shadow-lg hover:shadow-xl transition-all"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                        <div
                            className="relative h-full"
                            onTouchStart={onTouchStart}
                            onTouchMove={onTouchMove}
                            onTouchEnd={onTouchEnd}
                        >
                            {data.map((plan, index) => (
                                <motion.div
                                    key={plan.name + index}
                                    initial={{ y: 50, opacity: 0 }}
                                    whileInView={{ y: 0, opacity: 1 }}
                                    transition={{ duration: 0.6, delay: index * 0.1 }}
                                    viewport={{ once: true }}
                                    className={`absolute inset-0 justify-between flex flex-col p-8 rounded-xl  ${plan.name == "Pro" ? "border" : ""}  bg-card transition-all duration-300 cursor-pointer max-w-xs mx-auto
                                ${currentIndex === index
                                            ? 'z-30 scale-100 opacity-100 shadow-2xl border-primary'
                                            : currentIndex === index - 1 || (currentIndex === 0 && index === data.length - 1)
                                                ? 'z-20 scale-95 opacity-60 blur-sm translate-y-4'
                                                : currentIndex === index + 1 || (currentIndex === data.length - 1 && index === 0)
                                                    ? 'z-20 scale-95 opacity-60 blur-sm translate-y-4'
                                                    : 'z-10 scale-90 opacity-30 blur-md translate-y-8'
                                        }
                                ${plan.name == "Pro" && currentIndex === index ? 'border-primary shadow-lg' : ''}`}
                                    onClick={() => setCurrentIndex(index)}
                                >
                                    <div className="space-y-3">
                                        {plan.name == "Pro" && currentIndex === index && (
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
                                        <div className="space-y-4 mb-8  overflow-y-auto">
                                            {plan.features.map((feature) => (
                                                <div key={feature.slug} className="flex items-center gap-3">
                                                    <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                    <span className="text-sm">{feature.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {plan.name != "Free" && (
                                        <>

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
                                                            router.push(ROUTES.SIGNUP)
                                                        }
                                                    }}
                                                >
                                                    Subscribe to {plan.name}
                                                </Button>
                                            </Unauthenticated>
                                        </>
                                    )}
                                </motion.div>
                            ))}
                        </div>
                    </div>

                    {data.map((plan, index) => (
                        <motion.div
                            key={plan.name + index + 'desktop'}
                            initial={{ y: 50, opacity: 0 }}
                            whileInView={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.6, delay: index * 0.1 }}
                            viewport={{ once: true }}
                            className={`relative justify-between flex-col p-8 rounded-xl border bg-card hover:shadow-lg transition-all hidden md:flex
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


                            {plan.name != "Free" && (
                                <>
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
                                                    router.push(ROUTES.SIGNUP)
                                                }
                                            }}
                                        >
                                            Subscribe to {plan.name}
                                        </Button>
                                    </Unauthenticated>
                                </>
                            )}
                        </motion.div>
                    ))}
                </div>

                <div className="flex justify-center mt-8 gap-2 md:hidden">
                    {data.map((_, index) => (
                        <button
                            key={index}
                            onClick={() => setCurrentIndex(index)}
                            className={`w-2 h-2 rounded-full transition-all ${currentIndex === index ? 'bg-primary' : 'bg-muted'
                                }`}
                        />
                    ))}
                </div>
            </div>
        </motion.section >
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
