"use client";

import { useEffect, useState } from "react";
import { Accordion } from "@/components/ui/accordion";

enum VIDEOS {
  VIDEO_1 = "/landing/videos/1.mp4",
  VIDEO_2 = "/landing/videos/2.mp4",
  VIDEO_3 = "/landing/videos/3.mp4",
}

// ✅ SafeVideo wrapper
function SafeVideo({ src, width, height }: { src: string; width?: number; height?: number }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <video
      key={src}
      className="scale-105"
      width={width}
      height={height}
      autoPlay
      loop
      muted
      playsInline
      preload="none"
    >
      <source src={src} type="video/mp4" />
      Your browser does not support the video tag.
    </video>
  );
}

export function About() {
  const visionItems = [
    {
      title: "Core Vision",
      content:
        "As a founder and co-founder of three startups, I've learned that communicating early-stage ideas is both challenging and time-consuming. Vision Maps addresses this challenge by helping you quickly align priors and build shared context.",
    },
    {
      title: "What We Do",
      content:
        "We believe that the only way to truly showcase your ideas is to build them—but building a full product takes time. Vision Maps lets you create that 'idea skeleton' quickly so you can align priors, transform scattered thoughts into coherent narratives, and accelerate the journey from idea to MVP.",
    },
  ];

  const featuresItems = [
    {
      title: "Creative Platform Integration",
      content:
        "Universal paste mechanism and automatic content organization from common platforms (Websites, Figma, GitHub, YouTube, TikTok, Instagram, Spotify, Notion, etc.) with manual override capabilities.",
    },
    {
      title: "LLM-Powered Innovation",
      content:
        "AI-driven brainstorming, vision validation, structured output generation, and usage credit system for scalable AI usage with flexible options",
    },
  ];

  const brandItems = [
    {
      title: "Brand & Strategic Vision",
      content:
        "Vision Maps is more than just a tool—it's a revolutionary way of communicating ideas. Our aim is to build a brand centered around ideation and creative expression that transforms how founders and business owners convey their visions.",
    },
    {
      title: "Revolutionary Communication",
      content:
        "When a founder steps into a VC meeting, they won't be limited to slides; they'll have a dynamic, living Vision Map that speaks to their creative process and demonstrates the full scope of their vision.",
    },
  ];

  return (
    <section id="about" className="p-10 bg-background overflow-hidden">
      <div className="mx-auto space-y-16">
        {/* Section 1 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-primary">
              &ldquo;Align priors and share your creative vision faster&rdquo;
            </h3>
            <div className="rounded-lg overflow-hidden">
              <SafeVideo src={VIDEOS.VIDEO_1} width={1920} height={1080} />
            </div>
          </div>
          <div className="space-y-4">
            <Accordion items={visionItems} />
          </div>
        </div>

        {/* Section 2 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-4 order-2 md:order-1">
            <Accordion items={featuresItems} />
          </div>
          <div className="space-y-6 order-1 md:order-2">
            <h3 className="text-2xl sm:text-3xl font-bold text-primary">
              &ldquo;Transform scattered thoughts into a coherent, instantly consumable
              narrative&rdquo;
            </h3>
            <div className="rounded-lg overflow-hidden">
              <SafeVideo src={VIDEOS.VIDEO_2} />
            </div>
          </div>
        </div>

        {/* Section 3 */}
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="space-y-6">
            <h3 className="text-2xl sm:text-3xl font-bold text-primary">
              &ldquo;A dynamic, living Vision Map that speaks to your creative process&rdquo;
            </h3>
            <div className="rounded-lg overflow-hidden">
              <SafeVideo src={VIDEOS.VIDEO_3} />
            </div>
          </div>
          <div className="space-y-4">
            <Accordion items={brandItems} />
          </div>
        </div>
      </div>
    </section>
  );
}
