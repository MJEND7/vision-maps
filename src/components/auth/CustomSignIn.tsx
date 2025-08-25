"use client";

import { useState } from "react";
import { useSignIn } from "@clerk/nextjs";
import { motion } from "motion/react";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Eye, EyeOff } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { ROUTES } from "@/lib/constants";

interface CustomSignInProps {
    onSwitchToSignUp: () => void;
}

export default function CustomSignIn({ onSwitchToSignUp }: CustomSignInProps) {
    const { isLoaded, signIn, setActive } = useSignIn();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");
    
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isLoaded) return;

        setIsLoading(true);
        setError("");

        try {
            const result = await signIn.create({
                identifier: email,
                password,
            });

            if (result.status === "complete") {
                await setActive({ session: result.createdSessionId });
                router.push(ROUTES.HOME);
            } else {
                const errorMessage = "Sign in failed. Please try again.";
                setError(errorMessage);
                toast.error(errorMessage);
            }
        } catch (err: unknown) {
            const errorMessage = (err as { errors?: { message: string }[] })?.errors?.[0]?.message || "An error occurred";
            setError(errorMessage);
            toast.error(errorMessage);
        } finally {
            setIsLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        if (!isLoaded) return;

        setIsLoading(true);
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_google",
                redirectUrl: ROUTES.SSO_CALLBACK,
                redirectUrlComplete: ROUTES.SSO_CALLBACK,
            });
        } catch (err: unknown) {
            const errorMessage = (err as { errors?: { message: string }[] })?.errors?.[0]?.message || "Google sign in failed";
            setError(errorMessage);
            toast.error(errorMessage);
            setIsLoading(false);
        }
    };

    const handleGitHubSignIn = async () => {
        if (!isLoaded) return;

        setIsLoading(true);
        try {
            await signIn.authenticateWithRedirect({
                strategy: "oauth_github",
                redirectUrl: ROUTES.SSO_CALLBACK,
                redirectUrlComplete: ROUTES.SSO_CALLBACK,
            });
        } catch (err: unknown) {
            const errorMessage = (err as { errors?: { message: string }[] })?.errors?.[0]?.message || "GitHub sign in failed";
            setError(errorMessage);
            toast.error(errorMessage);
            setIsLoading(false);
        }
    };

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="w-full max-w-md mx-auto relative"
        >
            {/* Back button cutout */}
            <div className="absolute -top-0 left-0 z-10">
                <motion.button
                    onClick={() => router.push(ROUTES.HOME)}
                    className="flex items-center justify-center w-12 h-12 bg-card border border-border rounded-tl-xl rounded-br-xl shadow-lg hover:bg-accent transition-colors"
                >
                    <svg
                        className="w-5 h-5 text-foreground"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M10 19l-7-7m0 0l7-7m-7 7h18"
                        />
                    </svg>
                </motion.button>
            </div>

            <div className="bg-card border border-border rounded-xl shadow-lg sm:p-8 p-4 pt-12">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-display font-bold mb-2">Welcome back, Vision</h2>
                    <p className="text-muted-foreground font-body">Continue with Google or enter your details.</p>
                </div>

                {error && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-destructive/10 border border-destructive/20 text-destructive text-sm rounded-lg p-3 mb-4"
                    >
                        {error}
                    </motion.div>
                )}


                <div className="flex gap-3 justify-center mb-6">
                    <Button
                        onClick={handleGoogleSignIn}
                        disabled={isLoading}
                        variant="outline"
                        size={"lg"}
                        className="h-12"
                    >
                        <svg className="w-5 h-5" viewBox="0 0 24 24">
                            <path
                                fill="currentColor"
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                                fill="currentColor"
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                            />
                            <path
                                fill="currentColor"
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                            />
                        </svg>
                        Google
                    </Button>
                    <Button
                        onClick={handleGitHubSignIn}
                        disabled={isLoading}
                        variant="outline"
                        size={"lg"}
                        className="h-12"
                    >
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
                        </svg>
                        GitHub
                    </Button>
                </div>
                <div className="relative mb-6">
                    <div className="absolute inset-0 flex items-center">
                        <div className="w-full border-t border-border"></div>
                    </div>
                    <div className="relative flex justify-center text-sm">
                        <span className="px-2 bg-card text-muted-foreground">or</span>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label htmlFor="email" className="block text-sm font-medium text-foreground mb-2">
                            Email address or username
                        </label>
                        <Input
                            id="email"
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="h-12"
                            placeholder="Enter email or username"
                            required
                        />
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-2">
                            Password
                        </label>
                        <div className="relative">
                            <Input
                                id="password"
                                type={showPassword ? "text" : "password"}
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="h-12 pr-10"
                                placeholder="Enter password"
                                required
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex items-center justify-between">
                        <label className="flex items-center">
                            <input type="checkbox" className="w-4 h-4 text-primary border-input rounded focus:ring-ring" />
                            <span className="ml-2 text-sm text-muted-foreground">Remember for 30 days</span>
                        </label>
                        <button type="button" className="text-sm text-primary hover:text-primary/80">
                            Forgot password
                        </button>
                    </div>

                    <Button
                        type="submit"
                        disabled={isLoading}
                        className="w-full h-12 font-medium"
                    >
                        {isLoading ? "Signing in..." : "Log in"}
                    </Button>
                </form>

                <div className="mt-6 text-center">
                    <p className="text-sm text-muted-foreground">
                        Don&apos;t have an account?{" "}
                        <button
                            onClick={onSwitchToSignUp}
                            className="text-primary hover:text-primary/80 font-medium"
                        >
                            Sign up
                        </button>
                    </p>
                </div>
            </div>
        </motion.div>
    );
}
