"use client";

import Logo from "@/icons/logo";
import Link from "next/link";
import { ROUTES } from "@/lib/constants";

export default function LandingFooter() {
    return (
        <footer
            className="bg-background border-t"
        >
            <div className="max-w-6xl mx-auto px-6 py-16">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
                    {/* Logo and Description */}
                    <div className="md:col-span-1">
                        <div className="flex items-center gap-3 mb-4">
                            <Logo size={32} />
                            <span className="text-lg font-light">Vision Maps</span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Build clearer— with Vision Maps.
                        </p>
                    </div>

                    {/* Contact Links */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4">Contact</h4>
                        <div className="space-y-2">
                            <Link href={ROUTES.EXTERNAL.SUPPORT_EMAIL} className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Contact
                            </Link>
                            <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Help center
                            </Link>
                            <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                X (Twitter)
                            </Link>
                            <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                LinkedIn
                            </Link>
                        </div>
                    </div>

                    {/* Legal Links */}
                    <div>
                        <h4 className="font-semibold text-foreground mb-4">Legal</h4>
                        <div className="space-y-2">
                            <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Privacy policy
                            </Link>
                            <Link href="#" className="block text-sm text-muted-foreground hover:text-foreground transition-colors">
                                Terms
                            </Link>
                        </div>
                    </div>
                </div>

                {/* Copyright */}
                <div className="pt-8 border-t border-border">
                    <p className="text-sm text-muted-foreground">
                        © Vision Maps. All rights reserved
                    </p>
                </div>
            </div>
        </footer >
    );
}
