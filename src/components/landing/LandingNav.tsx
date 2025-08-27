"use client";

import { motion, AnimatePresence } from "motion/react";
import Logo from "@/icons/logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { Button } from "../ui/button";
import { useState, useRef, useEffect } from "react";
import { Menu, X } from "lucide-react";
import { Authenticated, Unauthenticated } from "convex/react";
import UserAvatar from "../ui/user-avatar";
import MissingAvatar from "@/icons/missing_avatar";
import { ROUTES } from "@/lib/constants";

export default function LandingNav({
    showLandingSections = false,
}: {
    showLandingSections?: boolean;
}) {
    const { isLoaded, user } = useUser();
    const [menuOpen, setMenuOpen] = useState(false);
    const [showLoginHint, setShowLoginHint] = useState(true);
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

    useEffect(() => {
        function handleScroll() {
            const scrollTop = window.scrollY;
            const docHeight = document.documentElement.scrollHeight - window.innerHeight;
            const scrolledPercent = (scrollTop / docHeight) * 100;

            if (scrolledPercent < 0.5) {
                setShowLoginHint(true);
            } else {
                setShowLoginHint(false);
            }
        }

        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    return (
        <div className="flex gap-1 items-center justify-center w-full p-2 fixed top-0 z-[40]">
            <motion.header
                initial={{ y: -50, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.6 }}
                className="relative sm:max-w-[900px] w-full sm:rounded-l-4xl rounded-4xl sm:rounded-r-xl backdrop-blur-[5px] dark:bg-background/50 dark:backdrop-blur-md bg-accent/50 border px-5 py-2 flex items-center justify-between"
            >

                <AnimatePresence>
                    {showLoginHint && (
                        <motion.div
                            key="login-hint"
                            className="absolute sm:-right-11 top-12 right-0 z-10"
                            initial={{ scale: 0.8, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.5, opacity: 0 }}
                            transition={{ duration: 0.3, ease: "easeInOut" }}
                        >
                            <svg
                                className="fill-primary transform scale-x-[-1] md:scale-x-100 z-20 sm:w-[137px] sm:h-[137px] w-[90px] h-[90px]"
                                viewBox="0 0 137 137"
                                fill="none"
                                xmlns="http://www.w3.org/2000/svg"
                            >
                                <g clipPath="url(#clip0_718_2)">
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M87.2308 114.893C78.0322 111.083 70.0698 102.222 64.2284 91.3959C55.5025 75.2191 51.5042 54.6681 55.0558 40.2308C55.1327 39.9343 55.4348 39.7522 55.7282 39.8247C56.0291 39.8985 56.2081 40.1962 56.1343 40.4971C52.6396 54.7109 56.612 74.9404 65.209 90.8687C70.916 101.451 78.6632 110.144 87.6569 113.865C87.9428 113.982 88.0752 114.306 87.9581 114.592C87.8423 114.87 87.5168 115.01 87.2308 114.893Z"
                                    />
                                    <path
                                        fillRule="evenodd"
                                        clipRule="evenodd"
                                        d="M54.2525 22.5986C52.6229 31.0667 52.0495 38.6662 47.1092 46.3953C46.9395 46.6532 46.5974 46.733 46.3395 46.5633C46.0803 46.4011 46.0049 46.0559 46.1703 45.801C51.6047 37.2956 51.6409 28.9404 53.7778 19.3924C53.8954 18.8773 54.2913 18.8639 54.386 18.8685C54.5266 18.8731 54.747 18.9256 54.8765 19.1997C54.9018 19.2537 54.9362 19.3666 54.9618 19.5314C55.0039 19.848 55.0352 20.4991 55.078 20.7891C55.208 21.6251 55.3586 22.453 55.4886 23.289C55.8605 25.6791 56.2572 28.0581 56.8274 30.4053C58.9466 39.1897 60.6235 46.386 68.488 51.4523C68.7502 51.6189 68.8226 51.9599 68.656 52.2221C68.4906 52.477 68.1454 52.5524 67.8905 52.387C59.7533 47.1485 57.9388 39.7493 55.744 30.6655C55.1714 28.2873 54.7649 25.8761 54.3893 23.4624C54.3466 23.1724 54.2995 22.8855 54.2525 22.5986Z"
                                    />
                                </g>
                                <defs>
                                    <clipPath id="clip0_718_2">
                                        <rect
                                            width="97.7632"
                                            height="97.7632"
                                            fill="white"
                                            transform="matrix(0.815038 -0.579408 -0.579408 -0.815038 57.0859 136.642)"
                                        />
                                    </clipPath>
                                </defs>
                            </svg>

                            <Unauthenticated>
                                <p className="font-gaegu text-lg font-bold absolute top-15 sm:top-25 -left-3 sm:left-23">Login</p>
                            </Unauthenticated>
                            <Authenticated>
                                <p className="w-[150px] font-gaegu text-xl font-bold absolute top-15 sm:top-25 -left-20 sm:left-23">Look it&apos;s you</p>
                            </Authenticated>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* Left: Logo */}
                <div className="flex w-full max-w-[160px] items-center gap-2">
                    <Link
                        key={"Home"}
                        href={ROUTES.LANDING.HOME}
                        onClick={() => setMenuOpen(false)}
                        className="flex gap-3 items-center"
                    >
                        <motion.div
                            initial={{ rotate: -180, scale: 0 }}
                            animate={{ rotate: 0, scale: 1 }}
                            transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
                        >
                            <Logo size={35} />
                        </motion.div>
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
                            { name: "Features", href: ROUTES.LANDING.FEATURES },
                            { name: "About", href: ROUTES.LANDING.ABOUT },
                            { name: "Pricing", href: ROUTES.LANDING.PRICING },
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
                        <Unauthenticated>
                            <Link href={ROUTES.SIGNUP}>
                                <Button size="lg">Sign up</Button>
                            </Link>
                        </Unauthenticated>
                        <Authenticated>
                            <Link href={ROUTES.PROFILE.VISIONS}>
                                <Button size="lg">Dashboard</Button>
                            </Link>
                        </Authenticated>
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

                    {/* Mobile Menu Toggle */}
                    {showLandingSections && (
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
                    )}
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
                                    { name: "Features", href: ROUTES.LANDING.FEATURES },
                                    { name: "About", href: ROUTES.LANDING.ABOUT },
                                    { name: "Pricing", href: ROUTES.LANDING.PRICING },
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

                                <div className="flex w-full justify-end gap-2">
                                    {!user ? (
                                        <Link href={ROUTES.SIGNUP} className="w-full">
                                            <Button size={"lg"} className="w-full" variant="outline">
                                                Sign up
                                            </Button>
                                        </Link>
                                    ) : (
                                        <Link href={ROUTES.VISIONS} className="w-full">
                                            <Button size={"lg"} className="w-full" variant="outline">
                                                Visions
                                            </Button>
                                        </Link>
                                    )}
                                    {/* Theme Switcher in Mobile Menu */}
                                    {isLoaded && (
                                        <ThemeSwitcher />
                                    )}
                                </div>
                                <Link href={ROUTES.SIGNUP}>
                                    <Button size={"lg"} className="w-full">Sign up</Button>
                                </Link>

                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </motion.header>
            <div
                className="hidden sm:flex  items-center justify-between w-auto rounded-r-4xl rounded-l-xl backdrop-blur-[5px] dark:bg-background/50 dark:backdrop-blur-md bg-accent/50 border pl-2 pr-3 py-2"
            >
                <ThemeSwitcher />
            </div>
        </div>
    );
}
