"use client";

import { motion } from 'motion/react'
import Logo from '@/icons/logo'
import ThemeSwitcher from '@/components/ThemeSwitcher'
import Link from 'next/link'
import { Authenticated, Unauthenticated } from 'convex/react';
import { UserButton } from '@clerk/nextjs';
import { Button } from '../ui/button';

export default function LandingNav({ showLandingSections = false }: { showLandingSections: boolean }) {
    return (
        <motion.header
            initial={{ y: -50, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ duration: 0.6 }}
            className="sticky top-0 z-10 bg-transparent p-4 flex flex-row items-center"
        >
            <Link href="/" className="w-full">
                <motion.div
                    initial={{ x: -50, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.2 }}
                    className="w-full flex gap-1 justify-start items-center"
                >
                    <motion.div
                        initial={{ rotate: -180, scale: 0 }}
                        animate={{ rotate: 0, scale: 1 }}
                        transition={{ duration: 0.8, delay: 0.3, type: "spring" }}
                    >
                        <Logo size={50} />
                    </motion.div>
                    <motion.p
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 0.6, delay: 0.5 }}
                        className="mb-1 font-light text-2xl dark:text-white text-black"
                    >
                        Vision Maps
                    </motion.p>
                </motion.div>
            </Link>
            {showLandingSections && (
                <motion.div
                    initial={{ y: -20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 }}
                    className="flex w-full justify-center items-center gap-4 font-body"
                >
                    {["Features", "About", "Pricing", "Contact"].map((item, index) => (
                        <motion.button
                            key={item}
                            initial={{ y: -20, opacity: 0 }}
                            animate={{ y: 0, opacity: 1 }}
                            transition={{ duration: 0.4 }}
                            whileHover={{ scale: 1.05, transition: { duration: 0.1 } }}
                            whileTap={{ scale: 0.95 }}
                            className="cursor-pointer px-4 py-2 m-[1px] hover:m-0 hover:border hover:border-input rounded-lg"
                        >
                            {item}
                        </motion.button>
                    ))}
                </motion.div>
            )}

            <motion.div
                initial={{ x: 50, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3 }}
                className="w-full flex justify-end items-center gap-2"
            >
                <motion.div
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.9, type: "spring" }}
                >
                    <ThemeSwitcher />
                </motion.div>
                <Authenticated>
                    <motion.div
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.4, delay: 0.8, type: "spring" }}
                    >
                        <UserButton />
                    </motion.div>
                </Authenticated>
                <Unauthenticated>
                    <motion.div
                        initial={{ scale: 0.8, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        transition={{ duration: 0.5, delay: 0.7 }}
                        className="flex gap-2"
                    >
                        <Link href="/signup">
                            <Button size={"lg"} variant={"outline"}>
                                Sign up
                            </Button>
                        </Link>
                        <Link href="/contact-us">
                            <Button size={"lg"}>
                                Contact Us
                            </Button>
                        </Link>
                    </motion.div>
                </Unauthenticated>
            </motion.div>
        </motion.header>
    )
} 
