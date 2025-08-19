"use client";

import { motion, AnimatePresence } from "motion/react";
import Logo from "@/icons/logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";

function SkeletonLoader() {
    return (
        <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />
            <div className="w-28 h-10 rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse" />
        </div>
    );
}

export default function LandingNav({
    showLandingSections = false,
}: {
    showLandingSections?: boolean;
}) {
    const { isLoaded, user } = useUser();
    const [menuOpen, setMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                menuRef.current &&
                buttonRef.current &&
                !menuRef.current.contains(event.target as Node) &&
                !buttonRef.current.contains(event.target as Node)
            ) {
                setMenuOpen(false);
            }
        }

        if (menuOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [menuOpen]);

    return (
        <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="bg-transparent p-4 flex items-center justify-between relative"
        >
            {/* Left: Logo */}
            <Link href="/" className="flex items-center gap-2">
                <motion.div
                    initial={{ rotate: -180, scale: 0 }}
                    animate={{ rotate: 0, scale: 1 }}
                    transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
                >
                    <Logo size={40} />
                </motion.div>
                <motion.p
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.6, delay: 0.5 }}
                    className="font-light text-lg sm:text-2xl dark:text-white text-black"
                >
                    Vision Maps
                </motion.p>
            </Link>

            {/* Right side */}
            <div className="flex items-center gap-2">
                {/* Theme Switcher - Hidden on mobile when landing sections are shown */}
                {isLoaded && (
                    <motion.div
                        initial={{ scale: 0, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
                        className={showLandingSections ? "hidden sm:block" : ""}
                    >
                        <ThemeSwitcher />
                    </motion.div>
                )}

                {/* Auth / Buttons - Hide UserButton on mobile when showLandingSections is true */}
                {!isLoaded ? (
                    <SkeletonLoader />
                ) : user ? (
                    <div className={showLandingSections ? "hidden sm:block" : ""}>
                        <UserButton
                            appearance={{
                                elements: { avatarBox: "w-10 h-10" },
                            }}
                        />
                    </div>
                ) : (
                    <div className="hidden sm:flex gap-2">
                        <Link href="/signup">
                            <Button size="sm" variant="outline">
                                Sign up
                            </Button>
                        </Link>
                        <Link href="/contact-us">
                            <Button size="sm">Contact Us</Button>
                        </Link>
                    </div>
                )}

                {/* Mobile Menu Toggle */}
                {showLandingSections && (
                    <button
                        ref={buttonRef}
                        className="sm:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                        onClick={() => setMenuOpen(!menuOpen)}
                    >
                        {menuOpen ? <X size={24} /> : <Menu size={24} />}
                    </button>
                )}
                <Authenticated>
                    <UserButton
                        appearance={{
                            elements: { avatarBox: "w-8 h-8" },
                        }}
                    />
                </Authenticated>
                <Unauthenticated>
                    <div className="bg-gradient-to-t from-gray-400 to-blue-500 w-8 h-8 rounded-full" />
                </Unauthenticated>
            </div>

            {/* Mobile Dropdown Menu with AnimatePresence */}
            <AnimatePresence>
                {menuOpen && (
                    <motion.div
                        ref={menuRef}
                        key="mobile-menu"
                        initial={{ y: -10, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: -10, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="absolute top-16 left-2 right-2 bg-background dark:bg-background/80 dark:backdrop-blur-sm rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 flex flex-col items-stretch py-4 sm:hidden z-50"
                    >
                        {/* Nav Links */}
                        <div className="flex flex-col gap-2 px-4">
                            {[
                                { name: "Features", href: "#features" },
                                { name: "About", href: "#about" },
                                { name: "Pricing", href: "#pricing" },
                            ].map((item) => (
                                <Link
                                    key={item.name}
                                    href={item.href}
                                    className="px-4 py-2 rounded-lg text-base font-medium text-gray-800 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                                    onClick={() => setMenuOpen(false)}
                                >
                                    {item.name}
                                </Link>
                            ))}
                        </div>

                        {/* Mobile Auth Buttons */}
                        {!user && (
                            <>
                                {/* Divider */}
                                < div className="my-3 border-t border-gray-200 dark:border-zinc-700" />

                                <div className="flex flex-col gap-2 px-4">

                                    <div className="flex w-full gap-2">
                                        <Link href="/signup" className="w-full">
                                            <Button size={"lg"} className="w-full" variant="outline">
                                                Sign up
                                            </Button>
                                        </Link>
                                        {/* Theme Switcher in Mobile Menu */}
                                        {isLoaded && (
                                            <ThemeSwitcher />
                                        )}
                                    </div>
                                    <Link href="/contact-us">
                                        <Button size={"lg"} className="w-full">Contact Us</Button>
                                    </Link>

                                </div>
                            </>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </motion.header>
    );
}
