"use client";

import {
    CheckoutButton,
} from "@clerk/nextjs/experimental";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { CheckCircle } from "lucide-react";
import { Unauthenticated } from "convex/react";
import { Button } from "../ui/button";
import { ROUTES } from "@/lib/constants";
import { SignedIn, useOrganization, useOrganizationList, useClerk } from "@clerk/clerk-react";
import AutoCheckout from "./AutoCheckout";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription
} from "../ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "../ui/avatar";
import { Users, Plus, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { ApiRoutes } from "@/constants/apiRoutes";

// Hardcoded pricing config (UI only — no Clerk IDs yet)
const plans = [
    {
        key: "free",
        name: "Free",
        description: "Start your ideation journey with Vision!",
        monthly: "$0.00",
        annual: "$0.00",
        annualMonthly: "$0.00",
        features: [
            "1 Vision",
            "View Mode",
            "All integrations",
            "Basic export options",
        ],
    },
    {
        key: "pro",
        id: process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_CLERK_DEV_PRO_PLAN : process.env.NEXT_PUBLIC_CLERK_DEV_PRO_PLAN,
        name: "Pro",
        description: "Enhance your ideation experience",
        monthly: "$15.00",
        annual: "$150.00",
        annualMonthly: "$13.00",
        hasFreeTrial: true,
        trialDays: 3,
        features: [
            "Unlimited visions",
            "AI Assistance",
            "View Mode",
            "All integrations",
            "Advanced export options",
            "Priority support",
        ],
    },
    {
        key: "teams",
        id: process.env.NODE_ENV !== "production" ? process.env.NEXT_PUBLIC_CLERK_DEV_TEAM_PLAN : process.env.NEXT_PUBLIC_CLERK_DEV_TEAM_PLAN,
        name: "Teams",
        description: "Small plan for small teams 1 to 3 users",
        monthly: "$50.00",
        annual: "$480.00",
        annualMonthly: "$40.00",
        hasFreeTrial: true,
        trialDays: 3,
        features: [
            "Unlimited visions",
            "AI Assistance",
            "Team Collaboration",
            "Large Team",
            "All integrations",
            "Advanced export options",
            "Priority support",
        ],
    },
];

export function PricingComponent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [isAnnual, setIsAnnual] = useState(false);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [showCheckOut, setShowCheckOut] = useState(false);
    const [currentPlan, setCurrentPlan] = useState<string>("free");
    const [isLoadingPlan, setIsLoadingPlan] = useState(true);
    const [showOrgSelector, setShowOrgSelector] = useState(false);
    const [selectedOrgForTeam, setSelectedOrgForTeam] = useState<{ id: string | null, name: string } | null>(null);
    const [isProcessingOrgSelection, setIsProcessingOrgSelection] = useState(false);
    const [proAlreadyOwned, setProAlreadyOwned] = useState(false);
    const [showCreateOrg, setShowCreateOrg] = useState(false);
    const [newOrgName, setNewOrgName] = useState("");
    const [isCreatingOrg, setIsCreatingOrg] = useState(false);

    const { organization } = useOrganization();
    const { userMemberships, isLoaded: orgListLoaded, setActive } = useOrganizationList({
        userMemberships: { infinite: true },
    });
    const { createOrganization } = useClerk();

    // Fetch current user plan from API
    useEffect(() => {
        fetch('/api/user-plan')
            .then(res => res.json())
            .then(data => {
                console.log('Initial plan fetch:', data)
                setCurrentPlan(data.plan || "free");
                // Set proAlreadyOwned if user has pro plan and is in an organization
                if (data.plan === 'pro' && organization) {
                    setProAlreadyOwned(true);
                    console.log('Setting proAlreadyOwned to true on initial load');
                }
                setIsLoadingPlan(false);
            })
            .catch(error => {
                console.error('Error fetching user plan:', error);
                setCurrentPlan("free");
                setIsLoadingPlan(false);
            });
    }, [organization]);

    // Update proAlreadyOwned state when organization changes
    useEffect(() => {
        if (!organization) {
            // When switching to personal account, reset the state
            setProAlreadyOwned(false);
        } else if (currentPlan === 'pro') {
            // When switching to an organization and user has pro plan, set to true
            setProAlreadyOwned(true);
            console.log('Setting proAlreadyOwned to true because user has pro and switched to org');
        }
    }, [organization, currentPlan, ]);

    // Preselect checkout if coming with query params
    useEffect(() => {
        const selectedPlan = searchParams.get("plan");
        const selectedPeriod = searchParams.get("period");

        if (selectedPlan && selectedPeriod && !isLoadingPlan) {
            const wasAnnual = selectedPeriod === "annual";
            setIsAnnual(wasAnnual);
            const planIndex = plans.findIndex(
                (plan) => plan.name.toLowerCase() === selectedPlan.toLowerCase()
            );
            if (planIndex !== -1) setCurrentIndex(planIndex);

            // If it's a teams plan, show org selector when in organization or no organization
            if (selectedPlan.toLowerCase() === "teams") {
                setShowOrgSelector(true);
            } else {
                // For other plans (Pro), proceed directly to checkout
                setShowCheckOut(true);
            }
        }
    }, [isLoadingPlan, searchParams]);

    // Helper function to get button text based on current plan
    const getButtonText = (planKey: string) => {
        const plan = plans.find(p => p.key === planKey);
        const isCurrentPlan = currentPlan === planKey;
        const isUpgrade = currentPlan === "free" && planKey !== "free";

        if (isCurrentPlan) {
            return "Current Plan";
        }

        // Special case for Teams plan - show current org name
        if (planKey === "teams" && organization) {
            if (plan?.hasFreeTrial) {
                return `Start Trial for ${organization.name}`;
            }
            return `Upgrade ${organization.name} to Teams`;
        }

        if (plan?.hasFreeTrial) {
            return `Start ${plan.trialDays}-Day Free Trial`;
        }

        if (isUpgrade) {
            return `Upgrade to ${plan?.name}`;
        }
        return `Switch to ${plan?.name}`;
    };

    // Handle team plan purchase - show org selector
    const handleTeamPlanClick = () => {
        setShowOrgSelector(true);
    };

    // Handle org selection and proceed to checkout
    const handleOrgSelection = async (orgId: string | null, orgName: string) => {
        setIsProcessingOrgSelection(true);
        setSelectedOrgForTeam({ id: orgId, name: orgName });
        setShowOrgSelector(false);
        setCurrentIndex(2); // Team plan index

        // Clean up URL params if they exist
        const hasParams = searchParams.get("plan") || searchParams.get("period");
        if (hasParams) {
            router.push(window.location.pathname);
        }

        // Add a small delay to allow for any org switching to complete
        setTimeout(() => {
            setShowCheckOut(true);
            setIsProcessingOrgSelection(false);
        }, 500);
    };

    // Handle Pro plan click when in organization
    const handleProPlanClick = async () => {
        if (!organization || proAlreadyOwned) return;

        setIsProcessingOrgSelection(true);

        try {
            // Switch to personal account
            await setActive?.({ organization: null });

            // Wait a moment for org switch to complete
            await new Promise(resolve => setTimeout(resolve, 1500));

            // Check if user already has Pro plan on personal account
            const response = await fetch(ApiRoutes.USER_PLAN);
            const data = await response.json();

            console.log('User plan check:', data); // Debug log

            if (data.plan === 'pro') {
                console.log('Setting proAlreadyOwned to true'); // Debug log
                toast.error("You already own the Pro plan on your personal account");
                setProAlreadyOwned(true);
                return;
            }

            // Proceed to checkout for Pro plan
            setCurrentIndex(1); // Pro plan index
            setSelectedOrgForTeam(null); // Clear team selection
            setShowCheckOut(true);

        } catch (error) {
            console.error('Error switching to personal account:', error);
            toast.error('Failed to switch to personal account');
        } finally {
            setIsProcessingOrgSelection(false);
        }
    };

    // Handle create new organization
    const handleCreateNewOrg = () => {
        setShowOrgSelector(false);
        setShowCreateOrg(true);
    };

    // Handle organization creation
    const handleCreateOrganization = async () => {
        if (!newOrgName.trim()) return;

        setIsCreatingOrg(true);

        try {
            const org = await createOrganization({ name: newOrgName.trim() });
            if (org) {
                toast.success("Organization created successfully!");

                // Refresh the memberships list to include the new org
                userMemberships.revalidate?.();

                setShowCreateOrg(false);
                setNewOrgName("");

                // Go directly to checkout with the newly created org
                setTimeout(() => {
                    handleOrgSelection(org.id, org.name);
                }, 500);
            }
        } catch (error) {
            console.error("Failed to create organization:", error);
            toast.error("Failed to create organization");
        } finally {
            setIsCreatingOrg(false);
        }
    };

    if (isLoadingPlan) {
        return (
            <section id="pricing" className="py-20 px-6">
                <div className="max-w-6xl mx-auto text-center">
                    <div className="animate-pulse">
                        <div className="h-8 bg-muted rounded mb-4 max-w-md mx-auto"></div>
                        <div className="h-4 bg-muted rounded mb-8 max-w-lg mx-auto"></div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <>
            {showCheckOut && (
                <SignedIn>
                    <AutoCheckout
                        isAnnual={isAnnual}
                        data={plans}
                        currentIndex={currentIndex}
                        forWho={selectedOrgForTeam ? "organization" : "user"}
                        selectedOrg={selectedOrgForTeam}
                    />
                </SignedIn>
            )}

            <section id="pricing" className="py-20 px-6">
                <div className="max-w-6xl mx-auto">
                    {/* HEADER */}
                    <div className="text-center mb-16">
                        <h2 className="text-5xl font-display font-light mb-4">Pricing</h2>
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
                            Choose the plan that fits your creative needs
                        </p>

                        {/* Monthly / Annual Toggle */}
                        <div className="flex items-center justify-center gap-4 mb-8">
                            <span
                                className={`text-sm font-medium ${!isAnnual ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                Monthly
                            </span>
                            <button
                                onClick={() => setIsAnnual(!isAnnual)}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isAnnual ? "bg-primary" : "bg-muted"
                                    }`}
                            >
                                <span
                                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isAnnual ? "translate-x-6" : "translate-x-1"
                                        }`}
                                />
                            </button>
                            <span
                                className={`text-sm font-medium ${isAnnual ? "text-foreground" : "text-muted-foreground"
                                    }`}
                            >
                                Annual
                            </span>
                        </div>
                    </div>

                    {/* DESKTOP GRID */}
                    <div className="grid md:grid-cols-3 gap-8">
                        {plans.map((plan) => (
                            <div
                                key={`DESKTOP-${plan.name}`}
                                className={`relative flex flex-col justify-between p-8 rounded-xl border bg-card hover:shadow-lg transition-all ${plan.name === "Pro" ? "border-primary shadow-lg scale-105" : ""
                                    }`}
                            >
                                <div className="space-y-3">
                                    {plan.name === "Pro" && (
                                        <div className="absolute -top-4 left-1/2 transform -translate-x-1/2 flex flex-col gap-2">
                                            <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-semibold">
                                                Most Popular
                                            </span>
                                        </div>
                                    )}
                                    <div className="text-center">
                                        <h3 className="text-2xl font-semibold mb-2">
                                            {plan.name}
                                        </h3>
                                        <div className="mb-2">
                                            {plan.hasFreeTrial && (
                                                <div className="text-center mb-2">
                                                    <span className="text-green-600 font-semibold text-sm">
                                                        {plan.trialDays} days free, then
                                                    </span>
                                                </div>
                                            )}
                                            <div className="flex items-center justify-center gap-2">
                                                <span className="text-4xl font-bold">
                                                    {isAnnual ? plan.annual : plan.monthly}
                                                </span>
                                                <span className="text-muted-foreground">
                                                    {isAnnual ? "Yearly" : "Monthly"}
                                                </span>
                                            </div>
                                            {isAnnual && plan.name !== "Free" && (
                                                <p className="text-xs text-muted-foreground mt-2">
                                                    ({plan.annualMonthly}/month billed annually)
                                                </p>
                                            )}
                                        </div>
                                        <p className="text-muted-foreground text-xs">
                                            {plan.description}
                                        </p>
                                    </div>
                                    <hr />
                                    <div className="space-y-4 mb-8">
                                        {plan.features.map((feature) => (
                                            <div
                                                key={`FEATURE-${plan.name}-${feature}`}
                                                className="flex items-center gap-3"
                                            >
                                                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
                                                <span>{feature}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {plan.name !== "Free" && plan.id && (
                                    <div>
                                        <SignedIn>
                                            {plan.key === "teams" ? (
                                                <Button
                                                    onClick={handleTeamPlanClick}
                                                    data-plan={plan.name}
                                                    data-period={isAnnual ? "annual" : "month"}
                                                    className="w-full h-auto p-3"
                                                    variant="outline"
                                                    size="lg"
                                                    disabled={currentPlan === plan.key || isProcessingOrgSelection}
                                                >
                                                    {isProcessingOrgSelection ? (
                                                        "Processing..."
                                                    ) : organization ? (
                                                        <div className="flex items-center justify-between w-full">
                                                            <div className="flex items-center gap-2">
                                                                <Avatar className="w-5 h-5">
                                                                    <AvatarImage src={organization.imageUrl} />
                                                                    <AvatarFallback className="bg-blue-500 text-white text-xs">
                                                                        {organization.name[0]}
                                                                    </AvatarFallback>
                                                                </Avatar>
                                                                <span className="text-sm">
                                                                    {plan?.hasFreeTrial ? `Start Trial for ${organization.name}` : `Upgrade ${organization.name} to Teams`}
                                                                </span>
                                                            </div>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    ) : (
                                                        <div className="flex items-center justify-between w-full">
                                                            <span>{getButtonText(plan.key)}</span>
                                                            <ChevronDown className="w-4 h-4 text-muted-foreground" />
                                                        </div>
                                                    )}
                                                </Button>
                                            ) : plan.key === "pro" && organization ? (
                                                <Button
                                                    onClick={() => {
                                                        console.log('Button clicked, proAlreadyOwned:', proAlreadyOwned);
                                                        handleProPlanClick();
                                                    }}
                                                    data-plan={plan.name}
                                                    data-period={isAnnual ? "annual" : "month"}
                                                    className={`w-full ${proAlreadyOwned ? "opacity-50 cursor-not-allowed" : "bg-primary hover:bg-primary/90"}`}
                                                    variant={proAlreadyOwned ? "outline" : "default"}
                                                    size="lg"
                                                    disabled={currentPlan === plan.key || isProcessingOrgSelection || proAlreadyOwned}
                                                >
                                                    {(() => {
                                                        console.log('Rendering button, states:', { isProcessingOrgSelection, proAlreadyOwned, currentPlan: currentPlan === plan.key });
                                                        return isProcessingOrgSelection ? "Switching to personal..." : proAlreadyOwned ? "Already owned on personal account" : getButtonText(plan.key);
                                                    })()}
                                                </Button>
                                            ) : (
                                                <CheckoutButton
                                                    planId={plan.id}
                                                    planPeriod={isAnnual ? "annual" : "month"}
                                                >
                                                    <Button
                                                        data-plan={plan.name}
                                                        data-period={isAnnual ? "annual" : "month"}
                                                        className={`w-full ${plan.name === "Pro"
                                                            ? "bg-primary hover:bg-primary/90"
                                                            : ""
                                                            }`}
                                                        variant={
                                                            plan.name === "Pro" ? "default" : "outline"
                                                        }
                                                        size="lg"
                                                        disabled={currentPlan === plan.key}
                                                    >
                                                        {getButtonText(plan.key)}
                                                    </Button>
                                                </CheckoutButton>
                                            )}
                                        </SignedIn>
                                        <Unauthenticated>
                                            <Button
                                                className={`w-full ${plan.name === "Pro"
                                                    ? "bg-primary hover:bg-primary/90"
                                                    : ""
                                                    }`}
                                                variant={plan.name === "Pro" ? "default" : "outline"}
                                                size="lg"
                                                onClick={() => {
                                                    const returnUrl = ROUTES.PRICING;
                                                    const signupUrl = `${ROUTES.SIGNUP}?returnUrl=${encodeURIComponent(
                                                        returnUrl
                                                    )}&plan=${encodeURIComponent(
                                                        plan.key
                                                    )}&period=${isAnnual ? "annual" : "month"}`;
                                                    router.push(signupUrl);
                                                }}
                                            >
                                                {getButtonText(plan.key)}
                                            </Button>
                                        </Unauthenticated>
                                    </div>
                                )}

                                {plan.name === "Free" && (
                                    <div>
                                        <Button
                                            className="w-full"
                                            variant={currentPlan === "free" ? "default" : "outline"}
                                            size="lg"
                                            disabled={currentPlan === "free"}
                                        >
                                            {getButtonText(plan.key)}
                                        </Button>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Team Plan Organization Selector Dialog */}
            <Dialog open={showOrgSelector} onOpenChange={setShowOrgSelector}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Select Organization for Team Plan</DialogTitle>
                        <DialogDescription>
                            Choose which organization you want to purchase the Team plan for, or create a new one.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        {/* Organizations */}
                        {orgListLoaded && userMemberships.data?.map((membership) => (
                            <Button
                                key={membership.organization.id}
                                variant="outline"
                                className="w-full p-4 h-auto justify-start"
                                onClick={() => handleOrgSelection(membership.organization.id, membership.organization.name)}
                                disabled={isProcessingOrgSelection}
                            >
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={membership.organization.imageUrl} />
                                        <AvatarFallback className="bg-blue-500 text-white">
                                            {membership.organization.name[0]}
                                        </AvatarFallback>
                                    </Avatar>
                                    <div className="flex flex-col items-start">
                                        <span className="text-sm font-medium">
                                            {membership.organization.name}
                                        </span>
                                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                                            <Users className="w-3 h-3" />
                                            {membership.organization.membersCount} members
                                        </span>
                                    </div>
                                </div>
                            </Button>
                        ))}

                        {/* Create New Organization */}
                        <Button
                            variant="outline"
                            className="w-full p-4 h-auto justify-start border-dashed"
                            disabled={isProcessingOrgSelection}
                            onClick={handleCreateNewOrg}
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full border-2 border-dashed border-muted-foreground/50 flex items-center justify-center">
                                    <Plus className="w-4 h-4 text-muted-foreground" />
                                </div>
                                <div className="flex flex-col items-start">
                                    <span className="text-sm font-medium">Create New Organization</span>
                                    <span className="text-xs text-muted-foreground">
                                        Set up a new team workspace
                                    </span>
                                </div>
                            </div>
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Create Organization Dialog */}
            <Dialog open={showCreateOrg} onOpenChange={setShowCreateOrg}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>Create Organization</DialogTitle>
                        <DialogDescription>
                            Enter a name for your new organization to continue with the Teams plan.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="org-name">Organization Name</Label>
                            <Input
                                id="org-name"
                                placeholder="Enter organization name"
                                value={newOrgName}
                                onChange={(e) => setNewOrgName(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") handleCreateOrganization();
                                }}
                                disabled={isCreatingOrg}
                            />
                        </div>

                        <div className="flex justify-end gap-2">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    setShowCreateOrg(false);
                                    setShowOrgSelector(true);
                                }}
                                disabled={isCreatingOrg}
                            >
                                Back
                            </Button>
                            <Button
                                onClick={handleCreateOrganization}
                                disabled={!newOrgName.trim() || isCreatingOrg}
                            >
                                {isCreatingOrg ? "Creating..." : "Create Organization"}
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
