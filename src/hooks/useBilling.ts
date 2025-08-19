"use client";

import { useUser, useClerk } from "@clerk/nextjs";
import { useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface BillingPlan {
    id: string;
    name: string;
    price: number;
    period: "monthly" | "yearly";
}

export function useBilling() {
    const { user } = useUser();
    const clerk = useClerk();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const subscribeToPlan = useCallback(async (
        planId: string, 
        period: "monthly" | "yearly" = "monthly"
    ) => {
        if (!user) {
            clerk.openSignIn();
            return false;
        }

        setIsLoading(true);
        
        try {
            // For free plan, no billing required
            if (planId === "free") {
                toast.success("Welcome to Vision Maps!");
                router.push("/profile/visions");
                return true;
            }

            // Check if Clerk billing is available
            if (clerk.billing) {
                // Use Clerk's billing API
                await clerk.billing.subscribe({
                    plan: planId,
                    period: period
                });
                
                toast.success(`Successfully subscribed to ${planId} plan!`);
                router.push("/profile/visions?upgrade=success");
                return true;
            } else {
                // Fallback: redirect to Clerk's pricing table
                router.push("/pricing-redirect");
                return true;
            }
        } catch (error: any) {
            console.error("Subscription error:", error);
            
            const errorMessage = error?.message || "Failed to subscribe to plan";
            toast.error(errorMessage);
            
            // If subscription fails, try redirecting to pricing redirect as fallback
            if (error?.code === "billing_not_available") {
                router.push("/pricing-redirect");
                return false;
            }
            
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [user, clerk, router]);

    const changePlan = useCallback(async (
        newPlanId: string,
        period: "monthly" | "yearly" = "monthly"
    ) => {
        if (!user) {
            return false;
        }

        setIsLoading(true);
        
        try {
            if (clerk.billing) {
                await clerk.billing.changePlan({
                    plan: newPlanId,
                    period: period
                });
                
                toast.success(`Successfully changed to ${newPlanId} plan!`);
                return true;
            } else {
                // Fallback: redirect to manage subscription page
                router.push("/pricing-redirect");
                return false;
            }
        } catch (error: any) {
            console.error("Plan change error:", error);
            toast.error(error?.message || "Failed to change plan");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [user, clerk, router]);

    const cancelSubscription = useCallback(async () => {
        if (!user) {
            return false;
        }

        setIsLoading(true);
        
        try {
            if (clerk.billing) {
                await clerk.billing.cancel();
                toast.success("Subscription cancelled successfully");
                return true;
            } else {
                // Fallback: redirect to manage subscription
                router.push("/pricing-redirect");
                return false;
            }
        } catch (error: any) {
            console.error("Cancellation error:", error);
            toast.error(error?.message || "Failed to cancel subscription");
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [user, clerk, router]);

    const openBillingPortal = useCallback(() => {
        if (!user) {
            clerk.openSignIn();
            return;
        }

        try {
            if (clerk.billing) {
                clerk.billing.openPortal();
            } else {
                // Fallback: redirect to pricing page
                router.push("/pricing-redirect");
            }
        } catch (error) {
            console.error("Billing portal error:", error);
            toast.error("Unable to open billing portal");
        }
    }, [user, clerk, router]);

    const getSubscriptionStatus = useCallback(async () => {
        if (!user) {
            return null;
        }

        try {
            if (clerk.billing) {
                return await clerk.billing.getSubscription();
            }
            return null;
        } catch (error) {
            console.error("Failed to get subscription status:", error);
            return null;
        }
    }, [user, clerk]);

    return {
        subscribeToPlan,
        changePlan,
        cancelSubscription,
        openBillingPortal,
        getSubscriptionStatus,
        isLoading,
        isSignedIn: !!user
    };
}