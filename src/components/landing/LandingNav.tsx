"use client";

import { motion } from "motion/react";
import Logo from "@/icons/logo";
import ThemeSwitcher from "@/components/ThemeSwitcher";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { UserButton } from "@clerk/nextjs";
import { Button } from "../ui/button";

function SkeletonLoader() {
  return (
    <div className="flex items-center gap-3">
      {/* ThemeSwitcher placeholder */}
      <div className="w-10 h-10 rounded-full bg-gray-300 dark:bg-gray-700 animate-pulse" />

      {/* UserButton / Buttons placeholder */}
      <div className="w-28 h-10 rounded-lg bg-gray-300 dark:bg-gray-700 animate-pulse" />
    </div>
  );
}

export default function LandingNav({
  showLandingSections = false,
}: {
  showLandingSections?: boolean;
}) {
  const { isLoaded, user } = useUser(); // ✅ gives us both load state + user

  return (
    <motion.header
      initial={{ y: -50, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6 }}
      className="bg-transparent p-4 flex flex-col sm:flex-row items-center gap-4 sm:gap-0"
    >
      {/* Logo */}
      <Link href="/" className="w-full">
        <motion.div
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="w-full sm:w-auto flex gap-1 justify-center sm:justify-start items-center"
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
            className="mb-1 font-light text-xl sm:text-2xl dark:text-white text-black"
          >
            Vision Maps
          </motion.p>
        </motion.div>
      </Link>

      {/* Landing Sections */}
      {showLandingSections && (
        <motion.div
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex w-full justify-center items-center gap-2 sm:gap-4 font-body flex-wrap"
        >
          {[
            { name: "Features", href: "#features" },
            { name: "About", href: "#about" },
            { name: "Pricing", href: "#pricing" },
          ].map((item) => (
            <motion.a
              key={item.name}
              href={item.href}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ duration: 0.4 }}
              whileHover={{ scale: 1.05, transition: { duration: 0.1 } }}
              whileTap={{ scale: 0.95 }}
              className="cursor-pointer px-3 sm:px-4 py-2 m-[1px] hover:m-0 hover:border hover:border-input rounded-lg text-sm sm:text-base"
            >
              {item.name}
            </motion.a>
          ))}
        </motion.div>
      )}

      {/* Right side (auth-dependent) */}
      <motion.div
        initial={{ x: 50, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="w-full flex justify-center sm:justify-end items-center gap-2"
      >
        {/* Show skeleton while loading */}
        {!isLoaded ? (
          <SkeletonLoader />
        ) : (
          <>
            {/* Theme Switcher */}
            <motion.div
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.2, type: "spring" }}
            >
              <ThemeSwitcher />
            </motion.div>

            {/* If user exists → show UserButton */}
            {user ? (
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.3, type: "spring" }}
                className="flex items-center"
              >
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "w-12 h-12",
                    },
                  }}
                />
              </motion.div>
            ) : (
              /* If no user → show Sign up + Contact Us */
              <motion.div
                initial={{ scale: 0, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.3, type: "spring" }}
                className="flex items-center sm:items-start gap-2"
              >
                {!window.location.pathname.startsWith("/sign") && (
                  <Link href="/signup">
                    <Button
                      size={"lg"}
                      variant={"outline"}
                      className="sm:size-lg"
                    >
                      Sign up
                    </Button>
                  </Link>
                )}
                <Link href="/contact-us">
                  <Button size={"lg"} className="sm:size-lg">
                    Contact Us
                  </Button>
                </Link>
              </motion.div>
            )}
          </>
        )}
      </motion.div>
    </motion.header>
  );
}
