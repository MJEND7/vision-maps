"use client";

import {
    Authenticated,
    Unauthenticated,
    useMutation,
    useQuery,
} from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { motion, AnimatePresence } from "motion/react"
import { useState, useEffect } from "react"
import LandingNav from "@/components/landing/LandingNav";

export default function Home() {
    return (
        <>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
            >
                <LandingNav showLandingSections={true} />
                <motion.main
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.8, delay: 0.4 }}
                    className="flex flex-col gap-8"
                >
                    <Authenticated>
                        <Content />
                    </Authenticated>
                    <Unauthenticated>
                        <Landing />
                    </Unauthenticated>
                </motion.main>
            </motion.div>
        </>
    );
}

function Landing() {
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
    }, []);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
        >
            <div className="flex flex-col h-[300px] justify-end text-center gap-4 mx-auto">
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
                    className="text-4xl cursor-default font-display "
                >
                    <motion.span
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.8, delay: 1.2 }}
                    >
                        The Essence of{" "}
                    </motion.span>
                    <motion.span
                        className="dark:text-white text-black italic font-extrabold"
                    >
                        Vision
                    </motion.span>
                </motion.h1>
                <motion.h2
                    initial={{ y: 50, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{
                        duration: 0.8,
                        delay: 1.6,
                        type: "spring",
                        stiffness: 120
                    }}
                    whileHover={{
                        scale: 1.02,
                        transition: { duration: 0.2 }
                    }}
                    whileTap={{ scale: 0.98 }}
                    className="text-2xl cursor-default font-display font-light"
                >
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.8 }}
                    >
                        Never Explain a{" "}
                    </motion.span>
                    <span className="inline-block min-w-[80px]">
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
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.6, delay: 1.8 }}
                    >
                        {" "}again
                    </motion.span>
                </motion.h2>
            </div>
        </motion.div>
    );
}

function Content() {
    const { viewer, numbers } =
        useQuery(api.myFunctions.listNumbers, {
            count: 10,
        }) ?? {};
    const addNumber = useMutation(api.myFunctions.addNumber);

    if (viewer === undefined || numbers === undefined) {
        return (
            <div className="mx-auto">
                <p>loading... (consider a loading skeleton)</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-8 max-w-lg mx-auto">
            <p>Welcome {viewer ?? "Anonymous"}!</p>
            <p>
                Click the button below and open this page in another window - this data
                is persisted in the Convex cloud database!
            </p>
            <p>
                <button
                    className="bg-foreground text-background text-sm px-4 py-2 rounded-md"
                    onClick={() => {
                        void addNumber({ value: Math.floor(Math.random() * 10) });
                    }}
                >
                    Add a random number
                </button>
            </p>
            <p>
                Numbers:{" "}
                {numbers?.length === 0
                    ? "Click the button!"
                    : (numbers?.join(", ") ?? "...")}
            </p>
            <p>
                Edit{" "}
                <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
                    convex/myFunctions.ts
                </code>{" "}
                to change your backend
            </p>
            <p>
                Edit{" "}
                <code className="text-sm font-bold font-mono bg-slate-200 dark:bg-slate-800 px-1 py-0.5 rounded-md">
                    app/page.tsx
                </code>{" "}
                to change your frontend
            </p>
            <p>
                See the{" "}
                <Link href="/server" className="underline hover:no-underline">
                    /server route
                </Link>{" "}
                for an example of loading data in a server component
            </p>
            <div className="flex flex-col">
                <p className="text-lg font-bold">Useful resources:</p>
                <div className="flex gap-2">
                    <div className="flex flex-col gap-2 w-1/2">
                        <ResourceCard
                            title="Convex docs"
                            description="Read comprehensive documentation for all Convex features."
                            href="https://docs.convex.dev/home"
                        />
                        <ResourceCard
                            title="Stack articles"
                            description="Learn about best practices, use cases, and more from a growing
            collection of articles, videos, and walkthroughs."
                            href="https://www.typescriptlang.org/docs/handbook/2/basic-types.html"
                        />
                    </div>
                    <div className="flex flex-col gap-2 w-1/2">
                        <ResourceCard
                            title="Templates"
                            description="Browse our collection of templates to get started quickly."
                            href="https://www.convex.dev/templates"
                        />
                        <ResourceCard
                            title="Discord"
                            description="Join our developer community to ask questions, trade tips & tricks,
            and show off your projects."
                            href="https://www.convex.dev/community"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}

function ResourceCard({
    title,
    description,
    href,
}: {
    title: string;
    description: string;
    href: string;
}) {
    return (
        <div className="flex flex-col gap-2 bg-slate-200 dark:bg-slate-800 p-4 rounded-md h-28 overflow-auto">
            <a href={href} className="text-sm underline hover:no-underline">
                {title}
            </a>
            <p className="text-xs">{description}</p>
        </div>
    );
}
