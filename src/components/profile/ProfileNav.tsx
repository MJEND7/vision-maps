"use client";

import { motion, AnimatePresence } from "motion/react";
import Logo from "@/icons/logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import UserAvatar from "../ui/user-avatar";
import MissingAvatar from "@/icons/missing_avatar";
import { ROUTES } from "@/lib/constants";

export default function ProfileNav() {
    const { isLoaded } = useUser();
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
        <div className="flex gap-1 items-center justify-center w-full p-2 fixed top-0 z-[40]">
            <header
                className="relative sm:max-w-[900px] w-full sm:rounded-l-4xl rounded-4xl sm:rounded-r-xl backdrop-blur-[5px] dark:bg-background/50 dark:backdrop-blur-md bg-accent/50 border px-5 py-2 flex items-center justify-between"
            >
                <div className="flex w-full max-w-[160px] items-center gap-2">
                    <Link
                        href={ROUTES.HOME}
                        onClick={() => setMenuOpen(false)}
                        className="flex gap-3 items-center"
                    >
                        <div
                        >
                            <Logo size={35} />
                        </div>
                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ duration: 0.6, delay: 0.5 }}
                            className="sm:hidden inline font-light text-lg dark:text-white text-black"
                        >
                            Vision Maps
                        </motion.p>
                    </Link>
                    <div className="sm:flex hidden justify-center gap-2">
                        {[
                            { name: "Visions", href: ROUTES.PROFILE.VISIONS },
                            { name: "Profile", href: ROUTES.PROFILE.PROFILE },
                        ].map((item) => (
                            <Link
                                key={item.name}
                                href={item.href}
                                className="px-3 py-2 rounded-lg text-base font-medium text-gray-800 dark:text-gray-200 m-[1px] hover:m-0 hover:border transition"
                                onClick={() => setMenuOpen(false)}
                            >
                                {item.name}
                            </Link>
                        ))}
                    </div>
                </div>
                {/* Nav Links */}
                <div className="flex">
                    {/* Auth / Buttons - Hide UserButton on mobile when showLandingSections is true */}
                    <div className="hidden sm:flex items-center gap-2">
                        <div className="flex w-8 h-8">
                            <UserAvatar />
                        </div>
                    </div>

                    {/* Mobile Menu Toggle */}
                    <div className="sm:hidden flex items-center gap-2">
                        <button
                            ref={buttonRef}
                            className="sm:hidden p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
                            onClick={() => setMenuOpen(!menuOpen)}
                        >
                            {menuOpen ? <X size={24} /> : <Menu size={24} />}
                        </button>
                        <div className="flex w-8 h-8">
                            <Authenticated>
                                <UserAvatar />
                            </Authenticated>
                            <Unauthenticated>
                                <Link className="cursor-pointer" href={ROUTES.SIGNIN}>
                                    <MissingAvatar />
                                </Link>
                            </Unauthenticated>
                        </div>
                    </div>
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
                            className="absolute top-16 left-2 right-2 bg-background dark:bg-background rounded-xl shadow-lg border border-zinc-200 dark:border-zinc-700 flex flex-col items-stretch py-4 sm:hidden z-50"
                        >
                            {/* Nav Links */}
                            <div className="flex flex-col gap-2 px-4">
                                {[
                                    { name: "Visions", href: ROUTES.PROFILE.VISIONS },
                                    { name: "Profile", href: ROUTES.PROFILE.PROFILE },
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

                            {/* Divider */}
                            < div className="my-3 border-t border-gray-200 dark:border-zinc-700" />

                            <div className="flex flex-col gap-2 px-4">
                                {/* Theme Switcher in Mobile Menu */}
                                {isLoaded && (
                                    <ThemeSwitcher />
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>
            <div
                className="hidden sm:flex  items-center justify-between w-auto rounded-r-4xl rounded-l-xl backdrop-blur-[5px] dark:bg-background/50 dark:backdrop-blur-md bg-accent/50 border pl-2 pr-3 py-2"
            >
                <ThemeSwitcher />
            </div>
        </div>
    );
}
