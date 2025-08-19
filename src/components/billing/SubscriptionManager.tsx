"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSubscription } from "@/hooks/useSubscription";
import { useBilling } from "@/hooks/useBilling";
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from "@/components/ui/card";
import {
    Crown,
    Users,
    Zap,
    Settings,
    CreditCard,
    Calendar,
    AlertTriangle,
    CheckCircle,
    Loader2
} from "lucide-react";

interface SubscriptionDetails {
    plan: string;
    status: string;
    nextBilling?: Date;
    amount?: number;
    period?: "monthly" | "yearly";
}

export default function SubscriptionManager() {
    const { hasFreePlan, hasProPlan, hasTeamPlan } = useSubscription();
    const { 
        changePlan, 
        cancelSubscription, 
        openBillingPortal, 
        getSubscriptionStatus,
        isLoading 
    } = useBilling();
    
    const [subscriptionDetails, setSubscriptionDetails] = useState<SubscriptionDetails | null>(null);
    const [isLoadingDetails, setIsLoadingDetails] = useState(true);

    useEffect(() => {
        const loadSubscriptionDetails = async () => {
            try {
                const details = await getSubscriptionStatus();
                if (details) {
                    setSubscriptionDetails(details);
                }
            } catch (error) {
                console.error("Failed to load subscription details:", error);
            } finally {
                setIsLoadingDetails(false);
            }
        };

        loadSubscriptionDetails();
    }, [getSubscriptionStatus]);

    const getCurrentPlan = () => {
        if (hasTeamPlan()) return { name: "Team", icon: Users, color: "text-purple-600" };
        if (hasProPlan()) return { name: "Pro", icon: Crown, color: "text-blue-600" };
        if (hasFreePlan()) return { name: "Free", icon: Zap, color: "text-gray-600" };
        return { name: "Unknown", icon: AlertTriangle, color: "text-yellow-600" };
    };

    const currentPlan = getCurrentPlan();
    const PlanIcon = currentPlan.icon;

    const handleUpgrade = () => {
        // Redirect to pricing page for upgrades
        window.location.href = "/pricing";
    };

    const handleManageBilling = () => {
        openBillingPortal();
    };

    if (isLoadingDetails) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>Subscription Details</CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="w-6 h-6 animate-spin" />
                </CardContent>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Current Plan Card */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
            >
                <Card>
                    <CardHeader>
                        <div className="flex items-center gap-3">
                            <div className={cn("p-2 rounded-lg bg-current/10", currentPlan.color)}>
                                <PlanIcon className={cn("w-5 h-5", currentPlan.color)} />
                            </div>
                            <div>
                                <CardTitle className="text-xl">Current Plan: {currentPlan.name}</CardTitle>
                                <CardDescription>
                                    {currentPlan.name === "Free" && "Perfect for getting started"}
                                    {currentPlan.name === "Pro" && "Everything you need for serious vision mapping"}
                                    {currentPlan.name === "Team" && "Built for teams that think big together"}
                                </CardDescription>
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {subscriptionDetails && (
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">
                                            Status: <span className="font-medium capitalize">{subscriptionDetails.status}</span>
                                        </span>
                                    </div>
                                    
                                    {subscriptionDetails.nextBilling && (
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-blue-500" />
                                            <span className="text-sm">
                                                Next billing: <span className="font-medium">
                                                    {subscriptionDetails.nextBilling.toLocaleDateString()}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                    
                                    {subscriptionDetails.amount && (
                                        <div className="flex items-center gap-2">
                                            <CreditCard className="w-4 h-4 text-purple-500" />
                                            <span className="text-sm">
                                                Amount: <span className="font-medium">
                                                    ${subscriptionDetails.amount}/{subscriptionDetails.period}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="flex flex-wrap gap-3 pt-4">
                                {currentPlan.name !== "Team" && (
                                    <Button onClick={handleUpgrade} className="gap-2">
                                        <Crown className="w-4 h-4" />
                                        {currentPlan.name === "Free" ? "Upgrade to Pro" : "Upgrade to Team"}
                                    </Button>
                                )}
                                
                                {currentPlan.name !== "Free" && (
                                    <Button 
                                        onClick={handleManageBilling} 
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Settings className="w-4 h-4" />
                                        Manage Billing
                                    </Button>
                                )}
                                
                                {currentPlan.name === "Free" && (
                                    <Button 
                                        onClick={handleUpgrade} 
                                        variant="outline"
                                        className="gap-2"
                                    >
                                        <Zap className="w-4 h-4" />
                                        View All Plans
                                    </Button>
                                )}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Plan Features */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
            >
                <Card>
                    <CardHeader>
                        <CardTitle>Plan Features</CardTitle>
                        <CardDescription>
                            What's included in your {currentPlan.name} plan
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {currentPlan.name === "Free" && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">3 vision maps</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Basic templates</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Export to PDF</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Community support</span>
                                    </div>
                                </>
                            )}
                            
                            {currentPlan.name === "Pro" && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Unlimited vision maps</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">AI-powered insights</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Advanced templates</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Advanced export options</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Priority support</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Team collaboration (up to 5)</span>
                                    </div>
                                </>
                            )}
                            
                            {currentPlan.name === "Team" && (
                                <>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Everything in Pro</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Unlimited team members</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Advanced team management</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Custom branding</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">API access</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Dedicated support</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <CheckCircle className="w-4 h-4 text-green-500" />
                                        <span className="text-sm">Advanced analytics</span>
                                    </div>
                                </>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </motion.div>

            {/* Danger Zone (only for paid plans) */}
            {currentPlan.name !== "Free" && (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5, delay: 0.2 }}
                >
                    <Card className="border-destructive/20">
                        <CardHeader>
                            <div className="flex items-center gap-2">
                                <AlertTriangle className="w-5 h-5 text-destructive" />
                                <CardTitle className="text-destructive">Danger Zone</CardTitle>
                            </div>
                            <CardDescription>
                                Irreversible actions for your subscription
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Button 
                                onClick={() => cancelSubscription()}
                                disabled={isLoading}
                                variant="destructive"
                                className="gap-2"
                            >
                                {isLoading ? (
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                    <>
                                        <AlertTriangle className="w-4 h-4" />
                                        Cancel Subscription
                                    </>
                                )}
                            </Button>
                            <p className="text-sm text-muted-foreground mt-2">
                                You'll retain access to your current plan features until the end of your billing period.
                            </p>
                        </CardContent>
                    </Card>
                </motion.div>
            )}
        </div>
    );
}

// Separate Card components for better organization (if using shadcn/ui)
function Card({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "rounded-lg border bg-card text-card-foreground shadow-sm",
                className
            )}
            {...props}
        />
    );
}

function CardHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
    );
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
    return (
        <h3
            className={cn(
                "text-2xl font-semibold leading-none tracking-tight",
                className
            )}
            {...props}
        />
    );
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
    return (
        <p
            className={cn("text-sm text-muted-foreground", className)}
            {...props}
        />
    );
}

function CardContent({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
    return <div className={cn("p-6 pt-0", className)} {...props} />;
}