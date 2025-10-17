"use client";

import { useState, useEffect } from "react";
import { Download, Share, Plus } from "lucide-react";
import { Button } from "./button";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from "./dialog";

interface BeforeInstallPromptEvent extends Event {
    prompt: () => Promise<void>;
    userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

export function InstallPrompt() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showPrompt, setShowPrompt] = useState(false);
    const [isIOS, setIsIOS] = useState(false);
    const [isStandalone, setIsStandalone] = useState(false);
    const [isInstalling, setIsInstalling] = useState(false);

    useEffect(() => {
        // Check if running in standalone mode (already installed/bookmarked)
        const standalone = window.matchMedia('(display-mode: standalone)').matches ||
                          (window.navigator as any).standalone === true;
        setIsStandalone(standalone);

        // If already installed, don't show prompt
        if (standalone) {
            return;
        }

        // Check if iOS
        const iOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
        setIsIOS(iOS);

        // Handle the beforeinstallprompt event (Android/Chrome)
        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

        // Always show prompt after 3 seconds if not installed
        // iOS users will see manual instructions, Android/Desktop will get auto-install button
        const timer = setTimeout(() => {
            setShowPrompt(true);
        }, 3000);

        return () => {
            clearTimeout(timer);
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        };
    }, []);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        setIsInstalling(true);
        try {
            // Trigger the browser's install prompt
            await deferredPrompt.prompt();

            // Wait for the user to respond to the prompt
            const choiceResult = await deferredPrompt.userChoice;

            if (choiceResult.outcome === 'accepted') {
                console.log('User accepted the install prompt');
                // App will be installed - close the dialog
                setShowPrompt(false);
            } else {
                console.log('User dismissed the install prompt');
            }

            setDeferredPrompt(null);
        } catch (error) {
            console.error('Error installing PWA:', error);
        } finally {
            setIsInstalling(false);
        }
    };

    const handleDismiss = () => {
        // Just close the dialog - don't save dismissal to localStorage
        // This ensures it shows up again on next visit if not installed
        setShowPrompt(false);
    };

    if (isStandalone || !showPrompt) {
        return null;
    }

    return (
        <Dialog open={showPrompt} onOpenChange={handleDismiss}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-xl">
                        <div className="rounded-lg bg-primary/10 p-2">
                            <Download className="h-5 w-5 text-primary" />
                        </div>
                        Install Vision App
                    </DialogTitle>
                    <DialogDescription className="text-base pt-2">
                        Add Vision to your home screen for a better experience - quick access, fullscreen mode, and offline support.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Visual preview */}
                    <div className="relative rounded-xl border-2 border-dashed border-primary/20 bg-gradient-to-br from-primary/5 to-primary/10 p-8">
                        <div className="flex items-center justify-center gap-4">
                            <div className="relative">
                                <div className="rounded-2xl bg-background shadow-2xl border-4 border-foreground/10 w-16 h-16 flex items-center justify-center">
                                    {/* eslint-disable-next-line @next/next/no-img-element */}
                                    <img
                                        src="/light_favicon.ico"
                                        alt="Vision Icon"
                                        className="w-12 h-12 rounded-xl"
                                    />
                                </div>
                                <div className="absolute -bottom-1 -right-1 bg-primary text-primary-foreground rounded-full p-1">
                                    <Plus className="h-3 w-3" />
                                </div>
                            </div>
                            <div className="text-2xl">→</div>
                            <div className="rounded-xl bg-muted/50 p-4 text-center">
                                <div className="text-sm font-medium">Home Screen</div>
                                <div className="text-xs text-muted-foreground mt-1">One tap access</div>
                            </div>
                        </div>
                    </div>

                    {/* Instructions */}
                    {isIOS ? (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Installation Steps for iOS:</h4>
                            <ol className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                        1
                                    </span>
                                    <span>
                                        Tap the <Share className="inline h-4 w-4 mx-1" /> Share button in Safari (bottom of screen)
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                        2
                                    </span>
                                    <span>
                                        Scroll and tap <strong>&quot;Add to Home Screen&quot;</strong>
                                    </span>
                                </li>
                                <li className="flex gap-3">
                                    <span className="flex-shrink-0 flex h-6 w-6 items-center justify-center rounded-full bg-primary/10 text-primary font-semibold text-xs">
                                        3
                                    </span>
                                    <span>
                                        Tap <strong>&quot;Add&quot;</strong> in the top right
                                    </span>
                                </li>
                            </ol>
                            <div className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-3 mt-4">
                                <p className="text-xs text-blue-600 dark:text-blue-400">
                                    💡 You&apos;re viewing this in Safari. The install option is only available there on iOS devices.
                                </p>
                            </div>
                        </div>
                    ) : deferredPrompt ? (
                        <div className="space-y-3">
                            <h4 className="font-semibold text-sm">Benefits:</h4>
                            <ul className="space-y-2 text-sm text-muted-foreground">
                                <li className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>Launch directly from your home screen</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>Full screen experience without browser UI</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>Works offline with cached content</span>
                                </li>
                                <li className="flex items-center gap-2">
                                    <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                                    <span>Faster load times and better performance</span>
                                </li>
                            </ul>
                        </div>
                    ) : (
                        <div className="rounded-lg bg-amber-500/10 border border-amber-500/20 p-4">
                            <p className="text-sm text-amber-600 dark:text-amber-400">
                                To install Vision, use Chrome, Edge, or Safari on a mobile device.
                            </p>
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="flex flex-col gap-3">
                    {deferredPrompt && !isIOS && (
                        <Button
                            onClick={handleInstall}
                            disabled={isInstalling}
                            className="w-full gap-2 bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
                            size="lg"
                        >
                            {isInstalling ? (
                                <>
                                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                                    Installing...
                                </>
                            ) : (
                                <>
                                    <Download className="h-5 w-5" />
                                    Add to Home Screen
                                </>
                            )}
                        </Button>
                    )}
                    {isIOS && (
                        <Button
                            onClick={handleDismiss}
                            className="w-full gap-2"
                            size="lg"
                        >
                            Got It
                        </Button>
                    )}
                    <Button
                        variant="ghost"
                        onClick={handleDismiss}
                        className="w-full"
                        disabled={isInstalling}
                    >
                        Maybe Later
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    );
}
