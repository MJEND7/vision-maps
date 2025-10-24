"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Menu } from "lucide-react";
import { NotionSidebar } from "@/components/ui/notion-sidebar";

export default function WithSidebarLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    // Close sidebar when clicking outside on mobile
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            const sidebar = document.getElementById('mobile-sidebar');
            const button = document.getElementById('mobile-sidebar-button');
            // Check if click is inside drawer content
            const drawerContent = document.querySelector('[data-slot="drawer-content"]');
            const drawerOverlay = document.querySelector('[data-slot="drawer-overlay"]');

            // Don't close sidebar if clicking inside drawer or drawer overlay
            const isClickInsideDrawer = drawerContent?.contains(event.target as Node) || drawerOverlay?.contains(event.target as Node);

            if (isClickInsideDrawer) {
                return;
            }

            if (isSidebarOpen && sidebar && !sidebar.contains(event.target as Node) &&
                button && !button.contains(event.target as Node)) {
                setIsSidebarOpen(false);
            }
        };

        if (isSidebarOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isSidebarOpen]);

    return (
        <div className="flex h-screen bg-background relative">
            {/* Desktop Sidebar */}
            <div className="hidden lg:block">
                <NotionSidebar />
            </div>

            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="lg:hidden fixed inset-0 bg-black/50 z-40"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Mobile Sidebar */}
            <div
                id="mobile-sidebar"
                className={`rounded-l-lg lg:hidden fixed top-0 right-0 h-full bg-background border-l border-border z-50 transform transition-transform duration-300 ease-in-out ${
                    isSidebarOpen ? 'translate-x-0' : 'translate-x-full'
                }`}
            >
                <NotionSidebar />
            </div>

            <main className="flex-1 overflow-y-auto">
                {/* Mobile Menu Button */}
                <div className="lg:hidden fixed top-4 right-4 z-30">
                    <motion.button
                        id="mobile-sidebar-button"
                        onClick={() => setIsSidebarOpen(true)}
                        className="p-3 bg-card/90 backdrop-blur-sm text-foreground border border-border rounded-xl shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-200"
                        whileTap={{ scale: 0.95 }}
                        whileHover={{ scale: 1.05 }}
                    >
                        <Menu className="w-5 h-5" />
                    </motion.button>
                </div>

                {children}
            </main>
        </div>
    );
}
